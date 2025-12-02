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
import { getDeviceId as getEventDeviceId } from "@/lib/deviceId";

const BUCKET_NAME = "event-photos";
const MAX_FILES = 20; // max 20 fichiers à la fois
const MAX_FILE_SIZE_MB = 10; // max 10 Mo par fichier

// On étend le type Photo pour ajouter l'uploader
type PhotoItem = Photo & {
  uploaderDeviceId?: string | null;
};

export default function EventPage() {
  const params = useParams();
  const pin = params.pin as string;

  // --- STATE ---

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

  const photoCount = photos.length;
  const hasPhotos = photoCount > 0;

  // --- DEVICE ID & HOST ---

  // 1) Récupérer l’ID du device courant
  useEffect(() => {
    const id = getEventDeviceId();
    console.log("DEVICE ID (event page) :", id);
    setDeviceId(id);
  }, []);

  // 2) Savoir si ce device est l'organisateur de l'évènement
  useEffect(() => {
    if (event && deviceId) {
      const host = event.host_device_id === deviceId;
      console.log("isHost ?", host, "event.host_device_id =", event.host_device_id);
      setIsHost(host);
    }
  }, [event, deviceId]);

  // --- ORIGIN & SHARE URL ---

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const shareUrl = origin && event ? `${origin}/events/${event.pin}` : null;

// --- FETCH EVENT ---
useEffect(() => {
  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("pin", pin)
      .maybeSingle<EventData>();

    if (error) {
      console.error(error);
      setError("Erreur lors du chargement de l'évènement.");
    } else if (!data) {
      setError("Aucun évènement trouvé pour ce PIN.");
    } else {
      setEvent(data);

      // 🔍 LOGS POUR CHECKER L'ÉVÈNEMENT
      console.log("[CHECK EVENT] id =", data.id);
      console.log("[CHECK EVENT] pin =", data.pin);
    }

    setLoading(false);
  };

  fetchEvent();
}, [pin]);

  // Charger les photos de l'évènement (depuis le bucket "event-photos")
  const refreshPhotos = async (evt: EventData) => {
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(evt.id, {
        limit: 200,
        sortBy: { column: "name", order: "asc" },
      });

  console.log("📁 Files bruts Supabase :", files, "error :", error);

  if (error) {
    console.error("Erreur list photos:", error);
    return;
  }

    const photosWithUrl: Photo[] =
      files?.map((file) => {
        const path = `${evt.id}/${file.name}`;
        const { data } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(path);

  return {
    name: file.name,
    path,
    url: data.publicUrl,
    // ... uploadeur, etc
  };
});

console.log("[REFRESH] Photos construites pour l'état React =", photosWithUrl); // 👈 AJOUTE ÇA

setPhotos(photosWithUrl);

};


  // Quand l'évènement change, on recharge les photos
  useEffect(() => {
    if (event) {
      refreshPhotos(event);
    }
  }, [event]);

  // --- DROITS DE SUPPRESSION ---

  const canDeletePhoto = (photo: PhotoItem) => {
    if (!deviceId) return false;
    if (isHost) return true; // l'organisateur peut tout supprimer
    return photo.uploaderDeviceId === deviceId; // sinon seulement ses propres photos
  };

  // --- UPLOAD ---
console.log("[UPLOAD] event.id =", event?.id);
console.log("[UPLOAD] currentDeviceId =", getEventDeviceId());
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !event) return;

    const filesArray = Array.from(files);

    // 1) Récupérer l'ID de cet appareil
    const currentDeviceId = getEventDeviceId();
    if (!currentDeviceId) {
      console.error("Impossible de récupérer le deviceId");
      setError("Erreur : appareil non identifié.");
      return;
    }

    // 2) Limiter le nombre de fichiers
    if (filesArray.length > MAX_FILES) {
      alert(`Tu peux envoyer maximum ${MAX_FILES} fichiers à la fois.`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const newPhotos: PhotoItem[] = [];

      for (const file of filesArray) {
        // 3) Vérifier la taille
        const sizeMb = file.size / (1024 * 1024);
        if (sizeMb > MAX_FILE_SIZE_MB) {
          console.warn(`Fichier trop lourd : ${file.name}`);
          continue;
        }

        // 4) Nom de fichier safe
        const safeName = file.name
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9.\-_]/g, "_");

        // 5) Path complet dans le bucket
        const filenameOnStorage = `${currentDeviceId}__${Date.now()}-${safeName}`;
        const path = `${event.id}/${filenameOnStorage}`;
        console.log("[UPLOAD] path envoyé à Supabase =", path);

        // 6) Upload
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(path, file);

        if (uploadError) {
          console.error("Erreur upload Supabase :", uploadError);
          setError("Erreur lors de l’upload d’une photo.");
          continue;
        }

        // 7) URL publique
        const { data: publicData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(path);

        newPhotos.push({
          name: filenameOnStorage,
          url: publicData.publicUrl,
          path,
          uploaderDeviceId: currentDeviceId,
        });
      }

      if (newPhotos.length > 0) {
        setPhotos((prev) => [...prev, ...newPhotos]);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

// --- SUPPRESSION INDIVIDUELLE ---
const handleDelete = async (photo: PhotoItem) => {
  if (!event) return;

  const confirmDelete = window.confirm(
    "Supprimer définitivement cette photo de l'espace commun ?"
  );
  if (!confirmDelete) return;

  console.log("[DELETE] Demande de suppression pour :", photo.path);
  console.log("[DELETE] isHost =", isHost, "deviceId =", deviceId);

  try {
    setDeletingPath(photo.path);

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([photo.path]);

    console.log("[DELETE] Résultat remove Supabase :", { data, error });

    if (error) {
      throw error;
    }

    // 🔁 Mise à jour immédiate du state local
    setPhotos((prev) => prev.filter((p) => p.path !== photo.path));

    // 🔁 Sync avec Supabase au cas où
    await refreshPhotos(event);
  } catch (err) {
    console.error("Delete error:", err);
    alert("Erreur lors de la suppression de la photo.");
  } finally {
    setDeletingPath(null);
  }
};



  // --- SUPPRESSION MULTIPLE ---

  const toggleSelectPhoto = (path: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleDeleteSelected = async () => {
    if (!event || selectedPhotos.length === 0) return;

    const ok = window.confirm(
      `Supprimer définitivement ${selectedPhotos.length} photo${
        selectedPhotos.length > 1 ? "s" : ""
      } ?`
    );
    if (!ok) return;

    console.log("Demande de suppression multiple pour :", selectedPhotos);

    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(selectedPhotos);

      console.log("Résultat remove multiple Supabase :", { data, error });

      if (error) throw error;

      setSelectedPhotos([]);
      setMultiDeleteMode(false);
      await refreshPhotos(event);
    } catch (err) {
      console.error("Delete selected error:", err);
      alert("Erreur lors de la suppression des photos sélectionnées.");
    }
  };

  // --- COPIER LIEN ---

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    alert("Lien de l’évènement copié dans le presse-papiers ✅");
  };

  // --- DOWNLOAD ZIP ---

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

  // --- RENDER ---

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
                              className={`group relative flex flex-col rounded-lg border overflow-hidden bg-slate-900/60 transition-all ${
                                isSelected
                                  ? "border-teal-400 bg-slate-900"
                                  : "border-slate-700"
                              }`}
                            >
                              {/* Clic sur l’image → lightbox */}
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
                                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                                />
                              </button>

                              {/* Checkbox mode multi */}
                              {multiDeleteMode && (
                                <div className="absolute top-2 left-2 bg-slate-900/70 rounded px-1 py-0.5">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() =>
                                      toggleSelectPhoto(photo.path)
                                    }
                                  />
                                </div>
                              )}

                              {/* Bouton suppression individuelle */}
                              {!multiDeleteMode && canDeletePhoto(photo) && (
                                <button
                                  type="button"
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

                      {/* Actions mode multi */}
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
            </section>
          </>
        )}
      </div>
    </main>
  );
}
