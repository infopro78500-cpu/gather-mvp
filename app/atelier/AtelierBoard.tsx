"use client";

// Tableau de bord atelier Printerkut — photo-first, P0 + P1 + P2 de l'audit
// docs/audit-ux-atelier.md (palette claire actée par Nico le 06/08/2026).
//
// Règles maîtresses : chaque section répond à une question d'opérateur en
// < 5 s ; les photos se jugent sur un entourage NEUTRE CLAIR (même en thème
// sombre, les surfaces qui portent une photo restent claires) ; « sélectionner
// puis agir » ; poll léger 10 s + détail/stats à la demande ; erreurs en
// langage humain. Les règles durables sont consignées dans DESIGN.md.

import { useCallback, useEffect, useRef, useState } from "react";
import { getVariant } from "@/lib/print/catalog";

/* ---------- Types (miroir de l'API /api/print/board) ---------- */

interface QueuePieceLite {
  id: string;
  created_at: string;
  status: "pending" | "batching";
  order_ref: string;
  customer_name: string;
  product: string;
  format: string;
  material: string;
  materialLabel: string;
  thumbUrl: string | null;
  resolution: "ok" | "acceptable" | "insufficient" | null;
  pxWidth: number | null;
  pxHeight: number | null;
  requeuedFrom: string | null;
}

interface BatchLite {
  id: string;
  created_at: string;
  piece_count: number;
  material: string;
  materialLabel: string;
  emailed_at: string | null;
  printed_at: string | null;
}

interface BatchPieceDetail {
  id: string;
  slot: number;
  order_ref: string;
  customer_name: string;
  product: string;
  format: string;
  thumbUrl: string | null;
  link: string | null;
  resolution: "ok" | "acceptable" | "insufficient" | null;
  pxWidth: number | null;
  pxHeight: number | null;
  requeuedFrom: string | null;
}

interface BoardOrder {
  order_ref: string;
  customer_name: string;
  customer_email: string;
  ids: string[];
  total: number;
  inQueue: number;
  status: "en_file" | "en_lot" | "imprimee" | "expediee";
  oldest: string;
}

interface BoardData {
  batchSize: number;
  batchSizes: Record<string, number>;
  maxWaitDays: number;
  daysWindow: number;
  today: {
    toPrint: { pieces: number; lots: number };
    late: number;
    pending: { total: number; perMaterial: { material: string; label: string; count: number }[] };
    toShip: number;
  };
  pieces: QueuePieceLite[];
  batchesToDo: BatchLite[];
  batchesDone: BatchLite[];
  orders: BoardOrder[];
}

interface BoardStats {
  perDay: { date: string; count: number }[];
  batches7: { batches: number; avgSize: number | null };
}

type Selection =
  | { kind: "queue"; piece: QueuePieceLite }
  | { kind: "batch"; piece: BatchPieceDetail; batchId: string; printed: boolean };

interface PreviewModal {
  src: string;
  title: string;
  subtitle: string;
  pxWidth: number | null;
  pxHeight: number | null;
  product: string;
  format: string;
  fullResLink: string | null;
}

/* ---------- Design system (cf. DESIGN.md) ---------- */

const THEMES = {
  light: {
    "--at-bg": "#F6F6F4",
    "--at-card": "#FFFFFF",
    "--at-border": "#E2E1DC",
    "--at-border-2": "#D8D6CF",
    "--at-text": "#1A1A18",
    "--at-text-2": "#6B6A63",
    "--at-text-3": "#8A8983",
    "--at-soft": "#EFEEE9",
    "--at-accent": "#0b0f19",
    "--at-accent-2": "#232a3a",
    "--at-accent-text": "#FFFFFF",
  },
  dark: {
    "--at-bg": "#12151A",
    "--at-card": "#1B2027",
    "--at-border": "#2B323C",
    "--at-border-2": "#3A434F",
    "--at-text": "#F1F0EC",
    "--at-text-2": "#A8AFB9",
    "--at-text-3": "#7E8590",
    "--at-soft": "#242B34",
    "--at-accent": "#E9E7E2",
    "--at-accent-2": "#FFFFFF",
    "--at-accent-text": "#12151A",
  },
} as const;

// L'entourage des PHOTOS reste clair et neutre dans les deux thèmes : on juge
// une photo sur fond neutre clair, jamais sombre (audit §9.1 — règle métier).
const PHOTO_SURROUND = "#ECEBE6";

const MATERIAL_STYLE: Record<string, { dot: string; bg: string; text: string }> = {
  "papier-photo": { dot: "#C9A874", bg: "#FBF3E4", text: "#6B4F1D" },
  canvas: { dot: "#B9673F", bg: "#FBEAE1", text: "#7C3A1D" },
  forex: { dot: "#7C6FB0", bg: "#EFEBFA", text: "#463A78" },
  dibond: { dot: "#6B7A8F", bg: "#EAEDF1", text: "#3C4857" },
  plexi: { dot: "#3FA6B0", bg: "#E3F5F6", text: "#1C5F66" },
};
const materialStyle = (m: string) =>
  MATERIAL_STYLE[m] ?? { dot: "#8A8983", bg: "#EFEEE9", text: "#4A4944" };

const RESOLUTION_STYLE: Record<string, { color: string; label: string }> = {
  ok: { color: "#0F9D8A", label: "Résolution optimale" },
  acceptable: { color: "#B7791F", label: "Résolution correcte (déco vue à distance)" },
  insufficient: { color: "#DC2626", label: "Résolution insuffisante" },
};

/* ---------- Icônes (traits fins, monochromes) ---------- */

const ic = "inline-block h-[1.05em] w-[1.05em] align-[-0.15em]";
const IconPrint = () => (
  <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M7 8V4h10v4M7 16h10v5H7zM5 16H4a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-1" />
  </svg>
);
const IconBox = () => (
  <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8" />
  </svg>
);
const IconCheck = () => (
  <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);
const IconRedo = () => (
  <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 11a8 8 0 0 1 14-4.6L21 9M21 4v5h-5M20 13a8 8 0 0 1-14 4.6L3 15M3 20v-5h5" />
  </svg>
);
const IconBolt = () => (
  <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
  </svg>
);
const IconSearch = () => (
  <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </svg>
);
const IconSun = () => (
  <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2" />
  </svg>
);
const IconMoon = () => (
  <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </svg>
);
const IconImageOff = () => (
  <svg className="h-6 w-6 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 16l5-5 4 4M14 13l2-2 5 5" />
    <circle cx="9" cy="9" r="1.4" />
  </svg>
);

/* ---------- Helpers ---------- */

function ageLabel(iso: string | null): string {
  if (!iso) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

/** Aujourd'hui / Hier / Cette semaine / Plus ancien (audit §4.3). */
function dayGroup(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return "Cette semaine";
  return "Plus ancien";
}

function groupByDay<T>(items: T[], getIso: (t: T) => string): [string, T[]][] {
  const order = ["Aujourd'hui", "Hier", "Cette semaine", "Plus ancien"];
  const map = new Map<string, T[]>();
  for (const item of items) {
    const g = dayGroup(getIso(item));
    const arr = map.get(g);
    if (arr) arr.push(item);
    else map.set(g, [item]);
  }
  return order.filter((o) => map.has(o)).map((o) => [o, map.get(o)!]);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Bandes de cadrage : fraction coupée de chaque côté pour un format donné. */
function cropBands(
  pxWidth: number,
  pxHeight: number,
  product: string,
  format: string
): { horizontal: number; vertical: number; label: string } | null {
  const variant = getVariant(product, format, { includePending: true });
  if (!variant || !pxWidth || !pxHeight) return null;
  const { widthCm, heightCm } = variant.format;
  const imgRatio = pxWidth / pxHeight;
  // Le format s'imprime dans le sens de la photo (portrait ou paysage).
  const target = imgRatio >= 1 ? Math.max(widthCm, heightCm) / Math.min(widthCm, heightCm) : Math.min(widthCm, heightCm) / Math.max(widthCm, heightCm);
  if (Math.abs(imgRatio - target) < 0.01) return { horizontal: 0, vertical: 0, label: "" };
  if (imgRatio > target) {
    // Image plus large que le format → les côtés seront coupés.
    const kept = target / imgRatio;
    return { horizontal: (1 - kept) / 2, vertical: 0, label: "les bords gauche et droit seront coupés" };
  }
  const kept = imgRatio / target;
  return { horizontal: 0, vertical: (1 - kept) / 2, label: "le haut et le bas seront coupés" };
}

function MaterialChip({ material, label }: { material: string; label: string }) {
  const style = materialStyle(material);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: style.dot }} />
      {label}
    </span>
  );
}

function ResolutionDot({ resolution }: { resolution: QueuePieceLite["resolution"] }) {
  if (!resolution) return null;
  const r = RESOLUTION_STYLE[resolution];
  return (
    <span
      title={r.label}
      className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white"
      style={{ backgroundColor: r.color }}
    />
  );
}

function PieceTile({
  thumbUrl,
  caption,
  badge,
  slot,
  requeued,
  resolution,
  selected,
  dimmed,
  onClick,
}: {
  thumbUrl: string | null;
  caption: string;
  badge: string;
  slot?: number;
  requeued: boolean;
  resolution: QueuePieceLite["resolution"];
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-[104px] shrink-0 text-left focus:outline-none ${dimmed ? "opacity-25" : ""}`}
    >
      <span
        className={`relative block aspect-square overflow-hidden rounded-lg border ${
          selected
            ? "border-[var(--at-accent)] ring-2 ring-[var(--at-accent)]"
            : "border-[var(--at-border)] group-hover:border-[var(--at-border-2)]"
        }`}
        style={{ backgroundColor: PHOTO_SURROUND }}
      >
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt={caption} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] text-[#6B6A63]">
            <IconImageOff />
            aperçu indisponible
          </span>
        )}
        <ResolutionDot resolution={resolution} />
        {slot !== undefined && (
          <span className="absolute left-1 top-1 rounded bg-white/90 px-1.5 text-[12px] font-semibold tabular-nums text-[#1A1A18]">
            {slot}
          </span>
        )}
        <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 text-[11px] font-medium text-[#1A1A18]">
          {badge}
        </span>
        {requeued && (
          <span
            className="absolute bottom-1 right-1 rounded bg-[#0b0f19]/85 px-1.5 text-[11px] font-medium text-white"
            title="Pièce remise en file (retirage)"
          >
            <IconRedo /> retirage
          </span>
        )}
      </span>
      <span className="mt-1 block truncate text-[12px] text-[var(--at-text-2)]">{caption}</span>
    </button>
  );
}

/* ---------- Le composant principal ---------- */

export default function AtelierBoard({ cle }: { cle: string }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [stats, setStats] = useState<BoardStats | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [errorKind, setErrorKind] = useState<"network" | "auth" | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selection, setSelectionRaw] = useState<Selection | null>(null);
  const [modal, setModal] = useState<PreviewModal | null>(null);
  const [batchDetails, setBatchDetails] = useState<Record<string, BatchPieceDetail[]>>({});
  const [openHistory, setOpenHistory] = useState(false);
  const [openDone, setOpenDone] = useState<Record<string, boolean>>({});
  const [orderTab, setOrderTab] = useState<"ship" | "progress" | "shipped">("ship");
  const [bulkSel, setBulkSel] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [daysWindow, setDaysWindow] = useState(7);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("atelier_theme");
      if (saved === "dark") setTheme("dark");
    } catch {}
  }, []);
  const switchTheme = (t: "light" | "dark") => {
    setTheme(t);
    try {
      window.localStorage.setItem("atelier_theme", t);
    } catch {}
  };

  const setSelection = (s: Selection | null) => {
    // Changer de sélection désarme toujours la confirmation en cours.
    setConfirmKey(null);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setSelectionRaw(s);
  };

  const api = useCallback(
    (params = "") => `/api/print/board?cle=${encodeURIComponent(cle)}${params}`,
    [cle]
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(api(`&days=${daysWindow}&history=${historyLimit}`), {
        cache: "no-store",
      });
      if (res.status === 401) {
        setErrorKind("auth");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as BoardData);
      setErrorKind(null);
      setLastRefresh(new Date());
    } catch {
      setErrorKind((k) => (k === "auth" ? k : "network"));
    }
  }, [api, daysWindow, historyLimit]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(api("&stats=1"), { cache: "no-store" });
      if (res.ok) setStats((await res.json()) as BoardStats);
    } catch {}
  }, [api]);

  const loadBatchDetail = useCallback(
    async (batchId: string, force = false) => {
      if (!force && batchDetails[batchId]) return;
      try {
        const res = await fetch(api(`&batch=${batchId}`), { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { pieces: BatchPieceDetail[] };
        setBatchDetails((d) => ({ ...d, [batchId]: body.pieces }));
      } catch {}
    },
    [api, batchDetails]
  );

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      if (!document.hidden) void load();
    }, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    for (const b of data?.batchesToDo ?? []) void loadBatchDetail(b.id);
  }, [data?.batchesToDo, loadBatchDetail]);

  useEffect(() => {
    if (statsOpen) void loadStats();
  }, [statsOpen, loadStats]);

  const twoClick = (key: string, run: () => void) => {
    if (confirmKey === key) {
      setConfirmKey(null);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      run();
    } else {
      setConfirmKey(key);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmKey(null), 3500);
    }
  };

  const action = async (
    payload: Record<string, unknown>,
    successMessage: string,
    invalidateBatch?: string
  ) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(api(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setNotice(successMessage);
      setSelection(null);
      setBulkSel(new Set());
      if (invalidateBatch) void loadBatchDetail(invalidateBatch, true);
      await load();
    } catch (e) {
      setNotice(`⚠ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const printSortSheet = async (batch: BatchLite) => {
    if (!batchDetails[batch.id]) await loadBatchDetail(batch.id);
    const pieces = batchDetails[batch.id] ?? [];
    const rows = pieces
      .map(
        (p) =>
          `<tr><td>${p.slot}</td><td>${
            p.thumbUrl
              ? `<img src="${p.thumbUrl}" style="height:44px;border-radius:3px;filter:grayscale(1)">`
              : "—"
          }</td><td>${p.order_ref}</td><td>${p.customer_name}</td><td>${p.product} ${p.format}</td></tr>`
      )
      .join("");
    const win = window.open("", "_blank", "width=760,height=900");
    if (!win) return;
    win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
      <title>Bon de tri — lot ${batch.id.slice(0, 6)}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#1A1A18}
      table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:6px 8px;text-align:left;vertical-align:middle}
      h1{font-size:20px}</style></head><body>
      <h1>Bon de tri — lot ${batch.id.slice(0, 6)} · ${batch.materialLabel} · ${new Date(
        batch.created_at
      ).toLocaleDateString("fr-FR")}</h1>
      <table><thead><tr><th>N°</th><th>Photo</th><th>Commande</th><th>Client</th><th>Produit</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    win.document.close();
  };

  const openPreview = (piece: QueuePieceLite | BatchPieceDetail, fullResLink: string | null) => {
    if (!piece.thumbUrl) return;
    setModal({
      src: piece.thumbUrl,
      title: `${piece.order_ref} · ${piece.customer_name}`,
      subtitle: `${piece.product} ${piece.format}`,
      pxWidth: piece.pxWidth,
      pxHeight: piece.pxHeight,
      product: piece.product,
      format: piece.format,
      fullResLink,
    });
  };

  /* ---------- Dérivés ---------- */

  const q = norm(search.trim());
  const matches = (...fields: (string | null | undefined)[]) =>
    !q || fields.some((f) => f && norm(f).includes(q));

  const pieceGroups = new Map<string, QueuePieceLite[]>();
  for (const piece of data?.pieces ?? []) {
    if (!matches(piece.customer_name, piece.order_ref)) continue;
    const g = pieceGroups.get(piece.material);
    if (g) g.push(piece);
    else pieceGroups.set(piece.material, [piece]);
  }

  const filterOrders = (list: BoardOrder[]) =>
    list.filter((o) => matches(o.customer_name, o.order_ref, o.customer_email));
  const ordersToShip = filterOrders((data?.orders ?? []).filter((o) => o.status === "imprimee"));
  const ordersInProgress = filterOrders(
    (data?.orders ?? []).filter((o) => o.status === "en_file" || o.status === "en_lot")
  );
  const ordersShipped = filterOrders((data?.orders ?? []).filter((o) => o.status === "expediee"));

  const batchMatches = (batch: BatchLite) => {
    if (!q) return true;
    if (norm(batch.id).includes(q) || norm(batch.materialLabel).includes(q)) return true;
    const detail = batchDetails[batch.id];
    return detail
      ? detail.some((p) => matches(p.customer_name, p.order_ref))
      : true; // détail pas chargé : on ne cache pas à l'aveugle
  };

  const bulkIds = ordersToShip
    .filter((o) => bulkSel.has(o.order_ref))
    .flatMap((o) => o.ids);

  const sizeFor = (material: string) => data?.batchSizes?.[material] ?? data?.batchSize ?? 8;
  const maxPerDay = Math.max(1, ...(stats?.perDay ?? []).map((d) => d.count));

  const primaryBtn =
    "inline-flex items-center gap-1.5 rounded-lg bg-[var(--at-accent)] px-3 py-2 text-sm font-medium text-[var(--at-accent-text)] hover:bg-[var(--at-accent-2)] disabled:opacity-40";
  const ghostBtn =
    "inline-flex items-center gap-1.5 rounded-lg border border-[var(--at-border-2)] bg-[var(--at-card)] px-3 py-2 text-sm font-medium text-[var(--at-text)] hover:bg-[var(--at-soft)] disabled:opacity-40";
  const card = "rounded-xl border border-[var(--at-border)] bg-[var(--at-card)]";
  const tabBtn = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      active
        ? "bg-[var(--at-accent)] text-[var(--at-accent-text)]"
        : "border border-[var(--at-border-2)] bg-[var(--at-card)] text-[var(--at-text-2)] hover:bg-[var(--at-soft)]"
    }`;

  /* ---------- Rendu ---------- */

  return (
    <main
      className="min-h-screen bg-[var(--at-bg)] pb-40 text-[16px] text-[var(--at-text)]"
      style={THEMES[theme] as React.CSSProperties}
    >
      <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-8">
        {/* En-tête */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl tracking-tight">
              <span className="font-light">use</span>
              <span className="font-bold">gather</span>
              <span className="text-[var(--at-text-2)]"> × Printerkut</span>
            </h1>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-[var(--at-text-2)]">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  errorKind ? "bg-[#B7791F]" : "bg-[#0F9D8A]"
                }`}
              />
              {errorKind
                ? "reconnexion en cours…"
                : `connecté${lastRefresh ? ` · ${lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--at-text-3)]">
                <IconSearch />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="nom, réf, email…"
                className="w-44 rounded-lg border border-[var(--at-border-2)] bg-[var(--at-card)] py-2 pl-8 pr-2 text-sm text-[var(--at-text)] placeholder:text-[var(--at-text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--at-accent)] sm:w-56"
              />
            </label>
            <button
              onClick={() => switchTheme(theme === "light" ? "dark" : "light")}
              className={ghostBtn}
              title={theme === "light" ? "Passer en sombre (les photos restent sur fond clair)" : "Passer en clair"}
            >
              {theme === "light" ? <IconMoon /> : <IconSun />}
            </button>
            <button onClick={() => void load()} className={ghostBtn}>
              <IconRedo /> Actualiser
            </button>
          </div>
        </header>

        {/* Erreurs en langage humain */}
        {errorKind === "network" && (
          <p className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8C98A] bg-[#FEF3C7] p-3 text-sm text-[#7A5410]">
            <span>
              Connexion au serveur impossible. Nouvel essai automatique dans quelques
              secondes — les données affichées restent les dernières connues.
            </span>
            <button onClick={() => void load()} className="font-semibold underline">
              Réessayer maintenant
            </button>
          </p>
        )}
        {errorKind === "auth" && (
          <p className="rounded-xl border border-[#F1B5B5] bg-[#FEE2E2] p-3 text-sm text-[#8C1D1D]">
            Lien d&apos;accès invalide ou expiré. Demandez un nouveau lien à Nico —
            recharger la page ne suffira pas.
          </p>
        )}
        {notice && <p className={`${card} p-3 text-sm`}>{notice}</p>}

        {/* Bandeau AUJOURD'HUI */}
        <section aria-label="Aujourd'hui">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--at-text-2)]">
            Aujourd&apos;hui
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={`${card} p-4`}>
              <p className="text-3xl font-semibold tabular-nums">
                {data ? data.today.toPrint.pieces : "…"}
              </p>
              <p className="mt-1 text-sm text-[var(--at-text-2)]">
                à imprimer{" "}
                {data && data.today.toPrint.lots > 0 && (
                  <span className="text-[#2563EB]">
                    ({data.today.toPrint.lots} lot{data.today.toPrint.lots > 1 ? "s" : ""})
                  </span>
                )}
              </p>
            </div>
            <div
              className={
                data && data.today.late > 0
                  ? "rounded-xl border border-[#F1B5B5] bg-[#FEE2E2] p-4 text-[#8C1D1D]"
                  : `${card} p-4`
              }
            >
              <p className="text-3xl font-semibold tabular-nums">
                {data ? (data.today.late > 0 ? data.today.late : <IconCheck />) : "…"}
              </p>
              <p className={`mt-1 text-sm ${data && data.today.late > 0 ? "" : "text-[var(--at-text-2)]"}`}>
                {data && data.today.late > 0 ? `en retard (> ${data.maxWaitDays} j)` : "à jour"}
              </p>
            </div>
            <div className={`${card} p-4`}>
              <p className="text-3xl font-semibold tabular-nums">
                {data ? data.today.pending.total : "…"}
              </p>
              <p className="mt-1 truncate text-sm text-[var(--at-text-2)]">
                en file
                {data && data.today.pending.perMaterial.length > 0 && (
                  <span>
                    {" "}
                    ·{" "}
                    {data.today.pending.perMaterial
                      .map((m) => `${m.count} ${m.label.split(" ")[0].toLowerCase()}`)
                      .join(" · ")}
                  </span>
                )}
              </p>
            </div>
            <div className={`${card} p-4`}>
              <p className="text-3xl font-semibold tabular-nums">{data ? data.today.toShip : "…"}</p>
              <p className="mt-1 text-sm text-[var(--at-text-2)]">à expédier</p>
            </div>
          </div>
        </section>

        {/* FILE EN COURS */}
        <section className="space-y-3" aria-label="File en cours">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">File en cours</h2>
            <button
              disabled={busy || !data?.today.pending.total}
              onClick={() =>
                twoClick("force", () =>
                  void action({ action: "force" }, "Lot forcé envoyé à l'atelier.")
                )
              }
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40 ${
                confirmKey === "force"
                  ? "bg-[#B7791F] text-white hover:bg-[#a06a19]"
                  : "bg-[var(--at-accent)] text-[var(--at-accent-text)] hover:bg-[var(--at-accent-2)]"
              }`}
            >
              <IconBolt />
              {confirmKey === "force" ? "Confirmer l'envoi ?" : "Forcer l'envoi du lot"}
            </button>
          </div>
          {pieceGroups.size === 0 && (
            <p className={`${card} p-4 text-sm text-[var(--at-text-2)]`}>
              {q ? "Aucune pièce en file ne correspond à la recherche." : "Aucune pièce en attente — la file est vide."}
            </p>
          )}
          {[...pieceGroups.entries()].map(([material, pieces]) => {
            const label = pieces[0]?.materialLabel ?? material;
            const size = sizeFor(material);
            const ratio = Math.min(1, pieces.length / size);
            return (
              <div key={material} className={`${card} space-y-3 p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <MaterialChip material={material} label={label} />
                  <p className="text-sm tabular-nums text-[var(--at-text-2)]">
                    {pieces.length} / {size} avant envoi auto
                  </p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--at-soft)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${ratio * 100}%`, backgroundColor: materialStyle(material).dot }}
                  />
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {pieces.map((piece) => (
                    <PieceTile
                      key={piece.id}
                      thumbUrl={piece.thumbUrl}
                      caption={piece.customer_name}
                      badge={piece.format}
                      requeued={Boolean(piece.requeuedFrom)}
                      resolution={piece.resolution}
                      dimmed={false}
                      selected={selection?.kind === "queue" && selection.piece.id === piece.id}
                      onClick={() => setSelection({ kind: "queue", piece })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* LOTS À IMPRIMER */}
        <section className="space-y-3" aria-label="Lots à imprimer">
          <h2 className="text-lg font-semibold">
            Lots à imprimer{" "}
            {data && data.batchesToDo.length > 0 && (
              <span className="rounded-full bg-[#DBEAFE] px-2 py-0.5 text-sm font-medium text-[#2563EB]">
                {data.batchesToDo.length}
              </span>
            )}
          </h2>
          {(data?.batchesToDo ?? []).length === 0 && (
            <p className={`${card} p-4 text-sm text-[var(--at-text-2)]`}>
              Rien à imprimer pour l&apos;instant — tout est à jour.
            </p>
          )}
          {(data?.batchesToDo ?? []).filter(batchMatches).map((batch) => {
            const detail = batchDetails[batch.id];
            return (
              <div key={batch.id} className={`${card} space-y-3 p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    Lot {batch.id.slice(0, 6)}
                    <MaterialChip material={batch.material} label={batch.materialLabel} />
                    <span className="text-sm text-[var(--at-text-2)]">
                      {batch.piece_count} pièce{batch.piece_count > 1 ? "s" : ""} · reçu il y a{" "}
                      {ageLabel(batch.created_at)}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm ${batch.emailed_at ? "text-[#0F9D8A]" : "text-[#B7791F]"}`}>
                      {batch.emailed_at ? "email atelier parti" : "email non parti — fichiers ici"}
                    </span>
                    <button onClick={() => void printSortSheet(batch)} className={ghostBtn}>
                      <IconPrint /> Bon de tri
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        twoClick(`printed-${batch.id}`, () =>
                          void action(
                            { action: "printed", id: batch.id },
                            `Lot ${batch.id.slice(0, 6)} marqué imprimé.`
                          )
                        )
                      }
                      className={primaryBtn}
                    >
                      <IconCheck />
                      {confirmKey === `printed-${batch.id}` ? "Confirmer ?" : "Marquer imprimé"}
                    </button>
                  </div>
                </div>
                {detail ? (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {detail.map((piece) => (
                      <PieceTile
                        key={piece.id}
                        thumbUrl={piece.thumbUrl}
                        caption={piece.customer_name}
                        badge={piece.format}
                        slot={piece.slot}
                        requeued={Boolean(piece.requeuedFrom)}
                        resolution={piece.resolution}
                        dimmed={Boolean(q) && !matches(piece.customer_name, piece.order_ref)}
                        selected={selection?.kind === "batch" && selection.piece.id === piece.id}
                        onClick={() =>
                          setSelection({ kind: "batch", piece, batchId: batch.id, printed: false })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--at-text-2)]">Chargement des vignettes…</p>
                )}
              </div>
            );
          })}
        </section>

        {/* HISTORIQUE (replié, groupé par jour) */}
        <section aria-label="Historique">
          <button
            onClick={() => setOpenHistory((o) => !o)}
            className={`${card} flex w-full items-center justify-between p-4 text-left`}
          >
            <span className="font-semibold">
              Historique — lots imprimés{" "}
              <span className="font-normal text-[var(--at-text-2)]">
                ({data?.batchesDone.length ?? 0} affiché{(data?.batchesDone.length ?? 0) > 1 ? "s" : ""})
              </span>
            </span>
            <span className="text-[var(--at-text-2)]">{openHistory ? "replier ▴" : "déplier ▾"}</span>
          </button>
          {openHistory && (
            <div className="mt-3 space-y-4">
              {groupByDay(
                (data?.batchesDone ?? []).filter(batchMatches),
                (b) => b.created_at
              ).map(([day, batches]) => (
                <div key={day} className="space-y-3">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--at-text-3)]">
                    {day}
                  </h3>
                  {batches.map((batch) => (
                    <div key={batch.id} className={`${card} space-y-3 p-4`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">Lot {batch.id.slice(0, 6)}</span>
                          <MaterialChip material={batch.material} label={batch.materialLabel} />
                          <span className="text-[var(--at-text-2)]">
                            {batch.piece_count} pièce{batch.piece_count > 1 ? "s" : ""} ·{" "}
                            {new Date(batch.created_at).toLocaleString("fr-FR")}
                          </span>
                          <span className="text-[#0F9D8A]">
                            <IconCheck /> imprimé
                          </span>
                        </p>
                        <button
                          className={ghostBtn}
                          onClick={() => {
                            setOpenDone((o) => ({ ...o, [batch.id]: !o[batch.id] }));
                            void loadBatchDetail(batch.id);
                          }}
                        >
                          {openDone[batch.id] ? "masquer" : "voir les pièces"}
                        </button>
                      </div>
                      {openDone[batch.id] && batchDetails[batch.id] && (
                        <div className="flex gap-3 overflow-x-auto pb-1">
                          {batchDetails[batch.id].map((piece) => (
                            <PieceTile
                              key={piece.id}
                              thumbUrl={piece.thumbUrl}
                              caption={piece.customer_name}
                              badge={piece.format}
                              slot={piece.slot}
                              requeued={Boolean(piece.requeuedFrom)}
                              resolution={piece.resolution}
                              dimmed={Boolean(q) && !matches(piece.customer_name, piece.order_ref)}
                              selected={selection?.kind === "batch" && selection.piece.id === piece.id}
                              onClick={() =>
                                setSelection({ kind: "batch", piece, batchId: batch.id, printed: true })
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {(data?.batchesDone ?? []).length === 0 && (
                <p className={`${card} p-4 text-sm text-[var(--at-text-2)]`}>
                  Aucun lot imprimé récemment.
                </p>
              )}
              {historyLimit === 10 && (data?.batchesDone.length ?? 0) >= 8 && (
                <button onClick={() => setHistoryLimit(30)} className={ghostBtn}>
                  Charger plus d&apos;historique (30)
                </button>
              )}
            </div>
          )}
        </section>

        {/* CHARGE & STATISTIQUES */}
        <section aria-label="Charge">
          <button
            onClick={() => setStatsOpen((o) => !o)}
            className={`${card} flex w-full items-center justify-between p-4 text-left`}
          >
            <span className="font-semibold">
              Charge &amp; statistiques{" "}
              {stats?.batches7.avgSize != null && (
                <span className="font-normal text-[var(--at-text-2)]">
                  — Ø {stats.batches7.avgSize} pièces/lot sur 7 j ({stats.batches7.batches} lot
                  {stats.batches7.batches > 1 ? "s" : ""})
                </span>
              )}
            </span>
            <span className="text-[var(--at-text-2)]">{statsOpen ? "replier ▴" : "déplier ▾"}</span>
          </button>
          {statsOpen && (
            <div className={`${card} mt-3 space-y-3 p-4`}>
              <p className="text-sm text-[var(--at-text-2)]">
                Pièces commandées par jour — 30 derniers jours
                {stats?.batches7.avgSize != null && (
                  <>
                    {" "}
                    · taille moyenne de lot :{" "}
                    <strong className="text-[var(--at-text)]">{stats.batches7.avgSize}</strong> (repère
                    pour ajuster les seuils par matière avec l&apos;atelier)
                  </>
                )}
              </p>
              {stats ? (
                <div className="flex h-24 items-end gap-[3px]">
                  {stats.perDay.map((d) => (
                    <div
                      key={d.date}
                      title={`${new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR")} : ${d.count} pièce${d.count > 1 ? "s" : ""}`}
                      className="flex-1 rounded-t"
                      style={{
                        height: `${Math.max(3, (d.count / maxPerDay) * 100)}%`,
                        backgroundColor:
                          d.count === 0 ? "var(--at-soft)" : materialStyle("papier-photo").dot,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--at-text-2)]">Chargement…</p>
              )}
              {stats && (
                <p className="flex justify-between text-[12px] text-[var(--at-text-3)]">
                  <span>
                    {new Date(stats.perDay[0]?.date + "T00:00:00").toLocaleDateString("fr-FR")}
                  </span>
                  <span>aujourd&apos;hui</span>
                </p>
              )}
            </div>
          )}
        </section>

        {/* COMMANDES — onglets + fenêtre + recherche globale */}
        <section className="space-y-3" aria-label="Commandes">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Commandes</h2>
            <div className="flex items-center gap-1 text-sm">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDaysWindow(d)}
                  className={tabBtn(daysWindow === d)}
                >
                  {d} j
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setOrderTab("ship")} className={tabBtn(orderTab === "ship")}>
              <IconBox /> À expédier ({ordersToShip.length})
            </button>
            <button
              onClick={() => setOrderTab("progress")}
              className={tabBtn(orderTab === "progress")}
            >
              En production ({ordersInProgress.length})
            </button>
            <button onClick={() => setOrderTab("shipped")} className={tabBtn(orderTab === "shipped")}>
              Expédiées ({ordersShipped.length})
            </button>
          </div>

          {orderTab === "ship" && (
            <div className={`${card} p-4`}>
              {ordersToShip.length === 0 ? (
                <p className="text-sm text-[var(--at-text-2)]">
                  {q ? "Aucune commande à expédier ne correspond à la recherche." : "Rien à expédier — tout est parti."}
                </p>
              ) : (
                <>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm text-[var(--at-text-2)]">
                      <input
                        type="checkbox"
                        checked={bulkSel.size === ordersToShip.length && ordersToShip.length > 0}
                        onChange={(e) =>
                          setBulkSel(
                            e.target.checked
                              ? new Set(ordersToShip.map((o) => o.order_ref))
                              : new Set()
                          )
                        }
                        className="h-4 w-4"
                      />
                      tout sélectionner
                    </label>
                    {bulkSel.size > 0 && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          twoClick("bulk-ship", () =>
                            void action(
                              { action: "ship", ids: bulkIds },
                              `${bulkSel.size} commande${bulkSel.size > 1 ? "s" : ""} marquée${bulkSel.size > 1 ? "s" : ""} expédiée${bulkSel.size > 1 ? "s" : ""}.`
                            )
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F9D8A] px-3 py-2 text-sm font-medium text-white hover:bg-[#0c8172] disabled:opacity-40"
                      >
                        <IconBox />
                        {confirmKey === "bulk-ship"
                          ? "Confirmer ?"
                          : `Marquer ${bulkSel.size} expédiée${bulkSel.size > 1 ? "s" : ""}`}
                      </button>
                    )}
                  </div>
                  {groupByDay(ordersToShip, (o) => o.oldest).map(([day, orders]) => (
                    <div key={day}>
                      <h3 className="mt-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--at-text-3)]">
                        {day}
                      </h3>
                      <ul className="divide-y divide-[var(--at-soft)]">
                        {orders.map((order) => (
                          <li
                            key={order.order_ref}
                            className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                          >
                            <label className="flex min-w-0 items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={bulkSel.has(order.order_ref)}
                                onChange={(e) =>
                                  setBulkSel((s) => {
                                    const next = new Set(s);
                                    if (e.target.checked) next.add(order.order_ref);
                                    else next.delete(order.order_ref);
                                    return next;
                                  })
                                }
                                className="h-4 w-4 shrink-0"
                              />
                              <span className="truncate">
                                <span className="font-medium">{order.order_ref}</span> ·{" "}
                                {order.customer_name}{" "}
                                <span className="text-[var(--at-text-2)]">
                                  ({order.customer_email}) · {order.total} pièce
                                  {order.total > 1 ? "s" : ""}
                                </span>
                              </span>
                            </label>
                            <button
                              disabled={busy}
                              onClick={() =>
                                twoClick(`ship-${order.order_ref}`, () =>
                                  void action(
                                    { action: "ship", ids: order.ids },
                                    `Commande ${order.order_ref} marquée expédiée.`
                                  )
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F9D8A] px-3 py-2 text-sm font-medium text-white hover:bg-[#0c8172] disabled:opacity-40"
                            >
                              <IconBox />
                              {confirmKey === `ship-${order.order_ref}` ? "Confirmer ?" : "Marquer expédiée"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {orderTab === "progress" && (
            <div className={`${card} p-4`}>
              {ordersInProgress.length === 0 && (
                <p className="text-sm text-[var(--at-text-2)]">Aucune commande en cours.</p>
              )}
              {groupByDay(ordersInProgress, (o) => o.oldest).map(([day, orders]) => (
                <div key={day}>
                  <h3 className="mt-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--at-text-3)]">
                    {day}
                  </h3>
                  <ul className="divide-y divide-[var(--at-soft)]">
                    {orders.map((order) => (
                      <li
                        key={order.order_ref}
                        className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                      >
                        <span>
                          <span className="font-medium">{order.order_ref}</span> · {order.customer_name}{" "}
                          <span className="text-[var(--at-text-2)]">
                            · {order.total} pièce{order.total > 1 ? "s" : ""}
                          </span>
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[13px] font-medium ${
                            order.status === "en_file"
                              ? "bg-[#FEF3C7] text-[#7A5410]"
                              : "bg-[#DBEAFE] text-[#1d4fd7]"
                          }`}
                        >
                          {order.status === "en_file" ? "en file" : "en lot"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {orderTab === "shipped" && (
            <div className={`${card} p-4`}>
              {ordersShipped.length === 0 && (
                <p className="text-sm text-[var(--at-text-2)]">Aucune commande expédiée sur la période.</p>
              )}
              {groupByDay(ordersShipped, (o) => o.oldest).map(([day, orders]) => (
                <div key={day}>
                  <h3 className="mt-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--at-text-3)]">
                    {day}
                  </h3>
                  <ul className="divide-y divide-[var(--at-soft)]">
                    {orders.map((order) => (
                      <li key={order.order_ref} className="py-2.5 text-sm text-[var(--at-text-2)]">
                        {order.order_ref} · {order.customer_name} · {order.total} pièce
                        {order.total > 1 ? "s" : ""} · <IconCheck /> expédiée
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="pt-4 text-[13px] text-[var(--at-text-3)]">
          Actualisation automatique toutes les 10 s · fenêtre : {daysWindow} jours · les liens
          fichiers sont re-signés à la demande · doc opérateur : docs/process-fabrication-photo.md
        </footer>
      </div>

      {/* PANNEAU DE SÉLECTION */}
      {selection && !modal && (
        <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-[var(--at-border-2)] bg-[var(--at-card)] p-4 shadow-2xl">
          <div className="flex items-start gap-4">
            <button
              onClick={() =>
                openPreview(
                  selection.piece,
                  selection.kind === "batch" ? selection.piece.link : null
                )
              }
              title="Aperçu grand format"
              className="block h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-[var(--at-border)]"
              style={{ backgroundColor: PHOTO_SURROUND }}
            >
              {selection.piece.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selection.piece.thumbUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[#6B6A63]">
                  <IconImageOff />
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <p className="font-medium">
                {selection.piece.order_ref} · {selection.piece.customer_name}
              </p>
              <p className="text-[var(--at-text-2)]">
                {selection.piece.product} {selection.piece.format}
                {selection.kind === "batch" && <> · pièce n°{selection.piece.slot}</>}
              </p>
              {selection.piece.resolution && (
                <p style={{ color: RESOLUTION_STYLE[selection.piece.resolution].color }}>
                  {RESOLUTION_STYLE[selection.piece.resolution].label}
                </p>
              )}
              {selection.piece.requeuedFrom && (
                <p className="text-[var(--at-text-2)]">
                  <IconRedo /> pièce de remplacement (retirage)
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {selection.piece.thumbUrl && (
                  <button
                    onClick={() =>
                      openPreview(
                        selection.piece,
                        selection.kind === "batch" ? selection.piece.link : null
                      )
                    }
                    className={ghostBtn}
                  >
                    <IconSearch /> Aperçu &amp; cadrage
                  </button>
                )}
                {selection.kind === "batch" && selection.piece.link && (
                  <a
                    href={selection.piece.link}
                    target="_blank"
                    rel="noreferrer"
                    className={ghostBtn}
                  >
                    Fichier pleine résolution
                  </a>
                )}
                {selection.kind === "queue" && selection.piece.status === "pending" && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      twoClick(`remove-${selection.piece.id}`, () =>
                        void action(
                          { action: "remove", id: selection.piece.id },
                          "Pièce retirée de la file."
                        )
                      )
                    }
                    className="rounded-lg border border-[#F1B5B5] bg-[#FEE2E2] px-3 py-2 text-sm font-medium text-[#8C1D1D] hover:bg-[#fbcaca] disabled:opacity-40"
                  >
                    {confirmKey === `remove-${selection.piece.id}`
                      ? "Confirmer le retrait ?"
                      : "Retirer de la file"}
                  </button>
                )}
                {selection.kind === "queue" && selection.piece.status === "batching" && (
                  <span className="text-[var(--at-text-2)]">Mise en lot en cours…</span>
                )}
                {selection.kind === "batch" && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      twoClick(`requeue-${selection.piece.id}`, () =>
                        void action(
                          { action: "requeue", id: selection.piece.id },
                          "Pièce remise en file pour retirage.",
                          selection.batchId
                        )
                      )
                    }
                    className={ghostBtn}
                  >
                    <IconRedo />
                    {confirmKey === `requeue-${selection.piece.id}`
                      ? "Confirmer le retirage ?"
                      : "Remettre en file (retirage)"}
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelection(null)}
              aria-label="Fermer"
              className="rounded-lg border border-[var(--at-border-2)] px-2.5 py-1 text-sm text-[var(--at-text-2)] hover:bg-[var(--at-soft)]"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* MODALE APERÇU + INDICATEUR DE CADRAGE */}
      {modal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="max-h-full w-full max-w-2xl overflow-auto rounded-2xl border border-[var(--at-border-2)] bg-[var(--at-card)] p-4"
            style={THEMES[theme] as React.CSSProperties}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-[var(--at-text)]">{modal.title}</p>
                <p className="text-sm text-[var(--at-text-2)]">{modal.subtitle}</p>
              </div>
              <button
                onClick={() => setModal(null)}
                aria-label="Fermer"
                className="rounded-lg border border-[var(--at-border-2)] px-2.5 py-1 text-sm text-[var(--at-text-2)] hover:bg-[var(--at-soft)]"
              >
                ✕
              </button>
            </div>
            {/* L'image se juge sur fond neutre clair, dans les deux thèmes. */}
            <div
              className="flex items-center justify-center rounded-xl p-4"
              style={{ backgroundColor: PHOTO_SURROUND }}
            >
              <div
                className="relative max-h-[62vh] max-w-full"
                style={{
                  aspectRatio:
                    modal.pxWidth && modal.pxHeight ? `${modal.pxWidth} / ${modal.pxHeight}` : undefined,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={modal.src}
                  alt={modal.title}
                  className="max-h-[62vh] w-auto max-w-full rounded"
                />
                {(() => {
                  if (!modal.pxWidth || !modal.pxHeight) return null;
                  const bands = cropBands(modal.pxWidth, modal.pxHeight, modal.product, modal.format);
                  if (!bands || (bands.horizontal === 0 && bands.vertical === 0)) return null;
                  const h = `${bands.horizontal * 100}%`;
                  const v = `${bands.vertical * 100}%`;
                  return (
                    <>
                      {bands.horizontal > 0 && (
                        <>
                          <span className="pointer-events-none absolute inset-y-0 left-0 rounded-l bg-black/55" style={{ width: h }} />
                          <span className="pointer-events-none absolute inset-y-0 right-0 rounded-r bg-black/55" style={{ width: h }} />
                        </>
                      )}
                      {bands.vertical > 0 && (
                        <>
                          <span className="pointer-events-none absolute inset-x-0 top-0 rounded-t bg-black/55" style={{ height: v }} />
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b bg-black/55" style={{ height: v }} />
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--at-text-2)]">
              {(() => {
                if (!modal.pxWidth || !modal.pxHeight)
                  return "Dimensions inconnues — cadrage non simulable.";
                const bands = cropBands(modal.pxWidth, modal.pxHeight, modal.product, modal.format);
                if (!bands) return null;
                if (bands.horizontal === 0 && bands.vertical === 0)
                  return `La photo est exactement au ratio du format ${modal.format} — aucune coupe.`;
                return `Zones assombries = coupées à l'impression en ${modal.format} (${bands.label}).`;
              })()}
              {modal.fullResLink && (
                <>
                  {" "}
                  <a
                    href={modal.fullResLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#2563EB] underline-offset-2 hover:underline"
                  >
                    Ouvrir le fichier de production
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
