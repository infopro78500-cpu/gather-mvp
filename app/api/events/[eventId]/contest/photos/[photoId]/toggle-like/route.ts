import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabaseClient";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ToggleResponse = {
  liked: boolean;
  likesCount: number;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ eventId: string; photoId: string }> }
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.error("[Supabase] Client not available for toggle-like route.");
    return NextResponse.json(
      { error: "SUPABASE_NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  const { eventId, photoId } = (await context.params) as {
    eventId: string;
    photoId: string;
  };

  if (!UUID_REGEX.test(eventId) || !UUID_REGEX.test(photoId)) {
    return NextResponse.json(
      { error: "INVALID_ID" },
      { status: 400 }
    );
  }

  let voterId = "";
  try {
    const body = await req.json();
    if (typeof body?.voterId === "string") {
      voterId = body.voterId.trim();
    }
  } catch (error) {
    return NextResponse.json(
      { error: "INVALID_BODY", message: (error as Error).message },
      { status: 400 }
    );
  }

  if (!voterId) {
    return NextResponse.json({ error: "MISSING_VOTER" }, { status: 400 });
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("contest_enabled, contest_ends_at")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    console.error("Supabase contest event error:", eventError);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  if (!event) {
    return NextResponse.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  if (!event.contest_enabled) {
    return NextResponse.json({ error: "CONTEST_DISABLED" }, { status: 403 });
  }

  if (event.contest_ends_at) {
    const endsAtMs = new Date(event.contest_ends_at).getTime();
    if (Number.isFinite(endsAtMs) && endsAtMs <= Date.now()) {
      return NextResponse.json({ error: "VOTING_CLOSED" }, { status: 403 });
    }
  }

  let liked = true;

  const { error: insertError } = await supabase.from("photo_likes").insert({
    event_id: eventId,
    photo_id: photoId,
    voter_id: voterId,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      liked = false;
      const { error: deleteError } = await supabase
        .from("photo_likes")
        .delete()
        .eq("event_id", eventId)
        .eq("photo_id", photoId)
        .eq("voter_id", voterId);

      if (deleteError) {
        console.error("Supabase delete like error:", deleteError);
        return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
      }
    } else {
      const status = insertError.code === "42501" ? 403 : 500;
      console.error("Supabase insert like error:", insertError);
      return NextResponse.json({ error: "DB_ERROR" }, { status });
    }
  }

  const { count, error: countError } = await supabase
    .from("photo_likes")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("photo_id", photoId);

  if (countError) {
    console.error("Supabase count like error:", countError);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  const payload: ToggleResponse = {
    liked,
    likesCount: count ?? 0,
  };

  return NextResponse.json(payload);
}
