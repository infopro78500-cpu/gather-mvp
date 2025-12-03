"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isCoffreOpen, setIsCoffreOpen] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [multiDeleteMode, setMultiDeleteMode] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadInfo, setUploadInfo] = useState<{
    processed: number;
    total: number;
  } | null>(null);

  const photoCount = photos.length;
  const deviceCount = useMemo(() => {
    const uniqueDeviceIds = new Set(
      photos
        .map((photo) => photo.uploaderDeviceId)
        .filter((id): id is string => Boolean(id))
    );
    return uniqueDeviceIds.size;
  }, [photos]);
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

  const refreshPhotos = async (evt: EventData, silent = false): Promise<void> => {
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

      setPhotos(photosWithUrl);
    } catch (err) {
      console.error("Erreur inattendue lors du chargement des photos", err);
      setError("Erreur lors du chargement des photos.");
      setPhotos([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (event) {
      refreshPhotos(event);
    }
  }, [event]);

  // Auto-refresh de la galerie toutes les 8s. On nettoie l'interval au démontage pour éviter les fuites.
  useEffect(() => {
    if (!event) return;

    const intervalId = setInterval(() => {
      refreshPhotos(event, true);
    }, 8000);

    return () => {
      clearInterval(intervalId);
    };
  }, [event]);

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
    setUploadSuccess(null);
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
        setUploadSuccess("Upload terminé ✅");
        setTimeout(() => setUploadSuccess(null), 2500);
      }
    } finally {
      if (event) {
        await refreshPhotos(event);
      }
      setUploading(false);
      setUploadInfo(null);
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

  const formatZipName = (evt: EventData, label: string) => {
    const normalizedName = evt.name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const date = new Date().toISOString().split("T")[0];
    return `${normalizedName || "gather-event"}_${date}_${label}.zip`;
  };

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
      const zipName = formatZipName(event, zipLabel);
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-100 via-rose-50 to-amber-200 text-amber-950 px-4 py-6">
      <div className="w-full max-w-3xl rounded-3xl bg-white/80 border border-amber-200 p-5 md:p-8 shadow-2xl backdrop-blur-lg space-y-6">
        {loading && (
          <p className="text-center text-sm text-amber-700">
            Chargement de l’évènement...
          </p>
        )}

        {!loading && error && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}

        {!loading && event && (
          <>
            <section className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-300/70 via-rose-200/70 to-amber-300/70 border border-amber-200 shadow-inner px-4 py-4 md:px-6 md:py-5">
              <div className="text-4xl md:text-5xl" aria-hidden>
                🎄
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-800">Coffre photo festif</p>
                <p className="text-xl md:text-2xl font-semibold text-amber-950">
                  {event.name}
                </p>
                <p className="text-sm text-amber-800/90 mt-1">
                  Partagez vos photos ici en scannant le QR code ou en les ajoutant ci-dessous.
                </p>
              </div>
            </section>

            <EventHeader event={event} />

            {shareUrl && (
              <section className="mt-1 rounded-2xl border border-amber-200 bg-white/70 px-5 py-5 flex flex-col gap-4 shadow-md">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <p className="text-[11px] tracking-wide uppercase text-amber-800 font-semibold">Partage de l’évènement</p>
                    <p className="text-base font-semibold text-amber-950">Invite ton groupe à rejoindre ce coffre.</p>
                    <p className="text-sm text-amber-800/90">Copie le lien ou scanne le QR code pour partager rapidement.</p>
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="w-full overflow-hidden rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-[11px] text-amber-900 shadow-inner">
                        {shareUrl}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="self-start inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 shadow-sm"
                      >
                        📋 Copier le lien
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center md:items-start justify-center md:justify-end">
                    <div className="rounded-lg border border-amber-200 bg-white/70 p-4 shadow-inner">
                      <QRCode value={shareUrl} size={128} bgColor="transparent" fgColor="#0f172a" />
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="mt-4 rounded-2xl border border-amber-200 bg-white/70 px-5 py-5 shadow-md space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col text-left">
                  <p className="text-[11px] tracking-wide uppercase text-amber-800 font-semibold">Espace commun du groupe</p>
                  <p className="text-base font-semibold text-amber-950">Galerie photo commune</p>
                  <p className="text-sm text-amber-800/90 mt-1">
                    Cliquez pour {isCoffreOpen ? "masquer" : "ouvrir"} la galerie.
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] text-amber-900 mt-1 border border-amber-200">
                    {hasPhotos ? (
                      <>
                        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {photoCount} photo{photoCount > 1 ? "s" : ""} partagée{photoCount > 1 ? "s" : ""}
                      </>
                    ) : (
                      "Aucune photo"
                    )}
                  </span>
                  <span className="text-[11px] text-amber-800">
                    {deviceCount > 0
                      ? `${deviceCount} contributeur${deviceCount > 1 ? "s" : ""}`
                      : "En attente des premiers invités"}
                  </span>
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg border border-amber-200 bg-gradient-to-br from-amber-100 via-white to-amber-200 shadow-inner">
                    <span className="text-xl">{isCoffreOpen ? "📖" : "🔒"}</span>
                  </div>

                  <p className="text-[11px] uppercase tracking-wide text-amber-800/80 mb-1">
                    {isCoffreOpen ? "Coffre ouvert" : "Coffre fermé"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCoffreOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/80 to-rose-400/80 hover:from-amber-500 hover:to-rose-400 border border-amber-200 transition-all duration-200 shadow-sm text-amber-950"
              >
                <span className="font-semibold">{isCoffreOpen ? "Refermer la galerie" : "Ouvrir la galerie"}</span>
                <span className="text-lg">{isCoffreOpen ? "⬆️" : "⬇️"}</span>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  isCoffreOpen
                    ? "max-h-[2000px] opacity-100 translate-y-0"
                    : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"
                }`}
              >
                <div className="flex flex-col items-center gap-3 mb-5">
                  <button
                    onClick={() => {
                      setMultiDeleteMode((prev) => !prev);
                      setSelectedPhotos([]);
                    }}
                    className="text-xs font-medium text-amber-900 underline-offset-4 hover:underline mb-1"
                  >
                    {multiDeleteMode
                      ? "Quitter le mode sélection"
                      : "Sélectionner plusieurs photos"}
                  </button>
                  <p className="text-[11px] text-amber-800/90 text-center leading-relaxed max-w-[560px]">
                    {isHost
                      ? "En tant qu'hôte, vous pouvez supprimer toutes les photos du coffre."
                      : "Vous pouvez supprimer uniquement les photos que vous avez envoyées. Seul l'hôte peut supprimer l'ensemble des photos."}
                  </p>

                  <label
                    className={`px-4 py-2 rounded-lg cursor-pointer font-semibold text-sm shadow-sm inline-flex items-center gap-2 border border-amber-200 transition ${
                      uploading
                        ? "bg-amber-300/80 text-amber-900 cursor-not-allowed"
                        : "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                    }`}
                  >
                    <span>📤</span>
                    {uploading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
                        {uploadInfo
                          ? `Upload : ${uploadInfo.processed}/${uploadInfo.total}`
                          : "Upload en cours..."}
                      </span>
                    ) : (
                      "Ajouter des photos à l’espace commun"
                    )}
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
                    <p className="text-xs text-red-600 text-center max-w-[360px]">
                      {uploadError}
                    </p>
                  )}
                  {uploadSuccess && (
                    <p className="text-xs text-emerald-700 text-center max-w-[360px]">
                      {uploadSuccess}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-amber-700">
                    <span>Limite : {MAX_FILES} fichiers en une fois</span>
                    <span>•</span>
                    <span>10 Mo par fichier</span>
                    <span>•</span>
                    <span>Formats : JPG, PNG...</span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-2 text-xs text-amber-800">
                    <p>Téléchargez toutes les photos en un seul fichier ZIP.</p>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadAll}
                        disabled={downloading}
                        className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                      >
                        {downloading ? "Préparation du ZIP..." : "Télécharger toutes les photos (ZIP)"}
                      </button>
                      {multiDeleteMode && selectedPhotos.length > 0 && (
                        <button
                          type="button"
                          onClick={handleDownloadSelected}
                          disabled={downloading}
                          className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                        >
                          {downloading ? "Préparation..." : "Télécharger la sélection"}
                        </button>
                      )}
                    </div>
                  </div>

                  {multiDeleteMode && selectedPhotos.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteSelected}
                        className="rounded-md bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm"
                      >
                        Supprimer {selectedPhotos.length} photo(s)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPhotos([])}
                        className="rounded-md bg-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-900 border border-amber-300 transition-colors hover:bg-amber-300 shadow-sm"
                      >
                        Réinitialiser la sélection
                      </button>
                    </div>
                  )}
                </div>

                <section className="mt-4">
                  <div className="flex items-center justify-between text-xs text-amber-800 mb-2">
                    <span>
                      {photoCount} photo{photoCount > 1 ? "s" : ""} partagée{photoCount > 1 ? "s" : ""}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      {isRefreshing && (
                        <span className="h-3 w-3 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
                      )}
                      <span className="text-amber-700">Rafraîchissement auto</span>
                    </span>
                  </div>
                  {photos.length === 0 ? (
                    <p className="text-xs text-amber-700 text-center mb-2">
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
                              className={`group relative flex flex-col rounded-lg border overflow-hidden bg-white/70 transition-all shadow-sm ${
                                isSelected
                                  ? "border-emerald-400 scale-[1.02]"
                                  : "border-amber-200 hover:border-emerald-400 hover:scale-[1.02]"
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
                                <div className="absolute top-2 left-2 bg-white/90 rounded px-1 py-0.5">
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
                                  className="mt-auto text-xs bg-red-500 hover:bg-red-600 disabled:opacity-60 py-1.5 text-center transition-colors rounded-md border border-amber-200 text-white"
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
                            className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md shadow-sm text-white"
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

            <p className="text-center text-sm text-amber-900 font-semibold">
              Merci d’avoir partagé vos souvenirs ❤️ {hasPhotos && "— de nouvelles photos arrivent en continu !"}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
