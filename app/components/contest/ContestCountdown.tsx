"use client";

import { useEffect, useMemo, useState } from "react";

type ContestCountdownProps = {
  endsAt: string;
};

const formatDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const pad = (value: number) => value.toString().padStart(2, "0");

  if (days > 0) {
    return `${days}j ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export function ContestCountdown({ endsAt }: ContestCountdownProps) {
  const endsAtMs = useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [remainingMs, setRemainingMs] = useState(() => endsAtMs - Date.now());

  useEffect(() => {
    setRemainingMs(endsAtMs - Date.now());
    const intervalId = window.setInterval(() => {
      setRemainingMs(endsAtMs - Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [endsAtMs]);

  if (!Number.isFinite(endsAtMs)) {
    return null;
  }

  if (remainingMs <= 0) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        Vote terminé
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      Fin du vote dans <span className="font-semibold">{formatDuration(remainingMs / 1000)}</span>
    </div>
  );
}
