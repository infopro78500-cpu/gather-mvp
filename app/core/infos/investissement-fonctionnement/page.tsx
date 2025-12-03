export default function InvestissementFonctionnementPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-12 flex justify-center">
      <div className="w-full max-w-4xl space-y-12">
        {/* 1. HERO */}
        <section className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-400/80">
            Gather • Comprendre le fonctionnement
          </p>
          <h1 className="text-3xl md:text-4xl font-bold">
            Comprendre le fonctionnement de l&apos;investissement dans Gather
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-3xl">
            L&apos;objectif de cette page est d&apos;expliquer simplement comment fonctionne la
            participation financière dans Gather&nbsp;: multiplicateurs, points, types de
            contributeurs et cadre d&apos;accord. Sans jargon juridique, sans promesse magique.
          </p>
        </section>

        {/* 2. Principe général */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold">Le principe général</h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <p className="text-sm text-slate-300">
              Gather ne vend pas des parts de société classiques. Les personnes qui soutiennent le
              projet financièrement reçoivent des <strong>points</strong>, calculés à partir d&apos;un{" "}
              <strong>multiplicateur</strong>.
            </p>
            <p className="text-sm text-slate-300">
              Quand une partie des revenus futurs est redistribuée, elle l&apos;est au{" "}
              <strong>prorata des points</strong>. Plus tu as de points, plus ta part de
              redistribution potentielle est élevée.
            </p>
          </div>
        </section>

        {/* 3. Deux types de contributeurs */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold">Les deux types de contributeurs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Early Access */}
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3">
              <h3 className="text-lg font-semibold text-emerald-300">
                Cercle Early Access (communautaire)
              </h3>
              <ul className="text-sm text-slate-200 space-y-1 list-disc list-inside">
                <li>Limité à <strong>200 personnes maximum</strong>.</li>
                <li>Plafond à <strong>1000&nbsp;€</strong> par personne.</li>
                <li>Multiplicateurs les plus élevés (x20, x15, x12 selon le moment d&apos;entrée).</li>
                <li>Rôle d&apos;ambassadeur naturel de Gather.</li>
              </ul>
            </div>

            {/* Investisseurs privés */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
              <h3 className="text-lg font-semibold text-slate-50">
                Investisseurs privés (gros tickets)
              </h3>
              <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                <li>Tickets entre <strong>5&nbsp;000</strong> et <strong>20&nbsp;000&nbsp;€</strong>.</li>
                <li>Multiplicateur plus bas mais stable&nbsp;: <strong>x5</strong>.</li>
                <li>Conditions discutées au cas par cas, en cohérence avec la vision long terme.</li>
                <li>Cercle séparé pour garder l&apos;équilibre du modèle.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. Calcul des points */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold">Comment sont calculés les points ?</h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-200">
                La formule est volontairement simple :
              </p>
              <p className="inline-flex items-center rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm font-mono">
                Points = montant investi × multiplicateur
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-300">Quelques exemples pour visualiser :</p>
              <div className="grid gap-2 md:grid-cols-3 text-xs md:text-sm">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-1">
                  <p className="text-slate-200 font-medium">Early Access</p>
                  <p className="text-slate-300">200&nbsp;€ × x20</p>
                  <p className="text-emerald-300 font-semibold">=&nbsp;4&nbsp;000 points</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-1">
                  <p className="text-slate-200 font-medium">Early Access</p>
                  <p className="text-slate-300">1000&nbsp;€ × x12</p>
                  <p className="text-emerald-300 font-semibold">=&nbsp;12&nbsp;000 points</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-1">
                  <p className="text-slate-200 font-medium">Investisseur privé</p>
                  <p className="text-slate-300">5&nbsp;000&nbsp;€ × x5</p>
                  <p className="text-emerald-300 font-semibold">=&nbsp;25&nbsp;000 points</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Ces exemples sont illustratifs. Le but est de montrer comment le multiplicateur
                amplifie les points en fonction du moment d&apos;entrée et du montant.
              </p>
            </div>
          </div>
        </section>

        {/* 5. À quoi servent les points ? */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold">À quoi servent les points ?</h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <p className="text-sm text-slate-300">
              Les points servent de base à une éventuelle <strong>redistribution future</strong>.
              Si Gather décide de redistribuer une partie de ses revenus, cette redistribution
              pourra être répartie entre les contributeurs au <strong>prorata de leurs points</strong>.
            </p>
            <p className="text-sm text-slate-300">
              Concrètement, plus tu participes tôt avec un multiplicateur élevé, plus ton{" "}
              <strong>ratio points / euro investi</strong> est intéressant, et plus ta position
              dans le système est forte.
            </p>
            <p className="text-xs text-slate-500">
              Important&nbsp;: le système reste flexible et dépendra de la trajectoire réelle de
              Gather. L&apos;objectif est d&apos;aligner les intérêts entre le projet et celles et
              ceux qui l&apos;aident à décoller.
            </p>
          </div>
        </section>

        {/* 6. Comment ça se passe concrètement ? */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold">Comment ça se passe concrètement ?</h2>
          <p className="text-slate-300 max-w-3xl">
            L&apos;idée est de garder les choses simples, humaines et transparentes. Pas de
            plateforme compliquée&nbsp;: on parle, on clarifie, puis on formalise.
          </p>
          <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
            <li>
              Tu nous écris (ou tu remplis un formulaire) avec ton intention de participation
              (montant envisagé, Early Access ou Investisseur privé).
            </li>
            <li>
              On échange ensemble pour répondre aux questions, valider le type d&apos;entrée, le
              multiplicateur applicable et clarifier les règles.
            </li>
            <li>
              Tu signes un <strong>accord de contribution</strong>, puis tu reçois un récap clair :
              montant, multiplicateur, nombre de points et statut.
            </li>
          </ol>
          <div className="pt-2">
            <a
              href="mailto:contact@gather.app?subject=Comprendre%20le%20fonctionnement%20de%20l%27investissement%20Gather"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 transition"
            >
              📩 Poser des questions ou demander un échange
            </a>
          </div>
        </section>

        {/* 7. Accord de contribution */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold">L&apos;accord de contribution</h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <p className="text-sm text-slate-300">
              Avant toute participation financière, un <strong>accord de contribution</strong> est
              signé. Il sert à sécuriser la relation pour tout le monde et à éviter les malentendus.
            </p>
            <p className="text-sm text-slate-300">Cet accord précise notamment :</p>
            <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
              <li>le montant investi,</li>
              <li>le multiplicateur associé,</li>
              <li>le nombre de points générés,</li>
              <li>les règles de redistribution éventuelle,</li>
              <li>le type d&apos;entrée (Early Access ou Investisseur privé).</li>
            </ul>
            <p className="text-sm text-slate-300">
              Ce n&apos;est <strong>pas</strong> une vente de parts de société, mais un cadre simple
              et transparent qui formalise la contribution et son fonctionnement.
            </p>
            <p className="text-xs text-slate-500">
              📄 Un modèle d&apos;accord peut être partagé sur demande pour lecture à froid.
            </p>
          </div>
        </section>

        {/* 8. Risques + navigation */}
        <section className="space-y-4 border-t border-slate-800 pt-6">
          <p className="text-xs text-slate-500">
            ⚠️ Comme tout projet en early stage, il existe un risque élevé. Il faut être à l&apos;aise
            avec l&apos;idée de soutenir une vision, sans garantie de rendement. L&apos;intention de
            Gather est d&apos;être clair, transparent et aligné avec ses premiers soutiens.
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="/infos/investisseur-v2"
              className="inline-flex items-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900 transition"
            >
              ⬅️ Revenir à la page investissement
            </a>
            <a
              href="mailto:contact@gather.app?subject=Questions%20sur%20le%20fonctionnement%20de%20l%27investissement%20Gather"
              className="inline-flex items-center rounded-xl border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 transition"
            >
              💬 Discuter d&apos;une participation
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
