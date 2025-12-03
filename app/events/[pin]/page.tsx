"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { EventData } from "@/types/event";
import { Photo } from "@/types/photo";
import { EventHeader } from "@/app/components/events/EventHeader";
import { getDeviceId as getEventDeviceId } from "@/lib/deviceId";
import { Button, buttonClasses } from "@/app/components/ui/button";
import { PageLayout } from "@/app/components/ui/page-layout";
import { Section } from "@/app/components/ui/section";
import { Card } from "@/app/components/ui/card";

const BUCKET_NAME = "event-photos";
const MAX_FILES = 20;
const MAX_FILE_SIZE_MB = 10;

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

  const [isCoffreOpen, setIsCoffreOpen] = useState(true);
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

  const supabase = getSupabaseClient();

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
      if (!supabase) {
        setError("Configuration Supabase manquante.");
        setLoading(false);
        return;
      }

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
  }, [pin, supabase]);

  const refreshPhotos = async (evt: EventData): Promise<void> => {
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      return;
    }

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
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      return;
    }

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

    if (!supabase) {
      setError("Configuration Supabase manquante.");
      return;
    }

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

    if (!supabase) {
      setError("Configuration Supabase manquante.");
      return;
    }

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
    <PageLayout
      eyebrow="Coffre partagé"
      title={event ? event.name : "Chargement de l’évènement"}
      description={
        event
          ? "Partage le PIN ou le QR code pour inviter ton groupe et gérez la galerie commune en quelques gestes."
          : "Nous préparons la galerie et les photos associées."
      }
    >
      <div className="space-y-4 md:space-y-6 animate-fade">
        {loading && (
          <Card className="p-5 text-center text-muted">
            Chargement de l’évènement...
          </Card>
        )}

        {!loading && error && (
          <Card className="p-5 text-center text-danger">{error}</Card>
        )}

        {!loading && event && (
          <>
            <EventHeader event={event} />

            {shareUrl && (
              <Section
                title="Partager l’accès"
                description="Copie le lien ou affiche le QR code pour permettre aux invités de rejoindre le coffre en quelques secondes."
                actions={
                  <Button variant="secondary" size="sm" onClick={handleCopyLink}>
                    Copier le lien
                  </Button>
                }
              >
                <div className="grid gap-4 md:grid-cols-[2fr_1fr] md:items-center">
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/60 bg-surface/80 px-4 py-3 text-sm text-foreground shadow-inner">
                      {shareUrl}
                    </div>
                    <div className="flex flex-col gap-2 text-sm text-muted">
                      <p>Partage ce lien ou scanne le QR code ci-contre.</p>
                      <p>Les invités arriveront directement sur la page de connexion.</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <Card className="p-4 border border-border/60 bg-surface-strong/70">
                      <QRCode
                        value={shareUrl}
                        size={148}
                        bgColor="transparent"
                        fgColor="#e2e8f0"
                      />
                    </Card>
                  </div>
                </div>
              </Section>
            )}

            <Section
              title="Espace commun du groupe"
              description="Ajoute des photos, télécharge tout le coffre ou supprime tes envois. Pensé pour fonctionner rapidement sur mobile."
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCoffreOpen((prev) => !prev)}
                >
                  {isCoffreOpen ? "Masquer la galerie" : "Afficher la galerie"}
                </Button>
              }
            >
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                <span className="inline-flex items-center gap-2 rounded-full bg-surface-strong/60 px-3 py-1 text-foreground border border-border/60">
                  {hasPhotos ? `${photoCount} photo${photoCount > 1 ? "s" : ""}` : "Aucune photo pour le moment"}
                </span>
                <span className="text-xs text-muted">
                  Max {MAX_FILES} fichiers • {MAX_FILE_SIZE_MB} Mo par fichier
                </span>
              </div>

              {isCoffreOpen && (
                <div className="space-y-4 animate-fade">
                  <Card className="p-4 md:p-5 border border-border/60 bg-surface/70">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Ajouter des photos à l’espace commun
                        </p>
                        <p className="text-sm text-muted">
                          Vous pouvez envoyer jusqu’à {MAX_FILES} fichiers à la fois (10 Mo par fichier).
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          id="upload-input"
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handleUpload}
                        />
                        <label
                          htmlFor="upload-input"
                          className={buttonClasses({
                            variant: "primary",
                            size: "md",
                            className: "cursor-pointer w-full sm:w-auto text-center",
                          })}
                        >
                          {uploading && uploadInfo
                            ? `Upload : ${uploadInfo.processed}/${uploadInfo.total}`
                            : uploading
                              ? "Upload en cours..."
                              : "Ajouter des photos"}
                        </label>
                        {multiDeleteMode && selectedPhotos.length > 0 && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={handleDeleteSelected}
                          >
                            Supprimer {selectedPhotos.length}
                          </Button>
                        )}
                      </div>
                    </div>
                    {uploadError && (
                      <p className="mt-2 text-sm text-danger" role="alert">
                        {uploadError}
                      </p>
                    )}
                  </Card>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMultiDeleteMode((prev) => !prev);
                        setSelectedPhotos([]);
                      }}
                    >
                      {multiDeleteMode
                        ? "Quitter le mode sélection"
                        : "Sélectionner plusieurs photos"}
                    </Button>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleDownloadAll}
                        loading={downloading}
                        disabled={!hasPhotos}
                      >
                        Télécharger toutes les photos
                      </Button>
                      {multiDeleteMode && selectedPhotos.length > 0 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleDownloadSelected}
                          loading={downloading}
                        >
                          Télécharger la sélection
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {photos.map((photo) => {
                      const isSelected = selectedPhotos.includes(photo.path);

                      return (
                        <div
                          key={photo.path}
                          className={`group relative overflow-hidden rounded-xl border border-border/60 bg-surface/70 shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition-all duration-200 ${
                            isSelected
                              ? "ring-2 ring-primary/70 scale-[1.01]"
                              : "hover:border-primary/60 hover:scale-[1.01]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPhoto(photo);
                              setIsLightboxOpen(true);
                            }}
                            className="block h-32 w-full overflow-hidden sm:h-36 md:h-40"
                          >
                            <img
                              src={photo.url}
                              alt={photo.name}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.05]"
                            />
                          </button>

                          {multiDeleteMode && (
                            <div className="absolute left-2 top-2 rounded-md bg-surface/80 px-2 py-1 text-xs">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectPhoto(photo.path)}
                              />
                            </div>
                          )}

                          {!multiDeleteMode && canDeletePhoto(photo) && (
                            <div className="p-2">
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(photo)}
                                loading={deletingPath === photo.path}
                                className="w-full"
                              >
                                {deletingPath === photo.path
                                  ? "Suppression..."
                                  : "Supprimer"}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {photos.length === 0 && (
                    <Card className="p-4 text-center text-muted">
                      Aucune photo pour l’instant. Ajoute la première ✨
                    </Card>
                  )}
                </div>
              )}

              {isLightboxOpen && selectedPhoto && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                  onClick={() => setIsLightboxOpen(false)}
                >
                  <div
                    className="relative max-h-[90vh] max-w-[90vw] animate-pop"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={selectedPhoto.url}
                      alt={selectedPhoto.name}
                      className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl"
                    />
                    <button
                      onClick={() => setIsLightboxOpen(false)}
                      className={buttonClasses({
                        variant: "secondary",
                        size: "sm",
                        className: "absolute right-3 top-3",
                      })}
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </PageLayout>
  );
}
