"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";

import { getDeviceId } from "@/lib/deviceId";
import { supabase } from "@/lib/supabaseClient";

type Accent = "teal" | "emerald" | "purple";

type HeroContent = {
  badge?: string;
  titleStart?: string;
  titleHighlight?: string;
  titleEnd?: string;
  description?: string;
  note?: string;
};

type SecondaryAction = {
  href: string;
  label: string;
};

export type CreateEventLandingProps = {
  hero?: HeroContent;
  accent?: Accent;
  secondaryAction?: SecondaryAction;
  ctaLabel?: string;
};

const accentThemes: Record<
  Accent,
  {
    text: string;
    border: string;
    badgeBg: string;
    badgeBorder: string;
    ctaBg: string;
    ctaHover: string;
    ctaText: string;
    focusRing: string;
  }
> = {
  teal: {
    text: "text-teal-400",
    border: "border-teal-500",
    badgeBg: "bg-teal-500/10",
    badgeBorder: "border-teal-500/40",
    ctaBg: "bg-teal-500",
    ctaHover: "hover:bg-teal-400",
    ctaText: "text-slate-950",
    focusRing: "focus:border-teal-500 focus:ring-1 focus:ring-teal-500",
  },
  emerald: {
    text: "text-emerald-400",
    border: "border-emerald-500",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/40",
    ctaBg: "bg-emerald-500",
    ctaHover: "hover:bg-emerald-400",
    ctaText: "text-slate-950",
    focusRing: "focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500",
  },
  purple: {
    text: "text-purple-300",
    border: "border-purple-400",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/40",
    ctaBg: "bg-purple-500",
    ctaHover: "hover:bg-purple-400",
    ctaText: "text-slate-50",
    focusRing: "focus:border-purple-400 focus:ring-1 focus:ring-purple-400",
  },
};

const defaultHero: Required<HeroContent> = {
  badge: "Gather-MVP",
  titleStart: "Crée un",
  titleHighlight: "coffre photo éphémère",
  titleEnd: "pour ton groupe.",
  description:
    "Un évènement = un PIN + un QR code. Tout le monde peut déposer ses photos dans le même coffre, sans compte, en quelques secondes.",
  note: "Pensé pour les voyages, mariages, soirées et moments de vie que tu veux rassembler au même endroit.",
};

export function CreateEventLanding({
  hero,
  accent = "teal",
  secondaryAction = {
    href: "/coming-soon",
    label: "Participer à l’aventure Gather 🚀",
  },
  ctaLabel = "Créer l’évènement",
}: CreateEventLandingProps) {
  const theme = accentThemes[accent];
  const heroContent = useMemo(() => ({ ...defaultHero, ...hero }), [hero]);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Donne un nom à ton évènement.");
      return;
    }

    const pin = generatePin();
    setCreating(true);

    try {
      const deviceId = await getDeviceId();

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

      const { error: insertError } = await supabase.from("events").insert({
        name: name.trim(),
        pin,
        host_device_id: deviceId,
        host_user_id: userId,
      });

      if (insertError) {
        console.error(insertError);
        setError("Erreur lors de la création de l'évènement.");
        return;
      }

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
        <div className="flex-1 flex flex-col justify-between gap-4">
          <div>
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
                <span className={`text-[11px] uppercase tracking-[0.25em] text-slate-400 ${theme.text}`}>
                  {heroContent.badge}
                </span>
                <span className="text-xs text-slate-500">Coffres photo partagés</span>
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 leading-snug">
              {heroContent.titleStart}{" "}
              <span className={theme.text}>{heroContent.titleHighlight}</span>{" "}
              {heroContent.titleEnd}
            </h1>

            <p className="mt-3 text-xs md:text-sm text-slate-400 max-w-md">
              {heroContent.description}
            </p>
          </div>

          {heroContent.note && (
            <div className="hidden md:block text-[11px] text-slate-500">
              {heroContent.note}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 px-4 py-5 space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
                Nouveau coffre
              </p>
              <h2 className="mt-1 text-sm font-semibold text-slate-50">Créer un évènement</h2>
              <p className="mt-1 text-[11px] text-slate-400">
                Donne un nom à ton évènement, on génère le PIN pour toi.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="name" className="text-xs font-medium text-slate-300">
                  Nom de l&apos;évènement
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-50 outline-none ${theme.focusRing}`}
                  placeholder="Ex : Anniversaire de Léa, Weekend à Lisbonne…"
                />
                {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={creating}
                className={`mt-2 w-full rounded-md ${theme.ctaBg} ${theme.ctaHover} ${theme.border} py-2 text-sm font-semibold ${theme.ctaText} disabled:opacity-60 disabled:cursor-not-allowed transition-colors`}
              >
                {creating ? "Création en cours..." : ctaLabel}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800">
              <p className="text-[11px] text-slate-500">
                Tu as déjà un PIN ?{" "}
                <a href="/join" className={`${theme.text} hover:underline`}>
                  Rejoindre un coffre existant
                </a>
              </p>
            </div>

            {secondaryAction && (
              <div className="mt-4 text-center">
                <a
                  href={secondaryAction.href}
                  className={`inline-block px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm border border-slate-700 ${theme.badgeBorder}`}
                >
                  {secondaryAction.label}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default CreateEventLanding;
