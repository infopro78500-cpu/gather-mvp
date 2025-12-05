"use client";

import { useMemo, useState } from "react";

export type ImageUploadResponse = {
  success: boolean;
  isStrictDuplicate?: boolean;
  isSoftDuplicate?: boolean;
  error?: string;
};

export type ImageUploaderProps = {
  eventId: string;
  className?: string;
};

type UploadStatus = "idle" | "uploading" | "success" | "duplicate" | "error";

type DuplicateState = {
  strict: boolean;
  soft: boolean;
};

export default function ImageUploader({ eventId, className }: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateState>({ strict: false, soft: false });

  const hasDuplicate = duplicates.strict || duplicates.soft;

  const statusDisplay = useMemo(() => {
    if (status === "uploading") {
      return { icon: "🟡", text: "Upload en cours…", color: "text-amber-400" };
    }
    if (status === "success") {
      return { icon: "🟢", text: "Image ajoutée avec succès", color: "text-emerald-400" };
    }
    if (status === "duplicate") {
      return {
        icon: "🔴",
        text: message ?? "Doublon détecté : strict ou similaire (flou)",
        color: "text-red-400",
      };
    }
    if (status === "error") {
      return { icon: "🔴", text: message ?? "Une erreur est survenue lors de l'upload.", color: "text-red-400" };
    }
    return null;
  }, [message, status]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setStatus("idle");
    setMessage(null);
    setDuplicates({ strict: false, soft: false });
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setStatus("error");
      setMessage("Merci de sélectionner une image avant de continuer.");
      return;
    }

    setStatus("uploading");
    setMessage(null);
    setDuplicates({ strict: false, soft: false });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/events/${eventId}/upload-image`, {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      const data: ImageUploadResponse = await response.json();

      if (!response.ok || !data.success) {
        setStatus("error");
        setMessage(data.error ?? "Impossible d'uploader l'image.");
        return;
      }

      const nextDuplicates: DuplicateState = {
        strict: Boolean(data.isStrictDuplicate),
        soft: Boolean(data.isSoftDuplicate),
      };
      setDuplicates(nextDuplicates);

      if (nextDuplicates.strict) {
        setStatus("duplicate");
        setMessage("Image strictement identique déjà présente.");
        return;
      }

      if (nextDuplicates.soft) {
        setStatus("duplicate");
        setMessage("Image similaire déjà existante.");
        return;
      }

      setStatus("success");
      setMessage("Image ajoutée avec succès");
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
      className={`flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 ${className ?? ""}`.trim()}
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

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={status === "uploading"}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "uploading" ? "Envoi en cours..." : "Uploader l'image"}
          {status === "uploading" && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
          )}
        </button>
        {hasDuplicate && (
          <span className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200">
            Doublon détecté (strict : {duplicates.strict ? "oui" : "non"}, similaire : {duplicates.soft ? "oui" : "non"})
          </span>
        )}
      </div>

      {statusDisplay && (
        <p className={`flex items-center gap-2 text-sm ${statusDisplay.color}`} aria-live="polite">
          <span>{statusDisplay.icon}</span>
          <span>{statusDisplay.text}</span>
        </p>
      )}
    </form>
  );
}
