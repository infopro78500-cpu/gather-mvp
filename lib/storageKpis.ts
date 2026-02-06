import type { SupabaseClient } from "@supabase/supabase-js";

export type StorageGlobalKpis = {
  total_files: number | null;
  total_mb: number | null;
  total_mb_outside_events: number | null;
  total_files_outside_events: number | null;
  share_outside_events: number | null;
};

export type StorageEventKpi = {
  event_key: string;
  event_label: string | null;
  total_files: number | null;
  total_mb: number | null;
  last_upload_at: string | null;
  event_status: string | null;
  orphan_files: number | null;
  orphan_size_mb: number | null;
};

type StorageGlobalKpisResult = {
  data: StorageGlobalKpis | null;
  error: string | null;
};

type StorageEventKpisResult = {
  data: StorageEventKpi[];
  error: string | null;
};

export const getStorageGlobalKpis = async (
  supabase: SupabaseClient
): Promise<StorageGlobalKpisResult> => {
  const { data, error } = await supabase
    .from("event_storage_kpi_global")
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data ?? null) as StorageGlobalKpis | null, error: null };
};

export const getStorageKpisByEvent = async (
  supabase: SupabaseClient
): Promise<StorageEventKpisResult> => {
  const { data, error } = await supabase
    .from("event_storage_kpi_events")
    .select("*")
    .order("total_mb", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as StorageEventKpi[], error: null };
};
