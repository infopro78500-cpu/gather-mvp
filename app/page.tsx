"use client";

import { useState, FormEvent } from "react";
import { getDeviceId } from "@/lib/deviceId";
import { getSupabaseClient } from "@/lib/supabaseClient";
import Image from "next/image";

export default function CreateEventPage() {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePin = () => {
    // Génère un PIN à 6 chiffres
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase n'est pas configuré. Contacte l'équipe.");
      return;
    }

    if (!name.trim()) {
      setError("Donne un nom à ton évènement.");
      return;
    }

    const pin = generatePin();
    setCreating(true);

    try {
      const deviceId = await getDeviceId();

      // --- Récupération optionnelle de l'utilisateur (anonyme autorisé) ---
      let userId: string | null = null;
      try {
        const { data: authInfo } = await supabase.auth.getUser();
        userId = authInfo?.user?.id ?? null;
      } catch (authError) {
        console.warn(
          "Aucune session Supabase, création d'évènement anonyme.",
          authError
        );
      }
      // IMPORTANT : on NE bloque PAS si userId est null

      const { error: insertError } = await supabase.from("events").insert({
        name: name.trim(),
        pin,
        host_device_id: deviceId,
        host_user_id: userId, // peut être null pour le MVP
      });

      if (insertError) {
        console.error(insertError);
        setError("Erreur lors de la création de l'évènement.");
        return;
      }

      // On connaît déjà le PIN, pas besoin de .select().single()
      window.location.href = `/events/${pin}`;
    } catch (err) {
      console.error(err);
      setError("Erreur inattendue.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-3xl rounded-3xl bg-slate-900/80 border border-slate-800 p-6 md:p-8 shadow-xl flex flex-col md:flex-row gap-8">
        {/* Bloc gauche : branding / pitch */}
        <div className="flex-1 flex flex-col justify-between gap-4">
          <div>
            {/* Logo Gather */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-center overflow-hidden">
                <Image
                  src="/gather-logo.png"
                  alt="Logo Gather"
                  width={56}
                  height={56}
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
                  Gather-MVP
                </span>
                <span className="text-xs text-slate-500">
                  Coffres photo partagés
                </span>
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 leading-snug">
              Crée un{" "}
              <span className="text-teal-400">coffre photo éphémère</span>{" "}
              pour ton groupe.
            </h1>

            <p className="mt-3 text-xs md:text-sm text-slate-400 max-w-md">
              Un évènement = un PIN + un QR code. Tout le monde peut déposer
              ses photos dans le même coffre, sans compte, en quelques
              secondes.
            </p>
          </div>

          <div className="hidden md:block text-[11px] text-slate-500">
            Pensé pour les voyages, mariages, soirées et moments de vie que tu
            veux rassembler au même endroit.
          </div>
        </div>

        {/* Bloc droit : création d’évènement */}
        <div className="flex-1">
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 px-4 py-5 space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
                Nouveau coffre
              </p>
              <h2 className="mt-1 text-sm font-semibold text-slate-50">
                Créer un évènement
              </h2>
              <p className="mt-1 text-[11px] text-slate-400">
                Donne un nom à ton évènement, on génère le PIN pour toi.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="name"
                  className="text-xs font-medium text-slate-300"
                >
                  Nom de l&apos;évènement
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-50 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  placeholder="Ex : Anniversaire de Léa, Weekend à Lisbonne…"
                />
                {error && (
                  <p className="text-[11px] text-red-400 mt-1">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={creating}
                className="mt-2 w-full rounded-md bg-teal-500 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? "Création en cours..." : "Créer l’évènement"}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800">
              <p className="text-[11px] text-slate-500">
                Tu as déjà un PIN ?{" "}
                <a href="/join" className="text-teal-400 hover:underline">
                  Rejoindre un coffre existant
                </a>
              </p>
            </div>

            <div className="mt-4 text-center">
              <a
                href="/coming-soon"
                className="inline-block px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm border border-slate-700"
              >
                Participer à l’aventure Gather 🚀
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
