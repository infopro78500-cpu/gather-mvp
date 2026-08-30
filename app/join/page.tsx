"use client";

import { useState, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseClient();

  const initialPin = (searchParams?.get("pin") ?? "").slice(0, 6);
  // Chantier mariage : un QR de présentoir porte sa table (?table=Table 3).
  // On la mémorise pour que la galerie étiquette les dépôts de cet invité.
  const tableLabel = (searchParams?.get("table") ?? "").trim().slice(0, 40);

  const [pin, setPin] = useState(initialPin);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!supabase) {
      setError("Supabase n'est pas configuré. Contacte l'équipe.");
      return;
    }

    const trimmed = pin.trim();

    if (!/^\d{6}$/.test(trimmed)) {
      setError("Entre un PIN à 6 chiffres.");
      return;
    }

    setLoading(true);

    // Résolution via la fonction SECURITY DEFINER : la table `events` n'est plus
    // lisible en direct par la clé anon (audit 30/08 — sinon un `select` sans
    // filtre exposait le PIN de tous les coffres). Un appel = un coffre.
    const { data: matches, error: supabaseError } = await supabase.rpc(
      "get_public_event",
      { p_pin: trimmed }
    );
    const data = matches?.[0] ?? null;

    if (supabaseError || !data) {
      setError("Aucun coffre trouvé pour ce code. Vérifie le PIN.");
      setLoading(false);
      return;
    }

    // L'étiquette ne vaut que pour le coffre du QR scanné : si l'invité a
    // ressaisi un autre PIN à la main, on ne l'applique pas.
    if (tableLabel && trimmed === initialPin) {
      try {
        window.localStorage.setItem(
          "gather_join_table",
          JSON.stringify({ pin: trimmed, table: tableLabel, at: Date.now() })
        );
      } catch {
        // stockage local indisponible : l'invité déposera sans étiquette
      }
    }
    router.push(`/events/${trimmed}`);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h1 className="text-xl font-semibold text-white mb-2 text-center">
          Rejoindre un coffre
        </h1>
        <p className="text-sm text-slate-300 mb-4 text-center">
          Entre le PIN à 6 chiffres pour accéder à l&apos;événement.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              PIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="123456"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-medium py-2.5 mt-2 transition"
          >
            {loading ? "Connexion..." : "Rejoindre"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="text-center text-white p-4">Chargement...</div>}>
      <JoinPageInner />
    </Suspense>
  );
}
