"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import QRCode from "react-qr-code";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { EventData } from "@/types/event";
import { Photo } from "@/types/photo";
import { EventHeader } from "@/app/components/events/EventHeader";
import { getDeviceId as getEventDeviceId } from "@/lib/deviceId";

const BUCKET_NAME = "event-photos";
const MAX_FILES = 20; // max 20 fichiers à la fois
const MAX_FILE_SIZE_MB = 10; // max 10 Mo par fichier

type PhotoItem = Photo & {
  uploaderDeviceId?: string | null;
};

export default function EventPage() {
  const params = useParams<{ pin: string }>();
  const pin = params.pin;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [isCoffreOpen, setIsCoffreOpen] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [multiDeleteMode, setMultiDeleteMode] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadInfo, setUploadInfo] = useState<{
    processed: number;
    total: number;
  } | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);


  const photoCount = photos.length;
  const hasPhotos = photoCount > 0;

  useEffect(() => {
    const id = getEventDeviceId();
    setDeviceId(id);
  }, []);

  useEffect(() => {
    if (event && deviceId) {
      setIsHost(event.host_device_id === deviceId);
    }
  }, [event, deviceId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const shareUrl = origin && event ? `${origin}/join?pin=${event.pin}` : null;

  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("pin", pin)
        .maybeSingle<EventData>();

      if (eventError) {
        console.error(eventError);
        setError("Erreur lors du chargement de l'évènement.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Aucun évènement trouvé pour ce PIN.");
        setLoading(false);
        return;
      }

      setEvent(data);
      setLoading(false);
    };

    if (pin) {
      fetchEvent();
    }
  }, [pin]);

  const refreshPhotos = useCallback(
    async (evt: EventData, { silent }: { silent?: boolean } = {}): Promise<void> => {
      try {
        if (!silent) {
          setIsRefreshing(true);
        }

        const { data: files, error: listError } = await supabase.storage
          .from(BUCKET_NAME)
          .list(evt.id, {
            limit: 200,
            sortBy: { column: "name", order: "asc" },
          });

        if (listError) {
          console.error("Erreur lors de la récupération des photos", listError);
          setError("Erreur lors du chargement des photos.");
          setPhotos([]);
          return;
        }

        const safeFiles = files ?? [];

        const photosWithUrl: PhotoItem[] = safeFiles
          .map((file): PhotoItem | null => {
            if (!file) return null;

            const path = `${evt.id}/${file.name}`;
            const filename = file.name || "";

            const uploaderDeviceId = filename.includes("__")
              ? filename.split("__")[0]
              : undefined;

            const { data: publicData } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(path);

            if (!publicData?.publicUrl) {
              return null;
            }

            return {
              name: file.name,
              path,
              url: publicData.publicUrl,
              uploaderDeviceId,
            };
          })
          .filter((p): p is PhotoItem => p !== null);

        setPhotos((prev) => {
          const isSameLength = prev.length === photosWithUrl.length;
          const hasSamePaths = isSameLength
            ? prev.every((p, idx) => p.path === photosWithUrl[idx]?.path)
            : false;

          // On évite les re-renders inutiles pour que la galerie ne "clignote" pas.
          return hasSamePaths ? prev : photosWithUrl;
        });
      } catch (err) {
        console.error("Erreur inattendue lors du chargement des photos", err);
        setError("Erreur lors du chargement des photos.");
        setPhotos([]);
      } finally {
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (event) {
      refreshPhotos(event);
    }
  }, [event, refreshPhotos]);

  useEffect(() => {
    if (!event) return;

    const intervalId = setInterval(() => {
      refreshPhotos(event, { silent: true });
    }, 8000);

    // Nettoyage pour éviter les fuites mémoire.
    return () => {
      clearInterval(intervalId);
    };
  }, [event, refreshPhotos]);

  const canDeletePhoto = (photo: PhotoItem): boolean => {
    if (!deviceId) return false;
    if (isHost) return true;
    return photo.uploaderDeviceId === deviceId;
  };

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const files = e.target.files;
    if (!files || files.length === 0 || !event) return;

    const filesArray = Array.from(files);

    const currentDeviceId = getEventDeviceId();
    if (!currentDeviceId) {
      console.error("Impossible de récupérer le deviceId");
      setError("Erreur : appareil non identifié.");
      return;
    }

    if (filesArray.length > MAX_FILES) {
      alert(`Tu peux envoyer maximum ${MAX_FILES} fichiers à la fois.`);
      return;
    }

    setUploading(true);
    setError(null);
    setUploadError(null);
    setUploadInfo({ processed: 0, total: filesArray.length });

    try {
      const newPhotos: PhotoItem[] = [];
      const rejectedFiles: string[] = [];

      for (const file of filesArray) {
        const sizeMb = file.size / (1024 * 1024);
        if (sizeMb > MAX_FILE_SIZE_MB) {
          console.warn(`Fichier trop lourd : ${file.name}`);
          rejectedFiles.push(file.name);
          continue;
        }

        const safeName = file.name
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9.\-_]/g, "_");

        const filenameOnStorage = `${currentDeviceId}__${Date.now()}-${safeName}`;
        const path = `${event.id}/${filenameOnStorage}`;

        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(path, file);

          if (uploadError) {
            console.error("Erreur upload Supabase", uploadError);
            continue;
          }

          if (!uploadData) {
            console.warn("Upload terminé sans données retournées", {
              path,
              file: file.name,
            });
            continue;
          }

          const { data: publicData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(path);

          if (!publicData?.publicUrl) {
            console.warn("URL publique manquante après upload", { path });
            continue;
          }

          newPhotos.push({
            name: filenameOnStorage,
            url: publicData.publicUrl,
            path,
            uploaderDeviceId: currentDeviceId,
          });
        } catch (err) {
          console.error("Erreur inattendue lors de l’upload d’un fichier", err);
        }

        setUploadInfo((prev) =>
          prev ? { ...prev, processed: prev.processed + 1 } : null
        );
      }

      if (rejectedFiles.length > 0) {
        const rejectedList = rejectedFiles.join(", ");
        const message = `${rejectedFiles.length} fichier${
          rejectedFiles.length > 1 ? "s" : ""
        } n'ont pas été ajoutés car ils dépassent 10 Mo : ${rejectedList}`;
        setUploadError(message);
      }

      if (newPhotos.length > 0) {
        setPhotos((prev) => [...prev, ...newPhotos]);
        setUploadSuccess("Upload terminé ✨");
        setTimeout(() => setUploadSuccess(null), 2000);
      }
    } finally {
      if (event) {
        await refreshPhotos(event);
      }
      setUploading(false);
      setUploadInfo(null);
      if (!uploadError) {
        setUploadError(null);
      }
      e.target.value = "";
    }
  };


  const handleDelete = async (photo: PhotoItem): Promise<void> => {
    if (!event) return;

    if (!canDeletePhoto(photo)) return;

    const confirmDelete = window.confirm(
      "Supprimer définitivement cette photo de l'espace commun ?"
    );
    if (!confirmDelete) return;

    setDeletingPath(photo.path);
    setPhotos((prev) => prev.filter((p) => p.path !== photo.path));

    try {
      try {
        const { error: deleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([photo.path]);

        if (deleteError) {
          console.error("Erreur Supabase lors de la suppression", {
            path: photo.path,
            error: deleteError,
          });
        }
      } catch (err) {
        console.error("Erreur inattendue lors de la suppression de la photo", err);
      }
    } finally {
      await refreshPhotos(event);
      setDeletingPath(null);
    }
  };

  const toggleSelectPhoto = (path: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleDeleteSelected = async (): Promise<void> => {
    if (!event || selectedPhotos.length === 0) return;

    const allowedPaths = selectedPhotos.filter((path) => {
      const photo = photos.find((p) => p.path === path);
      return photo ? canDeletePhoto(photo) : false;
    });

    if (allowedPaths.length === 0) {
      alert("Aucune photo autorisée à être supprimée.");
      return;
    }

    const ok = window.confirm(
      `Supprimer définitivement ${selectedPhotos.length} photo${
        selectedPhotos.length > 1 ? "s" : ""
      } ?`
    );
    if (!ok) return;

    setPhotos((prev) => prev.filter((p) => !allowedPaths.includes(p.path)));
    setSelectedPhotos([]);
    setMultiDeleteMode(false);

    try {
      try {
        const { error: deleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove(allowedPaths);

        if (deleteError) {
          console.error("Erreur Supabase lors de la suppression multiple", {
            paths: allowedPaths,
            error: deleteError,
          });
        }
      } catch (err) {
        console.error("Erreur inattendue lors de la suppression multiple", err);
      }
    } finally {
      await refreshPhotos(event);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    alert("Lien de l’évènement copié dans le presse-papiers ✅");
  };

  const formatForFilename = (label: string): string =>
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  const downloadPhotos = async (
    photosToDownload: PhotoItem[],
    zipLabel: string
  ): Promise<void> => {
    if (!event) return;

    if (photosToDownload.length === 0) {
      alert("Aucune photo à télécharger.");
      return;
    }

    try {
      setDownloading(true);

      const zip = new JSZip();

      for (const photo of photosToDownload) {
        const response = await fetch(photo.url);
        if (!response.ok) {
          console.error("Erreur de téléchargement pour", photo.url);
          continue;
        }
        const blob = await response.blob();

        const filename =
          photo.name || photo.path.split("/").pop() || "photo.jpg";

        zip.file(filename, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const eventLabel = event?.name ? formatForFilename(event.name) : zipLabel;
      const dateLabel = new Date().toISOString().split("T")[0];
      const zipName = `${eventLabel || "gather"}_${zipLabel}_${dateLabel}.zip`;
      saveAs(content, zipName);
    } catch (err) {
      console.error("Erreur lors de la création du ZIP :", err);
      alert("Erreur lors de la création du fichier ZIP.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    await downloadPhotos(photos, event ? event.pin || event.id : "coffre");
  };

  const handleDownloadSelected = async () => {
    if (!event) return;

    if (selectedPhotos.length === 0) {
      alert("Sélectionne au moins une photo pour télécharger.");
      return;
    }

    const photosToDownload = photos.filter((photo) =>
      selectedPhotos.includes(photo.path)
    );

    await downloadPhotos(
      photosToDownload,
      `${event.pin || event.id}-selection`
    );
  };

  const contributorCount = useMemo(() => {
    const ids = new Set<string>();
    photos.forEach((photo) => {
      if (photo.uploaderDeviceId) ids.add(photo.uploaderDeviceId);
    });
    return ids.size;
  }, [photos]);

  const [thankPulse, setThankPulse] = useState(false);

  useEffect(() => {
    if (!hasPhotos) return;
    setThankPulse(true);
    const timeout = setTimeout(() => setThankPulse(false), 1200);
    return () => clearTimeout(timeout);
  }, [photoCount, hasPhotos]);

  const festiveEmoji = "🎄";

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-amber-100 text-slate-900 px-4 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {loading && (
          <p className="text-center text-sm text-slate-600">
            Chargement de l’évènement...
          </p>
        )}

        {!loading && error && (
          <p className="text-center text-sm text-red-500">{error}</p>
        )}

        {!loading && event && (
          <>
            <section className="overflow-hidden rounded-3xl border border-amber-200 bg-white/80 shadow-2xl backdrop-blur">
              <div className="flex flex-col gap-4 bg-gradient-to-r from-rose-500 via-amber-400 to-amber-500 px-6 py-5 text-white md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <span className="text-2xl" aria-hidden>
                      {festiveEmoji}
                    </span>
                    <span>{event.name}</span>
                  </p>
                  <p className="text-xs md:text-sm text-white/90">
                    Partagez vos photos ici en scannant le QR code ou en les ajoutant ci-dessous.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-2 text-sm font-semibold shadow-inner">
                  <span className="text-white/90">PIN</span>
                  <span className="rounded-full bg-white px-3 py-1 text-rose-600 shadow-sm">
                    {event.pin}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <EventHeader event={event} />

                {shareUrl && (
                  <section className="rounded-2xl border border-amber-100 bg-gradient-to-r from-white via-amber-50 to-white px-5 py-5 shadow-inner flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 flex flex-col gap-2">
                        <p className="text-[11px] tracking-wide uppercase text-amber-700 font-semibold">
                          Partage de l’évènement
                        </p>
                        <p className="text-base font-semibold text-slate-900">
                          Invite ton groupe à rejoindre ce coffre.
                        </p>
                        <p className="text-sm text-slate-600">
                          Copie le lien ou scanne le QR code pour partager rapidement.
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="w-full overflow-hidden rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-[11px] text-slate-800 shadow-inner">
                            {shareUrl}
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyLink}
                            className="self-start inline-flex items-center gap-2 rounded-md bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-rose-600"
                          >
                            📋 Copier le lien
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center md:items-start justify-center md:justify-end">
                        <div className="rounded-xl border border-amber-200 bg-white/80 p-4 shadow-lg">
                          <QRCode value={shareUrl} size={128} bgColor="transparent" fgColor="#b91c1c" />
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-amber-200 bg-white/90 px-5 py-5 shadow-xl backdrop-blur">
              <button
                type="button"
                onClick={() => setIsCoffreOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-gradient-to-r from-amber-50 to-white hover:from-amber-100 hover:to-white border border-amber-100 transition-all duration-200 shadow-sm"
              >
                <div className="flex flex-col text-left">
                  <p className="text-[11px] tracking-wide uppercase text-amber-700 font-semibold">
                    Espace commun du groupe
                  </p>
                  <p className="text-base font-semibold text-slate-900">Galerie photo commune</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Cliquez pour {isCoffreOpen ? "masquer la galerie." : "ouvrir la galerie."}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] text-amber-800 mt-1 border border-amber-200">
                    {hasPhotos ? (
                      <>
                        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
                        {photoCount} photo
                        {photoCount > 1 ? "s" : ""} partagée
                        {photoCount > 1 ? "s" : ""}
                      </>
                    ) : (
                      "Aucune photo"
                    )}
                  </span>
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg border border-amber-200 bg-gradient-to-br from-white via-amber-50 to-amber-100 shadow-inner">
                    <span className="text-xl">{isCoffreOpen ? "📖" : "🔒"}</span>
                  </div>

                  <p className="text-[11px] uppercase tracking-wide text-amber-700 mb-1">
                    {isCoffreOpen ? "Coffre ouvert" : "Coffre fermé"}
                  </p>
                </div>
              </button>

              <div
                className={`mt-3 overflow-hidden transition-all duration-300 ease-out ${
                  isCoffreOpen
                    ? "max-h-[2000px] opacity-100 translate-y-0"
                    : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"
                }`}
              >
                <div className="flex flex-col gap-3 mb-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {photoCount} photo{photoCount > 1 ? "s" : ""} partagée{photoCount > 1 ? "s" : ""}
                      {contributorCount > 0 && ` · ${contributorCount} appareil${contributorCount > 1 ? "s" : ""}`}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-amber-700">
                      {isRefreshing && <span className="h-3 w-3 rounded-full bg-amber-400 animate-ping" aria-hidden />}
                      <span>{isRefreshing ? "Actualisation..." : "Mise à jour auto toutes les 8s"}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => {
                        setMultiDeleteMode((prev) => !prev);
                        setSelectedPhotos([]);
                      }}
                      className="text-xs font-medium text-rose-600 underline-offset-4 hover:underline"
                    >
                      {multiDeleteMode
                        ? "Quitter le mode sélection"
                        : "Sélectionner plusieurs photos"}
                    </button>
                    <p className="text-[11px] text-slate-600 text-center leading-relaxed max-w-[560px]">
                      {isHost
                        ? "En tant qu'hôte, vous pouvez supprimer toutes les photos du coffre."
                        : "Vous pouvez supprimer uniquement les photos que vous avez envoyées. Seul l'hôte peut supprimer l'ensemble des photos."}
                    </p>

                    <label
                      className={`px-4 py-2 rounded-lg cursor-pointer text-slate-900 font-semibold text-sm shadow-sm inline-flex items-center gap-2 transition-all ${
                        uploading
                          ? "bg-amber-300/80 opacity-80 pointer-events-none"
                          : "bg-amber-400 hover:bg-amber-300"
                      }`}
                    >
                      <span>{uploading ? "⌛" : "📤"}</span>
                      {uploading
                        ? uploadInfo
                          ? `Upload : ${uploadInfo.processed}/${uploadInfo.total}`
                          : "Upload en cours..."
                        : "Ajouter des photos à l’espace commun"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleUpload}
                        disabled={uploading}
                      />
                    </label>
                    {uploadError && (
                      <p className="text-xs text-red-500 text-center max-w-[360px]">
                        {uploadError}
                      </p>
                    )}
                    {uploadSuccess && (
                      <p className="text-xs text-green-600 text-center">{uploadSuccess}</p>
                    )}

                    {multiDeleteMode && selectedPhotos.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadSelected}
                          disabled={downloading}
                          className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 border border-amber-200 transition-colors hover:bg-amber-50 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                        >
                          {downloading
                            ? "Préparation du ZIP..."
                            : "Télécharger la sélection (ZIP)"}
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteSelected}
                          className="rounded-md bg-rose-500 hover:bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm"
                        >
                          Supprimer {selectedPhotos.length} photo(s)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPhotos([])}
                          className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 border border-amber-200 transition-colors hover:bg-amber-50 shadow-sm"
                        >
                          Réinitialiser la sélection
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap justify-center gap-2 text-[11px] text-slate-600">
                      <span>Max {MAX_FILES} fichiers</span>
                      <span>—</span>
                      <span>10 Mo par fichier</span>
                      <span>—</span>
                      <span>Formats : JPG, PNG...</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 text-xs text-slate-600">
                      <button
                        type="button"
                        onClick={handleDownloadAll}
                        disabled={downloading}
                        className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 border border-amber-200 transition-colors hover:bg-amber-50 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                      >
                        {downloading
                          ? "Préparation du ZIP..."
                          : "Télécharger toutes les photos (ZIP)"}
                      </button>
                      <p className="text-[11px] text-slate-500">
                        Téléchargez toutes les photos en un seul fichier ZIP.
                      </p>
                    </div>
                  </div>
                </div>

                <section className="mt-4">
                  {photos.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center mb-2">
                      Aucune photo pour l’instant. Ajoute la première ✨
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {photos.map((photo) => {
                          const isSelected = selectedPhotos.includes(photo.path);

                          return (
                            <div
                              key={photo.path}
                              className={`group relative flex flex-col rounded-lg border overflow-hidden bg-white transition-all shadow-sm ${
                                isSelected
                                  ? "border-rose-400 scale-[1.02]"
                                  : "border-amber-100 hover:border-rose-400 hover:scale-[1.02]"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPhoto(photo);
                                  setIsLightboxOpen(true);
                                }}
                                className="w-full h-32 md:h-40 overflow-hidden"
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.name}
                                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                />
                              </button>

                              {multiDeleteMode && (
                                <div className="absolute top-2 left-2 bg-white/80 rounded px-1 py-0.5 shadow-sm">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectPhoto(photo.path)}
                                  />
                                </div>
                              )}

                              {!multiDeleteMode && canDeletePhoto(photo) && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(photo)}
                                  disabled={deletingPath === photo.path}
                                  className="mt-auto text-xs bg-rose-500 hover:bg-rose-600 disabled:opacity-60 py-1.5 text-center transition-colors text-white"
                                >
                                  {deletingPath === photo.path
                                    ? "Suppression..."
                                    : "Supprimer de l’espace commun"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {multiDeleteMode && selectedPhotos.length > 0 && (
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleDeleteSelected}
                            className="text-xs bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-md shadow-sm text-white"
                          >
                            Supprimer {selectedPhotos.length} photo(s)
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </section>

                {isLightboxOpen && selectedPhoto && (
                  <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
                    onClick={() => setIsLightboxOpen(false)}
                  >
                    <div
                      className="relative max-w-[90%] max-h-[90%]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img
                        src={selectedPhoto.url}
                        alt={selectedPhoto.name}
                        className="max-w-full max-h-full rounded-lg shadow-2xl"
                      />
                      <button
                        onClick={() => setIsLightboxOpen(false)}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-md px-2 py-1 text-xs shadow-sm"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <p
              className={`text-center text-sm font-semibold text-rose-700 drop-shadow-sm transition-transform ${
                thankPulse ? "scale-[1.03]" : ""
              }`}
            >
              Merci d’avoir partagé vos souvenirs ❤️
            </p>
          </>
        )}
      </div>
    </main>
  );
}
