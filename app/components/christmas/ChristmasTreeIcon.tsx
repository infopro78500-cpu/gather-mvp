import React from "react";

export function ChristmasTreeIcon() {
  return (
    <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-900/90 shadow-md transition-transform hover:scale-105" aria-hidden>
      <svg
        className="w-6 h-6 text-emerald-200"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 2.5c-.4 0-.77.21-.98.55l-3.1 4.9a1.15 1.15 0 00.97 1.75h1.11l-2.37 3.76a1.15 1.15 0 00.97 1.76h1.14l-2.06 3.27c-.41.65.05 1.49.83 1.49h4.39v-2.4h1.5v2.4h4.39c.78 0 1.24-.84.83-1.49l-2.06-3.27h1.14c.92 0 1.46-1.02.97-1.76l-2.37-3.76h1.11c.92 0 1.46-1.02.97-1.75l-3.1-4.9A1.15 1.15 0 0012 2.5z" />
        <circle cx="12" cy="4.5" r="0.6" className="text-amber-200" fill="currentColor" />
        <circle cx="9.5" cy="9.5" r="0.5" className="text-red-200" fill="currentColor" />
        <circle cx="14.5" cy="9.5" r="0.5" className="text-emerald-100" fill="currentColor" />
        <circle cx="11" cy="13.5" r="0.5" className="text-amber-100" fill="currentColor" />
        <circle cx="13.5" cy="13.5" r="0.5" className="text-rose-100" fill="currentColor" />
      </svg>
    </div>
  );
}
