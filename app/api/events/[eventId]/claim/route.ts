import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { getServerUserId } from "@/lib/supabase/serverAuthClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rattache un coffre existant au compte connecté (chantier comptes hôtes, phase 2).
// Sécurité : session requise + preuve du jeton d'appareil qui a créé le coffre.
// On ne rattache que si le coffre n'est pas déjà réclamé par un AUTRE compte.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await ctx.params;

  const userId = await getServerUserId();
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "SUPABASE" }, { status: 503 });
  }

  let body: { deviceId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const deviceId =
    typeof body.deviceId === "string" ? body.deviceId.slice(0, 80) : null;

  const { data: event } = await supabase
    .from("events")
    .select("id, host_device_id, host_user_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // Idempotent : déjà rattaché à CE compte.
  if (event.host_user_id === userId) {
    return NextResponse.json({ ok: true, alreadyOwned: true });
  }
  // Déjà réclamé par un autre compte : on ne vole pas un coffre.
  if (event.host_user_id) {
    return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 409 });
  }
  // Non réclamé : il faut prouver le jeton d'appareil qui l'a créé.
  if (!deviceId || event.host_device_id !== deviceId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { error } = await supabase
    .from("events")
    .update({ host_user_id: userId })
    .eq("id", eventId);

  if (error) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
