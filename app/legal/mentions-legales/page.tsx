import Link from "next/link";

export const metadata = {
  title: "Mentions légales — Usegather",
};

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-12">
      <article className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <Link href="/" className="text-sm text-teal-300 hover:text-teal-200">
            ← Retour à l’accueil
          </Link>
          <h1 className="text-3xl font-bold">Mentions légales</h1>
        </div>

        <section className="space-y-3 text-sm leading-relaxed text-slate-300">
          <h2 className="pt-2 text-lg font-semibold text-slate-100">Éditeur</h2>
          <p>
            Usegather est actuellement un projet en cours de développement, édité à
            titre personnel par l’équipe Usegather. Aucune structure juridique
            (société ou entreprise individuelle) n’est immatriculée à ce jour.
            Les informations légales complètes (raison sociale, numéro SIRET,
            siège social) seront publiées lors de l’immatriculation, préalable à
            toute exploitation commerciale du service.
          </p>
          <p>Directeur de la publication : l’équipe Usegather.</p>
          <p>
            Contact :{" "}
            <a
              href="mailto:contact@usegather.app"
              className="font-semibold text-teal-300 hover:text-teal-200"
            >
              contact@usegather.app
            </a>
          </p>

          <h2 className="pt-4 text-lg font-semibold text-slate-100">Hébergement</h2>
          <p>
            L’application est hébergée par Vercel Inc. (États-Unis) pour la partie
            web, et les données sont stockées sur l’infrastructure de Supabase,
            avec des serveurs situés dans l’Union européenne (Irlande).
          </p>

          <h2 className="pt-4 text-lg font-semibold text-slate-100">
            Propriété intellectuelle
          </h2>
          <p>
            Les photos et vidéos déposées dans un coffre restent la propriété de
            leurs auteurs. Usegather ne revendique aucun droit sur les contenus
            partagés par les utilisateurs.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-slate-100">
            Données personnelles
          </h2>
          <p>
            Le traitement de vos données personnelles est décrit dans notre{" "}
            <Link
              href="/legal/confidentialite"
              className="text-teal-300 hover:text-teal-200"
            >
              politique de confidentialité
            </Link>
            .
          </p>

          <p className="pt-6 text-xs text-slate-500">
            Ces mentions doivent être complétées et validées par un professionnel
            avant toute exploitation commerciale.
          </p>
        </section>
      </article>
    </main>
  );
}
