import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité — Gather",
};

export default function ConfidentialitePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-12">
      <article className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <Link href="/" className="text-sm text-teal-300 hover:text-teal-200">
            ← Retour à l’accueil
          </Link>
          <h1 className="text-3xl font-bold">Politique de confidentialité</h1>
          <p className="text-sm text-slate-400">
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
          </p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed text-slate-300">
          <p>
            Gather permet à un groupe de rassembler les photos et vidéos d’un
            événement dans un espace commun (« coffre »), accessible via un code
            PIN ou un QR code. Cette page explique quelles données nous
            collectons, pourquoi, et comment vous pouvez exercer vos droits.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-slate-100">
            Données que nous collectons
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Photos et vidéos</strong> que vous déposez dans un coffre,
              ainsi que le nom de l’événement.
            </li>
            <li>
              <strong>Un identifiant d’appareil</strong> généré aléatoirement et
              stocké localement dans votre navigateur, pour distinguer les
              contributions et gérer les droits de suppression. Il ne contient
              aucune donnée personnelle et n’est pas utilisé à des fins
              publicitaires.
            </li>
            <li>
              <strong>Votre e-mail et vos centres d’intérêt</strong> uniquement
              si vous les renseignez volontairement via le formulaire
              d’inscription à la liste d’attente.
            </li>
          </ul>

          <h2 className="pt-4 text-lg font-semibold text-slate-100">
            Pourquoi nous les utilisons
          </h2>
          <p>
            Les photos et vidéos servent exclusivement à alimenter le coffre
            partagé de votre événement. L’e-mail de la liste d’attente sert
            uniquement à vous tenir informé du lancement. Nous ne vendons ni ne
            louons vos données à des tiers.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-slate-100">
            Où sont stockées vos données
          </h2>
          <p>
            Les données sont hébergées sur l’infrastructure de Supabase, avec des
            serveurs situés dans l’Union européenne (Irlande). Les échanges sont
            chiffrés en transit (HTTPS) et les données sont chiffrées au repos
            par l’hébergeur.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-slate-100">
            Durée de conservation
          </h2>
          <p>
            Chaque coffre a une durée de vie définie à sa création (par défaut
            24 heures, ou 7 jours). Les photos d’un événement expiré ont vocation
            à être supprimées. Vous pouvez également supprimer vos propres photos
            à tout moment depuis la page de l’événement.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-slate-100">
            Mesure d’audience
          </h2>
          <p>
            Nous utilisons Vercel Analytics pour mesurer la fréquentation du
            site. Cet outil fonctionne <strong>sans cookie</strong> et ne permet
            pas de vous identifier individuellement.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-slate-100">Vos droits</h2>
          <p>
            Conformément au Règlement général sur la protection des données
            (RGPD), vous disposez d’un droit d’accès, de rectification et de
            suppression de vos données. Pour exercer ces droits, ou pour demander
            la suppression d’un coffre ou d’une photo, contactez-nous à
            l’adresse&nbsp;:
          </p>
          <p>
            <a
              href="mailto:contact@usegather.app"
              className="font-semibold text-teal-300 hover:text-teal-200"
            >
              contact@usegather.app
            </a>
          </p>

          <h2 className="pt-4 text-lg font-semibold text-slate-100">Responsable</h2>
          <p>
            Le responsable du traitement est l’équipe Gather, dans le cadre d’un
            projet en cours de développement non encore immatriculé. L’identité
            juridique complète du responsable sera précisée lors de
            l’immatriculation de la structure.
          </p>

          <p className="pt-6 text-xs text-slate-500">
            Ce document constitue une information de transparence. Il ne se
            substitue pas à un conseil juridique.
          </p>
        </section>
      </article>
    </main>
  );
}
