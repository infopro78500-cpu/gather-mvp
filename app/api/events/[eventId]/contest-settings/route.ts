import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { getServerUserId } from "@/lib/supabase/serverAuthClient";
import { isEventHost } from "@/lib/hostAuth";

type ContestSettingsBody = {
  deviceId?: string;
  contestEnabled?: boolean;
  contestEndsAt?: string | null;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase n'est pas configuré." },
      { status: 503 }
    );
  }

  let body: ContestSettingsBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const deviceId = typeof body.deviceId === "string" ? body.deviceId : null;
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId requis." }, { status: 400 });
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, host_device_id, host_user_id, contest_enabled_at")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ error: "Évènement introuvable." }, { status: 404 });
  }

  const userId = await getServerUserId();
  if (!isEventHost(event, deviceId, userId)) {
    return NextResponse.json(
      { error: "Seul l'organisateur peut modifier cet évènement." },
      { status: 403 }
    );
  }

  const contestEnabled = Boolean(body.contestEnabled);
  const contestEndsAt = body.contestEndsAt ?? null;
  const shouldSetContestEnabledAt = contestEnabled && !event.contest_enabled_at;

  const updatePayload: Record<string, unknown> = {
    contest_enabled: contestEnabled,
    contest_ends_at: contestEndsAt,
  };

  if (shouldSetContestEnabledAt) {
    updatePayload.contest_enabled_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", eventId);

  if (updateError) {
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du concours." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    contest_enabled: contestEnabled,
    contest_enabled_at: updatePayload.contest_enabled_at ?? event.contest_enabled_at,
    contest_ends_at: contestEndsAt,
  });
}
