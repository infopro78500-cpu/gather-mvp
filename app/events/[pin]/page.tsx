"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import QRCode from "react-qr-code";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { EventData } from "@/types/event";
import { Photo } from "@/types/photo";
import { EventHeader } from "@/app/components/events/EventHeader";


export default function EventPage() {
  const MAX_FILES = 20;       // max 20 fichiers à la fois
const MAX_FILE_SIZE_MB = 10; // max 10 Mo par fichier

  const params = useParams();
  const pin = params.pin as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [isCoffreOpen, setIsCoffreOpen] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [multiDeleteMode, setMultiDeleteMode] = useState(false);

  const photoCount = photos.length;
  const hasPhotos = photoCount > 0;

  // Récupérer l'origin pour construire le lien de partage
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const shareUrl =
    origin && event ? `${origin}/events/${event.pin}` : null;

  // Charger l'évènement par PIN
  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("pin", pin)
        .maybeSingle<EventData>();

      if (error) {
        console.error(error);
        setError("Erreur lors du chargement de l’évènement.");
      } else if (!data) {
        setError("Aucun évènement trouvé pour ce PIN.");
      } else {
        setEvent(data);
      }

      setLoading(false);
    };

    fetchEvent();
  }, [pin]);

  // Charger les photos de l'évènement (depuis le bucket "photos")
  const refreshPhotos = async (evt: EventData) => {
    const { data: files, error } = await supabase.storage
      .from("photos")
      .list(evt.id, {
        limit: 200,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      console.error("Erreur list photos:", error);
      return;
    }

    const photosWithUrl: Photo[] =
      files?.map((file) => {
        const path = `${evt.id}/${file.name}`;
        const { data } = supabase.storage
          .from("photos")
          .getPublicUrl(path);

        return {
          name: file.name,
          url: data.publicUrl,
          path,
        };
      }) ?? [];

    setPhotos(photosWithUrl);
  };

  // Recharger les photos quand l'évènement est chargé
  useEffect(() => {
    if (event) {
      refreshPhotos(event);
    }
  }, [event]);

// Upload de plusieurs photos
const handleUpload = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const files = e.target.files;
  if (!files || files.length === 0 || !event) return;

  const filesArray = Array.from(files);

  // 1) Limiter le nombre de fichiers
  if (filesArray.length > MAX_FILES) {
    alert(`Tu peux envoyer maximum ${MAX_FILES} fichiers à la fois.`);
    return;
  }

  // 2) Vérifier type + taille
  for (const file of filesArray) {
    const sizeInMb = file.size / (1024 * 1024);

    if (!file.type.startsWith("image/")) {
      alert(`Le fichier ${file.name} n'est pas une image.`);
      return;
    }

    if (sizeInMb > MAX_FILE_SIZE_MB) {
      alert(`Le fichier ${file.name} dépasse ${MAX_FILE_SIZE_MB} Mo.`);
      return;
    }
  }

  setUploading(true);

  try {
    await Promise.all(
      filesArray.map(async (file) => {
        const cleanName = file.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9.\-_]/g, "_");

        const fileExt = cleanName.split(".").pop() || "jpg";
        const fileName = `${event.id}/${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("event-photos")
          .upload(fileName, file);

        if (uploadError) {
          console.error(uploadError);
          throw uploadError;
        }
      })
    );

    await refreshPhotos(event);
  } catch (error) {
    console.error("Erreur pendant l'upload :", error);
    alert("Une erreur est survenue pendant l'upload. Réessaie.");
  } finally {
    setUploading(false);
  }
};


  // Suppression individuelle
  const handleDelete = async (photo: Photo) => {
    if (!event) return;

    const confirmDelete = window.confirm(
      "Supprimer définitivement cette photo de l’espace commun ?"
    );
    if (!confirmDelete) return;

    try {
      setDeletingPath(photo.path);

      const { error } = await supabase.storage
        .from("event-photos")
        .remove([photo.path]);

      if (error) throw error;

      await refreshPhotos(event);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Erreur lors de la suppression de la photo.");
    } finally {
      setDeletingPath(null);
    }
  };

  // Toggle sélection multi
  const toggleSelectPhoto = (path: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(path)
        ? prev.filter((p) => p !== path)
        : [...prev, path]
    );
  };

  // Suppression multiple
  const handleDeleteSelected = async () => {
    if (!event || selectedPhotos.length === 0) return;

    const ok = window.confirm(
      `Supprimer définitivement ${selectedPhotos.length} photo${
        selectedPhotos.length > 1 ? "s" : ""
      } ?`
    );
    if (!ok) return;

    try {
      const { error } = await supabase.storage
        .from("event-photos")
        .remove(selectedPhotos);

      if (error) throw error;

      setSelectedPhotos([]);
      setMultiDeleteMode(false);
      await refreshPhotos(event);
    } catch (err) {
      console.error("Delete selected error:", err);
      alert("Erreur lors de la suppression des photos sélectionnées.");
    }
  };

  // Copier le lien
  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    alert("Lien de l’évènement copié dans le presse-papiers ✅");
  };

  // Télécharger toutes les photos en ZIP
  const handleDownloadAll = async () => {
    if (!event) return;

    if (photos.length === 0) {
      alert("Aucune photo à télécharger.");
      return;
    }

    try {
      setDownloading(true);

      const zip = new JSZip();

      for (const photo of photos) {
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
      const zipName = `coffre-${event.pin || event.id}.zip`;
      saveAs(content, zipName);
    } catch (err) {
      console.error("Erreur lors de la création du ZIP :", err);
      alert("Erreur lors de la création du fichier ZIP.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="w-[380px] md:w-[720px] rounded-2xl bg-slate-900/80 border border-slate-800 p-6 md:p-7 shadow-xl space-y-4">
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
            {/* PARTAGE */}
            {shareUrl && (
              <section className="mt-1 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-4 flex flex-col md:flex-row items-center md:items-stretch gap-4">
                <div className="flex-1 flex flex-col justify-between gap-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Partage de l’évènement
                  </p>
                  <p className="text-sm font-medium text-slate-50">
                    Invite ton groupe à rejoindre ce coffre.
                  </p>

                  <div className="mt-2 flex flex-col gap-2">
                    <div className="w-full max-w-full overflow-hidden rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-300">
                      {shareUrl}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="self-start rounded-md bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-400 transition-colors"
                    >
                      Copier le lien
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-end">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
                    <QRCode
                      value={shareUrl}
                      size={96}
                      bgColor="transparent"
                      fgColor="#ffffff"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* COFFRE */}
            <section className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-4">
              {/* Carte coffre */}
              <button
                type="button"
                onClick={() => setIsCoffreOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-teal-400/60 transition-all duration-200"
              >
                <div className="flex flex-col text-left">
                  <p className="text-[11px] tracking-wide uppercase text-slate-400">
                    Espace commun du groupe
                  </p>
                  <p className="text-sm font-medium text-slate-50">
                    Galerie photo commune
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cliquez pour{" "}
                    {isCoffreOpen
                      ? "masquer la galerie."
                      : "ouvrir la galerie."}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center rounded-full bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300 mt-1">
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

                  <div className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 shadow-inner">
                    <span className="text-xl">
                      {isCoffreOpen ? "📖" : "🔒"}
                    </span>
                  </div>

                  <p className="text-[11px] text-teal-400 mb-1">
                    {isCoffreOpen ? "Coffre ouvert" : "Coffre fermé"}
                  </p>
                </div>
              </button>

              {/* Contenu du coffre */}
              <div
                className={`mt-3 overflow-hidden transition-all duration-300 ease-out ${
                  isCoffreOpen
                    ? "max-h-[2000px] opacity-100 translate-y-0"
                    : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"
                }`}
              >
                {/* UPLOAD + actions */}
                <div className="flex flex-col items-center gap-3 mb-4">
                  {/* Mode sélection */}
                  <button
                    onClick={() => {
                      setMultiDeleteMode((prev) => !prev);
                      setSelectedPhotos([]);
                    }}
                    className="text-xs text-teal-400 hover:underline mb-1"
                  >
                    {multiDeleteMode
                      ? "Quitter le mode sélection"
                      : "Sélectionner plusieurs photos"}
                  </button>

                  <label className="bg-teal-500 px-4 py-2 rounded-md cursor-pointer text-slate-900 font-semibold hover:bg-teal-400 text-sm shadow-sm">
                    {uploading
                      ? "Upload en cours..."
                      : "Ajouter des photos à l’espace commun"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleUpload}
                    />
                  </label>

                  {multiDeleteMode && selectedPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="rounded-md bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                    >
                      Supprimer {selectedPhotos.length} photo
                      {selectedPhotos.length > 1 ? "s" : ""} sélectionnée
                      {selectedPhotos.length > 1 ? "s" : ""}
                    </button>
                  )}

                  <p className="text-xs text-slate-400 text-center">
                    Chaque photo ajoutée ici rejoint l’espace commun du groupe
                    pour cet évènement.
                  </p>
                </div>

                {/* Bouton ZIP */}
                {photos.length > 0 && (
                  <div className="mb-4 flex justify-center">
                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      disabled={downloading}
                      className="rounded-md border border-teal-500/60 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-teal-300 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {downloading
                        ? "Préparation du téléchargement..."
                        : "Télécharger toutes les photos (ZIP)"}
                    </button>
                  </div>
                )}

                {/* GALERIE */}
                {photos.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center mb-2">
                    Aucune photo pour l’instant. Ajoute la première ✨
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {photos.map((photo) => {
                      const isSelected = selectedPhotos.includes(
                        photo.path
                      );

                      return (
                        <div
                          key={photo.path}
                          className={`group relative flex flex-col rounded-lg border overflow-hidden bg-slate-900/60 transition-all ${
                            isSelected
                              ? "border-teal-400 bg-slate-900"
                              : "border-slate-700"
                          }`}
                        >
                          {/* Checkbox mode multi */}
                          {multiDeleteMode && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                toggleSelectPhoto(photo.path)
                              }
                              className="absolute top-2 left-2 h-4 w-4 accent-teal-400 z-20"
                            />
                          )}

                          <div className="relative">
                            <img
                              src={photo.url}
                              alt={photo.name}
                              onClick={() => {
                                if (multiDeleteMode) {
                                  toggleSelectPhoto(photo.path);
                                } else {
                                  setSelectedPhoto(photo);
                                  setIsLightboxOpen(true);
                                }
                              }}
                              className="w-full h-32 object-cover cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                            />
                          </div>

                          {/* Bouton suppression individuelle */}
                          {!multiDeleteMode && (
                            <button
                              onClick={() => handleDelete(photo)}
                              disabled={deletingPath === photo.path}
                              className="mt-auto text-xs bg-red-500 hover:bg-red-600 disabled:opacity-50 py-1 text-center transition-colors"
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
              </div>
            </section>
          </>
        )}

        {/* LIGHTBOX */}
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
    </main>
  );
}
