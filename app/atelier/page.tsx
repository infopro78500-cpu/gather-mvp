import type { Metadata } from "next";
import AtelierBoard from "./AtelierBoard";

// Tableau de bord atelier Printerkut — accès par LIEN SECRET, sans compte
// (pattern Renka : /atelier?cle=<ATELIER_SECRET>). Jamais indexé.
export const metadata: Metadata = {
  title: "Atelier — Usegather",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AtelierPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const cle = typeof params.cle === "string" ? params.cle : "";
  const secret = process.env.ATELIER_SECRET;

  if (!secret || cle !== secret) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100">
        <div className="text-center space-y-2 p-8">
          <p className="text-4xl">🔒</p>
          <h1 className="text-xl font-semibold">Accès atelier</h1>
          <p className="text-neutral-400">
            Lien invalide — demander le lien d&apos;accès à Nico.
          </p>
        </div>
      </main>
    );
  }

  return <AtelierBoard cle={cle} />;
}
