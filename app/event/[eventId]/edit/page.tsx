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
  const [contestEnabled, setContestEnabled] = useState(false);
  const [contestEndsAt, setContestEndsAt] = useState<string>("");
  const [contestSaving, setContestSaving] = useState(false);
  const [contestMessage, setContestMessage] = useState<string | null>(null);
  const [contestError, setContestError] = useState<string | null>(null);

  const toDateTimeLocalValue = (value: string | null | undefined) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const toIsoString = (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  };

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
        .select(
          "id, name, pin, host_device_id, host_user_id, expires_at, lifetime_days, contest_enabled, contest_ends_at"
        )
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
      setContestEnabled(Boolean(data.contest_enabled));
      setContestEndsAt(toDateTimeLocalValue(data.contest_ends_at ?? null));
      setLoading(false);
    };

    fetchEvent();
  }, [eventId]);

  const title = event?.name ?? "Événement";
  const expirationInfo = getExpirationInfo(event?.expires_at ?? null);

  const handleContestSave = async () => {
    if (!event) return;

    setContestSaving(true);
    setContestError(null);
    setContestMessage(null);

    const contestEndsAtIso = toIsoString(contestEndsAt);

    if (contestEndsAt && !contestEndsAtIso) {
      setContestError("Date de fin invalide.");
      setContestSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("events")
      .update({
        contest_enabled: contestEnabled,
        contest_ends_at: contestEndsAtIso,
      })
      .eq("id", event.id);

    if (updateError) {
      console.error("Erreur lors de la mise à jour du concours", updateError);
      setContestError("Impossible d'enregistrer les paramètres du concours.");
      setContestSaving(false);
      return;
    }

    setEvent((prev) =>
      prev
        ? {
            ...prev,
            contest_enabled: contestEnabled,
            contest_ends_at: contestEndsAtIso,
          }
        : prev
    );
    setContestMessage("Paramètres du concours enregistrés ✅");
    setContestSaving(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 md:px-6 lg:px-0">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Gestion d’événement</p>
        <h1 className="text-3xl font-semibold text-white md:text-4xl">{title}</h1>
        <p className="text-sm text-slate-300">
            Ajoutez ou mettez à jour les informations de l’événement puis téléversez des images contrôlées par l’IA locale pour
            éviter les doublons.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1.2fr]">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
          <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-white">Informations de l’événement</h2>
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
                  {expirationInfo.statusLabel}
                  {expirationInfo.isExpired && (
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {expirationInfo.expiredAtLabel}
                    </span>
                  )}
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

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-white">Concours</h2>
          <p className="text-sm text-slate-300">
            Activez le mode concours pour autoriser les votes sur les photos et définir une date de fin.
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={contestEnabled}
              onChange={(event) => setContestEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-400"
            />
            <span>Activer le mode concours</span>
          </label>

          <label className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Fin du vote (optionnel)</span>
            <input
              type="datetime-local"
              value={contestEndsAt}
              onChange={(event) => setContestEndsAt(event.target.value)}
              disabled={!contestEnabled}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span className="text-xs text-slate-400">
              Laissez vide pour un concours sans date de fin.
            </span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleContestSave}
            disabled={contestSaving || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {contestSaving ? "Sauvegarde..." : "Enregistrer le concours"}
          </button>
          {contestMessage && (
            <span className="text-sm text-emerald-400">{contestMessage}</span>
          )}
          {contestError && <span className="text-sm text-red-400">{contestError}</span>}
        </div>
      </section>
    </div>
  );
}
