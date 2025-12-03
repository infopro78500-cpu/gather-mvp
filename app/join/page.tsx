"use client";

import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPin = (searchParams.get("pin") ?? "").slice(0, 6);

  const [pin, setPin] = useState(initialPin);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

    router.push(`/events/${trimmed}`);
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-white mb-4">
          Rejoindre un coffre
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="pin"
              className="block text-sm font-medium text-slate-200 mb-1"
            >
              PIN du coffre
            </label>
            <input
              id="pin"
              type="tel"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="123456"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-slate-900 transition"
          >
            {loading ? "Connexion..." : "Rejoindre le coffre"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center"><p className="text-white">Chargement...</p></main>}>
      <JoinPageInner />
    </Suspense>
  );
}
