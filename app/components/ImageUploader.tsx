"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

export type ImageUploadResponse = {
  success: boolean;
  strictMatch?: boolean;
  fuzzyMatch?: boolean;
  isStrictDuplicate?: boolean;
  isSoftDuplicate?: boolean;
  message?: string;
  error?: string;
};

export type ImageUploaderProps = {
  eventId?: string;
  className?: string;
};

const STATUS_ICON = {
  success: "✅",
  fuzzy: "⚠️",
  strict: "❌",
  error: "❌",
  uploading: "⏳",
} as const;

type UploadStatus = "idle" | "uploading" | "success" | "fuzzy" | "strict" | "error";

type DuplicateState = {
  strict: boolean;
  fuzzy: boolean;
};

export default function ImageUploader({ eventId, className }: ImageUploaderProps) {
  const params = useParams<{ eventId?: string }>();
  const resolvedEventId = eventId ?? params?.eventId ?? "";

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateState>({ strict: false, fuzzy: false });

  const statusDisplay = useMemo(() => {
    if (status === "idle") return null;

    const icon = STATUS_ICON[status];
    const baseClass =
      status === "success"
        ? "text-emerald-400"
        : status === "fuzzy"
          ? "text-amber-300"
          : status === "strict"
            ? "text-red-400"
            : status === "uploading"
              ? "text-sky-300"
              : "text-red-400";

    return { icon, className: baseClass, text: message };
  }, [message, status]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setStatus("idle");
    setMessage(null);
    setDuplicates({ strict: false, fuzzy: false });
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resolvedEventId) {
      setStatus("error");
      setMessage("Impossible de déterminer l'identifiant de l'événement.");
      return;
    }

    if (!file) {
      setStatus("error");
      setMessage("Merci de sélectionner une image avant de continuer.");
      return;
    }

    setStatus("uploading");
    setMessage("Envoi de l'image en cours...");
    setDuplicates({ strict: false, fuzzy: false });

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`/api/events/${resolvedEventId}/upload-image`, {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      const data: ImageUploadResponse = await response.json();

      if (!response.ok || !data.success) {
        setStatus("error");
        setMessage(data.message ?? data.error ?? "Impossible d'uploader l'image.");
        return;
      }

      const nextDuplicates: DuplicateState = {
        strict: Boolean(data.strictMatch ?? data.isStrictDuplicate),
        fuzzy: Boolean(data.fuzzyMatch ?? data.isSoftDuplicate),
      };
      setDuplicates(nextDuplicates);

      if (nextDuplicates.strict) {
        setStatus("strict");
        setMessage(data.message ?? "Image déjà présente (identique)");
        return;
      }

      if (nextDuplicates.fuzzy) {
        setStatus("fuzzy");
        setMessage(data.message ?? "Image déjà présente (similaire)");
        return;
      }

      setStatus("success");
      setMessage(data.message ?? "Image enregistrée");
      setFile(null);
      event.currentTarget.reset();
    } catch (error) {
      console.error("Upload error", error);
      setStatus("error");
      setMessage("Une erreur technique est survenue lors de l'upload.");
    }
  };

  return (
    <form
      onSubmit={handleUpload}
      className={`flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30 ${className ?? ""}`.trim()}
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="event-image">
          Ajouter une image à l'événement
        </label>
        <input
          id="event-image"
          type="file"
          name="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 file:mr-4 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:border-teal-400 focus:border-teal-400 focus:outline-none"
        />
        {file && (
          <p className="text-xs text-slate-400" aria-live="polite">
            Fichier sélectionné : {file.name}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "uploading"}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "uploading" ? "Envoi en cours..." : "Téléverser une image"}
          {status === "uploading" && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
          )}
        </button>

        {duplicates.fuzzy && !duplicates.strict && (
          <span className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200">
            ⚠️ Image déjà présente (similaire)
          </span>
        )}

        {duplicates.strict && (
          <span className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200">
            ❌ Image déjà présente (identique)
          </span>
        )}
      </div>

      {statusDisplay && (
        <p className={`flex items-center gap-2 text-sm ${statusDisplay.className}`} aria-live="polite">
          <span>{statusDisplay.icon}</span>
          <span>{statusDisplay.text}</span>
        </p>
      )}
    </form>
  );
}
