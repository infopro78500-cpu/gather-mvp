// app/infos/investisseur/page.tsx

export default function InvestisseurPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-12 flex justify-center">
      <div className="w-full max-w-5xl space-y-12">
        {/* 1. HERO */}
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-400/80">
            Gather • Investisseurs early
          </p>
          <h1 className="text-3xl md:text-4xl font-bold">
            Investir maintenant dans le standard du partage photo d&apos;événements
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-3xl">
            Gather permet à un groupe de récupérer toutes les photos d&apos;un événement en un seul
            endroit via un QR code ou un code PIN. En rejoignant le cercle des premiers soutiens,
            tu accèdes aux multiplicateurs les plus élevés et tu participes à la construction de la fusée
            dès le décollage.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#multiplicateurs"
              className="inline-flex items-center rounded-xl border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 transition"
            >
              Comprendre le fonctionnement
            </a>
          </div>
        </section>

        {/* 2. Pourquoi Gather ? */}
        <section className="grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-xl md:text-2xl font-semibold">Pourquoi Gather a du potentiel ?</h2>
            <p className="text-slate-300">
              Aujourd&apos;hui, après chaque événement, les photos sont éparpillées&nbsp;: WhatsApp,
              clouds, téléphones… Au final, chacun repart avec peu de souvenirs. Gather simplifie
              tout&nbsp;: un coffre commun, un QR code, tout le monde dépose et repart avec l&apos;ensemble
              des photos en quelques secondes.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Un usage universel</h3>
            <p className="text-slate-300">
              Mariages, anniversaires, écoles, soirées, événements d&apos;entreprise, collectifs créatifs…
              Des millions d&apos;événements chaque année, des dizaines de personnes à chaque fois. Le besoin
              est massif et il n&apos;existe pas encore de standard simple pour gérer ces souvenirs
              collectifs. C&apos;est la place que vise Gather.
            </p>
          </div>
        </section>

        {/* 3. Où en est le projet ? */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold">Où en est le projet aujourd&apos;hui ?</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <p className="text-sm font-medium text-emerald-300/90">Produit</p>
              <p className="text-sm text-slate-300">
                MVP en cours (création d&apos;événement, QR code, coffre photo, upload, téléchargement des
                photos du groupe).
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <p className="text-sm font-medium text-emerald-300/90">Infrastructure</p>
              <p className="text-sm text-slate-300">
                Stack moderne (Next.js, Supabase, stockage cloud) déjà en place et pensée pour monter en
                charge progressivement.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <p className="text-sm font-medium text-emerald-300/90">Pilotage</p>
              <p className="text-sm text-slate-300">
                Landing page connectée, base de leads, dashboard interne pour suivre les inscriptions et
                l&apos;intérêt par type de participation.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Paliers (avec icônes + mini anim) */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold">Ce qu&apos;on veut financer en premier</h2>
          <p className="text-slate-300 max-w-3xl">
            On avance par étapes. Le premier objectif est de financer le décollage (Palier A), puis de
            renforcer le produit et le déploiement avec les paliers suivants.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Palier A */}
            <div className="rounded-2xl border border-emerald-500/60 bg-emerald-500/5 p-5 space-y-3 transition-transform transition-colors duration-200 hover:-translate-y-1 hover:border-emerald-400 hover:bg-emerald-500/10">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
                  Palier A • Décollage
                </p>
              </div>
              <p className="text-xl font-bold text-emerald-300">80&nbsp;000&nbsp;€</p>
              <p className="text-sm text-slate-300">
                Finaliser le MVP, organiser les premiers événements tests, stabiliser l&apos;infrastructure
                et lancer les bases du marketing.
              </p>
            </div>

            {/* Palier B */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 space-y-3 transition-transform transition-colors duration-200 hover:-translate-y-1 hover:border-emerald-400/70 hover:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛸</span>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/80">
                  Palier B • Orbite basse
                </p>
              </div>
              <p className="text-xl font-bold text-slate-50">+ 200&nbsp;000&nbsp;€</p>
              <p className="text-sm text-slate-300">
                Nouvelles fonctionnalités (vidéo, IA), apps mobiles, déploiement France et premiers
                partenariats structurants.
              </p>
            </div>

            {/* Palier C */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 space-y-3 transition-transform transition-colors duration-200 hover:-translate-y-1 hover:border-emerald-400/70 hover:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛰️</span>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/80">
                  Palier C • Orbite haute
                </p>
              </div>
              <p className="text-xl font-bold text-slate-50">+ 300&nbsp;000&nbsp;€</p>
              <p className="text-sm text-slate-300">
                Passage à l&apos;échelle en Europe, déploiement massif et consolidation de Gather comme
                référence du partage photo d&apos;événements.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Une version détaillée de la roadmap pourra être partagée sur demande (répartition par mois, par
            poste de dépense, projections).
          </p>
        </section>

        {/* 4bis. Vision sur 3 ans */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold">La vision sur 3 ans</h2>
          <p className="text-slate-300 max-w-3xl">
            L&apos;ambition de Gather est d&apos;installer un réflexe simple&nbsp;: &quot;On crée un coffre,
            on scanne le QR, tout le monde repart avec les photos.&quot; Voici comment on projette les
            prochaines années.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/80">
                Année 1 • Décollage
              </p>
              <p className="text-sm text-slate-300">
                Finaliser le produit, lancer les premiers coffres sur le terrain, atteindre
                les premiers milliers d&apos;utilisateurs et valider le modèle.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/80">
                Année 2 • Référence France
              </p>
              <p className="text-sm text-slate-300">
                Devenir un réflexe pour les mariages, écoles, événements d&apos;entreprise et collectifs
                créatifs. Atteindre 50k–200k utilisateurs.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/80">
                Année 3 • Scale Europe
              </p>
              <p className="text-sm text-slate-300">
                Déploiement dans plusieurs pays européens, partenariats structurants et cap vers le million
                d&apos;utilisateurs.
              </p>
            </div>
          </div>
        </section>

        {/* 5. À quoi sert l'argent ? (2x2) */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold">Concrètement, à quoi sert l&apos;argent ?</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-300/90">
                Développement & produit • ~40%
              </p>
              <p className="text-sm text-slate-300">
                Finaliser le MVP, améliorer l&apos;expérience, ajouter les fonctionnalités clés et préparer
                les versions mobiles.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-300/90">
                Infrastructure & sécurité • ~20%
              </p>
              <p className="text-sm text-slate-300">
                Stockage des photos, bande passante, sauvegardes, monitoring et tout ce qui permet
                d&apos;accueillir des dizaines de milliers d&apos;utilisateurs sereinement.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-300/90">Design & expérience • ~10%</p>
              <p className="text-sm text-slate-300">
                Identité visuelle, interface claire, onboarding fluide, tout ce qui rend Gather agréable à
                utiliser.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-300/90">
                Lancement & croissance • ~20%
              </p>
              <p className="text-sm text-slate-300">
                Tests sur le terrain, premiers événements, marketing ciblé et activation d&apos;ambassadeurs
                pour faire connaître Gather.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Système de multiplicateurs (light) */}
        <section id="multiplicateurs" className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold">
            Comment les premiers soutiens sont récompensés ?
          </h2>
          <p className="text-slate-300 max-w-3xl">
            Chaque contribution génère des points&nbsp;:{" "}
            <strong>montant investi × multiplicateur</strong>. Quand une partie des revenus est
            redistribuée, elle l&apos;est au prorata des points. Plus tu participes tôt, plus ton
            multiplicateur est élevé.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/50 bg-emerald-500/5 p-4 space-y-3">
              <h3 className="text-lg font-semibold text-emerald-300">
                Cercle Early Access (communautaire)
              </h3>
              <p className="text-sm text-slate-200">
                Cercle limité à <strong>200 personnes</strong>, avec un plafond de{" "}
                <strong>1000&nbsp;€</strong> par personne.
              </p>
              <ul className="text-sm text-slate-200 space-y-1 list-disc list-inside">
                <li>Multiplicateurs les plus élevés (x20, x15, x12 selon le moment d&apos;entrée).</li>
                <li>Rôle d&apos;ambassadeur naturel de Gather.</li>
                <li>Place privilégiée dans la redistribution future.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
              <h3 className="text-lg font-semibold text-slate-50">
                Investisseurs privés (gros tickets)
              </h3>
              <p className="text-sm text-slate-300">
                Pour les personnes qui souhaitent contribuer entre 5&nbsp;000 et 20&nbsp;000&nbsp;€, un
                cercle séparé existe avec un multiplicateur fixe plus bas pour garder l&apos;équilibre du
                système.
              </p>
              <p className="text-sm text-slate-300">
                Sur ce cercle, le multiplicateur est plafonné à <strong>x5</strong>, avec des conditions
                discutées au cas par cas, en cohérence avec la vision long terme.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Un document séparé pourra détailler les paliers de multiplicateurs (x20, x15, x12, etc.) et
            donner des exemples chiffrés pour ceux qui veulent rentrer dans le détail.
          </p>
        </section>

        {/* 7. Rentabilité + CTA */}
        <section className="space-y-4 border-t border-slate-800 pt-8">
          <h2 className="text-xl md:text-2xl font-semibold">Quand Gather devient rentable ?</h2>
          <p className="text-slate-300 max-w-3xl">
            À partir de 40&nbsp;000 à 60&nbsp;000 utilisateurs actifs, les revenus récurrents peuvent couvrir
            les coûts (infrastructure, développement, marketing) et rendre Gather rentable. Les principales
            sources de revenus sont alignées avec l&apos;usage réel de l&apos;app.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-300/90">Abonnements organisateurs</p>
              <p className="text-sm text-slate-300">
                Formules premium pour ceux qui organisent souvent des événements (coffres illimités, HD,
                stockage longue durée).
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-300/90">
                Packs événements (mariages, pro, écoles)
              </p>
              <p className="text-sm text-slate-300">
                Offres dédiées pour les mariages et événements structurés, avec options avancées et services
                complémentaires.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-300/90">Stockage & options avancées</p>
              <p className="text-sm text-slate-300">
                Modèle freemium&nbsp;: base gratuite, puis options payantes pour plus de stockage et de
                fonctionnalités.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Envie d&apos;en parler ?</h3>
            <p className="text-slate-300 max-w-3xl">
              Si tu veux en savoir plus, recevoir le détail des paliers ou discuter d&apos;un investissement
              (early access ou ticket privé), écris-nous. On enverra une présentation complète et, si
              besoin, on prendra un créneau pour échanger.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="mailto:contact@gather.app?subject=Int%C3%A9r%C3%AAt%20investisseur%20Gather"
                className="inline-flex items-center rounded-xl border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 transition"
              >
                📩 Discuter d&apos;un investissement
              </a>
              <p className="text-xs text-slate-500">
                Aucun engagement automatique. L&apos;objectif est d&apos;être clair, transparent et aligné.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
