"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import ImageUploader from "@/app/components/ImageUploader";
import { supabase } from "@/lib/supabaseClient";
import { EventData } from "@/types/event";
import { getExpirationInfo } from "@/lib/eventLifetimes";

const validateUUID = (value: string | undefined | null): value is string => {
  if (!value) return false;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export default function EditEventPage() {
  const params = useParams<{ eventId?: string }>();
  const paramEventId = params?.eventId;
  const eventId = typeof paramEventId === "string" ? paramEventId : "";

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) {
        setError("Impossible de récupérer l'identifiant de l'événement.");
        setLoading(false);
        return;
      }

      if (!validateUUID(eventId)) {
        setError("Identifiant d'événement invalide.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("events")
        .select("id, name, pin, host_device_id, host_user_id, expires_at, lifetime_days")
        .eq("id", eventId)
        .maybeSingle<EventData>();

      if (fetchError) {
        console.error("Erreur lors de la récupération de l'événement", fetchError);
        setError("Erreur lors du chargement de l'événement.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Aucun événement trouvé.");
        setLoading(false);
        return;
      }

      setEvent(data);
      setLoading(false);
    };

    fetchEvent();
  }, [eventId]);

  const title = event?.name ?? "Événement";
  const expirationInfo = getExpirationInfo(event?.expires_at ?? null);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 md:px-6 lg:px-0">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Gestion d'événement</p>
        <h1 className="text-3xl font-semibold text-white md:text-4xl">{title}</h1>
        <p className="text-sm text-slate-300">
          Ajoutez ou mettez à jour les informations de l'événement puis téléversez des images contrôlées par l'IA locale pour
          éviter les doublons.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1.2fr]">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-white">Informations de l'événement</h2>
            <p className="text-sm text-slate-300">
              Ces informations proviennent de Supabase. Les champs sont pré-remplis pour vous aider à vérifier que vous modifiez
              le bon événement.
            </p>
          </div>

          {loading && <p className="text-sm text-slate-400">Chargement des informations...</p>}
          {error && !loading && <p className="text-sm text-red-400">{error}</p>}

          {!loading && !error && event && (
            <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Nom</dt>
                <dd className="text-base font-semibold text-white">{event.name}</dd>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">PIN</dt>
                <dd className="text-base font-semibold text-white">{event.pin}</dd>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Identifiant</dt>
                <dd className="text-base font-semibold text-white">{event.id}</dd>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Durée</dt>
                <dd className="text-base font-semibold text-white">
                  {event.lifetime_days ? `${event.lifetime_days} jour${event.lifetime_days > 1 ? "s" : ""}` : "Non définie"}
                </dd>
                <dd className="text-sm text-slate-300">
                  {expirationInfo.isExpired
                    ? expirationInfo.expiredAtLabel
                    : expirationInfo.remainingLabel}
                </dd>
              </div>
              {event.host_device_id && (
                <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Hôte</dt>
                  <dd className="text-base font-semibold text-white">{event.host_device_id}</dd>
                </div>
              )}
              {event.host_user_id && (
                <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Utilisateur</dt>
                  <dd className="text-base font-semibold text-white">{event.host_user_id}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        <ImageUploader eventId={eventId} />
      </section>
    </div>
  );
}
