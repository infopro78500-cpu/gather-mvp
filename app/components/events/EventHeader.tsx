"use client";

import React from "react";
import { EventData } from "@/types/event";
import { getExpirationInfo } from "@/lib/eventLifetimes";

type Props = {
  event: EventData;
};

export function EventHeader({ event }: Props) {
  const expirationInfo = getExpirationInfo(event.expires_at ?? null);
  const expirationLabel = expirationInfo.statusLabel;
  const expirationStyle = expirationInfo.isExpired
    ? "bg-red-500/10 border-red-500/40 text-red-200"
    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-200";

  return (
    <div className="flex flex-col items-start sm:items-end gap-1 text-left sm:text-right">
      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 shadow-sm">
        PIN
        <span className="ml-1 font-semibold tracking-widest text-slate-100">
          {event.pin}
        </span>
      </span>
      {expirationLabel && (
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium shadow-sm ${expirationStyle}`}
        >
          {expirationLabel}
        </span>
      )}
    </div>
  );
}
