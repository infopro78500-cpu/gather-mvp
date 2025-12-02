import { supabase } from "@/lib/supabaseClient";

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

export default async function AdminPage() {
  const { data, error } = await supabase
    .from("leads_landing")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

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

  const totalLeads = leads.length;
  const investors = leads.filter((l) => l.interest_investing).length;
  const contributors = leads.filter((l) => l.interest_contributing).length;
  const ambassadors = leads.filter((l) => l.interest_ambassador).length;
  const betas = leads.filter((l) => l.interest_beta_tester).length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10 flex justify-center">
      <div className="w-full max-w-6xl space-y-8">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard Gather</h1>

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
        </section>
      </div>
    </main>
  );
}