"use client";

// Tableau de bord atelier Printerkut — refonte photo-first (audit
// docs/audit-ux-atelier.md, P0 validé par Nico le 06/08/2026).
//
// Principes : chaque section répond à une question d'opérateur en < 5 s ;
// palette CLAIRE (un entourage sombre fausse le jugement des photos — §9.1) ;
// mosaïques de vraies vignettes ; « sélectionner puis agir » (un panneau
// contextuel unique, jamais un mur de boutons) ; poll léger 10 s + détail de
// lot chargé à la demande ; erreurs en langage humain.

import { useCallback, useEffect, useRef, useState } from "react";

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
  maxWaitDays: number;
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

type Selection =
  | { kind: "queue"; piece: QueuePieceLite }
  | { kind: "batch"; piece: BatchPieceDetail; batchId: string; printed: boolean };

/* ---------- Design system (audit §9) ---------- */

const MATERIAL_STYLE: Record<string, { dot: string; bg: string }> = {
  "papier-photo": { dot: "#C9A874", bg: "#FBF3E4" },
  canvas: { dot: "#B9673F", bg: "#FBEAE1" },
  forex: { dot: "#7C6FB0", bg: "#EFEBFA" },
  dibond: { dot: "#6B7A8F", bg: "#EAEDF1" },
  plexi: { dot: "#3FA6B0", bg: "#E3F5F6" },
};
const materialStyle = (m: string) => MATERIAL_STYLE[m] ?? { dot: "#8A8983", bg: "#EFEEE9" };

const RESOLUTION_STYLE: Record<string, { color: string; label: string }> = {
  ok: { color: "#0F9D8A", label: "Résolution optimale" },
  acceptable: { color: "#B7791F", label: "Résolution correcte (déco vue à distance)" },
  insufficient: { color: "#DC2626", label: "Résolution insuffisante" },
};

/* ---------- Icônes (traits fins, monochromes — plus d'émojis fonctionnels) ---------- */

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
const IconImageOff = () => (
  <svg className="h-6 w-6 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 16l5-5 4 4M14 13l2-2 5 5" />
    <circle cx="9" cy="9" r="1.4" />
  </svg>
);

/* ---------- Petits helpers ---------- */

function ageLabel(iso: string | null): string {
  if (!iso) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

function MaterialChip({ material, label }: { material: string; label: string }) {
  const style = materialStyle(material);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium text-[#1A1A18]"
      style={{ backgroundColor: style.bg }}
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

/* ---------- Tuile vignette (file + lots) ---------- */

function PieceTile({
  thumbUrl,
  caption,
  badge,
  slot,
  requeued,
  resolution,
  selected,
  onClick,
}: {
  thumbUrl: string | null;
  caption: string;
  badge: string;
  slot?: number;
  requeued: boolean;
  resolution: QueuePieceLite["resolution"];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-[104px] shrink-0 text-left focus:outline-none ${selected ? "" : ""}`}
    >
      <span
        className={`relative block aspect-square overflow-hidden rounded-lg border bg-[#EFEEE9] ${
          selected
            ? "border-[#0b0f19] ring-2 ring-[#0b0f19]"
            : "border-[#E2E1DC] group-hover:border-[#b8b6ae]"
        }`}
      >
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt={caption}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] text-[#6B6A63]">
            <IconImageOff />
            aperçu indisponible
          </span>
        )}
        <ResolutionDot resolution={resolution} />
        {slot !== undefined && (
          <span className="absolute left-1 top-1 rounded bg-white/90 px-1.5 text-[12px] font-semibold tabular-nums">
            {slot}
          </span>
        )}
        <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 text-[11px] font-medium">
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
      <span className="mt-1 block truncate text-[12px] text-[#6B6A63]">{caption}</span>
    </button>
  );
}

/* ---------- Le composant principal ---------- */

export default function AtelierBoard({ cle }: { cle: string }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [errorKind, setErrorKind] = useState<"network" | "auth" | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selection, setSelectionRaw] = useState<Selection | null>(null);
  const [batchDetails, setBatchDetails] = useState<Record<string, BatchPieceDetail[]>>({});
  const [openHistory, setOpenHistory] = useState(false);
  const [openDone, setOpenDone] = useState<Record<string, boolean>>({});
  const [showShipped, setShowShipped] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Changer de sélection désarme toujours la confirmation en cours (leçon
  // Renka : un « Confirmer ? » armé sur A ne doit jamais être validé sur B).
  const setSelection = (s: Selection | null) => {
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
      const res = await fetch(api(), { cache: "no-store" });
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
  }, [api]);

  const loadBatchDetail = useCallback(
    async (batchId: string, force = false) => {
      if (!force && batchDetails[batchId]) return;
      try {
        const res = await fetch(api(`&batch=${batchId}`), { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { pieces: BatchPieceDetail[] };
        setBatchDetails((d) => ({ ...d, [batchId]: body.pieces }));
      } catch {
        // silencieux : le poll suivant retentera si le lot est toujours ouvert
      }
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

  // Les lots à imprimer sont l'action du jour : leur détail se charge seul.
  useEffect(() => {
    for (const b of data?.batchesToDo ?? []) void loadBatchDetail(b.id);
  }, [data?.batchesToDo, loadBatchDetail]);

  useEffect(() => {
    if (errorKind === "auth") return; // inutile de re-poller un lien invalide
  }, [errorKind]);

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
          `<tr><td>${p.slot}</td><td>${p.order_ref}</td><td>${p.customer_name}</td><td>${p.product} ${p.format}</td></tr>`
      )
      .join("");
    const win = window.open("", "_blank", "width=720,height=900");
    if (!win) return;
    win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
      <title>Bon de tri — lot ${batch.id.slice(0, 6)}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#1A1A18}
      table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:8px;text-align:left}
      h1{font-size:20px}</style></head><body>
      <h1>Bon de tri — lot ${batch.id.slice(0, 6)} · ${batch.materialLabel} · ${new Date(
        batch.created_at
      ).toLocaleDateString("fr-FR")}</h1>
      <table><thead><tr><th>N°</th><th>Commande</th><th>Client</th><th>Produit</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  };

  /* ---------- Dérivés ---------- */

  const pieceGroups = new Map<string, QueuePieceLite[]>();
  for (const piece of data?.pieces ?? []) {
    const g = pieceGroups.get(piece.material);
    if (g) g.push(piece);
    else pieceGroups.set(piece.material, [piece]);
  }

  const ordersToShip = (data?.orders ?? []).filter((o) => o.status === "imprimee");
  const ordersInProgress = (data?.orders ?? []).filter(
    (o) => o.status === "en_file" || o.status === "en_lot"
  );
  const ordersShipped = (data?.orders ?? []).filter((o) => o.status === "expediee");

  const primaryBtn =
    "inline-flex items-center gap-1.5 rounded-lg bg-[#0b0f19] px-3 py-2 text-sm font-medium text-white hover:bg-[#232a3a] disabled:opacity-40";
  const ghostBtn =
    "inline-flex items-center gap-1.5 rounded-lg border border-[#D8D6CF] bg-white px-3 py-2 text-sm font-medium text-[#1A1A18] hover:bg-[#F1F0EB] disabled:opacity-40";
  const card = "rounded-xl border border-[#E2E1DC] bg-white";

  /* ---------- Rendu ---------- */

  return (
    <main className="min-h-screen bg-[#F6F6F4] pb-40 text-[16px] text-[#1A1A18]">
      <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-8">
        {/* En-tête */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl tracking-tight">
              <span className="font-light">use</span>
              <span className="font-bold">gather</span>
              <span className="text-[#6B6A63]"> × Printerkut</span>
            </h1>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-[#6B6A63]">
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
          <button onClick={() => void load()} className={ghostBtn}>
            <IconRedo /> Actualiser
          </button>
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
        {notice && (
          <p className={`${card} p-3 text-sm`}>{notice}</p>
        )}

        {/* Bandeau AUJOURD'HUI */}
        <section aria-label="Aujourd'hui">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-[#6B6A63]">
            Aujourd&apos;hui
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={`${card} p-4`}>
              <p className="text-3xl font-semibold tabular-nums">
                {data ? data.today.toPrint.pieces : "…"}
              </p>
              <p className="mt-1 text-sm text-[#6B6A63]">
                à imprimer{" "}
                {data && data.today.toPrint.lots > 0 && (
                  <span className="text-[#2563EB]">
                    ({data.today.toPrint.lots} lot{data.today.toPrint.lots > 1 ? "s" : ""})
                  </span>
                )}
              </p>
            </div>
            <div
              className={`rounded-xl border p-4 ${
                data && data.today.late > 0
                  ? "border-[#F1B5B5] bg-[#FEE2E2]"
                  : "border-[#E2E1DC] bg-white"
              }`}
            >
              <p className="text-3xl font-semibold tabular-nums">
                {data ? (data.today.late > 0 ? data.today.late : <IconCheck />) : "…"}
              </p>
              <p className="mt-1 text-sm text-[#6B6A63]">
                {data && data.today.late > 0 ? "en retard (> " + data.maxWaitDays + " j)" : "à jour"}
              </p>
            </div>
            <div className={`${card} p-4`}>
              <p className="text-3xl font-semibold tabular-nums">
                {data ? data.today.pending.total : "…"}
              </p>
              <p className="mt-1 truncate text-sm text-[#6B6A63]">
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
              <p className="text-3xl font-semibold tabular-nums">
                {data ? data.today.toShip : "…"}
              </p>
              <p className="mt-1 text-sm text-[#6B6A63]">à expédier</p>
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
              className={`${confirmKey === "force" ? "bg-[#B7791F] hover:bg-[#a06a19]" : "bg-[#0b0f19] hover:bg-[#232a3a]"} inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-40`}
            >
              <IconBolt />
              {confirmKey === "force" ? "Confirmer l'envoi ?" : "Forcer l'envoi du lot"}
            </button>
          </div>
          {pieceGroups.size === 0 && (
            <p className={`${card} p-4 text-sm text-[#6B6A63]`}>
              Aucune pièce en attente — la file est vide.
            </p>
          )}
          {[...pieceGroups.entries()].map(([material, pieces]) => {
            const label = pieces[0]?.materialLabel ?? material;
            const ratio = data ? Math.min(1, pieces.length / data.batchSize) : 0;
            return (
              <div key={material} className={`${card} space-y-3 p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <MaterialChip material={material} label={label} />
                  <p className="text-sm tabular-nums text-[#6B6A63]">
                    {pieces.length} / {data?.batchSize ?? "?"} avant envoi auto
                  </p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#EFEEE9]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${ratio * 100}%`,
                      backgroundColor: materialStyle(material).dot,
                    }}
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
            <p className={`${card} p-4 text-sm text-[#6B6A63]`}>
              Rien à imprimer pour l&apos;instant — tout est à jour.
            </p>
          )}
          {(data?.batchesToDo ?? []).map((batch) => {
            const detail = batchDetails[batch.id];
            return (
              <div key={batch.id} className={`${card} space-y-3 p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    Lot {batch.id.slice(0, 6)}
                    <MaterialChip material={batch.material} label={batch.materialLabel} />
                    <span className="text-sm text-[#6B6A63]">
                      {batch.piece_count} pièce{batch.piece_count > 1 ? "s" : ""} · reçu il y a{" "}
                      {ageLabel(batch.created_at)}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm ${batch.emailed_at ? "text-[#0F9D8A]" : "text-[#B7791F]"}`}
                    >
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
                        selected={
                          selection?.kind === "batch" && selection.piece.id === piece.id
                        }
                        onClick={() =>
                          setSelection({
                            kind: "batch",
                            piece,
                            batchId: batch.id,
                            printed: false,
                          })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#6B6A63]">Chargement des vignettes…</p>
                )}
              </div>
            );
          })}
        </section>

        {/* HISTORIQUE (replié) */}
        <section aria-label="Historique">
          <button
            onClick={() => setOpenHistory((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl border border-[#E2E1DC] bg-white p-4 text-left"
          >
            <span className="font-semibold">
              Historique — lots imprimés{" "}
              <span className="font-normal text-[#6B6A63]">
                ({data?.batchesDone.length ?? 0} récents)
              </span>
            </span>
            <span className="text-[#6B6A63]">{openHistory ? "replier ▴" : "déplier ▾"}</span>
          </button>
          {openHistory && (
            <div className="mt-3 space-y-3">
              {(data?.batchesDone ?? []).map((batch) => (
                <div key={batch.id} className={`${card} space-y-3 p-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">Lot {batch.id.slice(0, 6)}</span>
                      <MaterialChip material={batch.material} label={batch.materialLabel} />
                      <span className="text-[#6B6A63]">
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
                          selected={
                            selection?.kind === "batch" && selection.piece.id === piece.id
                          }
                          onClick={() =>
                            setSelection({
                              kind: "batch",
                              piece,
                              batchId: batch.id,
                              printed: true,
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {(data?.batchesDone ?? []).length === 0 && (
                <p className={`${card} p-4 text-sm text-[#6B6A63]`}>Aucun lot imprimé récemment.</p>
              )}
            </div>
          )}
        </section>

        {/* COMMANDES */}
        <section className="space-y-3" aria-label="Commandes">
          <h2 className="text-lg font-semibold">Commandes (14 derniers jours)</h2>

          <div className={`${card} p-4`}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0F9D8A]">
              <IconBox /> À expédier ({ordersToShip.length})
            </h3>
            {ordersToShip.length === 0 && (
              <p className="text-sm text-[#6B6A63]">Rien à expédier — tout est parti.</p>
            )}
            <ul className="divide-y divide-[#EFEEE9]">
              {ordersToShip.map((order) => (
                <li
                  key={order.order_ref}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                  <span>
                    <span className="font-medium">{order.order_ref}</span> · {order.customer_name}{" "}
                    <span className="text-[#6B6A63]">
                      ({order.customer_email}) · {order.total} pièce{order.total > 1 ? "s" : ""}
                    </span>
                  </span>
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

          <div className={`${card} p-4`}>
            <h3 className="mb-2 text-sm font-semibold text-[#2563EB]">
              En production ({ordersInProgress.length})
            </h3>
            {ordersInProgress.length === 0 && (
              <p className="text-sm text-[#6B6A63]">Aucune commande en cours.</p>
            )}
            <ul className="divide-y divide-[#EFEEE9]">
              {ordersInProgress.map((order) => (
                <li key={order.order_ref} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span>
                    <span className="font-medium">{order.order_ref}</span> · {order.customer_name}{" "}
                    <span className="text-[#6B6A63]">
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

          <button
            onClick={() => setShowShipped((s) => !s)}
            className="text-sm text-[#6B6A63] underline-offset-2 hover:underline"
          >
            {showShipped ? "Masquer" : "Voir"} les expédiées ({ordersShipped.length})
          </button>
          {showShipped && (
            <div className={`${card} p-4`}>
              <ul className="divide-y divide-[#EFEEE9]">
                {ordersShipped.map((order) => (
                  <li key={order.order_ref} className="py-2.5 text-sm text-[#6B6A63]">
                    {order.order_ref} · {order.customer_name} · {order.total} pièce
                    {order.total > 1 ? "s" : ""} · <IconCheck /> expédiée
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <footer className="pt-4 text-[13px] text-[#8A8983]">
          Actualisation automatique toutes les 10 s · les liens fichiers sont re-signés à
          chaque affichage · doc opérateur : docs/process-fabrication-photo.md
        </footer>
      </div>

      {/* PANNEAU DE SÉLECTION (sélectionner puis agir) */}
      {selection && (
        <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-[#D8D6CF] bg-white p-4 shadow-2xl">
          <div className="flex items-start gap-4">
            <span className="block h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-[#E2E1DC] bg-[#EFEEE9]">
              {(selection.kind === "queue" ? selection.piece.thumbUrl : selection.piece.thumbUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selection.piece.thumbUrl as string}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <IconImageOff />
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <p className="font-medium">
                {selection.piece.order_ref} · {selection.piece.customer_name}
              </p>
              <p className="text-[#6B6A63]">
                {selection.piece.product} {selection.piece.format}
                {selection.kind === "batch" && <> · pièce n°{selection.piece.slot}</>}
              </p>
              {selection.piece.resolution && (
                <p style={{ color: RESOLUTION_STYLE[selection.piece.resolution].color }}>
                  {RESOLUTION_STYLE[selection.piece.resolution].label}
                </p>
              )}
              {selection.piece.requeuedFrom && (
                <p className="text-[#6B6A63]">
                  <IconRedo /> pièce de remplacement (retirage)
                </p>
              )}
              {selection.kind === "batch" && selection.piece.link && (
                <a
                  href={selection.piece.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-[#2563EB] underline-offset-2 hover:underline"
                >
                  Voir en pleine résolution
                </a>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
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
                  <span className="text-[#6B6A63]">Mise en lot en cours…</span>
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
              className="rounded-lg border border-[#D8D6CF] px-2.5 py-1 text-sm text-[#6B6A63] hover:bg-[#F1F0EB]"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
