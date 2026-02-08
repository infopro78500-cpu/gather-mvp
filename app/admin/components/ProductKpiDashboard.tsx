"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import type {
  ProductEventKpi,
  ProductGlobalKpis,
  ProductTimeseriesDaily,
  VercelWebMetricDaily,
} from "@/app/lib/analyticsProduct";

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
};

type CollapsibleSectionProps = {
  title: string;
  description?: string;
  initiallyOpen?: boolean;
  collapsible?: boolean;
  actions?: ReactNode;
  children: ReactNode;
};

const numberFormatter = new Intl.NumberFormat("fr-FR");
const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatCount = (value: number | null | undefined) =>
  typeof value === "number" ? numberFormatter.format(value) : "—";

const formatPercent = (value: number | null | undefined) =>
  typeof value === "number" ? percentFormatter.format(value) : "—";

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

const compareRows = (a: ProductEventKpi, b: ProductEventKpi, sort: SortState) => {
  const valueA = getSortValue(a, sort.key);
  const valueB = getSortValue(b, sort.key);

  let comparison = 0;
  if (sort.key === "last_photo_at") {
    const dateA = valueA ? new Date(valueA as string).getTime() : null;
    const dateB = valueB ? new Date(valueB as string).getTime() : null;
    comparison = compareNullable(dateA, dateB);
  } else {
    comparison = compareNullable(valueA, valueB);
  }

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

const hasEntryActivity = (entry: ProductTimeseriesDaily) =>
  [
    entry.events,
    entry.members,
    entry.photos,
    entry.votes,
    entry.contests_enabled,
  ].some(hasValue);

const hasEventActivity = (event: ProductEventKpi) =>
  [event.photos, event.members, event.votes].some(hasValue);

function CollapsibleSection({
  title,
  description,
  initiallyOpen = false,
  collapsible = true,
  actions,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const isExpanded = collapsible ? isOpen : true;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setIsOpen((current) => !current)}
              className="flex items-center gap-2 text-left"
              aria-expanded={isExpanded}
            >
              <span className="text-base font-semibold">{title}</span>
              <span className="text-xs text-slate-400">{isExpanded ? "—" : "+"}</span>
            </button>
          ) : (
            <h3 className="text-base font-semibold">{title}</h3>
          )}
          {description && (
            <span className="text-xs text-slate-500">{description}</span>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {isExpanded && <div className="space-y-4">{children}</div>}
    </section>
  );
}

export default function ProductKpiDashboard({
  globalKpis,
  events,
  timeseries,
  vercelMetrics,
}: ProductKpiDashboardProps) {
  const [contestFilter, setContestFilter] = useState<ContestFilter>("all");
  const [rangeDays, setRangeDays] = useState<30 | 90>(30);
  const [sort, setSort] = useState<SortState>({
    key: "last_photo_at",
    direction: "desc",
  });
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showZeroDays, setShowZeroDays] = useState(false);
  const [showAllDays, setShowAllDays] = useState(false);
  const [showAllVercelDays, setShowAllVercelDays] = useState(false);

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

  const activeEvents = useMemo(
    () => sortedEvents.filter((event) => hasEventActivity(event)),
    [sortedEvents]
  );

  const inactiveEventsCount = sortedEvents.length - activeEvents.length;

  const visibleEvents = showAllEvents ? sortedEvents : activeEvents;
  const limitedEvents = showAllEvents ? visibleEvents : visibleEvents.slice(0, 10);

  const filteredTimeseries = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - (rangeDays - 1));
    const startDate = start.toISOString().slice(0, 10);
    return timeseries.filter((entry) => entry.day >= startDate);
  }, [rangeDays, timeseries]);

  const activeTimeseries = useMemo(
    () => filteredTimeseries.filter((entry) => hasEntryActivity(entry)),
    [filteredTimeseries]
  );

  const visibleTimeseries = showZeroDays ? filteredTimeseries : activeTimeseries;
  const limitedTimeseries = showAllDays
    ? visibleTimeseries
    : visibleTimeseries.slice(-10);

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
    : sortedVercelMetrics.slice(0, 10);

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

  const activityMessage = useMemo(() => {
    if (activeTimeseries.length === 0) {
      return `Aucune activité détectée sur les ${rangeDays} derniers jours.`;
    }
    return `Activité détectée sur ${activeTimeseries.length} jour${
      activeTimeseries.length > 1 ? "s" : ""
    } ces ${rangeDays} derniers jours.`;
  }, [activeTimeseries.length, rangeDays]);

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
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Events ({rangeDays}j)
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
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
          {activityMessage}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Activité récente"
        description="Events avec mouvement récent"
        initiallyOpen
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {(["all", "contest", "non_contest"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setContestFilter(filter);
                  setShowAllEvents(false);
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
              ? `${sortedEvents.length} events affichés (${inactiveEventsCount} inactifs inclus).`
              : `${activeEvents.length} events actifs détectés sur ${sortedEvents.length}.`}
          </span>
          <button
            type="button"
            onClick={() => setShowAllEvents((current) => !current)}
            className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-slate-200 transition hover:border-emerald-500/60"
          >
            {showAllEvents ? "Masquer les events inactifs" : "Afficher tous les événements"}
          </button>
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
                    Event <span className="text-xs">{getSortLabel(sort, "event_name")}</span>
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
                      ? "Aucun event pour ce filtre."
                      : "Aucun event actif détecté sur cette période."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!showAllEvents && activeEvents.length > 10 && (
          <p className="text-xs text-slate-500">
            Les 10 derniers events actifs sont affichés. Utilisez “Afficher tous les
            événements” pour voir la liste complète.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Analyse & tendances"
        description="Focus sur les jours avec activité"
        initiallyOpen={false}
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
              {showZeroDays ? "Masquer les jours à zéro" : "Afficher les jours à zéro"}
            </button>
            <button
              type="button"
              onClick={() => setShowAllDays((current) => !current)}
              className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-slate-300 transition hover:border-emerald-500/60"
            >
              {showAllDays ? "Limiter aux 10 derniers jours" : "Afficher toute la période"}
            </button>
          </div>
        }
      >
        {visibleTimeseries.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
            Aucun signal d’activité sur cette période. Revenez plus tard pour analyser
            les tendances.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900">
                <tr className="text-left text-slate-400">
                  <th className="px-4 py-2">Jour</th>
                  <th className="px-4 py-2">Events</th>
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
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Technique & infrastructure"
        description="Données avancées et signaux techniques"
        initiallyOpen={false}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Storage KPIs
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Les KPI storage complets sont disponibles dans la section dédiée du
              dashboard admin.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Concours ({rangeDays}j)
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {formatCount(selectedGlobal?.contest_events)} events ·{" "}
                {formatCount(selectedGlobal?.contest_photos)} photos ·{" "}
                {formatCount(selectedGlobal?.contest_members)} membres ·{" "}
                {formatCount(selectedGlobal?.contest_votes)} votes
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Hors concours ({rangeDays}j)
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {formatCount(selectedGlobal?.non_contest_events)} events ·{" "}
                {formatCount(selectedGlobal?.non_contest_photos)} photos ·{" "}
                {formatCount(selectedGlobal?.non_contest_members)} membres ·{" "}
                {formatCount(selectedGlobal?.non_contest_votes)} votes
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Concours activés
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-400">
                {formatCount(selectedGlobal?.contests_enabled)}
              </p>
            </div>
          </div>

          {sortedVercelMetrics.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-200">Trafic (Vercel)</h4>
                <button
                  type="button"
                  onClick={() => setShowAllVercelDays((current) => !current)}
                  className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-500/60"
                >
                  {showAllVercelDays
                    ? "Limiter aux 10 derniers jours"
                    : "Afficher toute la période"}
                </button>
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
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Détection de doublons & IA
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Aucun signal IA ou détection de doublons n’est disponible dans cette
              vue pour le moment.
            </p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
