// File d'impression Printerkut (server-only) — transposition photo du système
// éprouvé sur Renka/Lika-NFC (cf. docs/strategie/audit-integration-printerkut.md §5).
//
// Garanties héritées (les quatre qui séparent une file de prod d'une file jouet) :
//  - claim CONDITIONNEL (status='pending') → jamais deux lots avec les mêmes
//    pièces, jamais de double email ;
//  - échec pendant la construction → rollback complet en 'pending', les pièces
//    ne sont JAMAIS perdues (le cron quotidien retente) ;
//  - claims zombies (crash/timeout > 15 min) récupérés par le cron ;
//  - fichiers FIGÉS à la commande (copiés dans le bucket print-files — une URL
//    signée périssable stockée en base = un tirage blanc, leçon Renka).
//
// Différence assumée avec Renka : PAS d'imposition en V1 — le gabarit et les
// seuils machine sont la question n°9 de l'audit. Un lot = N fichiers pièce
// + un bon de tri. L'imposition viendra avec les réponses de l'atelier.

import "server-only";

import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { pickBatchGroup } from "@/lib/print/groups";
import { sendBatchEmail } from "@/lib/print/email";

export const EVENT_PHOTOS_BUCKET = "event-photos";
export const PRINT_BUCKET = "print-files";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Pièces par lot — la bonne valeur par machine/matière est à caler avec
 *  l'atelier (question n°9) ; réglable sans redéploiement. */
export const BATCH_SIZE = clamp(Number(process.env.PRINT_BATCH_SIZE) || 8, 1, 50);
/** Ancienneté max d'une pièce en attente avant lot partiel (cron). */
export const MAX_WAIT_DAYS = Number(process.env.PRINT_MAX_WAIT_DAYS) || 2;
/** Claim plus vieux que ça sans issue = zombie (crash pendant construction). */
export const ZOMBIE_CLAIM_MINUTES = 15;
/** Jours après mise en lot avant purge du fichier de production d'une pièce. */
export const RETENTION_DAYS = Number(process.env.PRINT_RETENTION_DAYS) || 30;
/** Durée de validité des liens signés envoyés à l'atelier. */
export const SIGNED_LINK_DAYS = 7;
/** Côté long des vignettes générées au gel du fichier (audit UX §6.1). */
const THUMB_LONG_EDGE = 480;

export interface QueuedPiece {
  event_id: string;
  order_ref: string;
  customer_name: string;
  customer_email: string;
  shipping_address?: Record<string, unknown> | null;
  product: string;
  format: string;
  material: string;
  price_cents: number;
  source_path: string;
  file_path: string;
  /** Vignette générée au gel du fichier (peut manquer : base non migrée,
   *  génération échouée — l'UI affiche alors un pictogramme neutre). */
  thumb_path?: string | null;
  /** Pièce d'origine en cas de retirage (traçabilité, audit UX §6.7). */
  requeued_from?: string | null;
  px_width?: number | null;
  px_height?: number | null;
  notes?: string | null;
}

export interface QueueRow extends QueuedPiece {
  id: string;
  created_at: string;
  status: "pending" | "batching" | "batched";
  batch_id: string | null;
  slot_index: number | null;
  claimed_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
}

export interface BatchResult {
  batchId: string;
  pieceCount: number;
  material: string;
  emailed: boolean;
}

function getClient(): SupabaseClient | null {
  return getSupabaseAdminClient();
}

export interface FrozenFile {
  filePath: string;
  thumbPath: string | null;
  pxWidth: number | null;
  pxHeight: number | null;
}

/**
 * Copie une photo du coffre vers le bucket print-files (fichier de production
 * figé) et génère sa vignette + ses dimensions réelles au passage (le fichier
 * est déjà en mémoire — audit UX §6.1). La vignette et les dimensions sont
 * best-effort : leur échec ne bloque JAMAIS une commande.
 */
export async function freezeSourceFile(
  supabase: SupabaseClient,
  sourcePath: string,
  orderRef: string,
  index: number
): Promise<FrozenFile> {
  const { data, error } = await supabase.storage
    .from(EVENT_PHOTOS_BUCKET)
    .download(sourcePath);
  if (error || !data) {
    throw new Error(`photo introuvable dans le coffre : ${sourcePath}`);
  }
  const ext = (sourcePath.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
  const stem = `queue/${orderRef}/${index + 1}-${crypto.randomUUID().slice(0, 8)}`;
  const targetPath = `${stem}.${ext}`;
  const bytes = new Uint8Array(await data.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(PRINT_BUCKET)
    .upload(targetPath, bytes, {
      contentType: data.type || "image/jpeg",
      upsert: false,
    });
  if (upErr) throw new Error(`copie vers print-files échouée : ${upErr.message}`);

  let thumbPath: string | null = null;
  let pxWidth: number | null = null;
  let pxHeight: number | null = null;
  try {
    const image = sharp(Buffer.from(bytes), { failOn: "none" });
    const meta = await image.metadata();
    // Dimensions dans le sens d'affichage (l'EXIF peut tourner l'image).
    const rotated = (meta.orientation ?? 1) >= 5;
    pxWidth = (rotated ? meta.height : meta.width) ?? null;
    pxHeight = (rotated ? meta.width : meta.height) ?? null;
    const thumb = await image
      .rotate() // applique l'orientation EXIF
      .resize(THUMB_LONG_EDGE, THUMB_LONG_EDGE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    const candidate = `${stem}-thumb.jpg`;
    const { error: thumbErr } = await supabase.storage
      .from(PRINT_BUCKET)
      .upload(candidate, new Uint8Array(thumb), { contentType: "image/jpeg" });
    if (!thumbErr) thumbPath = candidate;
  } catch (e) {
    console.warn(`[print] vignette non générée pour ${sourcePath}`, e);
  }
  return { filePath: targetPath, thumbPath, pxWidth, pxHeight };
}

/** URL signée d'un fichier de production (email atelier, dashboard). */
export async function signPrintFile(
  supabase: SupabaseClient,
  path: string,
  days = SIGNED_LINK_DAYS
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from(PRINT_BUCKET)
    .createSignedUrl(path, days * 24 * 60 * 60);
  return data?.signedUrl ?? null;
}

/** Insère les pièces d'une commande dans la file. Renvoie le nombre inséré.
 *  Base pas encore migrée (colonnes thumb_path / requeued_from absentes) :
 *  retente sans la colonne fautive plutôt que de perdre la mise en file
 *  (pattern Renka — la migration 20260806 est additive et optionnelle). */
export async function enqueuePieces(pieces: QueuedPiece[]): Promise<number> {
  const supabase = getClient();
  if (!pieces.length || !supabase) return 0;
  let payload: Record<string, unknown>[] = pieces.map((p) => ({ ...p }));
  const optional = ["thumb_path", "requeued_from"];
  for (;;) {
    const { data, error } = await supabase
      .from("print_queue")
      .insert(payload)
      .select("id");
    if (!error) return data?.length ?? 0;
    const missing = optional.find((col) => error.message.includes(col));
    if (!missing) throw new Error(`print_queue insert : ${error.message}`);
    optional.splice(optional.indexOf(missing), 1);
    payload = payload.map((p) => {
      const { [missing]: _drop, ...rest } = p;
      void _drop;
      return rest;
    });
  }
}

async function releaseClaim(supabase: SupabaseClient, batchId: string) {
  await supabase
    .from("print_queue")
    .update({ status: "pending", batch_id: null, claimed_at: null, slot_index: null })
    .eq("batch_id", batchId);
}

/**
 * Construit AU PLUS UN lot : claim des BATCH_SIZE pièces les plus anciennes
 * d'une même matière (moins si `force`), enregistrement du lot, email atelier.
 * Renvoie null s'il n'y a pas de quoi remplir un lot (et !force).
 */
export async function maybeBuildBatch(opts?: {
  force?: boolean;
}): Promise<BatchResult | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const force = opts?.force === true;

  // Lecture large : le prochain groupe complet n'est pas forcément constitué
  // des pièces les plus anciennes toutes matières confondues.
  const { data: pendingRows, error: selErr } = await supabase
    .from("print_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(400);
  if (selErr) throw new Error(`print_queue select : ${selErr.message}`);
  const allPending = (pendingRows ?? []) as QueueRow[];
  if (!allPending.length) return null;

  const group = pickBatchGroup(allPending, BATCH_SIZE, force);
  if (!group) return null;
  const candidates = group.slice(0, BATCH_SIZE);
  const material = candidates[0]?.material ?? "";

  const batchId = crypto.randomUUID();
  const ids = candidates.map((c) => c.id);
  const { data: claimed, error: claimErr } = await supabase
    .from("print_queue")
    .update({
      status: "batching",
      batch_id: batchId,
      claimed_at: new Date().toISOString(),
    })
    .in("id", ids)
    .eq("status", "pending")
    .select("id");
  if (claimErr) throw new Error(`print_queue claim : ${claimErr.message}`);
  const claimedIds = new Set((claimed ?? []).map((c: { id: string }) => c.id));
  if (claimedIds.size === 0) return null;
  if (claimedIds.size < candidates.length && !force) {
    // Une exécution concurrente nous est passée devant : on relâche tout.
    await releaseClaim(supabase, batchId);
    return null;
  }
  const rows = candidates.filter((c) => claimedIds.has(c.id));

  try {
    // 1. Le lot existe en base même si l'email échoue ensuite.
    const { error: batchErr } = await supabase.from("print_batches").insert({
      id: batchId,
      piece_count: rows.length,
      material,
      file_paths: rows.map((r) => r.file_path),
    });
    if (batchErr) throw new Error(`print_batches insert : ${batchErr.message}`);

    await Promise.all(
      rows.map((row, i) =>
        supabase
          .from("print_queue")
          .update({ status: "batched", slot_index: i })
          .eq("id", row.id)
      )
    );

    // 2. Email atelier — échec non fatal (les liens restent accessibles au
    // dashboard, emailed_at reste null).
    let emailed = false;
    try {
      const links: (string | null)[] = [];
      for (const row of rows) links.push(await signPrintFile(supabase, row.file_path));
      await sendBatchEmail(batchId, rows, links);
      await supabase
        .from("print_batches")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", batchId);
      emailed = true;
    } catch (e) {
      console.error(`[print] email du lot ${batchId} échoué`, e);
    }

    return { batchId, pieceCount: rows.length, material, emailed };
  } catch (e) {
    // Rollback complet : les pièces redeviennent pending (le lot orphelin en
    // base est bénin — supprimé ci-dessous, best-effort).
    await supabase.from("print_batches").delete().eq("id", batchId).then(
      () => {},
      () => {}
    );
    await releaseClaim(supabase, batchId).catch(() => {});
    throw e;
  }
}

/** Remet en 'pending' les claims restés en 'batching' trop longtemps. */
export async function recoverZombieClaims(): Promise<number> {
  const supabase = getClient();
  if (!supabase) return 0;
  const cutoff = new Date(Date.now() - ZOMBIE_CLAIM_MINUTES * 60_000).toISOString();
  const { data, error } = await supabase
    .from("print_queue")
    .update({ status: "pending", batch_id: null, claimed_at: null, slot_index: null })
    .eq("status", "batching")
    .lt("claimed_at", cutoff)
    .select("id");
  if (error) throw new Error(`recover zombies : ${error.message}`);
  return data?.length ?? 0;
}

/** Pièces en attente dont la plus ancienne dépasse MAX_WAIT_DAYS ? */
export async function hasOverduePending(): Promise<boolean> {
  const supabase = getClient();
  if (!supabase) return false;
  const cutoff = new Date(Date.now() - MAX_WAIT_DAYS * 24 * 60 * 60_000).toISOString();
  const { data, error } = await supabase
    .from("print_queue")
    .select("id")
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .limit(1);
  if (error) throw new Error(`overdue check : ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/**
 * Purge du Storage les fichiers de production des pièces mises en lot depuis
 * plus de RETENTION_DAYS jours (marqueur : file_path vidé). Les lignes
 * print_queue (bon de tri, suivi commande) sont CONSERVÉES.
 */
export async function purgeOldPrintFiles(): Promise<number> {
  const supabase = getClient();
  if (!supabase) return 0;
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60_000).toISOString();
  // Vignette purgée EN MÊME TEMPS que le fichier de production (audit UX
  // §6.8) — sélection tolérante si la colonne thumb_path n'est pas migrée.
  let rows: { id: string; file_path: string; thumb_path?: string | null }[] | null = null;
  let hasThumbColumn = true;
  {
    const { data, error } = await supabase
      .from("print_queue")
      .select("id, file_path, thumb_path")
      .eq("status", "batched")
      .neq("file_path", "")
      .lt("claimed_at", cutoff)
      .limit(200);
    if (error && error.message.includes("thumb_path")) {
      hasThumbColumn = false;
      const retry = await supabase
        .from("print_queue")
        .select("id, file_path")
        .eq("status", "batched")
        .neq("file_path", "")
        .lt("claimed_at", cutoff)
        .limit(200);
      if (retry.error) throw new Error(`purge select : ${retry.error.message}`);
      rows = retry.data;
    } else if (error) {
      throw new Error(`purge select : ${error.message}`);
    } else {
      rows = data;
    }
  }
  if (!rows?.length) return 0;
  const paths = rows
    .flatMap((r) => [r.file_path, r.thumb_path ?? null])
    .filter((p): p is string => Boolean(p));
  if (paths.length) {
    const { error: rmErr } = await supabase.storage.from(PRINT_BUCKET).remove(paths);
    if (rmErr) throw new Error(`purge storage : ${rmErr.message}`);
  }
  const clear: Record<string, unknown> = hasThumbColumn
    ? { file_path: "", thumb_path: null }
    : { file_path: "" };
  const { error: updErr } = await supabase
    .from("print_queue")
    .update(clear)
    .in(
      "id",
      rows.map((r) => r.id)
    );
  if (updErr) throw new Error(`purge update : ${updErr.message}`);
  return rows.length;
}

/** Retire une pièce EN ATTENTE (annulation, doublon). Conditionnel pending. */
export async function removePendingPiece(id: string): Promise<boolean> {
  const supabase = getClient();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("print_queue")
    .delete()
    .eq("id", id)
    .eq("status", "pending")
    .select("file_path");
  if (error) throw new Error(`retrait pièce : ${error.message}`);
  const row = data?.[0];
  if (!row) return false;
  if (row.file_path) {
    await supabase.storage
      .from(PRINT_BUCKET)
      .remove([row.file_path])
      .then(
        () => {},
        () => {} // orphelin bénin
      );
  }
  return true;
}

/**
 * Remet en file une pièce DÉJÀ EN LOT (retirage après pièce ratée). Copie le
 * fichier vers un NOUVEAU chemin — l'original peut être purgé sans casser le
 * retirage — puis insère une nouvelle ligne pending (mêmes client/produit/réf).
 */
export async function requeuePiece(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getClient();
  if (!supabase) return { ok: false, error: "Supabase non configuré" };
  const { data: row, error } = await supabase
    .from("print_queue")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !row) return { ok: false, error: "pièce introuvable" };
  const piece = row as QueueRow;
  if (piece.status !== "batched")
    return { ok: false, error: "cette pièce est déjà dans la file" };
  if (!piece.file_path)
    return {
      ok: false,
      error: "fichier purgé (lot trop ancien) — repasser la commande",
    };

  const { data: blob, error: dlErr } = await supabase.storage
    .from(PRINT_BUCKET)
    .download(piece.file_path);
  if (dlErr || !blob)
    return { ok: false, error: "copie du fichier impossible (disparu ?)" };
  const ext = piece.file_path.split(".").pop() || "jpg";
  const stem = `queue/requeue/${crypto.randomUUID().slice(0, 12)}`;
  const newPath = `${stem}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(PRINT_BUCKET)
    .upload(newPath, new Uint8Array(await blob.arrayBuffer()), {
      contentType: blob.type || "image/jpeg",
    });
  if (upErr) return { ok: false, error: `re-upload échoué : ${upErr.message}` };

  // La vignette suit la pièce (c'est justement celle qu'on va ré-inspecter) —
  // best-effort, jamais bloquant.
  let newThumb: string | null = null;
  if (piece.thumb_path) {
    try {
      const { data: thumbBlob } = await supabase.storage
        .from(PRINT_BUCKET)
        .download(piece.thumb_path);
      if (thumbBlob) {
        const candidate = `${stem}-thumb.jpg`;
        const { error: thumbErr } = await supabase.storage
          .from(PRINT_BUCKET)
          .upload(candidate, new Uint8Array(await thumbBlob.arrayBuffer()), {
            contentType: "image/jpeg",
          });
        if (!thumbErr) newThumb = candidate;
      }
    } catch {
      newThumb = null;
    }
  }

  const inserted = await enqueuePieces([
    {
      event_id: piece.event_id,
      order_ref: piece.order_ref,
      customer_name: piece.customer_name,
      customer_email: piece.customer_email,
      shipping_address: piece.shipping_address ?? null,
      product: piece.product,
      format: piece.format,
      material: piece.material,
      price_cents: piece.price_cents,
      source_path: piece.source_path,
      file_path: newPath,
      thumb_path: newThumb,
      requeued_from: piece.id,
      px_width: piece.px_width ?? null,
      px_height: piece.px_height ?? null,
      notes: piece.notes ?? null,
    },
  ]);
  return inserted > 0
    ? { ok: true }
    : { ok: false, error: "insertion en file échouée" };
}

/** File visible du dashboard (pending + batching, par ancienneté). */
export async function listBoardPieces(): Promise<QueueRow[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("print_queue")
    .select("*")
    .in("status", ["pending", "batching"])
    .order("created_at", { ascending: true });
  if (error) throw new Error(`board pieces : ${error.message}`);
  return (data ?? []) as QueueRow[];
}

export interface BatchRow {
  id: string;
  created_at: string;
  piece_count: number;
  material: string;
  file_paths: string[];
  emailed_at: string | null;
  printed_at: string | null;
}

/** Lots non imprimés — la charge de travail du jour (bandeau Aujourd'hui). */
export async function listUnprintedBatches(): Promise<BatchRow[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("print_batches")
    .select("*")
    .is("printed_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`unprinted batches : ${error.message}`);
  return (data ?? []) as BatchRow[];
}

/** Derniers lots (historique du dashboard). */
export async function recentBatches(limit = 8): Promise<BatchRow[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("print_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`recent batches : ${error.message}`);
  return (data ?? []) as BatchRow[];
}

/** Pièces d'un lot envoyé, dans l'ordre des slots (bon de tri a posteriori). */
export async function listBatchPieces(batchId: string): Promise<QueueRow[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("print_queue")
    .select("*")
    .eq("batch_id", batchId)
    .order("slot_index", { ascending: true });
  if (error) throw new Error(`batch pieces : ${error.message}`);
  return (data ?? []) as QueueRow[];
}

export interface OrderSummary {
  order_ref: string;
  customer_name: string;
  customer_email: string;
  ids: string[];
  total: number;
  inQueue: number;
  status: "en_file" | "en_lot" | "imprimee" | "expediee";
  oldest: string;
}

/**
 * Commandes des `days` derniers jours, agrégées par order_ref, statut DÉRIVÉ
 * (jamais stocké) : en_file → en_lot → imprimee → expediee.
 */
export async function listRecentOrders(days = 14): Promise<OrderSummary[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
  // Tri DÉCROISSANT avant la limite : si la fenêtre dépasse 1000 lignes (pic
  // haute saison), ce sont les plus ANCIENNES qui sortent de l'écran, jamais
  // les commandes du jour (bug relevé par l'audit UX §8.2).
  const { data, error } = await supabase
    .from("print_queue")
    .select("*")
    .gt("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`orders : ${error.message}`);
  const rows = (data ?? []) as QueueRow[];
  if (!rows.length) return [];

  const batchIds = [...new Set(rows.map((r) => r.batch_id).filter(Boolean))] as string[];
  const printed = new Map<string, boolean>();
  if (batchIds.length) {
    const { data: batches } = await supabase
      .from("print_batches")
      .select("id, printed_at")
      .in("id", batchIds);
    for (const b of (batches ?? []) as { id: string; printed_at: string | null }[])
      printed.set(b.id, Boolean(b.printed_at));
  }

  const groups = new Map<string, QueueRow[]>();
  for (const r of rows) {
    const g = groups.get(r.order_ref);
    if (g) g.push(r);
    else groups.set(r.order_ref, [r]);
  }

  const orders: OrderSummary[] = [];
  for (const [ref, g] of groups) {
    const inQueue = g.filter((r) => r.status !== "batched").length;
    const allShipped = g.every((r) => r.shipped_at);
    const allPrinted =
      inQueue === 0 && g.every((r) => r.batch_id && printed.get(r.batch_id));
    orders.push({
      order_ref: ref,
      customer_name: g[0].customer_name,
      customer_email: g[0].customer_email,
      ids: g.map((r) => r.id),
      total: g.length,
      inQueue,
      status: allShipped
        ? "expediee"
        : inQueue > 0
          ? "en_file"
          : allPrinted
            ? "imprimee"
            : "en_lot",
      // Les lignes arrivent désormais du plus récent au plus ancien : la plus
      // ancienne pièce du groupe est la dernière.
      oldest: g[g.length - 1].created_at,
    });
  }
  // Groupes insérés du plus récent au plus ancien — déjà dans le bon ordre.
  return orders;
}

/** Marque expédiées toutes les pièces données (action « expédiée »). */
export async function markOrderShipped(ids: string[]): Promise<void> {
  const supabase = getClient();
  if (!ids.length || !supabase) return;
  const { error } = await supabase
    .from("print_queue")
    .update({ shipped_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw new Error(`expédition : ${error.message}`);
}

/** Marque un lot comme physiquement imprimé. */
export async function markBatchPrinted(batchId: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("print_batches")
    .update({ printed_at: new Date().toISOString() })
    .eq("id", batchId);
  if (error) throw new Error(`marquage imprimé : ${error.message}`);
}

/** Nombre de pièces en attente + date de la plus ancienne. */
export async function queueStatus(): Promise<{
  pending: number;
  oldestPendingAt: string | null;
}> {
  const supabase = getClient();
  if (!supabase) return { pending: 0, oldestPendingAt: null };
  const { data, error } = await supabase
    .from("print_queue")
    .select("created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`queue status : ${error.message}`);
  return {
    pending: data?.length ?? 0,
    oldestPendingAt: data?.[0]?.created_at ?? null,
  };
}
