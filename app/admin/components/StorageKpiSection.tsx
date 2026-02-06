import { getStorageGlobalKpis, getStorageKpisByEvent } from "@/lib/storageKpis";
import { getSupabaseClient } from "@/lib/supabaseClient";

import StorageKpiTable from "./StorageKpiTable";

const numberFormatter = new Intl.NumberFormat("fr-FR");
const mbFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatCount = (value: number | null | undefined) =>
  typeof value === "number" ? numberFormatter.format(value) : "—";

const formatMb = (value: number | null | undefined) =>
  typeof value === "number" ? mbFormatter.format(value) : "—";

const formatPercent = (value: number | null | undefined) =>
  typeof value === "number" ? percentFormatter.format(value) : "—";

export function StorageKpiSectionSkeleton() {
  return (
    <section className="space-y-3">
      <div className="h-6 w-40 rounded-full bg-slate-800/70" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`storage-kpi-skeleton-${index}`}
            className="h-24 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse"
          />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse" />
    </section>
  );
}

export default async function StorageKpiSection() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">KPI storage</h2>
        <div className="rounded-2xl border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-200">
          Impossible de charger les KPI storage (configuration Supabase manquante).
        </div>
      </section>
    );
  }

  const [{ data: globalKpis, error: globalError }, { data: eventKpis, error: eventsError }] =
    await Promise.all([getStorageGlobalKpis(supabase), getStorageKpisByEvent(supabase)]);

  const hasError = Boolean(globalError || eventsError);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">KPI storage</h2>

      {hasError && (
        <div className="rounded-2xl border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-200">
          Erreur lors du chargement des KPI storage. Les données peuvent être incomplètes.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Fichiers stockés (total)
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatCount(globalKpis?.total_files)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Volume total (MB)
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatMb(globalKpis?.total_mb)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Volume hors events (MB)
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatMb(globalKpis?.total_mb_outside_events)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Part hors events (%)
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatPercent(globalKpis?.share_outside_events)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold">Storage par event</h3>
        <StorageKpiTable rows={eventKpis} />
      </div>
    </section>
  );
}
