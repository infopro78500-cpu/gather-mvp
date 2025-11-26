"use client";

import React, { useState } from "react";

export function LandingForm() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setDone(false);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const payload = {
      email: formData.get("email"),
      full_name: formData.get("full_name"),
      interest_investing: !!formData.get("interest_investing"),
      interest_contributing: !!formData.get("interest_contributing"),
      interest_ambassador: !!formData.get("interest_ambassador"),
      interest_beta_tester: !!formData.get("interest_beta_tester"),
      message: formData.get("message"),
      source: "coming_soon",
    };

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error(data);
        setError("Une erreur est survenue. Réessaie plus tard.");
      } else {
        setDone(true);
        (e.target as HTMLFormElement).reset();
      }
    } catch (err) {
      console.error(err);
      setError("Problème de connexion. Vérifie ta connexion internet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-200">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          placeholder="ton@email.com"
          className="w-full rounded-md bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 text-sm outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
        />
      </div>

      {/* Nom */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-200">
          Nom / pseudo
        </label>
        <input
          name="full_name"
          type="text"
          placeholder="Ton prénom, ton blaze…"
          className="w-full rounded-md bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 text-sm outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
        />
      </div>

      {/* Intérêts */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-200">
          Comment tu veux participer ?
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            name="interest_investing"
            className="h-4 w-4 rounded border-slate-600 bg-slate-900"
          />
          <span>Je suis intéressé·e pour investir</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            name="interest_contributing"
            className="h-4 w-4 rounded border-slate-600 bg-slate-900"
          />
          <span>Je peux contribuer (temps / compétences)</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            name="interest_ambassador"
            className="h-4 w-4 rounded border-slate-600 bg-slate-900"
          />
          <span>Je peux parler de Gather autour de moi</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            name="interest_beta_tester"
            className="h-4 w-4 rounded border-slate-600 bg-slate-900"
          />
          <span>Je veux tester Gather en avant-première</span>
        </label>
      </div>

      {/* Message */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-200">
          Un mot pour nous ? (optionnel)
        </label>
        <textarea
          name="message"
          rows={3}
          placeholder="Parle-nous de toi, de ton lien avec les événements, la photo, la communauté…"
          className="w-full rounded-md bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 text-sm outline-none resize-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
        />
      </div>

      {/* Bouton */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 text-slate-950 font-semibold py-2 text-sm transition"
      >
        {loading ? "Envoi en cours..." : "Rejoindre l’aventure Gather"}
      </button>

      {done && (
        <p className="text-sm text-teal-300">
          Merci 🙌 On te recontacte dès que la prochaine étape est prête.
        </p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
