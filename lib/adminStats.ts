import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminContestStats = {
  eventsTotal: number;
  eventsContestEnabled: number;
  eventsWithVotes: number;
  likesTotal: number;
};

type AdminContestStatsResult = {
  data: AdminContestStats | null;
  error: string | null;
};

type PhotoLikeRow = {
  event_id: string | null;
};

export const getAdminContestStats = async (
  supabase: SupabaseClient
): Promise<AdminContestStatsResult> => {
  const { count: eventsTotal, error: eventsTotalError } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true });

  if (eventsTotalError) {
    return { data: null, error: eventsTotalError.message };
  }

  const { count: eventsContestEnabled, error: contestEnabledError } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .not("contest_enabled_at", "is", null);

  if (contestEnabledError) {
    return { data: null, error: contestEnabledError.message };
  }

  const { count: likesTotal, error: likesTotalError } = await supabase
    .from("photo_likes")
    .select("id, events!inner(id)", { count: "exact", head: true })
    .not("events.contest_enabled_at", "is", null);

  if (likesTotalError) {
    return { data: null, error: likesTotalError.message };
  }

  const { data: likedEvents, error: likedEventsError } = await supabase
    .from("photo_likes")
    .select("event_id, events!inner(contest_enabled_at)")
    .not("events.contest_enabled_at", "is", null);

  if (likedEventsError) {
    return { data: null, error: likedEventsError.message };
  }

  const eventsWithVotes = new Set(
    (likedEvents as PhotoLikeRow[] | null)?.map((row) => row.event_id).filter(Boolean)
  ).size;

  return {
    data: {
      eventsTotal: eventsTotal ?? 0,
      eventsContestEnabled: eventsContestEnabled ?? 0,
      eventsWithVotes,
      likesTotal: likesTotal ?? 0,
    },
    error: null,
  };
};
