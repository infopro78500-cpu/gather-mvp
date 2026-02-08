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

const toDateOnlyString = (value: Date) => value.toISOString().slice(0, 10);

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
  const supabase = getAdminClient();
  if (!supabase) {
    return { data: [], error: "Supabase admin client unavailable." };
  }

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
