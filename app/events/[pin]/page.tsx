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
import { getExpirationInfo } from "@/lib/eventLifetimes";

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
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isCoffreOpen, setIsCoffreOpen] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

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

  const expirationInfo = getExpirationInfo(event?.expires_at ?? null);

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
    if (expirationInfo.isExpired) {
      alert(
        "Cet événement est terminé. L'ajout de nouvelles photos n'est plus possible."
      );
      e.target.value = "";
      return;
    }

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
    if (!event || selectedPhotos.length === 0 || deletingSelected) return;

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

    try {
      setDeletingSelected(true);
      setError(null);

      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(allowedPaths);

      if (deleteError) {
        console.error("Erreur Supabase lors de la suppression multiple", {
          paths: allowedPaths,
          error: deleteError,
        });
        setError("Erreur lors de la suppression des photos sélectionnées.");
        return;
      }

      setPhotos((prev) => prev.filter((p) => !allowedPaths.includes(p.path)));
      setSelectedPhotos([]);
    } catch (err) {
      console.error("Erreur inattendue lors de la suppression multiple", err);
      setError("Erreur lors de la suppression des photos sélectionnées.");
    } finally {
      await refreshPhotos(event);
      setDeletingSelected(false);
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
      <div className="w-full max-w-4xl rounded-3xl bg-white/80 border border-amber-200 p-5 md:p-8 shadow-2xl backdrop-blur-lg space-y-6">
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
            <section className="rounded-2xl bg-gradient-to-r from-amber-300/70 via-rose-200/70 to-amber-300/70 border border-amber-200 shadow-inner px-4 py-4 md:px-6 md:py-5 flex items-center gap-4">
              <div className="text-4xl md:text-5xl" aria-hidden>
                🎄
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-800">Coffre photo festif</p>
                <p className="text-sm text-amber-800/90">
                  Partagez vos photos ici : scannez le QR code, ajoutez-les en quelques clics et profitez du coffre commun.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-white/70 px-5 py-5 shadow-md space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-amber-700 font-semibold">Évènement</p>
                  <p className="text-lg font-semibold text-amber-950">{event.name || "Photos"}</p>
                  <p className="text-sm text-amber-800/80">Ce coffre regroupe toutes les photos de votre groupe.</p>
                </div>
                <EventHeader event={event} />
              </div>
            </section>

            {shareUrl && (
              <section className="rounded-2xl border border-amber-200 bg-white/70 px-5 py-5 shadow-md space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-amber-700 font-semibold">Partage de l’évènement</p>
                    <p className="text-base font-semibold text-amber-950">Invitez votre groupe à rejoindre ce coffre.</p>
                    <p className="text-sm text-amber-800/90">Copie le lien ou scanne le QR code pour partager rapidement.</p>
                    <div className="mt-3 space-y-2">
                      <div className="w-full overflow-hidden rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-[12px] text-amber-900 shadow-inner">
                        {shareUrl}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 shadow-sm"
                      >
                        📋 Copier le lien
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-center md:justify-end">
                    <div className="rounded-xl border border-amber-200 bg-white/80 p-3 sm:p-4 shadow-inner">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 mx-auto">
                        <QRCode
                          value={shareUrl}
                          bgColor="transparent"
                          fgColor="#0f172a"
                          style={{ height: "100%", width: "100%" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-amber-200 bg-white/70 px-5 py-5 shadow-md space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-amber-950">Galerie photo commune</p>
                    <p className="text-sm text-amber-800/90">Cliquez pour masquer/afficher la galerie.</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-900 shadow-sm">
                      {photoCount} photo{photoCount > 1 ? "s" : ""}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-800 shadow-sm">
                      {deviceCount > 0
                        ? `${deviceCount} contributeur${deviceCount > 1 ? "s" : ""}`
                        : "En attente des premiers invités"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCoffreOpen((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm transition-colors hover:bg-amber-200"
                    >
                      <span aria-hidden>{isCoffreOpen ? "📖" : "🔒"}</span>
                      <span>{isCoffreOpen ? "Galerie ouverte" : "Galerie masquée"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-amber-700">
                  <span className="inline-flex items-center gap-2">
                    {isRefreshing && (
                      <span className="h-3 w-3 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
                    )}
                    <span className="text-amber-700">Rafraîchissement auto</span>
                  </span>
                </div>
              </div>

              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  isCoffreOpen
                    ? "max-h-[3000px] opacity-100 translate-y-0"
                    : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
                }`}
              >
                <div className="space-y-4 pt-2">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="md:col-span-2 rounded-xl border border-amber-200 bg-emerald-50/80 p-4 shadow-inner">
                      <p className="text-xs font-semibold text-emerald-900 uppercase tracking-[0.15em]">Section 1 — Ajout de photos</p>
                      <p className="text-sm text-emerald-900/90 mt-1">Ajoute des souvenirs pour tout le monde.</p>
                      <div className="mt-3 flex flex-col gap-2">
                        {expirationInfo.isExpired ? (
                          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
                            Cet événement est terminé. Vous pouvez toujours consulter et télécharger les photos du coffre.
                          </div>
                        ) : (
                          <>
                            <label
                              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition ${
                                uploading
                                  ? "bg-amber-200/80 text-amber-900 cursor-not-allowed border-amber-300"
                                  : "bg-emerald-500 text-emerald-950 border-emerald-600/50 hover:bg-emerald-400"
                              }`}
                            >
                              <span>📤</span>
                              {uploading ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="h-4 w-4 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
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
                                disabled={uploading || expirationInfo.isExpired}
                              />
                            </label>
                            <div className="text-[11px] text-emerald-900/80 space-y-1">
                              {uploadError && <p className="text-red-600">{uploadError}</p>}
                              {uploadSuccess && <p className="text-emerald-700">{uploadSuccess}</p>}
                              {uploadInfo && (
                                <p>
                                  {uploadInfo.processed}/{uploadInfo.total} fichiers traités...
                                </p>
                              )}
                              <p className="text-emerald-900/70">
                                Limite : {MAX_FILES} fichiers • 10 Mo par fichier • Formats : JPG, PNG...
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-white/80 p-4 shadow-inner space-y-2">
                      <p className="text-xs font-semibold text-amber-900 uppercase tracking-[0.15em]">Section 2 — Téléchargements</p>
                      <p className="text-sm text-amber-800/90">Récupère toutes les photos du coffre.</p>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadAll}
                          disabled={downloading || photos.length === 0}
                          className="rounded-lg border border-amber-200 bg-amber-500 px-3 py-2 text-sm font-semibold text-amber-950 shadow-sm transition-colors hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {downloading ? "Préparation du ZIP..." : "Télécharger toutes les photos (ZIP)"}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadSelected}
                          disabled={downloading || selectedPhotos.length === 0}
                          className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm transition-colors hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {downloading ? "Préparation..." : "Télécharger la sélection"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-white/80 p-4 shadow-inner space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-amber-900 uppercase tracking-[0.15em]">Section 3 — Mode sélection</p>
                        <p className="text-sm text-amber-800/90">Active le mode sélection pour choisir plusieurs photos.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectionMode((prev) => !prev);
                            setSelectedPhotos([]);
                          }}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm transition-colors ${
                            selectionMode
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                          }`}
                        >
                          <span className="h-2.5 w-2.5 rounded-full border border-amber-300 bg-white shadow-inner" />
                          {selectionMode ? "Mode sélection activé" : "Activer le mode sélection"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPhotos([])}
                          className="text-xs font-semibold text-amber-800 underline-offset-4 hover:underline"
                          disabled={!selectionMode}
                        >
                          Réinitialiser la sélection
                        </button>
                      </div>
                    </div>

                    {selectionMode && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/90 px-4 py-3 shadow-sm transition-all">
                        <p className="text-sm font-semibold text-emerald-900">
                          Mode sélection activé — {selectedPhotos.length} photo(s) sélectionnée(s)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleDeleteSelected}
                            disabled={selectedPhotos.length === 0 || deletingSelected}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {deletingSelected
                              ? "Suppression en cours..."
                              : `Supprimer ${selectedPhotos.length || "0"} photo(s)`}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectionMode(false)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm transition-colors hover:bg-amber-100"
                          >
                            Quitter le mode sélection
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-amber-700">
                      {isHost
                        ? "En tant qu'hôte, vous pouvez supprimer toutes les photos du coffre."
                        : "Vous pouvez supprimer uniquement vos photos. Seul l'hôte peut supprimer l'ensemble du coffre."}
                    </p>
                  </div>

                  <section>
                    {photos.length === 0 ? (
                      <p className="text-sm text-amber-700 text-center mb-4">
                        Aucune photo pour l’instant. Ajoute la première ✨
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {photos.map((photo) => {
                          const isSelected = selectedPhotos.includes(photo.path);

                          return (
                            <div
                              key={photo.path}
                              className={`group relative flex flex-col rounded-lg border overflow-hidden bg-white/80 shadow-sm transition-all duration-200 ${
                                isSelected
                                  ? "border-emerald-400 scale-[1.01]"
                                  : "border-amber-200 hover:border-emerald-400 hover:shadow-md"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPhoto(photo);
                                  setIsLightboxOpen(true);
                                }}
                                className="w-full h-full"
                              >
                                <div className="relative w-full overflow-hidden aspect-[4/5]">
                                  <img
                                    src={photo.url}
                                    alt={photo.name}
                                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                  />
                                  {selectionMode && (
                                    <div className="absolute top-2 left-2 rounded-md bg-white/90 px-2 py-1 shadow-sm">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={(event) => {
                                          event.stopPropagation();
                                          toggleSelectPhoto(photo.path);
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </button>

                              {!selectionMode && canDeletePhoto(photo) && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(photo)}
                                  disabled={deletingPath === photo.path}
                                  className="mt-auto text-xs bg-red-500 hover:bg-red-600 disabled:opacity-60 py-2 text-center transition-colors rounded-b-lg text-white"
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
