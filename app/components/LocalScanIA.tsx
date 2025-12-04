"use client";

import { useState } from "react";

export function LocalScanIA() {
  const [isLoading, setIsLoading] = useState(false);
  const [doublons, setDoublons] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setIsLoading(true);
    setError(null);
    setDoublons(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("SCAN_FAILED");
      }

      const data: { success: boolean; doublons?: number } = await response.json();

      if (!data.success) {
        throw new Error("SCAN_FAILED");
      }

      setDoublons(data.doublons ?? 0);
    } catch (err) {
      console.error("Erreur lors du scan:", err);
      setError("Erreur lors du scan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">IA locale</p>
          <h3 className="text-xl font-semibold text-slate-50">
            Détection des doublons
          </h3>
        </div>
        <button
          type="button"
          onClick={handleScan}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Analyse en cours..." : "Scanner la galerie pour doublons"}
          {isLoading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
          )}
        </button>
      </div>

      {doublons !== null && !error && (
        <p className="text-sm text-emerald-400">
          ✅ Scan terminé. {doublons} doublons détectés.
        </p>
      )}

      {error && <p className="text-sm text-red-400">🔴 {error}</p>}
    </div>
  );
}
