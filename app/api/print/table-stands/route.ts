import { NextRequest, NextResponse, after } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { tableStandLot, getVariant } from "@/lib/print/catalog";
import {
  renderTableStandArtwork,
  defaultCallToAction,
  type TableStandStyle,
} from "@/lib/print/artwork";
import {
  enqueuePieces,
  maybeBuildBatch,
  storeGeneratedArtwork,
  type QueuedPiece,
} from "@/lib/print/queue";
import { pieceLabel, sendCustomerOrderEmail } from "@/lib/print/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// N rendus sharp + N uploads : au-delà du timeout serverless par défaut.
export const maxDuration = 60;

// Commande des PRÉSENTOIRS DE TABLE (chantier mariage, option Pro) — la seule
// commande passée par L'ORGANISATEUR, pas par un invité : N tables → N pièces
// aux visuels tous différents (photo + « Table N » + QR du lien de la table),
// au PRIX DU LOT du catalogue (le palier qui couvre N).
//
// Arithmétique du lot : le prix est porté par la PREMIÈRE pièce, les autres
// sont à 0 centime — la somme des lignes reste juste (compta, marge), et le
// bon de tri liste bien N fichiers distincts.
//
// ⚠️ Même règle que le tunnel invité : PRINT_ENABLED ferme la route tant que
// Stripe n'est pas devant (on ne produit jamais sans encaisser).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const MAX_TABLES = 20; // le plus grand lot du catalogue

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

function makeOrderRef(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `UG-${yy}${mm}${dd}-${rand}`;
}

export async function POST(req: NextRequest) {
  if (process.env.PRINT_ENABLED !== "1") {
    return NextResponse.json(
      { success: false, error: "PRINT_DISABLED", message: "L'impression n'est pas encore ouverte." },
      { status: 503 }
    );
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "SUPABASE" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const eventId = clean(form.get("eventId"), 80);
  const deviceId = clean(form.get("deviceId"), 80);
  if (!eventId || !deviceId) {
    return NextResponse.json({ success: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  // Commande d'organisateur : vérifiée serveur, option Pro exigée.
  const { data: event } = await supabase
    .from("events")
    .select("id, name, pin, host_device_id, pro_enabled_at")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) {
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (event.host_device_id !== deviceId) {
    return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  }
  if (!event.pro_enabled_at) {
    return NextResponse.json({ success: false, error: "PRO_REQUIRED" }, { status: 403 });
  }

  const tableCount = Math.round(Number(form.get("tableCount")));
  if (!Number.isFinite(tableCount) || tableCount < 1 || tableCount > MAX_TABLES) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_TABLE_COUNT",
        message: `Entre 1 et ${MAX_TABLES} tables (au-delà, commandez en deux fois).`,
      },
      { status: 422 }
    );
  }
  const size = form.get("size") === "grand" ? "grand" : "moyen";
  const lot = tableStandLot(size, tableCount);
  if (!lot) {
    return NextResponse.json({ success: false, error: "NO_LOT" }, { status: 422 });
  }
  const variant = getVariant("presentoir", lot.id);
  if (!variant) {
    return NextResponse.json({ success: false, error: "NO_LOT" }, { status: 422 });
  }

  const style: TableStandStyle = {
    style: form.get("style") === "voile" ? "voile" : "fondu",
    veilOpacity: Number(form.get("veilOpacity")) || undefined,
    fadeStart: Number(form.get("fadeStart")) || undefined,
  };

  const customerName = clean(form.get("customerName"), 120);
  const customerEmail = clean(form.get("customerEmail"), 254)?.toLowerCase() ?? null;
  if (!customerName || !customerEmail || !EMAIL_REGEX.test(customerEmail)) {
    return NextResponse.json({ success: false, error: "INVALID_CUSTOMER" }, { status: 422 });
  }
  const line1 = clean(form.get("line1"), 200);
  const postalCode = clean(form.get("postalCode"), 10);
  const city = clean(form.get("city"), 120);
  if (!line1 || !postalCode || !/^\d{5}$/.test(postalCode) || !city) {
    return NextResponse.json({ success: false, error: "INVALID_ADDRESS" }, { status: 422 });
  }
  const shippingAddress = { line1, postalCode, city, country: "FR" };

  // La date du mariage = l'échéance impérative : la commande part en voie
  // express, jamais coincée derrière un seuil de lot.
  const dueDateRaw = clean(form.get("dueDate"), 40);
  let dueAt: string | null = null;
  if (dueDateRaw) {
    const parsed = new Date(dueDateRaw);
    const min = Date.now() - 24 * 60 * 60_000;
    const max = Date.now() + 730 * 24 * 60 * 60_000;
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() < min || parsed.getTime() > max) {
      return NextResponse.json({ success: false, error: "INVALID_DUE_DATE" }, { status: 422 });
    }
    dueAt = parsed.toISOString();
  }

  // Deux modes (idée Nico 09/08) : soit la MÊME photo partout (`photo`
  // seul), soit UNE PHOTO PAR TABLE (`photo_1`..`photo_N`, chacune
  // optionnelle). `photo` est toujours requis : il sert de repli pour les
  // tables laissées sans photo propre.
  const validatePhoto = async (f: FormDataEntryValue | null): Promise<Buffer | null> => {
    if (!(f instanceof File) || f.size === 0) return null;
    if (f.size > MAX_PHOTO_BYTES || !f.type.startsWith("image/")) return null;
    return Buffer.from(await f.arrayBuffer());
  };
  const defaultPhoto = await validatePhoto(form.get("photo"));
  if (!defaultPhoto) {
    return NextResponse.json({ success: false, error: "MISSING_PHOTO" }, { status: 422 });
  }
  const perTable = new Map<number, Buffer>();
  for (let i = 1; i <= tableCount; i++) {
    const entry = form.get(`photo_${i}`);
    if (entry instanceof File && entry.size > 0) {
      const buf = await validatePhoto(entry);
      if (!buf) {
        return NextResponse.json(
          { success: false, error: "INVALID_PHOTO", message: `Photo de la table ${i} invalide.` },
          { status: 422 }
        );
      }
      perTable.set(i, buf);
    }
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || req.nextUrl.origin;
  const orderRef = makeOrderRef();

  // N visuels différents — un par table — rangés dans le bucket de production.
  const queued: QueuedPiece[] = [];
  const frozenPaths: string[] = [];
  const dropFrozen = async () => {
    if (!frozenPaths.length) return;
    await supabase.storage
      .from("print-files")
      .remove(frozenPaths)
      .then(
        () => {},
        () => {}
      );
  };
  try {
    for (let i = 1; i <= tableCount; i++) {
      const tableLabel = `Table ${i}`;
      const joinUrl = `${origin}/join?pin=${event.pin}&table=${encodeURIComponent(tableLabel)}`;
      const artwork = await renderTableStandArtwork(
        variant.format,
        {
          photo: perTable.get(i) ?? defaultPhoto,
          tableLabel,
          joinUrl,
          pin: event.pin,
          callToAction: defaultCallToAction("presentoir"),
        },
        style
      );
      const frozen = await storeGeneratedArtwork(supabase, artwork, orderRef, i - 1);
      frozenPaths.push(frozen.filePath);
      if (frozen.thumbPath) frozenPaths.push(frozen.thumbPath);
      queued.push({
        event_id: eventId,
        order_ref: orderRef,
        customer_name: customerName,
        customer_email: customerEmail,
        shipping_address: shippingAddress,
        product: "presentoir",
        format: variant.format.id,
        material: variant.product.material,
        // Le prix du LOT sur la première pièce, 0 sur les suivantes : la somme
        // des lignes = le prix payé, et chaque pièce garde son fichier propre.
        price_cents: i === 1 ? variant.format.priceCents : 0,
        source_path: null,
        file_path: frozen.filePath,
        thumb_path: frozen.thumbPath,
        due_at: dueAt,
        px_width: frozen.pxWidth,
        px_height: frozen.pxHeight,
        notes: `${tableLabel} — lot ${size} ×${lot.packQuantity} (${tableCount} tables)`,
      });
    }
    await enqueuePieces(queued);
  } catch (e) {
    console.error("[print] commande présentoirs échouée", e);
    await dropFrozen();
    return NextResponse.json(
      { success: false, error: "ENQUEUE_FAILED", message: (e as Error).message },
      { status: 500 }
    );
  }

  const totalCents = variant.format.priceCents;

  after(async () => {
    try {
      await sendCustomerOrderEmail({
        to: customerEmail,
        name: customerName,
        orderRef,
        items: [
          {
            label: `${pieceLabel("presentoir", variant.format.id)} — ${tableCount} tables, visuels personnalisés`,
            count: 1,
          },
        ],
        totalCents,
        address: shippingAddress,
      });
    } catch (e) {
      console.warn("[print] email de confirmation présentoirs non parti", e);
    }
    try {
      if (dueAt) {
        for (let i = 0; i < 3; i++) {
          if (!(await maybeBuildBatch({ express: true }))) break;
        }
      }
      for (let i = 0; i < 3; i++) {
        if (!(await maybeBuildBatch())) break;
      }
    } catch (e) {
      console.error("[print] construction de lot post-présentoirs échouée", e);
    }
  });

  return NextResponse.json({
    success: true,
    orderRef,
    pieceCount: tableCount,
    totalCents,
    lot: { size, packQuantity: lot.packQuantity },
    express: Boolean(dueAt),
  });
}
