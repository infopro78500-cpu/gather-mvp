"use client";

import { FormEvent, useState } from "react";
import { getDeviceId } from "@/lib/deviceId";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button, buttonClasses } from "./components/ui/button";
import { Card } from "./components/ui/card";
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
    <PageLayout className="py-8 md:py-12">
      <div className="grid gap-5 md:gap-6 lg:grid-cols-5">
        <Section className="lg:col-span-3 space-y-5 md:space-y-6">
          <div className="flex items-center gap-3 text-xs font-semibold text-primary">
            <span className="rounded-full bg-primary/10 px-3 py-1 tracking-wide text-primary shadow-inner">
              Gather - MVP
            </span>
            <span className="rounded-full border border-border/70 bg-surface px-3 py-1 text-muted">
              v0.1
            </span>
          </div>

          <div className="space-y-3 md:space-y-4">
            <h1 className="text-3xl font-semibold leading-tight text-foreground md:text-4xl">
              Crée un coffre photo éphémère pour ton groupe.
            </h1>
            <p className="text-base leading-relaxed text-muted md:text-lg">
              Un événement = un PIN + un QR code. Tout le monde peut déposer ses
              photos dans le même coffre, sans compte, en quelques secondes.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button type="submit" form="create-event-form" size="lg">
              Créer l&apos;évènement
            </Button>
            <a
              href="/join"
              className={buttonClasses({ variant: "ghost", size: "lg" })}
            >
              Rejoindre un coffre existant
            </a>
          </div>

          <Card className="p-4 md:p-5 bg-surface/80 border border-border/70 shadow-inner space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary text-lg">
                ✦
              </div>
              <p className="text-sm leading-relaxed text-foreground md:text-base">
                Parfait pour les voyages, mariages, soirées, ou un groupe qui passe
                du temps ensemble.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary text-lg">
                ✦
              </div>
              <p className="text-sm leading-relaxed text-foreground md:text-base">
                Un QR code à partager, prêt en 30 secondes.
              </p>
            </div>
          </Card>
        </Section>

        <Section
          className="lg:col-span-2"
          title="Nouveau coffre"
          description="Créer un évènement"
          actions={
            <p className="text-xs text-muted md:text-sm">
              Donne un nom à ton évènement, on génère le PIN pour toi.
            </p>
          }
        >
          <form id="create-event-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Nom de l&apos;évènement
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border/70 bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/60"
                placeholder="Ex : Anniversaire de Léa, Weekend à Lisbonne"
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

            <div className="flex flex-col gap-2 text-sm text-muted">
              <p className="text-xs text-muted md:text-sm">
                Tu as déjà un PIN ?
                <a href="/join" className="ml-1 text-primary hover:underline">
                  Rejoindre un coffre existant
                </a>
              </p>
            </div>
          </form>
        </Section>
      </div>
    </PageLayout>
  );
}
