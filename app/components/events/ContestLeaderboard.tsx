"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Photo } from "@/types/photo";
import { ContestCountdown } from "@/app/components/contest/ContestCountdown";

const PODIUM_MEDALS = ["🥇", "🥈", "🥉"];
const DEFAULT_VISIBLE = 3;
const MAX_VISIBLE = 10;

export type ContestPhotoItem = Photo & {
  uploaderDeviceId?: string | null;
  contestPhotoId?: string;
};

export type ContestLeaderboardEntry = {
  photoId: string;
  count: number;
  photo: ContestPhotoItem | null;
};

const looksLikeStorageFilename = (filename: string): boolean => {
  const trimmed = filename.trim();
  if (!trimmed) return false;
  const hasUuid =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
      trimmed
    );
  const hasLongHash = /[0-9a-f]{20,}/i.test(trimmed);
  const hasTimestamp = /__?\d{10,}/.test(trimmed) || /\d{13}/.test(trimmed);
  const hasImageExtension = /\.(jpe?g|png)$/i.test(trimmed);
  const isVeryLong = trimmed.length > 32;
  return (
    hasUuid ||
    hasLongHash ||
    hasTimestamp ||
    (hasImageExtension && isVeryLong)
  );
};

const formatPhotoLabel = (
  entry: ContestLeaderboardEntry | null | undefined,
  index: number
): string => {
  const fallback = `Photo #${index + 1}`;
  const name = entry?.photo?.name?.trim();
  if (!name) return fallback;
  if (looksLikeStorageFilename(name)) return fallback;
  const maxLength = 28;
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength - 1)}…`;
};

type ContestLeaderboardProps = {
  contestEndsAt: string | null;
  contestLoading: boolean;
  contestError: string | null;
  leaderboard: ContestLeaderboardEntry[];
};

export function ContestLeaderboard({
  contestEndsAt,
  contestLoading,
  contestError,
  leaderboard,
}: ContestLeaderboardProps) {
  const [showMoreRanking, setShowMoreRanking] = useState(false);

  const podiumEntries = leaderboard.slice(0, PODIUM_MEDALS.length);
  const extraContestLeaderboard = leaderboard.slice(DEFAULT_VISIBLE, MAX_VISIBLE);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-5 shadow-md space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Mode concours</p>
          <p className="text-base font-semibold text-slate-50">
            Votez pour vos photos préférées ❤️
          </p>
          <p className="text-sm text-slate-400">
            Chaque participant peut liker une photo une fois. Le classement se met à jour en direct.
          </p>
        </div>
        {contestEndsAt && (
          <div className="self-start">
            <ContestCountdown endsAt={contestEndsAt} />
          </div>
        )}
      </div>

      {contestLoading && (
        <p className="text-sm text-slate-400">Chargement du concours...</p>
      )}
      {contestError && <p className="text-sm text-red-600">{contestError}</p>}

      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-100">Classement</p>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-slate-400">
            Aucun vote pour le moment. Soyez le premier à liker une photo !
          </p>
        ) : (
          <div className="space-y-3">
            {podiumEntries.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-3">
                {PODIUM_MEDALS.map((medal, index) => {
                  const entry = podiumEntries[index] ?? null;
                  const label = formatPhotoLabel(entry, index);
                  return (
                    <div
                      key={medal}
                      className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-200"
                    >
                      <span className="text-lg" aria-hidden>
                        {medal}
                      </span>
                      {entry?.photo?.url ? (
                        <img
                          src={entry.photo.url}
                          alt={label}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-800 text-xs text-slate-400">
                          —
                        </div>
                      )}
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-xs font-semibold text-slate-100">
                          {label}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {entry
                            ? `${entry.count} vote${entry.count > 1 ? "s" : ""}`
                            : "En attente"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {leaderboard.length > DEFAULT_VISIBLE && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowMoreRanking((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 shadow-sm transition-colors hover:bg-slate-800"
                >
                  {showMoreRanking ? "Afficher moins" : "Afficher plus"}
                </button>
              </div>
            )}

            {showMoreRanking && leaderboard.length > DEFAULT_VISIBLE && (
              <ol className="space-y-2">
                {extraContestLeaderboard.map((entry, index) => {
                  const rank = index + DEFAULT_VISIBLE + 1;
                  const label = formatPhotoLabel(entry, index + DEFAULT_VISIBLE);
                  return (
                    <li
                      key={entry.photoId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-200">
                          {rank}
                        </span>
                        {entry.photo?.url ? (
                          <img
                            src={entry.photo.url}
                            alt={label}
                            className="h-10 w-10 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-800 text-xs text-slate-400">
                            —
                          </div>
                        )}
                        <span className="truncate text-xs text-slate-200">{label}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-100">
                        {entry.count} vote{entry.count > 1 ? "s" : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
