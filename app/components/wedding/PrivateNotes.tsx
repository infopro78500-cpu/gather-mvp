"use client";

// « Un mot aux mariés » — la messagerie privée du chantier mariage (option
// Pro). Deux faces dans ce fichier : NoteModal (l'invité écrit, joint 1 à 3
// photos) et NotesInbox (les mariés lisent et modèrent). La confidentialité
// est tenue par le serveur (routes /api/events/[id]/notes) — ces composants
// n'affichent que ce que l'API veut bien leur donner.

import { useEffect, useState } from "react";

const field =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500";
const primary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed";
const ghost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800";

/** Réduit une photo côté client (~1800 px, JPEG) : un mot n'a pas besoin de
 *  20 Mo, et la route accepte 4 Mo max par pièce jointe. */
async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const long = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, 1800 / long);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export function NoteModal({
  eventId,
  tableLabel,
  onClose,
}: {
  eventId: string;
  tableLabel: string | null;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("message", message.trim());
      if (authorName.trim()) form.set("authorName", authorName.trim());
      if (tableLabel) form.set("tableLabel", tableLabel);
      for (const file of files.slice(0, 3)) {
        form.append("photos", await downscale(file), "photo.jpg");
      }
      const res = await fetch(`/api/events/${eventId}/notes`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("Le mot n'a pas pu être envoyé — réessayez.");
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Un mot aux mariés"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-800 bg-slate-950 text-slate-100 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-4">
          <div>
            <p className="font-semibold">💌 Un mot aux mariés</p>
            <p className="text-xs text-slate-400">
              Privé — seuls les mariés le liront{tableLabel ? ` · ${tableLabel}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-900"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {sent ? (
            <div className="space-y-3 py-8 text-center">
              <p className="text-3xl">💌</p>
              <p className="font-semibold">Votre mot est déposé</p>
              <p className="text-sm text-slate-400">
                Les mariés le découvriront dans leur boîte privée.
              </p>
              <button onClick={onClose} className={`${primary} mt-2`}>
                Revenir à la galerie
              </button>
            </div>
          ) : (
            <>
              <textarea
                className={`${field} min-h-32 resize-y`}
                placeholder="Écrivez votre mot… une anecdote, un vœu, un souvenir de la soirée"
                aria-label="Votre mot aux mariés"
                maxLength={1200}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <input
                className={field}
                placeholder="Votre prénom (facultatif)"
                aria-label="Votre prénom"
                maxLength={80}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
              />
              <div>
                <label className={`${ghost} w-full cursor-pointer`}>
                  📎 Joindre 1 à 3 photos{files.length > 0 ? ` (${files.length})` : ""}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) =>
                      setFiles(Array.from(e.target.files ?? []).slice(0, 3))
                    }
                  />
                </label>
                {files.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {files.map((f, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={URL.createObjectURL(f)}
                        alt=""
                        className="h-14 w-14 rounded-lg border border-slate-700 object-cover"
                      />
                    ))}
                  </div>
                )}
                <p className="mt-1 text-[11px] text-slate-400">
                  Ces photos restent privées — elles ne rejoignent pas l&apos;album.
                </p>
              </div>
              {error && (
                <p role="alert" className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {!sent && (
          <div className="border-t border-slate-800 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            <button
              disabled={busy || !message.trim()}
              onClick={() => void submit()}
              className={`${primary} w-full`}
            >
              {busy ? "Envoi…" : "Envoyer aux mariés"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface InboxNote {
  id: string;
  tableLabel: string | null;
  authorName: string | null;
  message: string;
  createdAt: string;
  photos: string[];
}

export function NotesInbox({
  eventId,
  deviceId,
  onClose,
}: {
  eventId: string;
  deviceId: string;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<InboxNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch(
        `/api/events/${eventId}/notes?deviceId=${encodeURIComponent(deviceId)}`
      );
      if (!res.ok) throw new Error("Impossible de charger les mots.");
      const body = (await res.json()) as { notes: InboxNote[] };
      setNotes(body.notes);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, deviceId]);

  const remove = async (noteId: string) => {
    const res = await fetch(`/api/events/${eventId}/notes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId, deviceId }),
    });
    if (res.ok) setNotes((n) => (n ?? []).filter((x) => x.id !== noteId));
    setConfirmId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mots reçus"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-800 bg-slate-950 text-slate-100 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-4">
          <div>
            <p className="font-semibold">💌 Les mots de vos invités</p>
            <p className="text-xs text-slate-400">
              Privé — visible de vous seuls
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-900"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {error && <p className="text-sm text-red-300">{error}</p>}
          {notes === null && !error && (
            <p className="animate-pulse text-sm text-slate-400">Chargement…</p>
          )}
          {notes?.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              Aucun mot pour l&apos;instant — ils arriveront au fil de la soirée.
            </p>
          )}
          {notes?.map((n) => (
            <div key={n.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-slate-400">
                  {n.authorName || "Un invité"}
                  {n.tableLabel ? ` · ${n.tableLabel}` : ""} ·{" "}
                  {new Date(n.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <button
                  onClick={() =>
                    confirmId === n.id ? void remove(n.id) : setConfirmId(n.id)
                  }
                  className={`shrink-0 rounded border px-2 py-0.5 text-[11px] ${
                    confirmId === n.id
                      ? "border-red-700 bg-red-950/60 text-red-200"
                      : "border-slate-700 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {confirmId === n.id ? "Confirmer ?" : "Supprimer"}
                </button>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-100">{n.message}</p>
              {n.photos.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {n.photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-16 w-16 rounded-lg border border-slate-700 object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
