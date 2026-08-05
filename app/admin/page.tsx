import { Suspense } from "react";
import Link from "next/link";

import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { LocalScanIA } from "@/app/components/LocalScanIA";
import { getAdminContestStats } from "@/lib/adminStats";
import ProductKpiSection, {
  ProductKpiSectionSkeleton,
} from "@/app/admin/components/ProductKpiSection";

type Lead = {
  id: string;
  created_at: string;
  email: string | null;
  full_name: string | null;
  interest_investing: boolean | null;
  interest_contributing: boolean | null;
  interest_ambassador: boolean | null;
  interest_beta_tester: boolean | null;
};

const PAGE_SIZE = 50;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // Lecture via la clé service role (server-side, /admin est protégé par
  // Basic Auth). Les leads ne sont plus lisibles par la clé anon publique.
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    console.error("[Supabase] Admin client not available for admin page.");
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10 flex justify-center">
        <p>Supabase n&apos;est pas configuré.</p>
      </main>
    );
  }

  const resolvedSearchParams = await searchParams;
  const page = Math.max(1, Number(resolvedSearchParams?.page) || 1);
  const rangeStart = (page - 1) * PAGE_SIZE;
  const rangeEnd = rangeStart + PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("leads_landing")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(rangeStart, rangeEnd);

  if (error) {
    console.error("Erreur Supabase:", error);
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10 flex justify-center">
        <p>Erreur lors du chargement des leads.</p>
      </main>
    );
  }

  if (!data) {
    console.error("Aucune donnée retournée par Supabase.");
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10 flex justify-center">
        <p>Aucune donnée disponible.</p>
      </main>
    );
  }

  const leads: Lead[] = data as Lead[];
  const totalLeads = count ?? leads.length;
  const totalPages = Math.max(1, Math.ceil(totalLeads / PAGE_SIZE));

  const countInterest = async (column: string) => {
    const { count: interestCount } = await supabase
      .from("leads_landing")
      .select("*", { count: "exact", head: true })
      .eq(column, true);
    return interestCount ?? 0;
  };

  const [investors, contributors, ambassadors, betas] = await Promise.all([
    countInterest("interest_investing"),
    countInterest("interest_contributing"),
    countInterest("interest_ambassador"),
    countInterest("interest_beta_tester"),
  ]);

  const { data: contestStats, error: contestStatsError } =
    await getAdminContestStats(supabase);

  if (contestStatsError) {
    console.error("Erreur lors du chargement des KPI concours:", contestStatsError);
  }

  const formatStat = (value?: number | null) =>
    typeof value === "number" ? value.toLocaleString("fr-FR") : "—";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10 flex justify-center">
      <div className="w-full max-w-6xl space-y-8">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard Usegather</h1>

        {/* Cartes de stats */}
        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total leads</p>
            <p className="text-2xl font-bold text-emerald-400">{totalLeads}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Investisseurs</p>
            <p className="text-2xl font-bold text-emerald-400">{investors}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contributeurs</p>
            <p className="text-2xl font-bold text-emerald-400">{contributors}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ambassadeurs</p>
            <p className="text-2xl font-bold text-emerald-400">{ambassadors}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Bêta-testeurs</p>
            <p className="text-2xl font-bold text-emerald-400">{betas}</p>
          </div>
        </section>

        <Suspense fallback={<ProductKpiSectionSkeleton />}>
          <ProductKpiSection />
        </Suspense>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">KPI concours</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Events total
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                {formatStat(contestStats?.eventsTotal)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Events concours activé
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                {formatStat(contestStats?.eventsContestEnabled)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Events avec votes (sur activés)
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                {formatStat(contestStats?.eventsWithVotes)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Likes total (sur activés)
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                {formatStat(contestStats?.likesTotal)}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <LocalScanIA />
        </section>

        {/* Derniers inscrits */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Derniers inscrits</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900">
                <tr className="text-left text-slate-400">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Nom</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Intérêts</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const date = new Date(lead.created_at);
                  const dateStr = date.toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const interests: string[] = [];
                  if (lead.interest_investing) interests.push("Invest");
                  if (lead.interest_contributing) interests.push("Contrib");
                  if (lead.interest_ambassador) interests.push("Ambassadeur");
                  if (lead.interest_beta_tester) interests.push("Beta");

                  return (
                    <tr key={lead.id} className="border-t border-slate-800">
                      <td className="px-4 py-2 text-slate-300">{dateStr}</td>
                      <td className="px-4 py-2 text-slate-300">
                        {lead.full_name || "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-300">
                        {lead.email || "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-300">
                        {interests.length ? interests.join(" • ") : "—"}
                      </td>
                    </tr>
                  );
                })}
                {leads.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      Aucun lead pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              Page {page} / {totalPages} ({totalLeads} lead{totalLeads > 1 ? "s" : ""} au total)
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin?page=${page - 1}`}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 hover:border-teal-500 hover:text-teal-400"
                >
                  Précédent
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin?page=${page + 1}`}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 hover:border-teal-500 hover:text-teal-400"
                >
                  Suivant
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
