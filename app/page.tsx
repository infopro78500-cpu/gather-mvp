"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { getDeviceId } from "@/lib/deviceId";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button, buttonClasses } from "./components/ui/button";
import { PageLayout } from "./components/ui/page-layout";
import { Section } from "./components/ui/section";

export default function CreateEventPage() {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  const generatePin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError("Configuration Supabase manquante.");
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
    <PageLayout
      eyebrow="Gather"
      title="Coffre photo instantané pour ton évènement"
      description="Crée un PIN, scanne un QR code et centralise les photos de ton groupe en quelques secondes. Pensé mobile-first pour les voyages, mariages et soirées."
      actions={
        <a
          href="/join"
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          Déjà un PIN ?
        </a>
      }
    >
      <div className="grid gap-4 md:gap-6 lg:grid-cols-5 animate-fade">
        <Section className="lg:col-span-3" title="Une interface simple pour rassembler vos souvenirs" description="Les invités déposent leurs photos sans compte, tu gères le coffre en un clic. Tout est pensé pour rester fluide sur smartphone.">
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-surface to-surface-strong/70 p-4 md:p-6 shadow-[0_12px_60px_rgba(0,0,0,0.25)]">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl border border-border/60 bg-surface-strong/80 p-2 shadow-inner">
                  <Image
                    src="/gather-logo.png"
                    alt="Logo Gather"
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Gather</p>
                  <p className="text-sm text-muted">Galerie partagée en direct</p>
                </div>
              </div>
              <p className="mt-4 text-base md:text-lg leading-relaxed text-foreground">
                Crée un coffre éphémère, partage le PIN ou le QR code, et laisse
                ton groupe déposer ses photos en toute simplicité.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {["Mobile-first", "Uploads rapides", "QR prêt à partager", "Sélection & suppression faciles"].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface/60 px-3 py-2 text-sm text-foreground"
                  >
                    <span className="h-8 w-8 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center text-lg">
                      ✦
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Création instantanée", value: "1 PIN = 1 coffre" },
                { label: "Photos partagées", value: "Illimitées*" },
                { label: "Contrôle hôte", value: "Supprime & télécharge" },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className="rounded-xl border border-border/60 bg-surface/70 px-4 py-3 shadow-inner"
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted">{feature.label}</p>
                  <p className="text-lg font-semibold text-foreground mt-1">{feature.value}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section
          className="lg:col-span-2"
          title="Créer un nouvel évènement"
          description="Un nom, un clic, on génère le PIN pour toi."
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Nom de l&apos;évènement
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border/60 bg-surface/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/60"
                placeholder="Ex : Anniversaire de Léa, Weekend à Lisbonne…"
              />
              {error && (
                <p className="text-xs text-danger" role="alert">
                  {error}
                </p>
              )}
            </div>

            <Button type="submit" variant="primary" size="lg" loading={creating} className="w-full">
              {creating ? "Création en cours..." : "Créer l’évènement"}
            </Button>

            <div className="rounded-xl border border-border/60 bg-surface/70 px-4 py-3 text-sm text-muted">
              <p className="text-foreground font-medium text-sm">Accès rapide</p>
              <p className="mt-1 text-muted text-sm">
                Invite ton groupe avec le PIN ou le QR code généré automatiquement.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <a href="/join" className="text-primary hover:underline text-sm">
                  Rejoindre un coffre existant
                </a>
                <a
                  href="/coming-soon"
                  className="text-sm text-secondary hover:underline"
                >
                  Participer à l’aventure Gather 🚀
                </a>
              </div>
            </div>
          </form>
        </Section>
      </div>
    </PageLayout>
  );
}
