"use client";

import { useState } from "react";

export default function JoinPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const handleJoin = () => {
    setError(null);

    const trimmed = pin.trim();

    if (!/^\d{6}$/.test(trimmed)) {
      setError("Entre un PIN à 6 chiffres.");
      return;
    }

    setJoining(true);

    if (typeof window !== "undefined") {
      window.location.href = `/events/${trimmed}`;
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="w-[360px] md:w-[420px] rounded-2xl bg-slate-900/80 border border-slate-800 p-6 md:p-7 shadow-xl space-y-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            Gather
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-50">
            Rejoindre un coffre photo
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Entre le PIN partagé avec toi pour accéder à l’espace commun du
            groupe.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label
              htmlFor="pin"
              className="text-xs font-medium text-slate-300"
            >
              PIN de l&apos;évènement
            </label>
            <input
              id="pin"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-50 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="Ex : 335058"
            />
            {error && (
              <p className="text-[11px] text-red-400 mt-1">
                {error}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleJoin}
            disabled={joining}
            className="mt-2 w-full rounded-md bg-teal-500 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {joining ? "Redirection..." : "Rejoindre le coffre"}
          </button>
        </div>

        <div className="pt-2 border-t border-slate-800">
          <p className="text-[11px] text-slate-500">
            Tu peux aussi rejoindre un coffre en scannant le QR code partagé
            depuis la page évènement.
          </p>
        </div>
      </div>
    </main>
  );
}
