import React from "react";
import { EventData } from "@/types/event";
import { Card } from "../ui/card";

type Props = {
  event: EventData;
};

export function EventHeader({ event }: Props) {
  return (
    <Card className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-gradient-to-r from-surface to-surface-strong/70 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Évènement</p>
        <p className="text-xl font-semibold text-foreground leading-tight">{event.name}</p>
        <p className="text-sm text-muted leading-relaxed">
          Coffre partagé • PIN à transmettre aux invités pour rejoindre le groupe.
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-surface-strong/70 px-4 py-3 border border-border/60 shadow-inner">
        <div className="flex flex-col text-xs uppercase tracking-[0.2em] text-muted">
          <span className="text-[11px] text-muted">PIN</span>
          <span className="text-base font-semibold text-foreground">{event.pin}</span>
        </div>
        <div className="h-10 w-px bg-border/80" aria-hidden />
        <div className="flex flex-col text-right">
          <span className="text-xs text-muted">Organisateur</span>
          <span className="text-sm font-medium text-foreground">Ton appareil</span>
        </div>
      </div>
    </Card>
  );
}
