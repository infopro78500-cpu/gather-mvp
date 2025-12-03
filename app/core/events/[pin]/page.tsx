"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import QRCode from "react-qr-code";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { EventData } from "@/types/event";
import { Photo } from "@/types/photo";
import { EventHeader } from "@/app/core/components/events/EventHeader";
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

  const shareUrl = origin && event ? `${origin}/join?pin=${event.pin}` : null

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

  const refreshPhotos = async (evt: EventData): Promise<void> => {
    try {
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
    }
  };

  useEffect(() => {
    if (event) {
      refreshPhotos(event);
    }
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
      const zipName = `coffre-${zipLabel}.zip`;
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
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4 py-6">
      <div className="w-[380px] md:w-[720px] rounded-2xl bg-slate-900/80 border border-slate-800 p-6 md:p-8 shadow-2xl space-y-5">
        {loading && (
          <p className="text-center text-sm text-slate-300">
            Chargement de l’évènement...
          </p>
        )}

        {!loading && error && (
          <p className="text-center text-sm text-red-400">{error}</p>
        )}

        {!loading && event && (
          <>
            <EventHeader event={event} />

            {shareUrl && (
              <section className="mt-1 rounded-xl border border-slate-800 bg-slate-950/90 px-5 py-5 flex flex-col gap-4 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
                      Partage de l’évènement
                    </p>
                    <p className="text-base font-semibold text-slate-50">
                      Invite ton groupe à rejoindre ce coffre.
                    </p>
                    <p className="text-sm text-slate-400">
                      Copie le lien ou scanne le QR code pour partager rapidement.
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-[11px] text-slate-200 shadow-inner">
                        {shareUrl}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="self-start inline-flex items-center gap-2 rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-sm transition-colors hover:bg-teal-400"
                      >
                        📋 Copier le lien
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center md:items-start justify-center md:justify-end">
                    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-inner">
                      <QRCode
                        value={shareUrl}
                        size={112}
                        bgColor="transparent"
                        fgColor="#ffffff"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="mt-2 rounded-xl border border-slate-800 bg-slate-950/90 px-5 py-5 shadow-lg">
              <button
                type="button"
                onClick={() => setIsCoffreOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-900/90 hover:to-slate-800/90 border border-slate-700 hover:border-teal-400/60 transition-all duration-200 shadow"
              >
                <div className="flex flex-col text-left">
                  <p className="text-[11px] tracking-wide uppercase text-slate-500 font-semibold">
                    Espace commun du groupe
                  </p>
                  <p className="text-base font-semibold text-slate-50">
                    Galerie photo commune
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Cliquez pour {isCoffreOpen ? "masquer la galerie." : "ouvrir la galerie."}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-200 mt-1 border border-slate-700/70">
                    {hasPhotos ? (
                      <>
                        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-teal-400" />
                        {photoCount} photo
                        {photoCount > 1 ? "s" : ""} partagée
                        {photoCount > 1 ? "s" : ""}
                      </>
                    ) : (
                      "Aucune photo"
                    )}
                  </span>
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl border border-teal-500/40 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 shadow-inner">
                    <span className="text-xl">{isCoffreOpen ? "📖" : "🔒"}</span>
                  </div>

                  <p className="text-[11px] text-teal-400 mb-1 font-semibold tracking-wide">
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
                <div className="flex flex-col items-center gap-3 mb-5">
                  <button
                    onClick={() => {
                      setMultiDeleteMode((prev) => !prev);
                      setSelectedPhotos([]);
                    }}
                    className="text-xs text-teal-300 hover:text-teal-200 underline-offset-4 hover:underline mb-1 font-medium"
                  >
                    {multiDeleteMode
                      ? "Quitter le mode sélection"
                      : "Sélectionner plusieurs photos"}
                  </button>
                  <p className="text-sm text-slate-400 text-center leading-relaxed max-w-[560px]">
                    {isHost
                      ? "En tant qu'hôte, vous pouvez supprimer toutes les photos du coffre."
                      : "Vous pouvez supprimer uniquement les photos que vous avez envoyées. Seul l'hôte peut supprimer l'ensemble des photos."}
                  </p>


                  <label className="bg-teal-500 px-4 py-2 rounded-lg cursor-pointer text-slate-900 font-semibold hover:bg-teal-400 text-sm shadow-sm inline-flex items-center gap-2">
                    <span>📤</span>
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
                    />
                  </label>
                  {uploadError && (
                    <p className="text-xs text-red-400 text-center max-w-[360px]">
                      {uploadError}
                    </p>
                  )}


                  {multiDeleteMode && selectedPhotos.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadSelected}
                        disabled={downloading}
                        className="rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-white border border-slate-700 transition-colors shadow-sm"
                      >
                        {downloading
                          ? "Préparation du ZIP..."
                          : "Télécharger la sélection (ZIP)"}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSelected}
                        className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm"
                      >
                        Supprimer {selectedPhotos.length} photo(s)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPhotos([])}
                        className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm"
                      >
                        Réinitialiser la sélection
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-400">
                    <span>Max {MAX_FILES} fichiers</span>
                    <span>—</span>
                    <span>10 Mo par fichier</span>
                    <span>—</span>
                    <span>Formats : JPG, PNG...</span>
                  </div>

                  <div className="flex justify-center gap-3 text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      disabled={downloading}
                      className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-[11px] font-semibold text-white border border-slate-700 shadow-sm"
                    >
                      {downloading
                        ? "Préparation du ZIP..."
                        : "Télécharger toutes les photos (ZIP)"}
                    </button>
                  </div>
                </div>

                <section className="mt-4">
                  {photos.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center mb-2">
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
                              className={`group relative flex flex-col rounded-xl border overflow-hidden bg-slate-900/60 transition-all ${
                                isSelected
                                  ? "border-teal-400 bg-slate-900"
                                  : "border-slate-700"
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
                                <div className="absolute top-2 left-2 bg-slate-900/70 rounded px-1 py-0.5">
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
                                  className="mt-auto text-xs bg-red-500 hover:bg-red-600 disabled:opacity-50 py-1.5 text-center transition-colors"
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
                            className="text-xs bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
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
                        className="max-w-full max-h-full rounded-lg shadow-lg"
                      />
                      <button
                        onClick={() => setIsLightboxOpen(false)}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
