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
        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
          Évènement
        </p>
        <p className="text-sm md:text-base font-semibold text-slate-50">
          {event.name}
        </p>
      </div>

      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] font-medium text-slate-200 shadow-sm">
        PIN
        <span className="ml-1 font-semibold tracking-widest text-teal-400">
          {event.pin}
        </span>
      </span>
    </div>
  );
}
