import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { materialLabel } from "@/lib/print/email";
import { getVariant, resolutionBadge } from "@/lib/print/catalog";
import { MATERIAL_LABELS } from "@/lib/print/catalog";
import {
  BATCH_SIZE,
  MAX_WAIT_DAYS,
  batchSizeFor,
  batchStats,
  listBatchPieces,
  listBoardPieces,
  listRecentOrders,
  listUnprintedBatches,
  markBatchPrinted,
  markOrderShipped,
  maybeBuildBatch,
  piecesPerDay,
  recentBatches,
  removePendingPiece,
  requeuePiece,
  signPrintFile,
  type QueueRow,
} from "@/lib/print/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API du tableau de bord atelier — accès par SECRET DÉDIÉ (ATELIER_SECRET),
// volontairement distinct de CRON_SECRET (le secret du cron ne transite
// jamais par un navigateur).
//
// Deux modes (audit UX §8.3, pattern Renka) :
//  - GET             → résumé LÉGER pollé toutes les 10 s : compteurs du jour,
//                      file en cours (avec vignettes — liste courte par
//                      construction), lots SANS détail pièce.
//  - GET ?batch=<id> → détail d'UN lot à la demande : pièces avec vignette,
//                      lien fichier signé, résolution, provenance retirage.
function authorized(request: NextRequest): boolean {
  const secret = process.env.ATELIER_SECRET;
  if (!secret) return false;
  return (
    request.nextUrl.searchParams.get("cle") === secret ||
    request.headers.get("x-atelier-cle") === secret
  );
}

function pieceResolution(p: QueueRow): "ok" | "acceptable" | "insufficient" | null {
  if (!p.px_width || !p.px_height) return null;
  const variant = getVariant(p.product, p.format);
  if (!variant) return null;
  return resolutionBadge(p.px_width, p.px_height, variant.format);
}

const THUMB_LINK_DAYS = 1;

// Cache des URLs signées (audit P1-6) : évite de re-signer les mêmes chemins
// à chaque poll de 10 s. Portée : l'instance serverless (best effort — un
// cold start repart à vide, sans conséquence).
const signCache = new Map<string, { url: string; expiresAt: number }>();

async function cachedSign(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  path: string,
  days: number
): Promise<string | null> {
  const hit = signCache.get(path);
  if (hit && hit.expiresAt > Date.now()) return hit.url;
  const url = await signPrintFile(supabase, path, days);
  if (url) {
    // Marge de 10 % avant l'expiration réelle du lien.
    signCache.set(path, {
      url,
      expiresAt: Date.now() + days * 24 * 60 * 60_000 * 0.9,
    });
    if (signCache.size > 2000) {
      // Borne mémoire : purge des entrées expirées, puis des plus anciennes.
      for (const [k, v] of signCache) {
        if (v.expiresAt <= Date.now()) signCache.delete(k);
      }
      while (signCache.size > 2000) {
        const first = signCache.keys().next().value;
        if (!first) break;
        signCache.delete(first);
      }
    }
  }
  return url;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré." }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;
  const batchId = params.get("batch");
  const wantStats = params.get("stats") === "1";
  const days = Math.min(30, Math.max(1, Number(params.get("days")) || 7));
  const historyLimit = Math.min(50, Math.max(1, Number(params.get("history")) || 10));

  try {
    // ---- Mode stats : chargé à la demande (ligne de charge + calendrier).
    if (wantStats) {
      const [perDay, batches7] = await Promise.all([piecesPerDay(30), batchStats(7)]);
      return NextResponse.json({ perDay, batches7 });
    }

    // ---- Mode détail : les pièces d'UN lot, chargées au clic.
    if (batchId) {
      const pieces = await listBatchPieces(batchId);
      const detailed = await Promise.all(
        pieces.map(async (p, i) => ({
          id: p.id,
          slot: (p.slot_index ?? i) + 1,
          order_ref: p.order_ref,
          customer_name: p.customer_name,
          product: p.product,
          format: p.format,
          thumbUrl: p.thumb_path
            ? await cachedSign(supabase, p.thumb_path, THUMB_LINK_DAYS)
            : null,
          link: p.file_path ? await cachedSign(supabase, p.file_path, 2) : null,
          resolution: pieceResolution(p),
          pxWidth: p.px_width ?? null,
          pxHeight: p.px_height ?? null,
          requeuedFrom: p.requeued_from ?? null,
        }))
      );
      return NextResponse.json({ batchId, pieces: detailed });
    }

    // ---- Mode léger : le poll de 10 s.
    const [boardPieces, unprinted, history, orders] = await Promise.all([
      listBoardPieces(),
      listUnprintedBatches(),
      recentBatches(historyLimit),
      listRecentOrders(days),
    ]);

    const now = Date.now();
    const lateCutoff = now - MAX_WAIT_DAYS * 24 * 60 * 60_000;
    const pendingPieces = boardPieces.filter((p) => p.status === "pending");
    const perMaterial = new Map<string, number>();
    for (const p of pendingPieces) {
      perMaterial.set(p.material, (perMaterial.get(p.material) ?? 0) + 1);
    }

    const today = {
      toPrint: {
        pieces: unprinted.reduce((sum, b) => sum + b.piece_count, 0),
        lots: unprinted.length,
      },
      late: pendingPieces.filter((p) => new Date(p.created_at).getTime() < lateCutoff)
        .length,
      pending: {
        total: pendingPieces.length,
        perMaterial: [...perMaterial.entries()].map(([material, count]) => ({
          material,
          label: materialLabel(material),
          count,
        })),
      },
      toShip: orders.filter((o) => o.status === "imprimee").length,
    };

    // File en cours : liste courte par construction (bornée par les seuils de
    // lot) → vignettes signées à chaque poll acceptables (cache : P1-6).
    const pieces = await Promise.all(
      boardPieces.map(async (p) => ({
        id: p.id,
        created_at: p.created_at,
        status: p.status,
        order_ref: p.order_ref,
        customer_name: p.customer_name,
        product: p.product,
        format: p.format,
        material: p.material,
        materialLabel: materialLabel(p.material),
        thumbUrl: p.thumb_path
          ? await cachedSign(supabase, p.thumb_path, THUMB_LINK_DAYS)
          : null,
        resolution: pieceResolution(p),
        pxWidth: p.px_width ?? null,
        pxHeight: p.px_height ?? null,
        requeuedFrom: p.requeued_from ?? null,
      }))
    );

    const lightBatch = (b: (typeof unprinted)[number]) => ({
      id: b.id,
      created_at: b.created_at,
      piece_count: b.piece_count,
      material: b.material,
      materialLabel: materialLabel(b.material),
      emailed_at: b.emailed_at,
      printed_at: b.printed_at,
    });

    const batchSizes = Object.fromEntries(
      Object.keys(MATERIAL_LABELS).map((m) => [m, batchSizeFor(m)])
    );

    return NextResponse.json({
      batchSize: BATCH_SIZE,
      batchSizes,
      maxWaitDays: MAX_WAIT_DAYS,
      daysWindow: days,
      today,
      pieces,
      batchesToDo: unprinted.map(lightBatch),
      batchesDone: history.filter((b) => b.printed_at).map(lightBatch),
      orders,
    });
  } catch (e) {
    console.error("[print board]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: { action?: string; id?: string; ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "force": {
        const built = await maybeBuildBatch({ force: true });
        return NextResponse.json({
          ok: true,
          built: built ? { batchId: built.batchId, pieceCount: built.pieceCount } : null,
        });
      }
      case "remove": {
        if (!body.id) return NextResponse.json({ error: "id manquant." }, { status: 400 });
        const ok = await removePendingPiece(body.id);
        return NextResponse.json({ ok });
      }
      case "requeue": {
        if (!body.id) return NextResponse.json({ error: "id manquant." }, { status: 400 });
        const result = await requeuePiece(body.id);
        return NextResponse.json(result, { status: result.ok ? 200 : 422 });
      }
      case "printed": {
        if (!body.id) return NextResponse.json({ error: "id manquant." }, { status: 400 });
        await markBatchPrinted(body.id);
        return NextResponse.json({ ok: true });
      }
      case "ship": {
        if (!body.ids?.length)
          return NextResponse.json({ error: "ids manquants." }, { status: 400 });
        await markOrderShipped(body.ids);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }
  } catch (e) {
    console.error("[print board action]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
