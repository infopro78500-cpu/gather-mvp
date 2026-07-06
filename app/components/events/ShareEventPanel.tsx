"use client";

import { useState } from "react";
import QRCode from "react-qr-code";

type ShareEventPanelProps = {
  shareUrl: string;
};

const isDesktopViewport = () =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;

export function ShareEventPanel({ shareUrl }: ShareEventPanelProps) {
  const [isShareOpen, setIsShareOpen] = useState(isDesktopViewport);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert("Lien de l’évènement copié dans le presse-papiers ✅");
  };

  return (
    <>
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

      {isQrModalOpen && (
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
    </>
  );
}
