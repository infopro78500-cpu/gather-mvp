"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import type {
  ProductEventKpi,
  ProductGlobalKpis,
  ProductTimeseriesDaily,
  VercelEventVisibilityRow,
  VercelWebMetricDaily,
} from "@/app/lib/analyticsProduct";
import type { StorageEventKpi, StorageGlobalKpis } from "@/lib/storageKpis";

import StorageKpiTable from "./StorageKpiTable";

type ContestFilter = "all" | "contest" | "non_contest";

type SortKey =
  | "event_name"
  | "photos_count"
  | "members_count"
  | "votes_count"
  | "last_photo_at"
  | "photos_per_member";

type SortDirection = "asc" | "desc";

type SortState = {
  key: SortKey;
  direction: SortDirection;
};

type ProductKpiDashboardProps = {
  globalKpis: ProductGlobalKpis[];
  events: ProductEventKpi[];
  timeseries: ProductTimeseriesDaily[];
  vercelMetrics: VercelWebMetricDaily[];
  vercelEventVisibility: Record<"30d" | "90d", VercelEventVisibilityRow[]>;
  vercelEventVisibilityErrors: Record<"30d" | "90d", string | null>;
  storageGlobalKpis: StorageGlobalKpis | null;
  storageEvents: StorageEventKpi[];
  storageError: string | null;
};

type CollapsibleSectionProps = {
  title: string;
  description?: string;
  initiallyOpen?: boolean;
  collapsible?: boolean;
  actions?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
};

type StorageSectionProps = {
  storageGlobalKpis: StorageGlobalKpis | null;
  storageEvents: StorageEventKpi[];
  storageError: string | null;
};

const numberFormatter = new Intl.NumberFormat("fr-FR");
const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const mbFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatCount = (value: number | null | undefined) =>
  typeof value === "number" ? numberFormatter.format(value) : "—";

const formatPercent = (value: number | null | undefined) =>
  typeof value === "number" ? percentFormatter.format(value) : "—";

const formatMb = (value: number | null | undefined) =>
  typeof value === "number" ? mbFormatter.format(value) : "—";

const formatDate = (value: string | null | undefined, withTime = true) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });
};

const compareNullable = (a: unknown, b: unknown) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, "fr-FR", { sensitivity: "base" });
  }
  return 0;
};

const getSortValue = (row: ProductEventKpi, key: SortKey) => {
  switch (key) {
    case "event_name":
      return row.event_name ?? "";
    case "photos_count":
      return row.photos;
    case "members_count":
      return row.members;
    case "votes_count":
      return row.votes;
    case "last_photo_at":
      return row.last_photo_at;
    case "photos_per_member":
      return row.photos_per_member;
    default:
      return null;
  }
};

const getEventLastActivity = (event: ProductEventKpi) => {
  const lastPhotoTime = event.last_photo_at
    ? new Date(event.last_photo_at).getTime()
    : null;
  if (lastPhotoTime != null && !Number.isNaN(lastPhotoTime)) {
    return lastPhotoTime;
  }
  const createdTime = event.created_at ? new Date(event.created_at).getTime() : null;
  return createdTime != null && !Number.isNaN(createdTime) ? createdTime : null;
};

const compareEventLastActivityDesc = (a: ProductEventKpi, b: ProductEventKpi) => {
  const activityA = getEventLastActivity(a);
  const activityB = getEventLastActivity(b);
  if (activityA == null && activityB == null) return 0;
  if (activityA == null) return 1;
  if (activityB == null) return -1;
  return activityB - activityA;
};

const compareRows = (a: ProductEventKpi, b: ProductEventKpi, sort: SortState) => {
  if (sort.key === "last_photo_at") {
    const dateA = getEventLastActivity(a);
    const dateB = getEventLastActivity(b);
    if (dateA == null && dateB == null) return 0;
    if (dateA == null) return 1;
    if (dateB == null) return -1;
    return sort.direction === "asc" ? dateA - dateB : dateB - dateA;
  }
  const valueA = getSortValue(a, sort.key);
  const valueB = getSortValue(b, sort.key);
  const comparison = compareNullable(valueA, valueB);

  return sort.direction === "asc" ? comparison : comparison * -1;
};

const getSortLabel = (sort: SortState, key: SortKey) => {
  if (sort.key !== key) return "";
  return sort.direction === "asc" ? "▲" : "▼";
};

const getContestFilterLabel = (filter: ContestFilter) => {
  switch (filter) {
    case "contest":
      return "Concours";
    case "non_contest":
      return "Hors concours";
    default:
      return "Tous";
  }
};

const getRangeLabel = (value: number) => `${value} jours`;

const hasValue = (value: number | null | undefined) => (value ?? 0) > 0;

const getVisibilityStatus = (visits: number) => {
  if (visits === 0) return "Jamais consulté";
  if (visits < 5) return "Peu consulté";
  return "Consulté";
};

const isActiveDay = (entry: ProductTimeseriesDaily) =>
  [
    entry.events,
    entry.members,
    entry.photos,
    entry.votes,
    entry.contests_enabled,
  ].some(hasValue);

const hasActivityEvent = (event: ProductEventKpi) =>
  [event.photos, event.members, event.votes].some(hasValue);

const getDefaultSort = (): SortState => ({
  key: "last_photo_at",
  direction: "desc",
});

function CollapsibleSection({
  title,
  description,
  initiallyOpen = false,
  collapsible = true,
  actions,
  badge,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const isExpanded = collapsible ? isOpen : true;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setIsOpen((current) => !current)}
              className="flex items-center gap-2 text-left"
              aria-expanded={isExpanded}
            >
              <span className="text-base font-semibold">{title}</span>
              {badge && (
                <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[11px] text-slate-200">
                  {badge}
                </span>
              )}
              <span className="text-xs text-slate-400">{isExpanded ? "—" : "+"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{title}</h3>
              {badge && (
                <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[11px] text-slate-200">
                  {badge}
                </span>
              )}
            </div>
          )}
          {description && <span className="text-xs text-slate-500">{description}</span>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {isExpanded && <div className="space-y-4">{children}</div>}
    </section>
  );
}

function StorageSection({
  storageGlobalKpis,
  storageEvents,
  storageError,
}: StorageSectionProps) {
  const [showAllStorageRows, setShowAllStorageRows] = useState(false);
  const storageWarning = (storageGlobalKpis?.share_outside_events ?? 0) > 0.5;
  const storageBadge =
    typeof storageGlobalKpis?.total_files === "number"
      ? `${formatCount(storageGlobalKpis.total_files)} fichiers`
      : "—";

  return (
    <CollapsibleSection
      title="Stockage"
      description="Répartition du volume et points d’attention"
      initiallyOpen={false}
      badge={storageBadge}
    >
      {storageError && (
        <div className="rounded-2xl border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-200">
          {storageError}
        </div>
      )}

      {storageWarning && (
        <div className="rounded-2xl border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-200">
          Plus de 50% du stockage est actuellement en dehors des événements.
          Priorisez une action de nettoyage ou de rattachement.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Fichiers stockés (total)
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatCount(storageGlobalKpis?.total_files)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Volume total (MB)
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatMb(storageGlobalKpis?.total_mb)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Volume hors événements (MB)
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatMb(storageGlobalKpis?.total_mb_outside_events)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Part hors événements (%)
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatPercent(storageGlobalKpis?.share_outside_events)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-200">
            Stockage par événement
          </h4>
          {storageEvents.length > 10 && (
            <button
              type="button"
              onClick={() => setShowAllStorageRows((current) => !current)}
              className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-500/60"
            >
              {showAllStorageRows ? "Limiter à 10 lignes" : "Voir plus"}
            </button>
          )}
        </div>
        <StorageKpiTable
          rows={storageEvents}
          maxRows={showAllStorageRows ? undefined : 10}
        />
      </div>
    </CollapsibleSection>
  );
}

export default function ProductKpiDashboard({
  globalKpis,
  events,
  timeseries,
  vercelMetrics,
  vercelEventVisibility,
  vercelEventVisibilityErrors,
  storageGlobalKpis,
  storageEvents,
  storageError,
}: ProductKpiDashboardProps) {
  const [contestFilter, setContestFilter] = useState<ContestFilter>("all");
  const [rangeDays, setRangeDays] = useState<30 | 90>(30);
  const [sort, setSort] = useState<SortState>(getDefaultSort);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllEventRows, setShowAllEventRows] = useState(false);
  const [showZeroDays, setShowZeroDays] = useState(false);
  const [showMoreDays, setShowMoreDays] = useState(false);
  const [showAllVercelDays, setShowAllVercelDays] = useState(false);
  const [showDataQualityDetails, setShowDataQualityDetails] = useState(false);

  const filteredEvents = useMemo(() => {
    if (contestFilter === "contest") {
      return events.filter((event) => event.contest_enabled);
    }
    if (contestFilter === "non_contest") {
      return events.filter((event) => !event.contest_enabled);
    }
    return events;
  }, [events, contestFilter]);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => compareRows(a, b, sort));
  }, [filteredEvents, sort]);

  const activeEvents = useMemo(() => {
    return [...filteredEvents]
      .filter((event) => hasActivityEvent(event))
      .sort(compareEventLastActivityDesc);
  }, [filteredEvents]);

  const inactiveEventsCount = sortedEvents.length - activeEvents.length;

  const visibleEvents = showAllEvents ? sortedEvents : activeEvents;
  const limitedEvents = showAllEventRows ? visibleEvents : visibleEvents.slice(0, 10);

  const filteredTimeseries = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - (rangeDays - 1));
    const startDate = start.toISOString().slice(0, 10);
    return timeseries.filter((entry) => entry.day >= startDate);
  }, [rangeDays, timeseries]);

  const activeTimeseries = useMemo(
    () => filteredTimeseries.filter((entry) => isActiveDay(entry)),
    [filteredTimeseries]
  );

  const visibleTimeseries = showZeroDays ? filteredTimeseries : activeTimeseries;
  const maxTrendRows = showMoreDays ? 30 : 14;
  const limitedTimeseries = visibleTimeseries.slice(-maxTrendRows);

  const filteredVercelMetrics = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - (rangeDays - 1));
    const startDate = start.toISOString().slice(0, 10);
    return vercelMetrics.filter((entry) => entry.day >= startDate);
  }, [rangeDays, vercelMetrics]);

  const sortedVercelMetrics = useMemo(() => {
    return [...filteredVercelMetrics].sort((a, b) => b.day.localeCompare(a.day));
  }, [filteredVercelMetrics]);

  const limitedVercelMetrics = showAllVercelDays
    ? sortedVercelMetrics
    : sortedVercelMetrics.slice(0, 7);

  const maxEvents = useMemo(() => {
    return visibleTimeseries.reduce((max, entry) => {
      const value = entry.events ?? 0;
      return value > max ? value : max;
    }, 0);
  }, [visibleTimeseries]);

  const selectedGlobal = useMemo(() => {
    return (
      globalKpis.find((row) => row.window === `${rangeDays}d`) ?? globalKpis[0] ?? null
    );
  }, [globalKpis, rangeDays]);

  const latestVercelMetric = sortedVercelMetrics[0];

  const selectedVisibilityKey = `${rangeDays}d` as "30d" | "90d";
  const visibilityRows = vercelEventVisibility[selectedVisibilityKey] ?? [];
  const visibilityError = vercelEventVisibilityErrors[selectedVisibilityKey] ?? null;

  const sortedVisibilityRows = useMemo(() => {
    return [...visibilityRows].sort((a, b) => b.visits - a.visits);
  }, [visibilityRows]);

  const activeDaysCount = activeTimeseries.length;

  const activitySummary = useMemo(() => {
    const eventsCount = selectedGlobal?.events ?? 0;
    const photosCount = selectedGlobal?.photos ?? 0;
    const membersCount = selectedGlobal?.members ?? 0;
    const votesCount = selectedGlobal?.votes ?? 0;

    if (
      [eventsCount, photosCount, membersCount, votesCount].every((value) => value === 0) &&
      activeDaysCount === 0
    ) {
      return `Sur les ${rangeDays} derniers jours, aucune activité n’a été enregistrée.`;
    }

    return `Sur ${rangeDays} jours : ${formatCount(
      eventsCount
    )} événements, ${formatCount(photosCount)} photos, ${formatCount(
      membersCount
    )} membres, ${formatCount(
      votesCount
    )} votes, activité sur ${activeDaysCount} jour${
      activeDaysCount > 1 ? "s" : ""
    }.`;
  }, [
    activeDaysCount,
    rangeDays,
    selectedGlobal?.events,
    selectedGlobal?.members,
    selectedGlobal?.photos,
    selectedGlobal?.votes,
  ]);

  const hasContestEvents = useMemo(
    () => events.some((event) => Boolean(event.contest_enabled)),
    [events]
  );

  const hasSupabaseKpiData = globalKpis.length > 0 && timeseries.length > 0;
  const supabaseKpiStatus = hasSupabaseKpiData ? "OK" : "partiel";
  const vercelTrafficMissing = vercelMetrics.length === 0;

  const handleSort = (key: SortKey) => {
    setSort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  return (
    <div className="space-y-6">
      <CollapsibleSection
        title="Vue d’ensemble"
        description="Synthèse sur la période sélectionnée"
        initiallyOpen
        collapsible={false}
        badge={`${rangeDays} jours`}
        actions={
          <div className="flex items-center gap-2 text-xs">
            {[30, 90].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRangeDays(value as 30 | 90)}
                className={`rounded-full border px-3 py-1 transition ${
                  rangeDays === value
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100"
                    : "border-slate-700 bg-slate-900/40 text-slate-300"
                }`}
              >
                {getRangeLabel(value)}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Événements ({rangeDays}j)
            </p>
            <p className="text-2xl font-bold text-emerald-400">
              {formatCount(selectedGlobal?.events)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Photos ({rangeDays}j)
            </p>
            <p className="text-2xl font-bold text-emerald-400">
              {formatCount(selectedGlobal?.photos)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Membres ({rangeDays}j)
            </p>
            <p className="text-2xl font-bold text-emerald-400">
              {formatCount(selectedGlobal?.members)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Votes ({rangeDays}j)
            </p>
            <p className="text-2xl font-bold text-emerald-400">
              {formatCount(selectedGlobal?.votes)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Jours actifs
            </p>
            <p className="text-2xl font-bold text-emerald-400">
              {formatCount(activeDaysCount)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
          {activitySummary}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Qualité des données
              </span>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-100">
                Supabase KPI: {supabaseKpiStatus}
              </span>
              {vercelTrafficMissing && (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                  Trafic (Vercel): indisponible
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowDataQualityDetails((current) => !current)}
              className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-xs text-slate-200 transition hover:border-emerald-500/60"
            >
              {showDataQualityDetails ? "Masquer les détails" : "Détails"}
            </button>
          </div>
          {showDataQualityDetails && (
            <div className="mt-3 space-y-2 text-xs text-slate-400">
              {!hasSupabaseKpiData && (
                <p>
                  Les indicateurs KPI Supabase semblent incomplets pour cette période.
                </p>
              )}
              {vercelTrafficMissing && (
                <p>Les métriques de trafic Vercel ne sont pas disponibles.</p>
              )}
              {storageError && <p>{storageError}</p>}
              {!storageError && hasSupabaseKpiData && !vercelTrafficMissing && (
                <p>Aucune anomalie détectée sur les sources disponibles.</p>
              )}
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Activité récente"
        description="Événements avec photos, membres ou votes"
        initiallyOpen
        badge={`${activeEvents.length} actifs`}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {(["all", "contest", "non_contest"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setContestFilter(filter);
                  setShowAllEvents(false);
                  setShowAllEventRows(false);
                }}
                className={`rounded-full border px-3 py-1 transition ${
                  contestFilter === filter
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100"
                    : "border-slate-700 bg-slate-900/40 text-slate-300"
                }`}
              >
                {getContestFilterLabel(filter)}
              </button>
            ))}
          </div>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            {showAllEvents
              ? `${sortedEvents.length} événements affichés (${inactiveEventsCount} inactifs inclus).`
              : `${activeEvents.length} événements actifs détectés sur ${sortedEvents.length}.`}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAllEvents((current) => !current);
                setShowAllEventRows(false);
              }}
              className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-slate-200 transition hover:border-emerald-500/60"
            >
              {showAllEvents
                ? "Masquer les événements inactifs"
                : "Inclure les événements inactifs"}
            </button>
            {visibleEvents.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAllEventRows((current) => !current)}
                className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-slate-200 transition hover:border-emerald-500/60"
              >
                {showAllEventRows ? "Limiter à 10 lignes" : "Afficher tous les événements"}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900">
              <tr className="text-left text-slate-400">
                <th className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => handleSort("event_name")}
                    className="flex items-center gap-2 text-left"
                  >
                    Événement{" "}
                    <span className="text-xs">{getSortLabel(sort, "event_name")}</span>
                  </button>
                </th>
                <th className="px-4 py-2">Concours</th>
                <th className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => handleSort("photos_count")}
                    className="flex items-center gap-2 text-left"
                  >
                    Photos <span className="text-xs">{getSortLabel(sort, "photos_count")}</span>
                  </button>
                </th>
                <th className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => handleSort("members_count")}
                    className="flex items-center gap-2 text-left"
                  >
                    Membres{" "}
                    <span className="text-xs">{getSortLabel(sort, "members_count")}</span>
                  </button>
                </th>
                <th className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => handleSort("votes_count")}
                    className="flex items-center gap-2 text-left"
                  >
                    Votes <span className="text-xs">{getSortLabel(sort, "votes_count")}</span>
                  </button>
                </th>
                <th className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => handleSort("last_photo_at")}
                    className="flex items-center gap-2 text-left"
                  >
                    Dernière photo{" "}
                    <span className="text-xs">{getSortLabel(sort, "last_photo_at")}</span>
                  </button>
                </th>
                <th className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => handleSort("photos_per_member")}
                    className="flex items-center gap-2 text-left"
                  >
                    Photos / membre{" "}
                    <span className="text-xs">{getSortLabel(sort, "photos_per_member")}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {limitedEvents.map((row) => (
                <tr
                  key={row.event_id}
                  className="border-t border-slate-800 text-slate-300 odd:bg-slate-950/40"
                >
                  <td className="px-4 py-2 font-medium text-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{row.event_name || "—"}</span>
                      {row.contest_enabled && (
                        <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                          Concours
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-200">
                    {row.contest_enabled ? "Oui" : "Non"}
                  </td>
                  <td className="px-4 py-2">{formatCount(row.photos)}</td>
                  <td className="px-4 py-2">{formatCount(row.members)}</td>
                  <td className="px-4 py-2">{formatCount(row.votes)}</td>
                  <td className="px-4 py-2">{formatDate(row.last_photo_at)}</td>
                  <td className="px-4 py-2">
                    {row.photos_per_member != null
                      ? row.photos_per_member.toFixed(2).replace(".", ",")
                      : "—"}
                  </td>
                </tr>
              ))}
              {limitedEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    {showAllEvents
                      ? "Aucun événement pour ce filtre."
                      : "Aucun événement actif détecté sur cette période."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!showAllEventRows && visibleEvents.length > 10 && (
          <p className="text-xs text-slate-500">
            Les 10 derniers événements sont affichés. Utilisez “Afficher tous les
            événements” pour afficher la liste complète.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Analyse & tendances"
        description="Lecture rapide de la dynamique quotidienne"
        initiallyOpen={false}
        badge={`${visibleTimeseries.length} jours`}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowZeroDays((current) => !current)}
              className={`rounded-full border px-3 py-1 transition ${
                showZeroDays
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100"
                  : "border-slate-700 bg-slate-900/40 text-slate-300"
              }`}
            >
              {showZeroDays
                ? "Masquer les jours sans activité"
                : "Inclure les jours sans activité"}
            </button>
            {visibleTimeseries.length > 14 && (
              <button
                type="button"
                onClick={() => setShowMoreDays((current) => !current)}
                className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-slate-300 transition hover:border-emerald-500/60"
              >
                {showMoreDays ? "Limiter à 14 jours" : "Voir plus"}
              </button>
            )}
          </div>
        }
      >
        {visibleTimeseries.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
            Aucun signal d’activité sur cette période. Revenez plus tard pour analyser
            les tendances.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>Tendance quotidienne (max. {maxTrendRows} jours)</span>
              {!showMoreDays && visibleTimeseries.length > 14 && (
                <span>Affichage des 14 derniers jours.</span>
              )}
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900">
                  <tr className="text-left text-slate-400">
                    <th className="px-4 py-2">Jour</th>
                    <th className="px-4 py-2">Événements</th>
                    <th className="px-4 py-2">Membres</th>
                    <th className="px-4 py-2">Photos</th>
                    <th className="px-4 py-2">Votes</th>
                    <th className="px-4 py-2">Concours activés</th>
                  </tr>
                </thead>
                <tbody>
                  {limitedTimeseries.map((entry) => {
                    const eventsValue = entry.events ?? 0;
                    const width =
                      maxEvents > 0 ? Math.round((eventsValue / maxEvents) * 100) : 0;

                    return (
                      <tr
                        key={entry.day}
                        className="border-t border-slate-800 text-slate-300 odd:bg-slate-950/40"
                      >
                        <td className="px-4 py-2 text-slate-200">
                          {formatDate(entry.day, false)}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            <span className="w-10">{formatCount(entry.events)}</span>
                            <div className="h-2 w-24 rounded-full bg-slate-800">
                              <div
                                className="h-2 rounded-full bg-emerald-400"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2">{formatCount(entry.members)}</td>
                        <td className="px-4 py-2">{formatCount(entry.photos)}</td>
                        <td className="px-4 py-2">{formatCount(entry.votes)}</td>
                        <td className="px-4 py-2">{formatCount(entry.contests_enabled)}</td>
                      </tr>
                    );
                  })}
                  {limitedTimeseries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        Aucun jour actif pour cette vue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CollapsibleSection>

      <StorageSection
        storageGlobalKpis={storageGlobalKpis}
        storageEvents={storageEvents}
        storageError={storageError}
      />

      {hasContestEvents && (
        <CollapsibleSection
          title="Concours"
          description="Zoom sur la performance des événements concours"
          initiallyOpen={false}
          badge={formatCount(selectedGlobal?.contest_events)}
        >
          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                label: `Événements concours (${rangeDays}j)`,
                value: selectedGlobal?.contest_events,
                empty: "Aucun événement concours sur la période.",
              },
              {
                label: `Photos concours (${rangeDays}j)`,
                value: selectedGlobal?.contest_photos,
                empty: "Aucune photo concours enregistrée.",
              },
              {
                label: `Membres concours (${rangeDays}j)`,
                value: selectedGlobal?.contest_members,
                empty: "Aucun membre actif côté concours.",
              },
              {
                label: "Concours activés",
                value: selectedGlobal?.contests_enabled,
                empty: "Aucun concours activé actuellement.",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {card.label}
                </p>
                {hasValue(card.value) ? (
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCount(card.value)}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">{card.empty}</p>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Outils"
        description="Actions administratives rapides"
        initiallyOpen={false}
      >
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Détection de doublons & IA
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Aucun signal IA ou détection de doublons n’est disponible dans cette vue
            pour le moment.
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Technique & infrastructure"
        description="Données avancées et signaux techniques"
        initiallyOpen={false}
        badge={sortedVercelMetrics.length > 0 ? "Vercel" : "Alerte"}
      >
        <div className="space-y-4">
          {sortedVercelMetrics.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-200">Trafic (Vercel)</h4>
                {sortedVercelMetrics.length > 7 && (
                  <button
                    type="button"
                    onClick={() => setShowAllVercelDays((current) => !current)}
                    className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-500/60"
                  >
                    {showAllVercelDays ? "Limiter à 7 jours" : "Afficher toute la période"}
                  </button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Visiteurs
                  </p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCount(latestVercelMetric?.visitors)}
                  </p>
                  <p className="text-xs text-slate-500">Dernière date</p>
                  <p className="text-xs text-slate-300">
                    {formatDate(latestVercelMetric?.day, false)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Pages vues
                  </p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCount(latestVercelMetric?.pageviews)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Taux de rebond
                  </p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatPercent(latestVercelMetric?.bounce_rate)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900">
                    <tr className="text-left text-slate-400">
                      <th className="px-4 py-2">Jour</th>
                      <th className="px-4 py-2">Visiteurs</th>
                      <th className="px-4 py-2">Pages vues</th>
                      <th className="px-4 py-2">Taux de rebond</th>
                    </tr>
                  </thead>
                  <tbody>
                    {limitedVercelMetrics.map((metric) => (
                      <tr
                        key={metric.day}
                        className="border-t border-slate-800 text-slate-300 odd:bg-slate-950/40"
                      >
                        <td className="px-4 py-2 text-slate-200">
                          {formatDate(metric.day, false)}
                        </td>
                        <td className="px-4 py-2">{formatCount(metric.visitors)}</td>
                        <td className="px-4 py-2">{formatCount(metric.pageviews)}</td>
                        <td className="px-4 py-2">{formatPercent(metric.bounce_rate)}</td>
                      </tr>
                    ))}
                    {limitedVercelMetrics.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                          Pas encore de trafic mesuré sur cette période.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-200">
              Aucun trafic Vercel disponible pour cette période. Vérifiez la
              configuration des métriques côté Vercel.
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-slate-200">
                Visibilité des événements (Trafic Vercel)
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              Basé sur les consultations des pages /events/:id
            </p>
            {visibilityError && (
              <div className="rounded-2xl border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-200">
                Trafic Vercel indisponible pour la visibilité des événements.
              </div>
            )}
            {sortedVisibilityRows.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900">
                    <tr className="text-left text-slate-400">
                      <th className="px-4 py-2">Événement</th>
                      <th className="px-4 py-2">Visites</th>
                      <th className="px-4 py-2">Dernière visite</th>
                      <th className="px-4 py-2">Visibilité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVisibilityRows.map((row) => (
                      <tr
                        key={row.event_id}
                        className="border-t border-slate-800 text-slate-300 odd:bg-slate-950/40"
                      >
                        <td className="px-4 py-2 font-medium text-slate-100">
                          {row.event_name || "—"}
                        </td>
                        <td className="px-4 py-2">{formatCount(row.visits)}</td>
                        <td className="px-4 py-2">{formatDate(row.last_visit)}</td>
                        <td className="px-4 py-2">{getVisibilityStatus(row.visits)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                Aucun événement consulté sur cette période.
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
