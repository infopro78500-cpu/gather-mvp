import { NextRequest, NextResponse, after } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import {
  getVariant,
  orderTotalCents,
  requiresCoffrePhoto,
  resolutionBadge,
} from "@/lib/print/catalog";
import { defaultCallToAction, renderGeneratedArtwork } from "@/lib/print/artwork";
import {
  enqueuePieces,
  freezeSourceFile,
  maybeBuildBatch,
  storeGeneratedArtwork,
  type QueuedPiece,
} from "@/lib/print/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PIECES = 20;

// ⚠️ CHANTIER V1 — cette route est volontairement fermée en prod tant que :
//  1. la grille prix n'est pas validée par l'atelier (catalog.ts = DRAFT) ;
//  2. le paiement Stripe n'est pas branché DEVANT la mise en file — règle
//     actée dans l'audit : contrairement à Renka, on ne produit JAMAIS sans
//     encaisser. Le webhook checkout.session.completed appellera la mise en
//     file ; cette route deviendra alors la création de session de paiement.

const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

function makeOrderRef(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6);
  return `UG-${yy}${mm}${dd}-${rand}`;
}

interface PieceInput {
  /** Photo du coffre. Absent pour la papeterie du jour J (visuel généré). */
  sourcePath?: string;
  productId: string;
  formatId: string;
  pxWidth?: number;
  pxHeight?: number;
  /** Papeterie du jour J : ligne secondaire du visuel (table, prénom…). */
  label?: string;
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
    return NextResponse.json(
      { success: false, error: "SUPABASE_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const eventId = clean(body.eventId, 80);
  if (!eventId || !EVENT_ID_PATTERN.test(eventId)) {
    return NextResponse.json(
      { success: false, error: "INVALID_EVENT_ID" },
      { status: 400 }
    );
  }
  const customerName = clean(body.customerName, 120);
  const customerEmail = clean(body.customerEmail, 254)?.toLowerCase() ?? null;
  if (!customerName || !customerEmail || !EMAIL_REGEX.test(customerEmail)) {
    return NextResponse.json(
      { success: false, error: "INVALID_CUSTOMER" },
      { status: 422 }
    );
  }
  const shippingAddress =
    body.shippingAddress && typeof body.shippingAddress === "object"
      ? (body.shippingAddress as Record<string, unknown>)
      : null;
  const notes = clean(body.notes, 1000);

  const piecesInput = Array.isArray(body.pieces) ? (body.pieces as PieceInput[]) : [];
  if (!piecesInput.length || piecesInput.length > MAX_PIECES) {
    return NextResponse.json(
      { success: false, error: "INVALID_PIECES" },
      { status: 422 }
    );
  }

  // Échéance impérative (date de l'événement) : elle sort la commande de la
  // logique de seuil et la fait partir par la voie express.
  const dueDateRaw = clean(body.dueDate, 40);
  let dueAt: string | null = null;
  if (dueDateRaw) {
    const parsed = new Date(dueDateRaw);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ success: false, error: "INVALID_DUE_DATE" }, { status: 422 });
    }
    dueAt = parsed.toISOString();
  }

  // Validation de chaque pièce : variante au catalogue, et selon le produit
  // soit un chemin borné au coffre, soit un visuel à générer.
  for (const piece of piecesInput) {
    const variant = getVariant(String(piece?.productId), String(piece?.formatId));
    if (!variant) {
      return NextResponse.json(
        { success: false, error: "UNKNOWN_VARIANT" },
        { status: 422 }
      );
    }
    const path = clean(piece?.sourcePath, 400);
    if (requiresCoffrePhoto(variant.product)) {
      // Produit né d'une photo : le chemin est obligatoire et borné au coffre.
      if (!path || !path.startsWith(`${eventId}/`) || path.includes("..")) {
        return NextResponse.json(
          { success: false, error: "INVALID_SOURCE_PATH" },
          { status: 422 }
        );
      }
    } else if (path && (!path.startsWith(`${eventId}/`) || path.includes(".."))) {
      // Papeterie du jour J : la photo est facultative, mais si elle est
      // fournie elle reste bornée au coffre.
      return NextResponse.json(
        { success: false, error: "INVALID_SOURCE_PATH" },
        { status: 422 }
      );
    }
    if (
      path &&
      typeof piece.pxWidth === "number" &&
      typeof piece.pxHeight === "number" &&
      resolutionBadge(piece.pxWidth, piece.pxHeight, variant.format) === "insufficient"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "RESOLUTION_TOO_LOW",
          message: `Résolution insuffisante pour ${variant.product.label} ${variant.format.id}.`,
        },
        { status: 422 }
      );
    }
  }

  const totalCents = orderTotalCents(
    piecesInput.map((p) => ({ productId: p.productId, formatId: p.formatId }))
  );
  if (totalCents === null) {
    return NextResponse.json({ success: false, error: "UNKNOWN_VARIANT" }, { status: 422 });
  }

  const orderRef = makeOrderRef();

  // La papeterie du jour J a besoin des données du coffre pour composer son
  // visuel (QR de dépôt, titre, PIN de repli).
  const needsArtwork = piecesInput.some((p) => {
    const v = getVariant(String(p.productId), String(p.formatId));
    return v && !requiresCoffrePhoto(v.product) && !clean(p.sourcePath, 400);
  });
  let eventRow: { name: string | null; pin: string | null } | null = null;
  if (needsArtwork) {
    const { data } = await supabase
      .from("events")
      .select("name, pin")
      .eq("id", eventId)
      .single();
    eventRow = (data as { name: string | null; pin: string | null } | null) ?? null;
    if (!eventRow?.pin) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 422 }
      );
    }
  }
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || req.nextUrl.origin;

  // Fichiers de production FIGÉS : copie immédiate hors du coffre (le coffre
  // expire en 24 h / 7 jours, pas la commande) — ou visuel composé par l'app
  // pour la papeterie du jour J, qui n'a pas de photo source.
  const queued: QueuedPiece[] = [];
  try {
    for (const [i, piece] of piecesInput.entries()) {
      const variant = getVariant(String(piece.productId), String(piece.formatId));
      if (!variant) continue; // déjà validé plus haut
      const sourcePath = clean(piece.sourcePath, 400);
      const frozen = sourcePath
        ? await freezeSourceFile(supabase, sourcePath, orderRef, i)
        : await storeGeneratedArtwork(
            supabase,
            await renderGeneratedArtwork(variant.format, {
              joinUrl: `${origin}/join?pin=${eventRow!.pin}`,
              title: eventRow!.name?.trim() || "Notre événement",
              subtitle: clean(piece.label, 80),
              callToAction: defaultCallToAction(variant.product.id),
              pin: eventRow!.pin,
            }),
            orderRef,
            i
          );
      queued.push({
        event_id: eventId,
        order_ref: orderRef,
        customer_name: customerName,
        customer_email: customerEmail,
        shipping_address: shippingAddress,
        product: variant.product.id,
        format: variant.format.id,
        material: variant.product.material,
        price_cents: variant.format.priceCents,
        source_path: sourcePath,
        file_path: frozen.filePath,
        thumb_path: frozen.thumbPath,
        due_at: dueAt,
        // Dimensions mesurées côté serveur (fiables pour 100 % des pièces) ;
        // repli sur celles transmises par le client si sharp a échoué.
        px_width:
          frozen.pxWidth ?? (typeof piece.pxWidth === "number" ? piece.pxWidth : null),
        px_height:
          frozen.pxHeight ?? (typeof piece.pxHeight === "number" ? piece.pxHeight : null),
        notes,
      });
    }
    await enqueuePieces(queued);
  } catch (e) {
    console.error("[print] mise en file échouée", e);
    return NextResponse.json(
      { success: false, error: "ENQUEUE_FAILED", message: (e as Error).message },
      { status: 500 }
    );
  }

  // Construction des lots APRÈS la réponse (pattern Renka after()) — le
  // client ne voit jamais l'attente ; le cron rattrape le reste.
  after(async () => {
    try {
      // Voie express d'abord : une pièce datée ne doit jamais attendre le
      // seuil de lot. Elle part dès la commande.
      if (dueAt) {
        for (let i = 0; i < 3; i++) {
          const built = await maybeBuildBatch({ express: true });
          if (!built) break;
        }
      }
      for (let i = 0; i < 3; i++) {
        const built = await maybeBuildBatch();
        if (!built) break;
      }
    } catch (e) {
      console.error("[print] construction de lot post-commande échouée", e);
    }
  });

  return NextResponse.json({
    success: true,
    orderRef,
    pieceCount: queued.length,
    totalCents,
    express: Boolean(dueAt),
  });
}
