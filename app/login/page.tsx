"use client";

import { useState, type FormEvent } from "react";

import { getBrowserAuthClient } from "@/lib/supabase/browserAuthClient";

type Status = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setStatus("error");
      return;
    }

    const supabase = getBrowserAuthClient();
    if (!supabase) {
      setStatus("error");
      return;
    }

    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/compte`,
      },
    });

    setStatus(error ? "error" : "sent");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-sm p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Connexion organisateur</h1>
          <p className="text-sm text-slate-400 mt-1">
            Reçois un lien de connexion par email — pas de mot de passe. Retrouve
            tes coffres sur tous tes appareils.
          </p>
        </div>

        {status === "sent" ? (
          <div className="rounded-lg bg-teal-500/10 border border-teal-500/30 p-4 text-sm text-teal-300">
            📧 Lien envoyé à <span className="font-medium">{email.trim()}</span>.
            Ouvre-le sur cet appareil pour te connecter. Pense à vérifier tes
            spams.
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ton@email.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-sm outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full py-2 bg-teal-500 text-slate-900 font-semibold rounded-md hover:bg-teal-400 disabled:opacity-60"
            >
              {status === "sending" ? "Envoi…" : "Recevoir mon lien"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-400 text-center">
                Vérifie ton adresse email, ou réessaie dans un instant.
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
