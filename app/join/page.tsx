"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function JoinPage() {
  const searchParams = useSearchParams();
  const initialPin = (searchParams.get("pin") ?? "").slice(0, 6);

  const [pin, setPin] = useState(initialPin);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmed = pin.trim();

    if (!/^\d{6}$/.test(trimmed)) {
      setError("Entre un PIN à 6 chiffres.");
      return;
    }

    setLoading(true);

    const { data, error: supabaseError } = await supabase
      .from("events")
      .select("id")
      .eq("pin", trimmed)
      .maybeSingle();

    if (supabaseError || !data) {
      setError("Aucun coffre trouvé pour ce code. Vérifie le PIN.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(`/events/${trimmed}`);
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

        <form className="space-y-3" onSubmit={handleJoin}>
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
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-md bg-teal-500 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Recherche..." : "Rejoindre le coffre"}
          </button>
        </form>

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
 