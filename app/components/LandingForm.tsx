"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function LandingForm() {
  const router = useRouter();  // ✅ ici c’est bon (à l’intérieur du composant)

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setDone(false);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Capture du canal d'acquisition (UTM + provenance), sans donnée perso.
    const urlParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();

    const payload = {
      email: formData.get("email"),
      full_name: formData.get("full_name"),
      interest_investing: !!formData.get("interest_investing"),
      interest_contributing: !!formData.get("interest_contributing"),
      interest_ambassador: !!formData.get("interest_ambassador"),
      interest_beta_tester: !!formData.get("interest_beta_tester"),
      message: formData.get("message"),
      source: "coming_soon",
      // Honeypot anti-bot : rempli uniquement par les robots.
      company: formData.get("company"),
      utm_source: urlParams.get("utm_source"),
      utm_medium: urlParams.get("utm_medium"),
      utm_campaign: urlParams.get("utm_campaign"),
      referrer: typeof document !== "undefined" ? document.referrer : null,
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

        const invest = !!formData.get("interest_investing");
        const contrib = !!formData.get("interest_contributing");
        const amb = !!formData.get("interest_ambassador");
        const beta = !!formData.get("interest_beta_tester");

        // Redirection : la page investisseur existe et sert de pitch dédié
        // (uniquement si c'est le seul intérêt coché). Tous les autres cas
        // vont vers /merci, qui adapte son message aux intérêts choisis.
        if (invest && !contrib && !amb && !beta) {
          router.push("/infos/investisseur-v2");
        } else {
          const params = new URLSearchParams();
          if (invest) params.append("invest", "1");
          if (contrib) params.append("contrib", "1");
          if (amb) params.append("amb", "1");
          if (beta) params.append("beta", "1");
          const query = params.toString();
          router.push(query ? `/merci?${query}` : "/merci");
        }

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
      {/* Honeypot anti-bot : invisible pour les humains, ignoré des lecteurs
          d'écran ; s'il est rempli, la soumission est traitée comme du spam. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

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

      {/* Consentement RGPD */}
      <label className="flex items-start gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900"
        />
        <span>
          J’accepte que mes informations soient utilisées pour être recontacté·e
          au sujet de Gather. Voir la{" "}
          <a
            href="/legal/confidentialite"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-300 underline hover:text-teal-200"
          >
            politique de confidentialité
          </a>
          .
        </span>
      </label>

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
