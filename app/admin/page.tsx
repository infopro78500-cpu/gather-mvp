import { supabase } from "../../lib/supabaseClient";

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

  const leads: Lead[] = (data as Lead[]) || [];

  const total = leads.length;
  const investors = leads.filter((l) => l.interest_investing).length;
  const contributors = leads.filter((l) => l.interest_contributing).length;
  const ambassadors = leads.filter((l) => l.interest_ambassador).length;
  const betaTesters = leads.filter((l) => l.interest_beta_tester).length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-8">
      <h1 className="text-3xl font-semibold mb-8">Dashboard Gather</h1>

      {/* Cards stats */}
      <div className="grid gap-4 md:grid-cols-5 mb-10">
        <StatCard label="Total leads" value={total} />
        <StatCard label="Investisseurs" value={investors} />
        <StatCard label="Contributeurs" value={contributors} />
        <StatCard label="Ambassadeurs" value={ambassadors} />
        <StatCard label="Bêta-testeurs" value={betaTesters} />
      </div>

      {/* Derniers inscrits */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Derniers inscrits</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          {leads.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">
              Aucun lead pour le moment.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Nom</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Intérêts</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const interests: string[] = [];
                  if (lead.interest_investing) interests.push("Invest");
                  if (lead.interest_contributing) interests.push("Contrib");
                  if (lead.interest_ambassador) interests.push("Ambassadeur");
                  if (lead.interest_beta_tester) interests.push("Beta");

                  return (
                    <tr
                      key={lead.id}
                      className="border-t border-slate-800/60 hover:bg-slate-900/70"
                    >
                      <td className="px-4 py-2 text-slate-300">
                        {new Date(lead.created_at).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-2 text-slate-100">
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
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4 flex flex-col justify-center">
      <div className="text-2xl font-semibold text-teal-400">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}
