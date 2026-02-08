import ProductKpiDashboard from "@/app/admin/components/ProductKpiDashboard";
import {
  getProductEventKpis,
  getProductGlobalKpis,
  getProductTimeseriesDaily,
  getVercelWebMetricsDaily,
} from "@/app/lib/analyticsProduct";
import { getSupabaseClient } from "@/lib/supabaseClient";

export function ProductKpiSectionSkeleton() {
  return (
    <section className="space-y-3">
      <div className="h-6 w-48 rounded-full bg-slate-800/70" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`product-kpi-skeleton-${index}`}
            className="h-24 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse"
          />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse" />
    </section>
  );
}

export default async function ProductKpiSection() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">KPI produit</h2>
        <div className="rounded-2xl border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-200">
          Impossible de charger les KPI produit (configuration Supabase manquante).
        </div>
      </section>
    );
  }

  const [
    { data: globalKpis, error: globalError },
    { data: timeseries, error: timeseriesError },
    { data: eventKpis, error: eventsError },
    { data: vercelMetrics, error: vercelError },
  ] = await Promise.all([
    getProductGlobalKpis(supabase),
    getProductTimeseriesDaily(supabase, 90),
    getProductEventKpis(supabase),
    getVercelWebMetricsDaily(supabase, 14),
  ]);

  const hasError = Boolean(globalError || timeseriesError || eventsError || vercelError);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">KPI produit</h2>

      {hasError && (
        <div className="rounded-2xl border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-200">
          Erreur lors du chargement des KPI produit. Les données peuvent être incomplètes.
        </div>
      )}

      <ProductKpiDashboard
        globalKpis={globalKpis}
        events={eventKpis}
        timeseries={timeseries}
        vercelMetrics={vercelMetrics}
      />
    </section>
  );
}
