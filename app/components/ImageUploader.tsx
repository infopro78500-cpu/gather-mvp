"use client";

import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

export type ImageUploadResponse = {
  ok?: boolean;
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

type UploadStatus = "idle" | "success" | "fuzzy" | "strict" | "error" | "uploading";

const STATUS_CONFIG = {
  idle: {
    icon: "ℹ️",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    text: "text-slate-200",
    defaultMessage: "Prêt pour un nouveau téléversement",
  },
  success: {
    icon: "✅",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-200",
    defaultMessage: "Image enregistrée avec succès",
  },
  fuzzy: {
    icon: "⚠️",
    bg: "bg-amber-500/10",
    border: "border-amber-400/30",
    text: "text-amber-200",
    defaultMessage: "Image similaire détectée",
  },
  strict: {
    icon: "⛔",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-200",
    defaultMessage: "Image identique détectée",
  },
  error: {
    icon: "❌",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-200",
    defaultMessage: "Le téléversement a échoué",
  },
  uploading: {
    icon: "⏳",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    text: "text-sky-200",
    defaultMessage: "Téléversement en cours...",
  },
} as const satisfies Record<UploadStatus, { icon: string; bg: string; border: string; text: string; defaultMessage: string }>;

type AlertState = {
  type: "success" | "warning" | "error" | "info";
  message: string;
};

type DuplicateState = {
  strict: boolean;
  fuzzy: boolean;
};

export default function ImageUploader({ eventId, className }: ImageUploaderProps) {
  const params = useParams<{ eventId?: string }>();
  const resolvedEventId = eventId ?? params?.eventId ?? "";

  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateState>({ strict: false, fuzzy: false });

  const statusDisplay = useMemo(() => {
    if (!alert) return null;

    const config = STATUS_CONFIG[status];
    return {
      icon: config.icon,
      className: `${config.text} ${config.bg} ${config.border}`,
      text: alert.message ?? config.defaultMessage,
    };
  }, [alert, status]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setStatus("idle");
    setAlert(null);
    setDuplicates({ strict: false, fuzzy: false });
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resolvedEventId) {
      setStatus("error");
      setAlert({ type: "error", message: "Impossible de déterminer l'identifiant de l'événement." });
      return;
    }

    if (!file) {
      setStatus("error");
      setAlert({ type: "error", message: "Merci de sélectionner une image avant de continuer." });
      return;
    }

    setStatus("uploading");
    setAlert({ type: "info", message: "Envoi de l'image en cours..." });
    setDuplicates({ strict: false, fuzzy: false });

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`/api/events/${resolvedEventId}/upload-image`, {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      let data: ImageUploadResponse;
      try {
        data = (await response.json()) as ImageUploadResponse;
      } catch (jsonError) {
        console.error("Upload response parse error", jsonError);
        data = { success: false, ok: false, error: "Réponse invalide du serveur." };
      }

      const nextDuplicates: DuplicateState = {
        strict: Boolean(data.strictMatch ?? data.isStrictDuplicate),
        fuzzy: Boolean(data.fuzzyMatch ?? data.isSoftDuplicate),
      };
      setDuplicates(nextDuplicates);

      if (!response.ok || (!data.success && !data.ok)) {
        setStatus("error");
        setAlert({
          type: "error",
          message: data.error ?? data.message ?? "Échec de l'upload.",
        });
        return;
      }

      if (nextDuplicates.strict) {
        setStatus("strict");
        setAlert({ type: "error", message: data.message ?? "Image déjà présente (identique)." });
        return;
      }

      if (nextDuplicates.fuzzy) {
        setStatus("fuzzy");
        setAlert({ type: "warning", message: data.message ?? "Image déjà présente (similaire)." });
        return;
      }

      setStatus("success");
      setAlert({ type: "success", message: data.message ?? "Image ajoutée avec succès." });
      setFile(null);
      formRef.current?.reset();
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error", error);
      setStatus("error");
      setAlert({ type: "error", message: "Une erreur technique est survenue lors de l’upload." });
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleUpload}
      className={`flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30 ${className ?? ""}`.trim()}
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="event-image">
          Ajouter une image à l’événement
        </label>
        <input
          id="event-image"
          type="file"
          name="file"
          accept="image/*"
          ref={inputRef}
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
        <div
          className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-inner shadow-slate-950/40 backdrop-blur ${statusDisplay.className}`}
          aria-live="polite"
          role={status === "error" || status === "strict" ? "alert" : "status"}
        >
          <span className="text-lg" aria-hidden>
            {statusDisplay.icon}
          </span>
          <div className="flex flex-col gap-1 text-slate-100">
            <p className="font-semibold capitalize text-slate-50">
              {status === "success" && "Téléversement réussi"}
              {status === "fuzzy" && "Similitude détectée"}
              {status === "strict" && "Doublon détecté"}
              {status === "error" && "Échec du téléversement"}
              {status === "uploading" && "Téléversement en cours"}
            </p>
            <p className="leading-relaxed text-slate-200">{statusDisplay.text}</p>
          </div>
        </div>
      )}
    </form>
  );
}
