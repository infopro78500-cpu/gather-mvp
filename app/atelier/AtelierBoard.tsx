"use client";

// Tableau de bord atelier Printerkut — l'email reste l'interface principale,
// ce tableau est le bonus de pilotage (pattern Renka) : voir la file arriver,
// forcer un lot, marquer imprimé/expédié, remettre une pièce en file.
// Toutes les actions destructrices sont en confirmation à 2 clics.

import { useCallback, useEffect, useRef, useState } from "react";

interface BoardPiece {
  id: string;
  created_at: string;
  status: "pending" | "batching";
  order_ref: string;
  customer_name: string;
  product: string;
  format: string;
  material: string;
  materialLabel: string;
}

interface BatchPiece {
  id: string;
  slot: number;
  order_ref: string;
  customer_name: string;
  product: string;
  format: string;
  link: string | null;
}

interface BoardBatch {
  id: string;
  created_at: string;
  piece_count: number;
  material: string;
  materialLabel: string;
  emailed_at: string | null;
  printed_at: string | null;
  pieces: BatchPiece[];
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
  pending: number;
  oldestPendingAt: string | null;
  pieces: BoardPiece[];
  batches: BoardBatch[];
  orders: BoardOrder[];
}

const ORDER_STATUS_LABELS: Record<BoardOrder["status"], string> = {
  en_file: "🕐 En file",
  en_lot: "📦 En lot",
  imprimee: "🖨️ Imprimée",
  expediee: "✅ Expédiée",
};

function ageLabel(iso: string | null): string {
  if (!iso) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

export default function AtelierBoard({ cle }: { cle: string }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/print/board?cle=${encodeURIComponent(cle)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as BoardData);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [cle]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      if (!document.hidden) void load();
    }, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  // Confirmation à 2 clics : le 1er clic arme (« Confirmer ? »), le 2e exécute.
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

  const action = async (payload: Record<string, unknown>, successMessage: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/print/board?cle=${encodeURIComponent(cle)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setNotice(successMessage);
      await load();
    } catch (e) {
      setNotice(`⚠️ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  // Bon de tri imprimable : HTML minimal + window.print() dans une popup
  // (aucune dépendance — à voler tel quel, dixit l'audit).
  const printSortSheet = (batch: BoardBatch) => {
    const rows = batch.pieces
      .map(
        (p) =>
          `<tr><td>${p.slot}</td><td>${p.order_ref}</td><td>${p.customer_name}</td><td>${p.product} ${p.format}</td></tr>`
      )
      .join("");
    const win = window.open("", "_blank", "width=720,height=900");
    if (!win) return;
    win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
      <title>Bon de tri — lot ${batch.id.slice(0, 6)}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px}
      table{border-collapse:collapse;width:100%}td,th{border:1px solid #333;padding:8px;text-align:left}
      h1{font-size:20px}</style></head><body>
      <h1>🖨️ Bon de tri — lot ${batch.id.slice(0, 6)} · ${batch.materialLabel} · ${new Date(
        batch.created_at
      ).toLocaleDateString("fr-FR")}</h1>
      <table><thead><tr><th>N°</th><th>Commande</th><th>Client</th><th>Produit</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  };

  const pieceGroups = new Map<string, BoardPiece[]>();
  for (const piece of data?.pieces ?? []) {
    const g = pieceGroups.get(piece.materialLabel);
    if (g) g.push(piece);
    else pieceGroups.set(piece.materialLabel, [piece]);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">🖨️ Atelier Printerkut</h1>
            <p className="text-neutral-400 text-sm">
              File d&apos;impression Usegather — un lot = une matière.
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
          >
            ↻ Actualiser
          </button>
        </header>

        {error && (
          <p className="rounded-lg border border-red-700 bg-red-950/50 p-3 text-sm">
            ⚠️ Chargement impossible : {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-sm">
            {notice}
          </p>
        )}

        {/* Tuiles compteurs */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Pièces en attente",
              value: data ? `${data.pending}` : "…",
            },
            {
              label: "Seuil de lot",
              value: data ? `${data.batchSize} pièces` : "…",
            },
            {
              label: "Plus ancienne attente",
              value: data ? ageLabel(data.oldestPendingAt) : "…",
            },
            {
              label: "Commandes (14 j)",
              value: data ? `${data.orders.length}` : "…",
            },
          ].map((tile) => (
            <div
              key={tile.label}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
            >
              <p className="text-2xl font-semibold">{tile.value}</p>
              <p className="text-xs text-neutral-400 mt-1">{tile.label}</p>
            </div>
          ))}
        </section>

        {/* File en cours */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">File en cours</h2>
            <button
              disabled={busy || !data?.pending}
              onClick={() =>
                twoClick("force", () =>
                  void action({ action: "force" }, "Lot forcé envoyé ✔")
                )
              }
              className="rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 px-3 py-1.5 text-sm font-medium"
            >
              {confirmKey === "force" ? "Confirmer l'envoi ?" : "⚡ Forcer l'envoi du lot"}
            </button>
          </div>
          {pieceGroups.size === 0 && (
            <p className="text-neutral-500 text-sm">Aucune pièce en attente. 🎉</p>
          )}
          {[...pieceGroups.entries()].map(([label, pieces]) => (
            <div
              key={label}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">🪪 {label}</p>
                <p className="text-sm text-neutral-400">
                  {pieces.length} / {data?.batchSize ?? "?"} avant envoi auto
                </p>
              </div>
              <ul className="divide-y divide-neutral-800 text-sm">
                {pieces.map((piece) => (
                  <li key={piece.id} className="py-2 flex items-center justify-between gap-3">
                    <span>
                      <span className="text-neutral-400">{piece.order_ref}</span>{" "}
                      {piece.customer_name} — {piece.product} {piece.format}
                      <span className="text-neutral-500"> · {ageLabel(piece.created_at)}</span>
                      {piece.status === "batching" && (
                        <span className="text-amber-400"> · en cours de mise en lot…</span>
                      )}
                    </span>
                    {piece.status === "pending" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          twoClick(`remove-${piece.id}`, () =>
                            void action(
                              { action: "remove", id: piece.id },
                              "Pièce retirée de la file."
                            )
                          )
                        }
                        className="text-xs rounded border border-neutral-700 px-2 py-1 hover:bg-neutral-800 shrink-0"
                      >
                        {confirmKey === `remove-${piece.id}` ? "Confirmer ?" : "Retirer"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* Lots récents */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Lots récents</h2>
          {(data?.batches ?? []).length === 0 && (
            <p className="text-neutral-500 text-sm">Aucun lot envoyé pour l&apos;instant.</p>
          )}
          {(data?.batches ?? []).map((batch) => (
            <div
              key={batch.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  Lot {batch.id.slice(0, 6)} · {batch.materialLabel} · {batch.piece_count}{" "}
                  pièce{batch.piece_count > 1 ? "s" : ""}
                  <span className="text-neutral-500 text-sm">
                    {" "}
                    · {new Date(batch.created_at).toLocaleString("fr-FR")}
                  </span>
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className={batch.emailed_at ? "text-emerald-400" : "text-amber-400"}>
                    {batch.emailed_at ? "📧 Email parti" : "📧 Email non parti"}
                  </span>
                  <button
                    onClick={() => printSortSheet(batch)}
                    className="rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800"
                  >
                    🖨️ Bon de tri
                  </button>
                  {batch.printed_at ? (
                    <span className="text-emerald-400">✔️ Imprimé</span>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() =>
                        twoClick(`printed-${batch.id}`, () =>
                          void action(
                            { action: "printed", id: batch.id },
                            "Lot marqué imprimé ✔"
                          )
                        )
                      }
                      className="rounded bg-emerald-800 hover:bg-emerald-700 px-2 py-1 text-xs font-medium"
                    >
                      {confirmKey === `printed-${batch.id}` ? "Confirmer ?" : "Marquer imprimé"}
                    </button>
                  )}
                </div>
              </div>
              <ul className="divide-y divide-neutral-800 text-sm">
                {batch.pieces.map((piece) => (
                  <li key={piece.id} className="py-2 flex items-center justify-between gap-3">
                    <span>
                      <strong>{piece.slot}</strong> · {piece.order_ref} · {piece.customer_name}{" "}
                      — {piece.product} {piece.format}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {piece.link ? (
                        <a
                          href={piece.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs rounded border border-neutral-700 px-2 py-1 hover:bg-neutral-800"
                        >
                          Fichier
                        </a>
                      ) : (
                        <span className="text-xs text-neutral-500">fichier purgé</span>
                      )}
                      <button
                        disabled={busy}
                        onClick={() =>
                          twoClick(`requeue-${piece.id}`, () =>
                            void action(
                              { action: "requeue", id: piece.id },
                              "Pièce remise en file pour retirage."
                            )
                          )
                        }
                        className="text-xs rounded border border-neutral-700 px-2 py-1 hover:bg-neutral-800"
                      >
                        {confirmKey === `requeue-${piece.id}` ? "Confirmer ?" : "🔁 Remettre en file"}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* Commandes */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Commandes (14 derniers jours)</h2>
          {(data?.orders ?? []).length === 0 && (
            <p className="text-neutral-500 text-sm">Aucune commande récente.</p>
          )}
          <ul className="space-y-2">
            {(data?.orders ?? []).map((order) => (
              <li
                key={order.order_ref}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>
                  <span className="font-medium">{order.order_ref}</span> ·{" "}
                  {order.customer_name}{" "}
                  <span className="text-neutral-500">({order.customer_email})</span> ·{" "}
                  {order.total} pièce{order.total > 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-neutral-300">{ORDER_STATUS_LABELS[order.status]}</span>
                  {order.status !== "expediee" && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        twoClick(`ship-${order.order_ref}`, () =>
                          void action(
                            { action: "ship", ids: order.ids },
                            `Commande ${order.order_ref} marquée expédiée ✔`
                          )
                        )
                      }
                      className="rounded bg-sky-800 hover:bg-sky-700 px-2 py-1 text-xs font-medium"
                    >
                      {confirmKey === `ship-${order.order_ref}`
                        ? "Confirmer ?"
                        : "📦 Marquer expédiée"}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="text-xs text-neutral-600 pb-8">
          Usegather × Printerkut — actualisation auto toutes les 10 s · les liens
          fichiers expirent (re-signés à chaque affichage) · doc opérateur :
          docs/process-fabrication-photo.md
        </footer>
      </div>
    </main>
  );
}
