"use client";

import React from "react";
import { EventData } from "@/types/event";

type Props = {
  event: EventData;
};

export function EventHeader({ event }: Props) {
  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <span className="text-[10px] uppercase tracking-[0.2em] text-amber-900/70">
        PIN du coffre
      </span>
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm">
        PIN
        <span className="ml-1 font-semibold tracking-widest text-amber-800">
          {event.pin}
        </span>
      </span>
    </div>
  );
}
