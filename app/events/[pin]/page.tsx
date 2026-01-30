"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import QRCode from "react-qr-code";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { EventData } from "@/types/event";
import { Photo } from "@/types/photo";
import { EventHeader } from "@/app/components/events/EventHeader";
import { getDeviceId as getEventDeviceId } from "@/lib/deviceId";
import { getExpirationInfo } from "@/lib/eventLifetimes";
import { getVoterId } from "@/lib/voterId";
import { getContestPhotoId } from "@/lib/photoId";
import { ContestCountdown } from "@/app/components/contest/ContestCountdown";


const BUCKET_NAME = "event-photos";
const MAX_FILES = 20; // max 20 fichiers à la fois
const MAX_FILE_SIZE_MB = 10; // max 10 Mo par fichier
const INITIAL_VISIBLE_COUNT = 8;
const VISIBLE_INCREMENT = 8;

type PhotoItem = Photo & {
  uploaderDeviceId?: string | null;
  contestPhotoId?: string;
};

type ContestLikeInfo = {
  count: number;
  likedByMe: boolean;
};

type ContestState = {
  contestEnabled: boolean;
  contestEndsAt: string | null;
  isVotingClosed: boolean;
  likesByPhoto: Record<string, ContestLikeInfo>;
  leaderboard: Array<{ photoId: string; count: number }>;
};

const getFilenameTimestamp = (filename: string | null | undefined): number => {
  if (!filename) return 0;
  const match = filename.match(/__(\d+)/);
  if (match) {
    const timestamp = Number(match[1]);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }
  return 0;
};

const getFileSortValue = (file: {
  name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}): number => {
  const nameTimestamp = getFilenameTimestamp(file.name ?? "");
  if (nameTimestamp) {
    return nameTimestamp;
  }
  const dateValue = file.created_at ?? file.updated_at ?? null;
  if (dateValue) {
    const parsed = Date.parse(dateValue);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};

export default function EventPage() {
const params = useParams<{ pin: string }>();

if (!params?.pin) {
  throw new Error("PIN manquant dans l’URL");
}

const pin = params.pin;

  const supabase = getSupabaseClient();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showAdvancedActions, setShowAdvancedActions] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const [isCoffreOpen, setIsCoffreOpen] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const [voterId, setVoterId] = useState<string | null>(null);
  const [contestState, setContestState] = useState<ContestState | null>(null);
  const [contestLoading, setContestLoading] = useState(false);
  const [contestError, setContestError] = useState<string | null>(null);
  const [likeLoadingPhotoId, setLikeLoadingPhotoId] = useState<string | null>(null);

  const [showUploadTooltip, setShowUploadTooltip] = useState(false);
  const [showDownloadTooltip, setShowDownloadTooltip] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadInfo, setUploadInfo] = useState<{
    processed: number;
    total: number;
  } | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const photoCount = photos.length;
  const selectedCount = selectedPhotos.length;
  const sortedPhotos = useMemo(
    () =>
      [...photos].sort((a, b) => {
        const timestampDiff =
          getFilenameTimestamp(b.name) - getFilenameTimestamp(a.name);
        if (timestampDiff !== 0) return timestampDiff;
        return b.name.localeCompare(a.name);
      }),
    [photos]
  );
  const visiblePhotos = useMemo(
    () => sortedPhotos.slice(0, visibleCount),
    [sortedPhotos, visibleCount]
  );
  const deviceCount = useMemo(() => {
    const uniqueDeviceIds = new Set(
      photos
        .map((photo) => photo.uploaderDeviceId)
        .filter((id): id is string => Boolean(id))
    );
    return uniqueDeviceIds.size;
  }, [photos]);

  const contestLeaderboard = useMemo(() => {
    if (!contestState?.contestEnabled) return [];
    return contestState.leaderboard.map((entry) => ({
      ...entry,
      photo: photos.find((photo) => photo.contestPhotoId === entry.photoId) ?? null,
    }));
  }, [contestState?.contestEnabled, contestState?.leaderboard, photos]);
  const hasPhotos = photoCount > 0;
  const isContestEnabled = Boolean(event?.contest_enabled);
  const contestEndsAt = contestState?.contestEndsAt ?? event?.contest_ends_at ?? null;
  const contestIsVotingClosed = Boolean(contestState?.isVotingClosed);
  const contestReady = Boolean(contestState?.contestEnabled);

  const buildLeaderboard = (likes: Record<string, ContestLikeInfo>) =>
    Object.entries(likes)
      .map(([photoId, value]) => ({ photoId, count: value.count }))
      .sort((a, b) => b.count - a.count);

  useEffect(() => {
    const id = getEventDeviceId();
    setDeviceId(id);
  }, []);

  useEffect(() => {
    const id = getVoterId();
    setVoterId(id);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    if (mediaQuery.matches) {
      setIsShareOpen(true);
    }
  }, []);

  const shareUrl = origin && event ? `${origin}/join?pin=${event.pin}` : null;

  const expirationInfo = getExpirationInfo(event?.expires_at ?? null);

  useEffect(() => {
    if (!supabase) {
      setError("Supabase n'est pas configuré.");
      setLoading(false);
      return;
    }

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
  }, [pin, supabase]);

  useEffect(() => {
    if (!event || !event.contest_enabled || !voterId) {
      setContestState(null);
      setContestError(null);
      return;
    }

    const controller = new AbortController();

    const fetchContestState = async () => {
      setContestLoading(true);
      setContestError(null);

      try {
        const response = await fetch(
          `/api/events/${event.id}/contest/state?voterId=${encodeURIComponent(voterId)}`,
          { signal: controller.signal }
        );
        const payload = await response.json();

        if (!response.ok) {
          setContestError("Impossible de charger l'état du concours.");
          setContestState(null);
          return;
        }

        setContestState(payload as ContestState);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Erreur lors du chargement du concours", err);
        setContestError("Impossible de charger l'état du concours.");
        setContestState(null);
      } finally {
        setContestLoading(false);
      }
    };

    fetchContestState();

    return () => {
      controller.abort();
    };
  }, [event, voterId]);

  useEffect(() => {
    if (!contestState?.contestEnabled || !contestState?.contestEndsAt) return;

    const endsAtMs = new Date(contestState.contestEndsAt).getTime();
    if (!Number.isFinite(endsAtMs)) return;

    const intervalId = window.setInterval(() => {
      setContestState((prev) => {
        if (!prev) return prev;
        const isClosed = endsAtMs <= Date.now();
        if (prev.isVotingClosed === isClosed) return prev;
        return { ...prev, isVotingClosed: isClosed };
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [contestState?.contestEnabled, contestState?.contestEndsAt]);

  const refreshPhotos = async (
    evt: EventData,
    silent = false
  ): Promise<void> => {
    try {
      if (!supabase) {
        throw new Error("Supabase n'est pas configuré.");
      }
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
      const sortedFiles = [...safeFiles].sort((a, b) => {
        const timestampDiff = getFileSortValue(b) - getFileSortValue(a);
        if (timestampDiff !== 0) return timestampDiff;
        return (b.name ?? "").localeCompare(a.name ?? "");
      });
      const shouldComputeContestIds = Boolean(evt.contest_enabled);

      const photosWithUrl = (
        await Promise.all(
          sortedFiles.map(async (file): Promise<PhotoItem | null> => {
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

            let contestPhotoId: string | undefined;
            if (shouldComputeContestIds) {
              try {
                contestPhotoId = await getContestPhotoId(path);
              } catch (err) {
                console.error("Impossible de générer l'identifiant concours", err);
              }
            }

            return {
              name: file.name,
              path,
              url: publicData.publicUrl,
              uploaderDeviceId,
              contestPhotoId,
            };
          })
        )
      ).filter((p): p is PhotoItem => p !== null);

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

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [event?.id]);

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

  const handleToggleLike = async (photo: PhotoItem): Promise<void> => {
    if (!event || !contestState?.contestEnabled || !voterId) return;
    if (!photo.contestPhotoId) return;
    if (contestState.isVotingClosed) return;

    setLikeLoadingPhotoId(photo.contestPhotoId);
    setContestError(null);

    try {
      const response = await fetch(
        `/api/events/${event.id}/contest/photos/${photo.contestPhotoId}/toggle-like`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voterId }),
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setContestState((prev) =>
            prev ? { ...prev, isVotingClosed: true } : prev
          );
          setContestError("Le vote est désormais terminé.");
          return;
        }
        setContestError("Impossible d'enregistrer votre vote.");
        return;
      }

      setContestState((prev) => {
        if (!prev) return prev;

        const likesByPhoto = {
          ...prev.likesByPhoto,
          [photo.contestPhotoId as string]: {
            count: payload.likesCount ?? 0,
            likedByMe: payload.liked ?? false,
          },
        };

        return {
          ...prev,
          likesByPhoto,
          leaderboard: buildLeaderboard(likesByPhoto),
        };
      });
    } catch (err) {
      console.error("Erreur lors du vote", err);
      setContestError("Impossible d'enregistrer votre vote.");
    } finally {
      setLikeLoadingPhotoId(null);
    }
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
    if (!supabase) {
      throw new Error("Supabase n'est pas configuré.");
    }

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

  const openUploadDialog = () => {
    if (uploading || expirationInfo.isExpired) return;
    uploadInputRef.current?.click();
  };

  const closeSelectionMode = () => {
    setSelectionMode(false);
    setSelectedPhotos([]);
  };

  const toggleAdvancedActions = () => {
    if (selectionMode) {
      setShowAdvancedActions(true);
      return;
    }
    setShowAdvancedActions((prev) => !prev);
  };

  const showTooltipTemporarily = (
    setter: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    setter(true);
    window.setTimeout(() => setter(false), 2000);
  };

  const handleDelete = async (photo: PhotoItem): Promise<void> => {
    if (!event) return;
    if (!supabase) {
      throw new Error("Supabase n'est pas configuré.");
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
    if (!event || selectedPhotos.length === 0 || deletingSelected) return;
    if (!supabase) {
      throw new Error("Supabase n'est pas configuré.");
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

    const photosToDownload = photos.filter((photo) =>
      selectedPhotos.includes(photo.path)
    );

    await downloadPhotos(
      photosToDownload,
      `${event.pin || event.id}-selection`
    );
  };

  const handleDownload = async () => {
    if (!hasPhotos) return;

    if (selectionMode && selectedCount === 0) {
      return;
    }

    if (selectionMode && selectedCount > 0) {
      await handleDownloadSelected();
      return;
    }

    await handleDownloadAll();
  };

  const downloadButtonLabel =
    selectionMode && selectedCount > 0
      ? `Télécharger ${selectedCount} photo${
          selectedCount > 1 ? "s" : ""
        } (ZIP)`
      : selectionMode
        ? "Télécharger la sélection (ZIP)"
        : "Télécharger toutes les photos (ZIP)";

  const downloadTooltipLabel = !hasPhotos
    ? "Aucune photo à télécharger."
    : selectionMode && selectedCount > 0
      ? `Télécharger les ${selectedCount} photos sélectionnées (ZIP)`
      : selectionMode
        ? "Sélectionne au moins une photo à télécharger (ZIP)"
        : "Télécharger toutes les photos du coffre (ZIP)";

  const downloadDisabled =
    downloading || !hasPhotos || (selectionMode && selectedCount === 0);

  const galleryToggleLabel = isCoffreOpen
    ? "Masquer la galerie"
    : "Afficher la galerie";
  const galleryToggleIcon = isCoffreOpen ? "🙈" : "👁️";

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4 py-6">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-900/80 border border-slate-800 p-5 md:p-8 shadow-2xl space-y-6">
        {loading && (
          <p className="text-center text-sm text-slate-400">
            Chargement de l’évènement...
          </p>
        )}

        {!loading && error && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}

        {!loading && event && (
          <>
            <section className="rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-5 shadow-md space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Évènement</p>
                  <p className="text-lg font-semibold text-slate-50">{event.name || "Photos"}</p>
                  <p className="text-sm text-slate-400">
                    Toutes les photos du groupe sont réunies ici.
                  </p>
                </div>
                <EventHeader event={event} />
              </div>
            </section>

            {isContestEnabled && (
              <section className="rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-5 shadow-md space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Mode concours</p>
                    <p className="text-base font-semibold text-slate-50">
                      Votez pour vos photos préférées ❤️
                    </p>
                    <p className="text-sm text-slate-400">
                      Chaque participant peut liker une photo une fois. Le classement se met à jour en direct.
                    </p>
                  </div>
                  {contestEndsAt && (
                    <div className="self-start">
                      <ContestCountdown endsAt={contestEndsAt} />
                    </div>
                  )}
                </div>

                {contestLoading && (
                  <p className="text-sm text-slate-400">Chargement du concours...</p>
                )}
                {contestError && (
                  <p className="text-sm text-red-600">{contestError}</p>
                )}

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-100">Classement</p>
                  {contestLeaderboard.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Aucun vote pour le moment. Soyez le premier à liker une photo !
                    </p>
                  ) : (
                    <ol className="space-y-2">
                      {contestLeaderboard.map((entry, index) => (
                        <li
                          key={entry.photoId}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-100">
                              {index + 1}
                            </span>
                            {entry.photo?.url ? (
                              <img
                                src={entry.photo.url}
                                alt={entry.photo.name}
                                className="h-10 w-10 rounded-md object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-800 text-xs text-slate-400">
                                —
                              </div>
                            )}
                            <span className="text-xs text-slate-300">
                              {`Photo #${index + 1}`}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-slate-100">
                            {entry.count} vote{entry.count > 1 ? "s" : ""}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-5 shadow-md space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-50">Photos du groupe</p>
                    <p className="text-sm text-slate-400">
                      Retrouvez et ajoutez les souvenirs partagés par tous.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCoffreOpen((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-100 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-900/60"
                    >
                      <span aria-hidden>{galleryToggleIcon}</span>
                      <span>{galleryToggleLabel}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-200 shadow-sm">
                    {photoCount} photo{photoCount > 1 ? "s" : ""}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-200 shadow-sm">
                    {isCoffreOpen ? "Galerie ouverte" : "Galerie masquée"}
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
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-inner space-y-3">
                    {expirationInfo.isExpired && (
                      <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 shadow-sm">
                        Cet événement est terminé. Vous pouvez toujours consulter et télécharger les photos du coffre.
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="relative">
                        <button
                          type="button"
                          aria-label="Ajouter des photos"
                          onClick={() => {
                            showTooltipTemporarily(setShowUploadTooltip);
                            openUploadDialog();
                          }}
                          onMouseEnter={() => setShowUploadTooltip(true)}
                          onMouseLeave={() => setShowUploadTooltip(false)}
                          onFocus={() => setShowUploadTooltip(true)}
                          onBlur={() => setShowUploadTooltip(false)}
                          onTouchStart={() => showTooltipTemporarily(setShowUploadTooltip)}
                          title="Ajoute des souvenirs en quelques clics. Max 20 fichiers • 10 Mo par photo • Formats JPG/PNG."
                          className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition ${
                            uploading || expirationInfo.isExpired
                              ? "bg-slate-800 text-slate-400 cursor-not-allowed border-slate-700"
                              : "bg-emerald-500/80 text-emerald-100 border-emerald-500/70 hover:bg-emerald-500"
                          }`}
                          disabled={uploading || expirationInfo.isExpired}
                        >
                          <span aria-hidden>📤</span>
                          {uploading ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-4 w-4 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
                              {uploadInfo
                                ? `Upload : ${uploadInfo.processed}/${uploadInfo.total}`
                                : "Upload en cours..."}
                            </span>
                          ) : (
                            "Ajouter des photos"
                          )}
                        </button>
                        {showUploadTooltip && (
                          <div className="absolute left-1/2 top-full z-10 mt-2 w-max max-w-[260px] -translate-x-1/2 rounded-lg border border-emerald-500/40 bg-slate-950 px-3 py-2 text-xs text-emerald-100 shadow-lg">
                            Ajoute des souvenirs en quelques clics. Max 20 fichiers • 10 Mo par photo • Formats JPG/PNG.
                          </div>
                        )}
                        <input
                          ref={uploadInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleUpload}
                          disabled={uploading || expirationInfo.isExpired}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {deviceCount > 0
                          ? `${deviceCount} contributeur${deviceCount > 1 ? "s" : ""} actifs`
                          : "En attente des premiers invités"}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1">
                      {uploadError && <p className="text-red-600">{uploadError}</p>}
                      {uploadSuccess && <p className="text-emerald-300">{uploadSuccess}</p>}
                      {uploadInfo && (
                        <p>
                          {uploadInfo.processed}/{uploadInfo.total} fichiers traités...
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                      <button
                        type="button"
                        onClick={toggleAdvancedActions}
                        className="flex w-full items-center justify-between text-xs font-semibold text-slate-200"
                        aria-expanded={showAdvancedActions}
                      >
                        <span>Actions avancées</span>
                        <span aria-hidden className="text-sm">
                          {showAdvancedActions ? "−" : "+"}
                        </span>
                      </button>
                      {showAdvancedActions && (
                        <div className="mt-3 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                              <button
                                type="button"
                                aria-label={downloadButtonLabel}
                                onClick={() => {
                                  showTooltipTemporarily(setShowDownloadTooltip);
                                  void handleDownload();
                                }}
                                onMouseEnter={() => setShowDownloadTooltip(true)}
                                onMouseLeave={() => setShowDownloadTooltip(false)}
                                onFocus={() => setShowDownloadTooltip(true)}
                                onBlur={() => setShowDownloadTooltip(false)}
                                onTouchStart={() =>
                                  showTooltipTemporarily(setShowDownloadTooltip)
                                }
                                disabled={downloadDisabled}
                                aria-disabled={downloadDisabled}
                                title={downloadTooltipLabel}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <span aria-hidden>⬇️</span>
                                {downloading ? "Préparation du ZIP..." : downloadButtonLabel}
                              </button>
                              {showDownloadTooltip && (
                                <div className="absolute left-1/2 top-full z-10 mt-2 w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 shadow-lg">
                                  {downloadTooltipLabel}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              aria-label={
                                selectionMode
                                  ? "Désactiver le mode sélection"
                                  : "Activer le mode sélection"
                              }
                              aria-pressed={selectionMode}
                              onClick={() => {
                                if (selectionMode) {
                                  closeSelectionMode();
                                } else {
                                  setSelectionMode(true);
                                  setShowAdvancedActions(true);
                                }
                              }}
                              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold shadow-sm transition-colors ${
                                selectionMode
                                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                                  : "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                              }`}
                            >
                              <span className="h-2.5 w-2.5 rounded-full border border-slate-600 bg-slate-100 shadow-inner" />
                              {selectionMode ? "Mode sélection (actif)" : "Mode sélection"}
                            </button>
                          </div>

                          {selectionMode && (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 shadow-sm transition-all">
                              <p className="text-sm font-semibold text-emerald-100">
                                {selectedPhotos.length} photo(s) sélectionnée(s)
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={handleDeleteSelected}
                                  disabled={
                                    selectedPhotos.length === 0 || deletingSelected
                                  }
                                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {deletingSelected
                                    ? "Suppression en cours..."
                                    : `Supprimer ${selectedPhotos.length || "0"} photo(s)`}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDownloadSelected}
                                  disabled={selectedPhotos.length === 0 || downloading}
                                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {downloading ? "Préparation du ZIP..." : "Télécharger"}
                                </button>
                                <button
                                  type="button"
                                  onClick={closeSelectionMode}
                                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 shadow-sm transition-colors hover:bg-slate-800"
                                >
                                  Quitter
                                </button>
                              </div>
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400">
                            {isHost
                              ? "Info hôte : vous pouvez supprimer toutes les photos du groupe."
                              : "Vous pouvez supprimer uniquement vos photos. L'hôte gère l'ensemble du coffre."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <section>
                    {photos.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center mb-4">
                        Aucune photo pour l’instant. Ajoute la première ✨
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {visiblePhotos.map((photo) => {
                          const isSelected = selectedPhotos.includes(photo.path);
                          const likeInfo = photo.contestPhotoId
                            ? contestState?.likesByPhoto[photo.contestPhotoId]
                            : undefined;
                          const likeCount = likeInfo?.count ?? 0;
                          const likedByMe = likeInfo?.likedByMe ?? false;
                          const isLikePending =
                            likeLoadingPhotoId === photo.contestPhotoId;
                          const likeDisabled =
                            !contestReady ||
                            contestLoading ||
                            contestIsVotingClosed ||
                            !photo.contestPhotoId ||
                            isLikePending;

                          return (
                            <div
                              key={photo.path}
                              className={`group relative flex flex-col rounded-lg border overflow-hidden bg-slate-950/40 shadow-sm transition-all duration-200 ${
                                isSelected
                                  ? "border-emerald-400 scale-[1.01]"
                                  : "border-slate-800 hover:border-emerald-400 hover:shadow-md"
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

                              {isContestEnabled && (
                                <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-2 py-2 text-[11px] text-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleLike(photo)}
                                    disabled={likeDisabled}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-semibold transition-colors ${
                                      likedByMe
                                        ? "border-rose-400/40 bg-rose-500/20 text-rose-100"
                                        : "border-slate-700 bg-slate-900 text-slate-100"
                                    } ${likeDisabled ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-800"}`}
                                  >
                                    <span aria-hidden>❤️</span>
                                    {isLikePending
                                      ? "Envoi..."
                                      : likedByMe
                                        ? "Aimé"
                                        : "J'aime"}
                                  </button>
                                  <span>
                                    {likeCount} vote{likeCount > 1 ? "s" : ""}
                                  </span>
                                </div>
                              )}

                              {!selectionMode && canDeletePhoto(photo) && (
                                <div className="absolute top-2 right-2">
                                  <button
                                    type="button"
                                    aria-label="Supprimer cette photo"
                                    title="Supprimer cette photo de l’espace commun"
                                    onClick={() => handleDelete(photo)}
                                    disabled={deletingPath === photo.path}
                                    className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-slate-950/90 px-2 py-1 text-[11px] font-semibold text-red-200 shadow-sm transition-colors hover:bg-red-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    <span aria-hidden>🗑️</span>
                                    <span className="hidden sm:inline">
                                      {deletingPath === photo.path
                                        ? "Suppression..."
                                        : "Supprimer"}
                                    </span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {sortedPhotos.length > visibleCount && (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleCount((prev) => prev + VISIBLE_INCREMENT)
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 shadow-sm transition-colors hover:bg-slate-800"
                      >
                        Afficher plus
                      </button>
                    </div>
                  )}

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

            {shareUrl && (
              <section
                className={`rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 shadow-md ${
                  isShareOpen ? "space-y-4" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsShareOpen((prev) => !prev)}
                  aria-expanded={isShareOpen}
                  aria-controls="share-section-details"
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
                    Partage de l’événement
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-200">
                    {isShareOpen ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <polyline points="6 15 12 9 18 15" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </span>
                </button>

                {isShareOpen && (
                  <div
                    id="share-section-details"
                    className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
                  >
                    <div className="space-y-2 flex-1">
                      <p className="text-base font-semibold text-slate-50">
                        Invitez votre groupe à rejoindre ce coffre.
                      </p>
                      <p className="text-sm text-slate-400">
                        Copie le lien ou scanne le QR code pour partager rapidement.
                      </p>
                      <div className="mt-3 space-y-2">
                        <div className="w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-[12px] text-slate-100 shadow-inner">
                          {shareUrl}
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-400 shadow-sm"
                        >
                          📋 Copier le lien
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-center md:justify-end">
                      <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-inner">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-28 md:h-28 mx-auto">
                          <QRCode
                            value={shareUrl}
                            bgColor="transparent"
                            fgColor="#e2e8f0"
                            style={{ height: "100%", width: "100%" }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsQrModalOpen(true)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 shadow-sm transition-colors hover:bg-slate-800"
                        >
                          Agrandir le QR
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {isQrModalOpen && shareUrl && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
                onClick={() => setIsQrModalOpen(false)}
              >
                <div
                  className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/95 p-5 shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-100">QR code</p>
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(false)}
                      className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      Fermer
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-center">
                    <div className="h-56 w-56 sm:h-64 sm:w-64">
                      <QRCode
                        value={shareUrl}
                        bgColor="transparent"
                        fgColor="#e2e8f0"
                        style={{ height: "100%", width: "100%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-center text-sm text-slate-200 font-semibold">
              Merci d’avoir partagé vos souvenirs ❤️ {hasPhotos && "— de nouvelles photos arrivent en continu !"}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
