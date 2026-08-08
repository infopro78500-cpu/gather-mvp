"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import ImageUploader from "@/app/components/ImageUploader";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { EventData } from "@/types/event";
import { getExpirationInfo } from "@/lib/eventLifetimes";
import { getDeviceId } from "@/lib/deviceId";

const validateUUID = (value: string | undefined | null): value is string => {
  if (!value) return false;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export default function EditEventPage() {
  const params = useParams<{ eventId?: string }>();
  const paramEventId = params?.eventId;
  const eventId = typeof paramEventId === "string" ? paramEventId : "";
  const supabase = getSupabaseClient();

  const [event, setEvent] = useState<EventData | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
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
    setDeviceId(getDeviceId());
  }, []);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!supabase) {
        setError("Supabase n'est pas configuré.");
        setLoading(false);
        return;
      }

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
          "id, name, pin, host_device_id, host_user_id, expires_at, lifetime_days, contest_enabled, contest_enabled_at, contest_ends_at, pro_enabled_at, table_count"
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
  }, [eventId, supabase]);

  const title = event?.name ?? "Événement";
  const expirationInfo = getExpirationInfo(event?.expires_at ?? null);
  const isHost = Boolean(event && deviceId && event.host_device_id === deviceId);

  const handleContestSave = async () => {
    if (!event) return;

    if (!isHost) {
      setContestError("Seul l'organisateur peut modifier cet évènement.");
      return;
    }

    setContestSaving(true);
    setContestError(null);
    setContestMessage(null);

    const contestEndsAtIso = toIsoString(contestEndsAt);

    if (contestEndsAt && !contestEndsAtIso) {
      setContestError("Date de fin invalide.");
      setContestSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/events/${event.id}/contest-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          contestEnabled,
          contestEndsAt: contestEndsAtIso,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setContestError(
          body?.error ?? "Impossible d'enregistrer les paramètres du concours."
        );
        setContestSaving(false);
        return;
      }

      const updated = await response.json();

      setEvent((prev) =>
        prev
          ? {
              ...prev,
              contest_enabled: updated.contest_enabled,
              contest_enabled_at: updated.contest_enabled_at,
              contest_ends_at: updated.contest_ends_at,
            }
          : prev
      );
      setContestMessage("Paramètres du concours enregistrés ✅");
    } catch (err) {
      console.error("Erreur lors de la mise à jour du concours", err);
      setContestError("Impossible d'enregistrer les paramètres du concours.");
    } finally {
      setContestSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 md:px-6 lg:px-0">
      {event?.pin && (
        <a
          href={`/events/${event.pin}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-teal-300 hover:text-teal-200"
        >
          ← Retour à l’événement
        </a>
      )}
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

        {!loading && !error && !isHost && (
          <p className="mt-4 text-sm text-amber-400">
            Seul l&apos;organisateur de cet évènement (sur son appareil d&apos;origine) peut modifier ces paramètres.
          </p>
        )}

        {isHost && (
          <>
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
          </>
        )}
      </section>

      <WeddingProSection
        event={event}
        isHost={isHost}
        deviceId={deviceId}
        onChanged={(patch) => setEvent((e) => (e ? { ...e, ...patch } : e))}
      />
    </div>
  );
}

/**
 * Chantier mariage — l'OPTION PRO de l'événement : galeries par table +
 * mots privés aux mariés. Un QR différent par table (c'est ce qui rend le
 * présentoir unique et nécessaire, cf. idee-galeries-par-table.md §2).
 * Activation offerte pendant la bêta ; Stripe s'insérera ici.
 */
function WeddingProSection({
  event,
  isHost,
  deviceId,
  onChanged,
}: {
  event: EventData | null;
  isHost: boolean;
  deviceId: string | null;
  onChanged: (patch: Partial<EventData>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [countInput, setCountInput] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  useEffect(() => {
    setCountInput(event?.table_count ? String(event.table_count) : "");
  }, [event?.table_count]);

  if (!event) return null;
  const pro = Boolean(event.pro_enabled_at);
  const tableCount = event.table_count ?? 0;

  const post = async (body: Record<string, unknown>) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${event.id}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, deviceId }),
      });
      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error("L'enregistrement a échoué — réessayez.");
      return payload;
    } catch (e) {
      setMessage((e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const tableLink = (i: number) =>
    `${origin}/join?pin=${event.pin}&table=${encodeURIComponent(`Table ${i}`)}`;

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-white">Mariage — galeries par table</h2>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
          Option Pro
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-300">
        Un QR différent par table : chaque photo déposée porte sa table, l&apos;album
        se parcourt table par table, et les invités peuvent envoyer un mot privé
        aux mariés — visible de vous seuls.
      </p>

      {!isHost && (
        <p className="mt-4 text-sm text-amber-400">
          Seul l&apos;organisateur peut gérer cette option.
        </p>
      )}

      {isHost && !pro && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              const r = await post({ action: "activate-pro" });
              if (r) onChanged({ pro_enabled_at: new Date().toISOString() });
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Activation…" : "Activer — offert pendant la bêta"}
          </button>
          <span className="text-xs text-slate-400">
            Le tarif de l&apos;option arrivera avec le paiement en ligne.
          </span>
        </div>
      )}

      {isHost && pro && (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Nombre de tables
              </span>
              <input
                type="number"
                min={0}
                max={60}
                value={countInput}
                onChange={(e) => setCountInput(e.target.value)}
                className="w-32 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                const n = Math.max(0, Math.min(60, Number(countInput) || 0));
                const r = await post({ action: "set-count", tableCount: n });
                if (r) {
                  onChanged({ table_count: n });
                  setMessage("Enregistré.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Enregistrer
            </button>
            {message && <span className="text-sm text-emerald-400">{message}</span>}
          </div>

          {tableCount > 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-400">
                Le lien de chaque table — à encoder dans son QR (présentoirs à
                venir via l&apos;impression) ou à partager tel quel :
              </p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {Array.from({ length: tableCount }, (_, i) => i + 1).map((i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-300"
                  >
                    <span className="truncate">Table {i}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard
                          ?.writeText(tableLink(i))
                          .then(() => {
                            setCopied(`t${i}`);
                            setTimeout(() => setCopied(null), 1500);
                          })
                          .catch(() => {});
                      }}
                      className="shrink-0 rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                    >
                      {copied === `t${i}` ? "Copié ✓" : "Copier le lien"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
