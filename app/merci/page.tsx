import Link from "next/link";

export const metadata = {
  title: "Merci — Gather",
};

export default async function MerciPage({
  searchParams,
}: {
  searchParams: Promise<{
    invest?: string;
    contrib?: string;
    amb?: string;
    beta?: string;
  }>;
}) {
  const params = await searchParams;
  const invest = params.invest === "1";
  const contrib = params.contrib === "1";
  const amb = params.amb === "1";
  const beta = params.beta === "1";

  const lines: string[] = [];
  if (beta) lines.push("Tu seras parmi les premiers à tester Gather en avant-première.");
  if (contrib) lines.push("On revient vers toi pour parler de la façon dont tu peux contribuer.");
  if (amb) lines.push("Merci de vouloir parler de Gather autour de toi 🙌");
  if (invest) lines.push("Ton intérêt pour investir a bien été noté — on te recontacte rapidement.");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-16">
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="text-3xl font-bold">Merci d’avoir rejoint l’aventure&nbsp;!</h1>
        <p className="text-slate-300">
          Ton inscription est bien enregistrée. On te tient au courant des
          prochaines étapes de Gather.
        </p>

        {lines.length > 0 && (
          <ul className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left text-sm text-slate-200">
            {lines.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden className="text-teal-300">
                  ✓
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col items-center gap-3 pt-2">
          {invest && (
            <Link
              href="/infos/investisseur-v2"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
            >
              Découvrir l’opportunité d’investissement
            </Link>
          )}
          <Link href="/" className="text-sm text-teal-300 hover:text-teal-200">
            ← Retour à l’accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
