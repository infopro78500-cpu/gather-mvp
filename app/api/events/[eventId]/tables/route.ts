import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Galeries par table (option Pro) — cf. docs/strategie/idee-galeries-par-table.md.
//  GET  → état public : option active ?, nombre de tables, étiquettes des photos
//         (les invités en ont besoin pour filtrer l'album — rien de sensible).
//  POST → « tag » (invité, après upload) / « set-count » et « activate-pro »
//         (hôte uniquement, vérifié côté serveur sur host_device_id).

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

async function loadEvent(eventId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { supabase: null, event: null };
  const { data } = await supabase
    .from("events")
    .select("id, host_device_id, pro_enabled_at, table_count, expires_at")
    .eq("id", eventId)
    .maybeSingle();
  return { supabase, event: data as {
    id: string;
    host_device_id: string | null;
    pro_enabled_at: string | null;
    table_count: number | null;
    expires_at: string | null;
  } | null };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await ctx.params;
  const { supabase, event } = await loadEvent(eventId);
  if (!supabase) return NextResponse.json({ error: "SUPABASE" }, { status: 503 });
  if (!event) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const proEnabled = Boolean(event.pro_enabled_at);
  let tags: Record<string, string> = {};
  if (proEnabled) {
    const { data } = await supabase
      .from("photo_tables")
      .select("path, table_label")
      .eq("event_id", eventId)
      .limit(5000);
    tags = Object.fromEntries(
      ((data ?? []) as { path: string; table_label: string }[]).map((r) => [
        r.path,
        r.table_label,
      ])
    );
  }
  return NextResponse.json({
    proEnabled,
    tableCount: event.table_count ?? 0,
    tags,
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await ctx.params;
  const { supabase, event } = await loadEvent(eventId);
  if (!supabase) return NextResponse.json({ error: "SUPABASE" }, { status: 503 });
  if (!event) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const action = clean(body.action, 20);

  // --- Geste invité : étiqueter une photo qu'il vient de déposer.
  if (action === "tag") {
    if (!event.pro_enabled_at) {
      return NextResponse.json({ error: "PRO_REQUIRED" }, { status: 403 });
    }
    const path = clean(body.path, 400);
    const tableLabel = clean(body.tableLabel, 40);
    if (!path || !tableLabel || !path.startsWith(`${eventId}/`) || path.includes("..")) {
      return NextResponse.json({ error: "INVALID_TAG" }, { status: 422 });
    }
    const { error } = await supabase
      .from("photo_tables")
      .upsert({ path, event_id: eventId, table_label: tableLabel });
    if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // --- Gestes hôte : vérification serveur sur host_device_id.
  const deviceId = clean(body.deviceId, 80);
  if (!deviceId || event.host_device_id !== deviceId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (action === "activate-pro") {
    // Bêta : activation offerte, datée — le paiement Stripe s'insérera ici.
    if (!event.pro_enabled_at) {
      const { error } = await supabase
        .from("events")
        .update({ pro_enabled_at: new Date().toISOString() })
        .eq("id", eventId);
      if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, proEnabled: true });
  }

  if (action === "set-count") {
    if (!event.pro_enabled_at) {
      return NextResponse.json({ error: "PRO_REQUIRED" }, { status: 403 });
    }
    const raw = Number(body.tableCount);
    const tableCount = Number.isFinite(raw) ? Math.max(0, Math.min(60, Math.round(raw))) : 0;
    const { error } = await supabase
      .from("events")
      .update({ table_count: tableCount })
      .eq("id", eventId);
    if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
    return NextResponse.json({ ok: true, tableCount });
  }

  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}
