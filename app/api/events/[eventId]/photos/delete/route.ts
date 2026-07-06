import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";

const BUCKET_NAME = "event-photos";

type DeleteRequestBody = {
  deviceId?: string;
  paths?: string[];
};

function getUploaderDeviceId(filename: string): string | undefined {
  return filename.includes("__") ? filename.split("__")[0] : undefined;
}

export async function POST(
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

  let body: DeleteRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const deviceId = typeof body.deviceId === "string" ? body.deviceId : null;
  const requestedPaths = Array.isArray(body.paths)
    ? body.paths.filter((p): p is string => typeof p === "string")
    : [];

  if (!deviceId || requestedPaths.length === 0) {
    return NextResponse.json(
      { error: "deviceId et paths sont requis." },
      { status: 400 }
    );
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, host_device_id")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ error: "Évènement introuvable." }, { status: 404 });
  }

  const isHost = event.host_device_id === deviceId;
  const eventPrefix = `${eventId}/`;

  const allowedPaths = requestedPaths.filter((path) => {
    if (!path.startsWith(eventPrefix)) return false;
    const filename = path.slice(eventPrefix.length);
    if (isHost) return true;
    return getUploaderDeviceId(filename) === deviceId;
  });

  if (allowedPaths.length === 0) {
    return NextResponse.json(
      { error: "Aucune photo autorisée à être supprimée." },
      { status: 403 }
    );
  }

  const { error: removeError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(allowedPaths);

  if (removeError) {
    return NextResponse.json(
      { error: "Erreur lors de la suppression." },
      { status: 500 }
    );
  }

  return NextResponse.json({ deletedPaths: allowedPaths });
}
