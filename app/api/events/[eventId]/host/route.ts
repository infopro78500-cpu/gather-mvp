import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// « Suis-je l'organisateur ? » — la comparaison se fait ICI, jamais dans le
// navigateur. Le jeton host_device_id ne quitte plus le serveur : le client
// envoie SON device id, on répond oui/non. Sans ça, n'importe qui pouvait
// lire le jeton d'un coffre via l'API REST et usurper l'organisateur (lire
// les mots privés, supprimer des photos, activer Pro…). Audit du 09/08.

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await ctx.params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ isHost: false, error: "SUPABASE" }, { status: 503 });
  }

  let body: { deviceId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ isHost: false }, { status: 400 });
  }
  const deviceId = typeof body.deviceId === "string" ? body.deviceId.slice(0, 80) : null;
  if (!deviceId) return NextResponse.json({ isHost: false });

  const { data } = await supabase
    .from("events")
    .select("host_device_id")
    .eq("id", eventId)
    .maybeSingle();
  const isHost = Boolean(data && data.host_device_id === deviceId);
  return NextResponse.json({ isHost });
}
