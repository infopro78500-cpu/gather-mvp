import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabaseClient";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type LikeRow = {
  photo_id: string;
  voter_id: string;
};

type ContestStateResponse = {
  contestEnabled: boolean;
  contestEndsAt: string | null;
  isVotingClosed: boolean;
  likesByPhoto: Record<string, { count: number; likedByMe: boolean }>;
  leaderboard: Array<{ photoId: string; count: number }>;
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.error("[Supabase] Client not available for contest state route.");
    return NextResponse.json(
      { error: "SUPABASE_NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  const { eventId } = (await context.params) as { eventId: string };

  if (!UUID_REGEX.test(eventId)) {
    return NextResponse.json(
      { error: "INVALID_EVENT_ID" },
      { status: 400 }
    );
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, contest_enabled, contest_ends_at")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    console.error("Supabase contest state error:", eventError);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  if (!event) {
    return NextResponse.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  const contestEnabled = Boolean(event.contest_enabled);
  const contestEndsAt = event.contest_ends_at ?? null;
  const isVotingClosed =
    contestEndsAt !== null && new Date(contestEndsAt).getTime() <= Date.now();

  if (!contestEnabled) {
    const payload: ContestStateResponse = {
      contestEnabled: false,
      contestEndsAt,
      isVotingClosed,
      likesByPhoto: {},
      leaderboard: [],
    };

    return NextResponse.json(payload);
  }

  const url = new URL(req.url);
  const voterId = url.searchParams.get("voterId")?.trim() ?? "";

  const { data: likes, error: likesError } = await supabase
    .from("photo_likes")
    .select("photo_id, voter_id")
    .eq("event_id", eventId);

  if (likesError) {
    console.error("Supabase photo_likes error:", likesError);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  const likesByPhoto: ContestStateResponse["likesByPhoto"] = {};

  (likes as LikeRow[] | null)?.forEach((like) => {
    const key = like.photo_id;
    if (!likesByPhoto[key]) {
      likesByPhoto[key] = { count: 0, likedByMe: false };
    }
    likesByPhoto[key].count += 1;
    if (voterId && like.voter_id === voterId) {
      likesByPhoto[key].likedByMe = true;
    }
  });

  const leaderboard = Object.entries(likesByPhoto)
    .map(([photoId, value]) => ({ photoId, count: value.count }))
    .sort((a, b) => b.count - a.count);

  const payload: ContestStateResponse = {
    contestEnabled,
    contestEndsAt,
    isVotingClosed,
    likesByPhoto,
    leaderboard,
  };

  return NextResponse.json(payload);
}
