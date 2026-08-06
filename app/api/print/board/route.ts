import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { materialLabel } from "@/lib/print/email";
import {
  BATCH_SIZE,
  listBatchPieces,
  listBoardPieces,
  listRecentOrders,
  markBatchPrinted,
  markOrderShipped,
  maybeBuildBatch,
  queueStatus,
  recentBatches,
  removePendingPiece,
  requeuePiece,
  signPrintFile,
} from "@/lib/print/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API du tableau de bord atelier — accès par SECRET DÉDIÉ (ATELIER_SECRET),
// volontairement distinct de CRON_SECRET : le secret du cron ne doit jamais
// transiter par un navigateur (pattern Renka).
function authorized(request: NextRequest): boolean {
  const secret = process.env.ATELIER_SECRET;
  if (!secret) return false;
  return (
    request.nextUrl.searchParams.get("cle") === secret ||
    request.headers.get("x-atelier-cle") === secret
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré." }, { status: 503 });
  }

  try {
    const [pieces, batches, orders, status] = await Promise.all([
      listBoardPieces(),
      recentBatches(10),
      listRecentOrders(14),
      queueStatus(),
    ]);

    // Liens signés à la demande (jamais stockés) : lots récents non purgés.
    const batchesWithLinks = await Promise.all(
      batches.map(async (b) => {
        const batchPieces = await listBatchPieces(b.id);
        const links = await Promise.all(
          batchPieces.map((p) =>
            p.file_path ? signPrintFile(supabase, p.file_path, 2) : Promise.resolve(null)
          )
        );
        return {
          ...b,
          materialLabel: materialLabel(b.material),
          pieces: batchPieces.map((p, i) => ({
            id: p.id,
            slot: (p.slot_index ?? i) + 1,
            order_ref: p.order_ref,
            customer_name: p.customer_name,
            product: p.product,
            format: p.format,
            link: links[i],
          })),
        };
      })
    );

    return NextResponse.json({
      batchSize: BATCH_SIZE,
      pending: status.pending,
      oldestPendingAt: status.oldestPendingAt,
      pieces: pieces.map((p) => ({
        id: p.id,
        created_at: p.created_at,
        status: p.status,
        order_ref: p.order_ref,
        customer_name: p.customer_name,
        product: p.product,
        format: p.format,
        material: p.material,
        materialLabel: materialLabel(p.material),
      })),
      batches: batchesWithLinks,
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
