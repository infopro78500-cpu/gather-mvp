// app/infos/investisseur-v2/page.tsx
import Link from "next/link";

export default function InvestisseurV2Page() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 py-16">
      <div className="mx-auto max-w-5xl px-4 space-y-16">
        {/* HERO */}
        <section className="space-y-6">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">
            Gather • Investisseurs early
          </p>

          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            Investir maintenant dans le standard du partage photo
            d&apos;événements
          </h1>

          <p className="text-slate-300 max-w-2xl">
            📸 Gather permet à un groupe de récupérer toutes les photos d&apos;un
            événement en un seul endroit, via un QR code ou un code PIN.
            L&apos;ambition : créer le réflexe&nbsp;
            <span className="italic">
              &quot;on ouvre un coffre photo, tout le monde repart avec ses
              souvenirs&quot;.
            </span>
          </p>

          {/* Badges vision / rentabilité / early access */}
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1">
              👁️ Vision&nbsp;: 1M d&apos;utilisateurs à terme
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1">
              💶 Seuil de rentabilité&nbsp;: ~40–60k utilisateurs actifs
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1">
              🚀 Early Access&nbsp;: 200 personnes maximum
            </span>
          </div>

{/* CTA principal + lien secondaire */}
<div className="space-y-3 pt-2">

<Link
  href="/infos/investissement-fonctionnement"
  scroll={false}
  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg"
>
    Découvrir le modèle d&apos;investissement
  <span className="text-lg">↗</span>
</Link>
   
   <Link href="/infos/investissement-fonctionnement-resume"
        className="block text-xs text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
        Je veux d’abord comprendre Gather et le fonctionnement général (résumé)
  </Link>

</div>
        </section>

        {/* Pourquoi Gather a du potentiel ? */}
        <section className="grid gap-10 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Pourquoi Gather a du potentiel&nbsp;?
            </h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span>📸</span>
                <span>
                  Tout le monde prend des photos pendant un événement (amis,
                  famille, collègues…).
                </span>
              </li>
              <li className="flex gap-2">
                <span>🌀</span>
                <span>
                  À la fin, les souvenirs sont éparpillés (WhatsApp, clouds,
                  conversations privées, téléphones…).
                </span>
              </li>
              <li className="flex gap-2">
                <span>📉</span>
                <span>
                  Résultat&nbsp;: très peu de personnes récupèrent vraiment
                  toutes les photos.
                </span>
              </li>
              <li className="flex gap-2">
                <span>🧰</span>
                <span>
                  Gather propose un réflexe simple&nbsp;: un coffre commun avec
                  QR code / PIN, tout le monde dépose et repart avec tout.
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Un usage universel</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span>🎉</span>
                <span>
                  Mariages, anniversaires, soirées, festivals, écoles,
                  événements d&apos;entreprise, collectifs créatifs…
                </span>
              </li>
              <li className="flex gap-2">
                <span>🌍</span>
                <span>
                  Des millions d&apos;événements chaque année, des dizaines de
                  personnes à chaque fois.
                </span>
              </li>
              <li className="flex gap-2">
                <span>⚠️</span>
                <span>
                  Aujourd&apos;hui, il n&apos;existe pas encore de standard
                  simple pour gérer ces souvenirs collectifs.
                </span>
              </li>
              <li className="flex gap-2">
                <span>🚀</span>
                <span>
                  Gather vise à devenir ce standard du partage de moments
                  collectifs.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Où en est le projet ? */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Où en est le projet aujourd&apos;hui&nbsp;?</h2>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Produit
              </p>
              <p className="mt-2 text-slate-300">
                MVP en cours de développement (création d&apos;événement, QR
                code / PIN, coffre photo, upload, téléchargement du coffre).
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Infrastructure
              </p>
              <p className="mt-2 text-slate-300">
                Stack moderne (Next.js, Supabase, stockage cloud) déjà en place
                et pensée pour monter en charge progressivement.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Pilotage
              </p>
              <p className="mt-2 text-slate-300">
                Page coming soon connectée à Supabase, dashboard interne pour
                suivre les leads et l&apos;intérêt par type de participation.
              </p>
            </div>
          </div>
        </section>

        {/* Bloc modèle d'investissement (plus bas dans la page) */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              Modèle d&apos;investissement
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Gather ne vend pas des parts de société classiques. Chaque
              contribution génère des points basés sur le{" "}
              <span className="font-semibold text-emerald-300">
                montant investi × multiplicateur
              </span>
              . Quand une partie des revenus est redistribuée, elle l&apos;est
              au prorata de ces points.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Plus tu participes tôt, plus ton multiplicateur est élevé. Les
              premiers soutiens (cercle early access) forment le cœur de la
              fusée&nbsp;: ils bénéficient des multiplicateurs les plus forts et
              d&apos;un rôle naturel d&apos;ambassadeurs du projet.
            </p>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Link
                href="/infos/investissement-fonctionnement"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                Voir le fonctionnement en détail
                <span className="text-lg">📝</span>
              </Link>
              <Link
                href="/infos/investissement-fonctionnement-resume"
                className="text-xs text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
              >
                Je préfère le résumé des paliers et multiplicateurs
              </Link>
            </div>
          </div>
        </section>

        {/* Paliers de financement */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Ce qu&apos;on veut financer en premier</h2>
          <p className="text-sm text-slate-300">
            On avance par étapes. Le premier objectif est de financer le
            décollage (Palier A), puis de renforcer le produit et le
            déploiement avec les paliers suivants.
          </p>

          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-xl border border-emerald-500/40 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                🚀 Palier A • Décollage
              </p>
              <p className="mt-2 text-xl font-semibold text-emerald-300">
                80 000 €
              </p>
              <p className="mt-2 text-slate-300">
                Finaliser le MVP, organiser les premiers événements tests,
                stabiliser l&apos;infrastructure et lancer les bases du
                marketing.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                🛰️ Palier B • Orbite basse
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-100">
                + 200 000 €
              </p>
              <p className="mt-2 text-slate-300">
                Nouvelles fonctionnalités (vidéo, IA), apps mobiles, déploiement
                France et premiers partenariats structurants.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                🪐 Palier C • Orbite haute
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-100">
                + 300 000 €
              </p>
              <p className="mt-2 text-slate-300">
                Passage à l&apos;échelle en Europe, partenariats stratégiques et
                consolidation de Gather comme référence du partage photo
                d&apos;événements.
              </p>
            </div>
          </div>
        </section>

        {/* Vision sur 3 ans */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">La vision sur 3 ans</h2>
          <p className="text-sm text-slate-300">
            L&apos;ambition de Gather est d&apos;installer un réflexe simple&nbsp;:{" "}
            <span className="italic">
              &quot;On crée un coffre, on scanne le QR, tout le monde repart
              avec les photos.&quot;
            </span>{" "}
            Voici comment on projette les prochaines années.
          </p>

          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                🌱 Année 1 • Germination
              </p>
              <p className="mt-2 text-slate-300">
                Finaliser le MVP, lancer les premiers coffres sur le terrain,
                atteindre les premiers milliers d&apos;utilisateurs et valider
                les usages.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                🌍 Année 2 • Référence France
              </p>
              <p className="mt-2 text-slate-300">
                Devenir un réflexe pour les mariages, écoles, événements
                d&apos;entreprise et collectifs créatifs. Objectif&nbsp;:
                50k–200k utilisateurs.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                🪐 Année 3 • Maturité Europe
              </p>
              <p className="mt-2 text-slate-300">
                Déploiement dans plusieurs pays européens, partenariats
                structurants et cap vers 500k–1M d&apos;utilisateurs.
              </p>
            </div>
          </div>
        </section>

        {/* Répartition de l'argent */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Concrètement, à quoi sert l&apos;argent&nbsp;?
          </h2>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-semibold text-emerald-300">
                🛠️ Développement &amp; produit ~40%
              </p>
              <p className="mt-2 text-slate-300">
                Finaliser le MVP, améliorer l&apos;expérience, ajouter les
                fonctionnalités clés et préparer les versions mobiles.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-semibold text-emerald-300">
                🧱 Infrastructure &amp; sécurité ~20%
              </p>
              <p className="mt-2 text-slate-300">
                Stockage des photos, bande passante, sauvegardes, monitoring et
                tout ce qui permet d&apos;accueillir des dizaines de milliers
                d&apos;utilisateurs sereinement.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-semibold text-emerald-300">
                🎨 Design &amp; expérience ~10%
              </p>
              <p className="mt-2 text-slate-300">
                Identité visuelle, interface claire, onboarding fluide, tout ce
                qui rend Gather agréable à utiliser.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-semibold text-emerald-300">
                📣 Lancement &amp; croissance ~20%
              </p>
              <p className="mt-2 text-slate-300">
                Tests sur le terrain, premiers événements, marketing ciblé et
                activation d&apos;ambassadeurs pour faire connaître Gather.
              </p>
            </div>
          </div>
        </section>

        {/* Comment les premiers soutiens sont récompensés */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Comment les premiers soutiens sont récompensés&nbsp;?
          </h2>
          <p className="text-sm text-slate-300">
            Le multiplicateur détermine combien de points tu reçois&nbsp;:{" "}
            <span className="font-semibold text-emerald-300">
              Points = montant investi × multiplicateur
            </span>
            . Plus tu participes tôt, plus ton multiplicateur est élevé. Les
            redistributions futures se font au prorata des points.
          </p>

          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="rounded-xl border border-emerald-500/40 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Cercle Early Access (communautaire)
              </p>
              <ul className="mt-3 space-y-2 text-slate-300">
                <li>
                  🔒 Cercle limité à <strong>200 personnes</strong>, avec un
                  plafond de <strong>1000 €</strong> par personne.
                </li>
                <li>✨ Multiplicateurs les plus élevés (x20, x15, x12 selon le moment d&apos;entrée).</li>
                <li>📣 Rôle d&apos;ambassadeur naturel de Gather.</li>
                <li>🎯 Place privilégiée dans la redistribution future.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Investisseurs privés (gros tickets)
              </p>
              <ul className="mt-3 space-y-2 text-slate-300">
                <li>
                  🎯 Pour les personnes qui souhaitent contribuer entre{" "}
                  <strong>5 000 €</strong> et <strong>20 000 €</strong>.
                </li>
                <li>
                  📊 Multiplicateur fixe plus bas pour garder l&apos;équilibre
                  global du système (plafonné à x5, avec conditions discutées au
                  cas par cas).
                </li>
                <li>
                  🤝 Vision long terme alignée avec le développement du produit
                  et de la communauté.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Process + accord clair */}
        <section className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              Comment ça se passe concrètement&nbsp;?
            </h2>
            <p className="text-sm text-slate-300">
              L&apos;idée est de garder les choses simples, humaines et
              transparentes.
            </p>
            <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
              <li>
                Tu nous écris (ou tu remplis un formulaire) avec ton intention
                de participation (montant, early ou privé).
              </li>
              <li>
                On échange ensemble pour répondre aux questions et choisir le
                type d&apos;entrée et le multiplicateur associé.
              </li>
              <li>
                Tu signes un accord de contribution, puis tu reçois un récap
                clair&nbsp;: montant, multiplicateur et nombre de points.
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-6 md:p-7">
            <p className="text-sm font-semibold text-amber-200">
              Un accord clair pour rassurer les premiers soutiens
            </p>
            <p className="mt-2 text-sm text-amber-100/90">
              Avant toute participation financière, chaque investisseur signe un{" "}
              <span className="font-semibold">accord de contribution</span>. Ce
              document formalise&nbsp;:
            </p>
            <ul className="mt-3 space-y-1 text-sm text-amber-100/80">
              <li>• le montant investi,</li>
              <li>• le multiplicateur obtenu,</li>
              <li>• le nombre de points générés,</li>
              <li>• les règles de redistribution future,</li>
              <li>• le statut (Early Access ou Investisseur privé).</li>
            </ul>
            <p className="mt-3 text-xs text-amber-100/70">
              Ce n&apos;est pas une vente de parts de société, mais un cadre
              simple et transparent qui sécurise la contribution et clarifie le
              fonctionnement du modèle.
            </p>
          </div>

          <p className="text-[11px] text-slate-500">
            ⚠️ Comme tout projet en early stage, il existe un risque élevé.
            L&apos;objectif est d&apos;être clair, transparent et aligné avec
            les personnes qui choisissent de soutenir Gather.
          </p>
        </section>

        {/* Rentabilité & sources de revenus */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Quand Gather devient rentable&nbsp;?
          </h2>
          <p className="text-sm text-slate-300">
            À partir de{" "}
            <span className="font-semibold text-emerald-300">
              40 000 à 60 000 utilisateurs actifs
            </span>
            , les revenus récurrents peuvent couvrir les coûts
            (infrastructure, développement, marketing) et rendre Gather
            rentable. Les principales sources de revenus sont alignées avec
            l&apos;usage réel de l&apos;app.
          </p>

          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-semibold text-emerald-300">
                🎟️ Abonnements organisateurs
              </p>
              <p className="mt-2 text-slate-300">
                Formules premium pour ceux qui organisent souvent des
                événements (coffres illimités, HD, stockage longue durée).
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-semibold text-emerald-300">
                📦 Packs événements (mariages, pro, écoles)
              </p>
              <p className="mt-2 text-slate-300">
                Offres dédiées pour les mariages, événements d&apos;entreprise,
                associations et écoles, avec options avancées et services
                complémentaires.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-semibold text-emerald-300">
                ☁️ Stockage &amp; options avancées
              </p>
              <p className="mt-2 text-slate-300">
                Modèle freemium&nbsp;: base gratuite, puis options payantes pour
                plus de stockage, de confort et de fonctionnalités.
              </p>
            </div>
          </div>
        </section>

        {/* Contact / closing CTA */}
        <section className="space-y-4 pb-10">
          <h2 className="text-lg font-semibold">Envie d&apos;en parler&nbsp;?</h2>
          <p className="text-sm text-slate-300 max-w-2xl">
            Si tu veux en savoir plus, recevoir le détail des paliers ou
            discuter d&apos;un investissement (early access ou ticket privé),
            écris-nous. On t&apos;enverra une présentation complète et, si
            besoin, on prendra un créneau pour échanger.
          </p>

          <Link
            href="mailto:contact@gather.app?subject=Investissement%20Gather"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
          >
            Discuter d&apos;un investissement
            <span className="text-lg">✉️</span>
          </Link>

          <p className="text-[11px] text-slate-500 max-w-md">
            Aucun engagement automatique. L&apos;objectif est d&apos;être clair,
            transparent et aligné.
          </p>
        </section>
      </div>
    </main>
  );
}
