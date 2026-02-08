import type { SupabaseClient } from "@supabase/supabase-js";

export type ProductGlobalKpis = {
  total_events_all_time: number | null;
  total_photos_all_time: number | null;
  total_members_all_time: number | null;
  total_votes_all_time: number | null;
  total_contest_events_all_time: number | null;
  photos_last_30d: number | null;
  events_last_30d: number | null;
  members_last_30d: number | null;
  votes_last_30d: number | null;
  contest_events_last_30d: number | null;
  contest_votes_last_30d: number | null;
  non_contest_events_last_30d: number | null;
  non_contest_votes_last_30d: number | null;
};

export type ProductTimeseriesDaily = {
  day: string;
  events_created: number | null;
  members_joined: number | null;
  photos_uploaded: number | null;
  votes_cast: number | null;
  contest_enabled_events: number | null;
};

export type ProductEventKpi = {
  event_id: string;
  event_name: string | null;
  created_at: string;
  is_closed: boolean | null;
  contest_enabled: boolean | null;
  contest_enabled_at: string | null;
  members_count: number | null;
  photos_count: number | null;
  votes_count: number | null;
  last_photo_at: string | null;
  photos_per_member: number | null;
  engagement_status: string | null;
};

export type VercelWebMetricDaily = {
  day: string;
  visitors: number | null;
  pageviews: number | null;
  bounce_rate: number | null;
  updated_at: string | null;
};

type ProductGlobalKpisResult = {
  data: ProductGlobalKpis | null;
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

const toDateOnlyString = (value: Date) => value.toISOString().slice(0, 10);

export const getProductGlobalKpis = async (
  supabase: SupabaseClient
): Promise<ProductGlobalKpisResult> => {
  const { data, error } = await supabase
    .from("kpi_product_global")
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data ?? null) as ProductGlobalKpis | null, error: null };
};

export const getProductTimeseriesDaily = async (
  supabase: SupabaseClient,
  rangeDays = 90
): Promise<ProductTimeseriesResult> => {
  const start = new Date();
  start.setDate(start.getDate() - Math.max(rangeDays - 1, 0));

  const { data, error } = await supabase
    .from("kpi_product_timeseries_daily")
    .select("*")
    .gte("day", toDateOnlyString(start))
    .order("day", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as ProductTimeseriesDaily[], error: null };
};

export const getProductEventKpis = async (
  supabase: SupabaseClient,
  options: { contestOnly?: boolean } = {}
): Promise<ProductEventKpisResult> => {
  let query = supabase.from("kpi_product_events").select("*");

  if (options.contestOnly === true) {
    query = query.eq("contest_enabled", true);
  }

  if (options.contestOnly === false) {
    query = query.eq("contest_enabled", false);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as ProductEventKpi[], error: null };
};

export const getVercelWebMetricsDaily = async (
  supabase: SupabaseClient,
  rangeDays = 14
): Promise<VercelWebMetricsResult> => {
  const start = new Date();
  start.setDate(start.getDate() - Math.max(rangeDays - 1, 0));

  const { data, error } = await supabase
    .from("vercel_web_metrics_daily")
    .select("*")
    .gte("day", toDateOnlyString(start))
    .order("day", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as VercelWebMetricDaily[], error: null };
};
