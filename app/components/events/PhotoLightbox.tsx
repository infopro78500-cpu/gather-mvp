/* eslint-disable @next/next/no-img-element */

import { isVideoFilename } from "@/lib/mediaType";

type PhotoLightboxProps = {
  photo: { url: string; name: string } | null;
  onClose: () => void;
};

export function PhotoLightbox({ photo, onClose }: PhotoLightboxProps) {
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div className="relative max-w-[90%] max-h-[90%]" onClick={(e) => e.stopPropagation()}>
        {isVideoFilename(photo.name) ? (
          <video
            src={photo.url}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-full rounded-lg shadow-2xl"
          />
        ) : (
          <img
            src={photo.url}
            alt={photo.name}
            className="max-w-full max-h-full rounded-lg shadow-2xl"
          />
        )}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-md px-2 py-1 text-xs shadow-sm"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
