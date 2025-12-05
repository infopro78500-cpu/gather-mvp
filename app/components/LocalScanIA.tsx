"use client";

import { useState } from "react";

type ScanResponse = {
  success: boolean;
  doublons?: number;
  error?: string;
};

export function LocalScanIA() {
  const [isLoading, setIsLoading] = useState(false);
  const [isHashLoading, setIsHashLoading] = useState(false);
  const [doublons, setDoublons] = useState<number | null>(null);
  const [doublonsStricts, setDoublonsStricts] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setIsLoading(true);
    setError(null);
    setDoublons(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("SCAN_FAILED");
      }

      const data: ScanResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "SCAN_FAILED");
      }

      setDoublons(data.doublons ?? 0);
    } catch (err) {
      console.error("Erreur lors du scan:", err);
      setError("Erreur lors du scan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStrictScan = async () => {
    setIsHashLoading(true);
    setError(null);
    setDoublonsStricts(null);

    try {
      const response = await fetch("/api/scan-hash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("HASH_SCAN_FAILED");
      }

      const data: ScanResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "HASH_SCAN_FAILED");
      }

      setDoublonsStricts(data.doublons ?? 0);
    } catch (err) {
      console.error("Erreur lors du scan strict:", err);
      setError("Erreur lors du scan strict.");
    } finally {
      setIsHashLoading(false);
    }
  };

  const isBusy = isLoading || isHashLoading;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="text-sm text-slate-400">IA locale</p>
          <h3 className="text-xl font-semibold text-slate-50">
            Détection des doublons
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleScan}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Analyse en cours..."
              : "Scanner la galerie pour doublons"}
            {isLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            )}
          </button>

          <button
            type="button"
            onClick={handleStrictScan}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-slate-50 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isHashLoading
              ? "Analyse stricte..."
              : "Détection stricte (100%)"}
            {isHashLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
            )}
          </button>
        </div>
      </div>

      {doublons !== null && !error && (
        <p className="text-sm text-emerald-400">
          ✅ Scan terminé. {doublons} doublons détectés.
        </p>
      )}

      {doublonsStricts !== null && !error && (
        <p className="text-sm text-emerald-400">
          ✅ Scan terminé. {doublonsStricts} doublons stricts détectés.
        </p>
      )}

      {error && <p className="text-sm text-red-400">🔴 {error}</p>}
    </div>
  );
}
