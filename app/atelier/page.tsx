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
      <main className="min-h-screen flex items-center justify-center bg-[#F6F6F4] text-[#1A1A18]">
        <div className="text-center space-y-2 rounded-2xl border border-[#E2E1DC] bg-white p-10">
          <h1 className="text-xl font-semibold">
            <span className="font-light">use</span>
            <span className="font-bold">gather</span>
            <span className="text-[#6B6A63]"> × Printerkut</span>
          </h1>
          <p className="text-[#6B6A63]">
            Lien d&apos;accès invalide — demander le lien atelier à Nico.
          </p>
        </div>
      </main>
    );
  }

  return <AtelierBoard cle={cle} />;
}
