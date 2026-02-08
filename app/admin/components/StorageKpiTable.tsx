"use client";

import { useMemo, useState } from "react";

import type { StorageEventKpi } from "@/lib/storageKpis";

type SortKey =
  | "event_label"
  | "total_files"
  | "total_mb"
  | "last_upload_at"
  | "event_status"
  | "orphan_files"
  | "orphan_size_mb";

type SortDirection = "asc" | "desc";

type SortState = {
  key: SortKey;
  direction: SortDirection;
};

type StorageKpiTableProps = {
  rows: StorageEventKpi[];
  maxRows?: number;
};

const numberFormatter = new Intl.NumberFormat("fr-FR");
const mbFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatCount = (value: number | null) =>
  typeof value === "number" ? numberFormatter.format(value) : "—";

const formatMb = (value: number | null) =>
  typeof value === "number" ? mbFormatter.format(value) : "—";

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatus = (value: string | null) => {
  if (!value) return "—";
  const normalized = value.toLowerCase();
  if (["closed", "inactive", "ended", "archived", "finished"].includes(normalized)) {
    return "Fermé";
  }
  if (["open", "active", "ongoing", "published", "live"].includes(normalized)) {
    return "Ouvert";
  }
  return value;
};

const getEventLabel = (row: StorageEventKpi) => {
  if (row.event_label) return row.event_label;
  if (row.event_key === "OUTSIDE_EVENTS") {
    return "Photos hors events (mobile / legacy)";
  }
  return "—";
};

const getSortValue = (row: StorageEventKpi, key: SortKey) => {
  switch (key) {
    case "event_label":
      return getEventLabel(row);
    case "total_files":
      return row.total_files;
    case "total_mb":
      return row.total_mb;
    case "last_upload_at":
      return row.last_upload_at;
    case "event_status":
      return row.event_status;
    case "orphan_files":
      return row.orphan_files;
    case "orphan_size_mb":
      return row.orphan_size_mb;
    default:
      return null;
  }
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

const compareRows = (a: StorageEventKpi, b: StorageEventKpi, sort: SortState) => {
  const valueA = getSortValue(a, sort.key);
  const valueB = getSortValue(b, sort.key);

  let comparison = 0;
  if (sort.key === "last_upload_at") {
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

export default function StorageKpiTable({ rows, maxRows }: StorageKpiTableProps) {
  const [sort, setSort] = useState<SortState>({
    key: "total_mb",
    direction: "desc",
  });

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => compareRows(a, b, sort));
  }, [rows, sort]);

  const visibleRows = useMemo(() => {
    if (!maxRows) return sortedRows;
    return sortedRows.slice(0, maxRows);
  }, [maxRows, sortedRows]);

  const handleSort = (key: SortKey) => {
    setSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "desc" };
    });
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900">
          <tr className="text-left text-slate-400">
            <th className="px-4 py-2">
              <button
                type="button"
                onClick={() => handleSort("event_label")}
                className="flex items-center gap-2 text-left"
              >
                Event <span className="text-xs">{getSortLabel(sort, "event_label")}</span>
              </button>
            </th>
            <th className="px-4 py-2">
              <button
                type="button"
                onClick={() => handleSort("total_files")}
                className="flex items-center gap-2 text-left"
              >
                Total photos <span className="text-xs">{getSortLabel(sort, "total_files")}</span>
              </button>
            </th>
            <th className="px-4 py-2">
              <button
                type="button"
                onClick={() => handleSort("total_mb")}
                className="flex items-center gap-2 text-left"
              >
                Total MB <span className="text-xs">{getSortLabel(sort, "total_mb")}</span>
              </button>
            </th>
            <th className="px-4 py-2">
              <button
                type="button"
                onClick={() => handleSort("last_upload_at")}
                className="flex items-center gap-2 text-left"
              >
                Dernier upload <span className="text-xs">{getSortLabel(sort, "last_upload_at")}</span>
              </button>
            </th>
            <th className="px-4 py-2">
              <button
                type="button"
                onClick={() => handleSort("event_status")}
                className="flex items-center gap-2 text-left"
              >
                Statut <span className="text-xs">{getSortLabel(sort, "event_status")}</span>
              </button>
            </th>
            <th className="px-4 py-2">
              <button
                type="button"
                onClick={() => handleSort("orphan_files")}
                className="flex items-center gap-2 text-left"
              >
                Photos mobiles (non rattachées){" "}
                <span className="text-xs">{getSortLabel(sort, "orphan_files")}</span>
              </button>
            </th>
            <th className="px-4 py-2">
              <button
                type="button"
                onClick={() => handleSort("orphan_size_mb")}
                className="flex items-center gap-2 text-left"
              >
                MB mobiles (non rattachés){" "}
                <span className="text-xs">{getSortLabel(sort, "orphan_size_mb")}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr
              key={row.event_key}
              className="border-t border-slate-800 text-slate-300 odd:bg-slate-950/40"
            >
              <td className="px-4 py-2 font-medium text-slate-100">
                {getEventLabel(row)}
              </td>
              <td className="px-4 py-2">{formatCount(row.total_files)}</td>
              <td className="px-4 py-2">{formatMb(row.total_mb)}</td>
              <td className="px-4 py-2">{formatDate(row.last_upload_at)}</td>
              <td className="px-4 py-2">{formatStatus(row.event_status)}</td>
              <td className="px-4 py-2">{formatCount(row.orphan_files)}</td>
              <td className="px-4 py-2">{formatMb(row.orphan_size_mb)}</td>
            </tr>
          ))}
          {visibleRows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                Aucune donnée storage pour le moment.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
