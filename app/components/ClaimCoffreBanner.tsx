"use client";

import { useEffect, useState } from "react";

import { getBrowserAuthClient } from "@/lib/supabase/browserAuthClient";

type Props = {
  eventId: string;
  deviceId: string | null;
  isHost: boolean;
};

type ClaimStatus = "idle" | "claiming" | "done" | "error";

// Bannière de rattachement (chantier comptes hôtes, phase 2). N'apparaît que pour
// l'hôte. Si connecté → propose de rattacher ce coffre au compte (route claim,
// preuve du device). Sinon → invite à se connecter pour le retrouver partout.
export default function ClaimCoffreBanner({ eventId, deviceId, isHost }: Props) {
  // undefined = état de session en cours de lecture
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [status, setStatus] = useState<ClaimStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    const client = getBrowserAuthClient();
    if (!client) {
      setEmail(null);
      return;
    }
    client.auth
      .getUser()
      .then(({ data }) => {
        if (!cancelled) setEmail(data.user?.email ?? null);
      })
      .catch(() => {
        if (!cancelled) setEmail(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isHost || email === undefined) return null;

  if (!email) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300 flex items-center justify-between gap-3">
        <span>Connecte-toi pour retrouver ce coffre sur tous tes appareils.</span>
        <a
          href="/login"
          className="shrink-0 px-3 py-1.5 rounded-md bg-teal-500 text-slate-900 font-semibold hover:bg-teal-400"
        >
          Me connecter
        </a>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4 text-sm text-teal-300">
        ✓ Coffre rattaché à <span className="font-medium">{email}</span>. Tu le
        retrouveras dans{" "}
        <a href="/compte" className="underline hover:text-teal-200">
          Mes coffres
        </a>
        .
      </div>
    );
  }

  const handleClaim = async () => {
    setStatus("claiming");
    try {
      const r = await fetch(`/api/events/${eventId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      setStatus(r.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span>
          Connecté : <span className="text-slate-200">{email}</span>
        </span>
        <button
          type="button"
          onClick={handleClaim}
          disabled={status === "claiming"}
          className="shrink-0 px-3 py-1.5 rounded-md bg-teal-500 text-slate-900 font-semibold hover:bg-teal-400 disabled:opacity-60"
        >
          {status === "claiming"
            ? "Rattachement…"
            : "Rattacher ce coffre à mon compte"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-red-400">
          Impossible de rattacher (peut-être déjà lié à un autre compte).
        </p>
      )}
    </div>
  );
}
