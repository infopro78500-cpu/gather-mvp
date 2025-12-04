"use client";

import React from "react";
import { EventData } from "@/types/event";

type Props = {
  event: EventData;
};

export function EventHeader({ event }: Props) {
  return (
    <div className="flex flex-col items-start sm:items-end gap-1 text-left sm:text-right">
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm">
        PIN
        <span className="ml-1 font-semibold tracking-widest text-amber-800">
          {event.pin}
        </span>
      </span>
    </div>
  );
}
