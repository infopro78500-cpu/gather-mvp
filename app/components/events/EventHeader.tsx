"use client";

import React from "react";
import { EventData } from "@/types/event";

type Props = {
  event: EventData;
};

export function EventHeader({ event }: Props) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <div className="text-left">
        <p className="text-[11px] uppercase tracking-[0.25em] text-amber-700">
          Évènement
        </p>
        <p className="text-sm md:text-base font-semibold text-amber-950">
          {event.name}
        </p>
      </div>

      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-[11px] font-medium text-amber-900 shadow-sm">
        PIN
        <span className="ml-1 font-semibold tracking-widest text-amber-700">
          {event.pin}
        </span>
      </span>
    </div>
  );
}
