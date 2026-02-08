import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";

export type ProductGlobalKpis = {
  window: "30d" | "90d";
  events: number | null;
  photos: number | null;
  members: number | null;
  votes: number | null;
  contest_events: number | null;
  contest_photos: number | null;
  contest_members: number | null;
  contest_votes: number | null;
  non_contest_events: number | null;
  non_contest_photos: number | null;
  non_contest_members: number | null;
  non_contest_votes: number | null;
  contests_enabled: number | null;
};

export type ProductTimeseriesDaily = {
  day: string;
  events: number | null;
  members: number | null;
  photos: number | null;
  votes: number | null;
  contests_enabled: number | null;
  contest_events: number | null;
  contest_photos: number | null;
  contest_members: number | null;
  contest_votes: number | null;
  non_contest_events: number | null;
  non_contest_photos: number | null;
  non_contest_members: number | null;
  non_contest_votes: number | null;
};

export type ProductEventKpi = {
  event_id: string;
  event_name: string | null;
  created_at: string;
  contest_enabled: boolean | null;
  members: number | null;
  photos: number | null;
  votes: number | null;
  last_photo_at: string | null;
  photos_per_member: number | null;
};

export type VercelWebMetricDaily = {
  day: string;
  visitors: number | null;
  pageviews: number | null;
  bounce_rate: number | null;
  updated_at: string | null;
};

export type VercelEventVisibilityRow = {
  event_id: string;
  event_name: string | null;
  visits: number;
  last_visit: string | null;
};

type ProductGlobalKpisResult = {
  data: ProductGlobalKpis[] | null;
  error: string | null;
};

type ProductTimeseriesResult = {
  data: ProductTimeseriesDaily[];
  error: string | null;
};

type ProductEventKpisResult = {
  data: ProductEventKpi[];
  error: string | null;
};

type VercelWebMetricsResult = {
  data: VercelWebMetricDaily[];
  error: string | null;
};

type VercelEventVisibilityResult = {
  data: VercelEventVisibilityRow[];
  error: string | null;
};

const toDateOnlyString = (value: Date) => value.toISOString().slice(0, 10);
const toDayStartUtc = (value: Date) =>
  Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

const getAdminClient = () => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }
  return supabase;
};

export const getProductGlobalKpis = async (): Promise<ProductGlobalKpisResult> => {
  const supabase = getAdminClient();
  if (!supabase) {
    return { data: null, error: "Supabase admin client unavailable." };
  }

  const { data, error } = await supabase.from("product_kpi_global").select("*");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data ?? null) as ProductGlobalKpis[] | null, error: null };
};

export const getProductTimeseriesDaily = async (options?: {
  window?: "30d" | "90d";
}): Promise<ProductTimeseriesResult> => {
  const supabase = getAdminClient();
  if (!supabase) {
    return { data: [], error: "Supabase admin client unavailable." };
  }

  const rangeDays = options?.window === "30d" ? 30 : 90;
  const start = new Date();
  start.setDate(start.getDate() - Math.max(rangeDays - 1, 0));

  const { data, error } = await supabase
    .from("product_kpi_timeseries_daily")
    .select("*")
    .gte("day", toDateOnlyString(start))
    .order("day", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as ProductTimeseriesDaily[], error: null };
};

export const getProductEventKpis = async (options?: {
  filter?: "all" | "contest" | "non_contest";
  window?: "30d" | "90d";
}): Promise<ProductEventKpisResult> => {
  const supabase = getAdminClient();
  if (!supabase) {
    return { data: [], error: "Supabase admin client unavailable." };
  }

  const rangeDays = options?.window === "30d" ? 30 : 90;
  const start = new Date();
  start.setDate(start.getDate() - Math.max(rangeDays - 1, 0));

  let query = supabase
    .from("product_kpi_events")
    .select("*")
    .gte("created_at", start.toISOString());

  if (options?.filter === "contest") {
    query = query.eq("contest_enabled", true);
  }

  if (options?.filter === "non_contest") {
    query = query.eq("contest_enabled", false);
  }

  const { data, error } = await query.order("photos", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as ProductEventKpi[], error: null };
};

export const getVercelWebMetricsDaily = async (
  rangeDays = 14
): Promise<VercelWebMetricsResult> => {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();

  if (!token || !projectId) {
    return { data: [], error: "Vercel analytics credentials missing." };
  }

  const start = new Date();
  start.setDate(start.getDate() - Math.max(rangeDays - 1, 0));
  const end = new Date();

  const url = new URL("https://vercel.com/api/analytics");
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("from", String(toDayStartUtc(start)));
  url.searchParams.set("to", String(end.getTime()));
  url.searchParams.set("interval", "1d");
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const bodySnippet = await response.text().then((text) => text.slice(0, 200));
    console.error("Vercel analytics error", {
      status: response.status,
      body: bodySnippet,
    });

    if (response.status === 403 || response.status === 404) {
      return { data: [], error: "Vercel analytics unavailable." };
    }

    return { data: [], error: "Failed to fetch Vercel analytics." };
  }

  const payload: unknown = await response.json();

  const series = extractVercelTimeseries(payload);
  if (!series) {
    console.error("Vercel analytics: unexpected response format.", {
      keys:
        payload && typeof payload === "object"
          ? Object.keys(payload as Record<string, unknown>)
          : null,
    });
    return { data: [], error: "Vercel analytics unavailable." };
  }

  const nowIso = new Date().toISOString();
  const data = series
    .map((entry) => normalizeVercelEntry(entry, nowIso))
    .filter((entry): entry is VercelWebMetricDaily => Boolean(entry))
    .sort((a, b) => b.day.localeCompare(a.day));

  return { data, error: null };
};

const extractVercelTimeseries = (
  payload: unknown
): Array<Record<string, unknown>> | null => {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  if (typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const data = record.data;
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    if (Array.isArray(nested.timeseries)) return nested.timeseries as Array<Record<string, unknown>>;
    if (Array.isArray(nested.points)) return nested.points as Array<Record<string, unknown>>;
    if (Array.isArray(nested.series)) return nested.series as Array<Record<string, unknown>>;
    if (Array.isArray(nested.values)) return nested.values as Array<Record<string, unknown>>;
  }
  return null;
};

const normalizeDayValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    const candidate = value.slice(0, 10);
    return candidate.match(/^\d{4}-\d{2}-\d{2}$/) ? candidate : null;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return toDateOnlyString(date);
  }
  return null;
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeVercelEntry = (
  entry: Record<string, unknown>,
  updatedAt: string
): VercelWebMetricDaily | null => {
  const day =
    normalizeDayValue(entry.day) ||
    normalizeDayValue(entry.date) ||
    normalizeDayValue(entry.timestamp);

  if (!day) return null;

  const visitors =
    normalizeNumber(entry.visitors) ??
    normalizeNumber(entry.uniqueVisitors) ??
    normalizeNumber(entry.unique_visitors) ??
    normalizeNumber(entry.visitor_count);

  const pageviews =
    normalizeNumber(entry.pageviews) ??
    normalizeNumber(entry.views) ??
    normalizeNumber(entry.page_views);

  const bounceRate =
    normalizeNumber(entry.bounce_rate) ??
    normalizeNumber(entry.bounceRate) ??
    normalizeNumber(entry.bounce);

  return {
    day,
    visitors,
    pageviews,
    bounce_rate: bounceRate,
    updated_at: updatedAt,
  };
};

const normalizeDateTimeValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
};

const extractVercelPathEntries = (
  payload: unknown
): Array<Record<string, unknown>> | null => {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  if (typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const data = record.data;
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    if (Array.isArray(nested.paths)) return nested.paths as Array<Record<string, unknown>>;
    if (Array.isArray(nested.items)) return nested.items as Array<Record<string, unknown>>;
    if (Array.isArray(nested.results)) return nested.results as Array<Record<string, unknown>>;
    if (Array.isArray(nested.values)) return nested.values as Array<Record<string, unknown>>;
  }
  return null;
};

const normalizeVercelPathEntry = (
  entry: Record<string, unknown>
): { path: string; visits: number; lastVisit: string | null } | null => {
  const path =
    (typeof entry.path === "string" && entry.path) ||
    (typeof entry.pathname === "string" && entry.pathname) ||
    (typeof entry.url === "string" && entry.url) ||
    null;

  if (!path) return null;

  const visits =
    normalizeNumber(entry.visits) ??
    normalizeNumber(entry.pageviews) ??
    normalizeNumber(entry.page_views) ??
    normalizeNumber(entry.views) ??
    normalizeNumber(entry.total);

  if (visits == null) return null;

  const lastVisit =
    normalizeDateTimeValue(entry.last_visit) ??
    normalizeDateTimeValue(entry.lastVisit) ??
    normalizeDateTimeValue(entry.lastViewedAt) ??
    normalizeDateTimeValue(entry.last_viewed_at) ??
    normalizeDateTimeValue(entry.last_seen) ??
    normalizeDateTimeValue(entry.lastSeen) ??
    normalizeDateTimeValue(entry.updated_at) ??
    normalizeDateTimeValue(entry.updatedAt) ??
    normalizeDateTimeValue(entry.timestamp);

  return { path, visits, lastVisit };
};

const parseEventIdFromPath = (path: string): string | null => {
  const match = path.match(/^\/events\/([^/?#]+)\/?$/);
  return match ? match[1] : null;
};

export const getVercelEventVisibility = async (
  rangeDays = 30
): Promise<VercelEventVisibilityResult> => {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();

  if (!token || !projectId) {
    return { data: [], error: "Vercel analytics credentials missing." };
  }

  const start = new Date();
  start.setDate(start.getDate() - Math.max(rangeDays - 1, 0));
  const end = new Date();

  const url = new URL("https://vercel.com/api/analytics/paths");
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("from", String(toDayStartUtc(start)));
  url.searchParams.set("to", String(end.getTime()));
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const bodySnippet = await response.text().then((text) => text.slice(0, 200));
    console.error("Vercel analytics (paths) error", {
      status: response.status,
      body: bodySnippet,
    });

    if (response.status === 403 || response.status === 404) {
      return { data: [], error: "Vercel analytics unavailable." };
    }

    return { data: [], error: "Failed to fetch Vercel analytics." };
  }

  const payload: unknown = await response.json();
  const entries = extractVercelPathEntries(payload);
  if (!entries) {
    console.error("Vercel analytics (paths): unexpected response format.", {
      keys:
        payload && typeof payload === "object"
          ? Object.keys(payload as Record<string, unknown>)
          : null,
    });
    return { data: [], error: "Vercel analytics unavailable." };
  }

  const aggregated = new Map<
    string,
    { visits: number; lastVisit: string | null }
  >();

  for (const entry of entries) {
    const normalized = normalizeVercelPathEntry(entry);
    if (!normalized) continue;
    const eventId = parseEventIdFromPath(normalized.path);
    if (!eventId) continue;

    const current = aggregated.get(eventId) ?? { visits: 0, lastVisit: null };
    const visits = current.visits + normalized.visits;
    const lastVisit =
      normalized.lastVisit &&
      (!current.lastVisit ||
        new Date(normalized.lastVisit).getTime() > new Date(current.lastVisit).getTime())
        ? normalized.lastVisit
        : current.lastVisit;
    aggregated.set(eventId, { visits, lastVisit });
  }

  if (aggregated.size === 0) {
    return { data: [], error: null };
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return { data: [], error: "Supabase admin client unavailable." };
  }

  const eventIds = Array.from(aggregated.keys());
  const { data: eventRows, error: eventError } = await supabase
    .from("events")
    .select("id, name")
    .in("id", eventIds);

  if (eventError) {
    return { data: [], error: eventError.message };
  }

  const eventNameMap = new Map<string, string | null>(
    (eventRows ?? []).map((row) => [row.id as string, row.name as string | null])
  );

  const data: VercelEventVisibilityRow[] = eventIds
    .map((eventId) => {
      const stats = aggregated.get(eventId);
      if (!stats) return null;
      if (!eventNameMap.has(eventId)) return null;
      return {
        event_id: eventId,
        event_name: eventNameMap.get(eventId) ?? null,
        visits: stats.visits,
        last_visit: stats.lastVisit,
      };
    })
    .filter((row): row is VercelEventVisibilityRow => Boolean(row));

  return { data, error: null };
};
