"use client";

import React from "react";
import { EventData } from "@/types/event";
import { getExpirationInfo } from "@/lib/eventLifetimes";

type Props = {
  event: EventData;
};

export function EventHeader({ event }: Props) {
  const expirationInfo = getExpirationInfo(event.expires_at ?? null);
  const expirationLabel = expirationInfo.isExpired
    ? expirationInfo.expiredAtLabel
    : expirationInfo.remainingLabel;
  const expirationStyle = expirationInfo.isExpired
    ? "bg-red-100 border-red-200 text-red-800"
    : "bg-emerald-100 border-emerald-200 text-emerald-800";

  return (
    <div className="flex flex-col items-start sm:items-end gap-1 text-left sm:text-right">
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm">
        PIN
        <span className="ml-1 font-semibold tracking-widest text-amber-800">
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
