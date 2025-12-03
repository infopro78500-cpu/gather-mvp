import { getSupabaseClient } from "@/lib/supabaseClient";

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
  const supabase = getSupabaseClient();

  if (!supabase) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10 flex justify-center">
        <p>Supabase n&apos;est pas configuré. Merci d&apos;ajouter les variables requises.</p>
      </main>
    );
  }

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
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Espace admin</h1>
        <p className="text-sm text-slate-300">
          Le vrai dashboard admin est en pause pour le moment.
        </p>
        <p className="text-sm text-slate-400">
          On se concentre sur la version fêtes et les tests mobile 🎄
        </p>
        <div className="text-left text-sm space-y-1">
          <p>Total leads: {totalLeads}</p>
          <p>Investisseurs intéressés: {investors}</p>
          <p>Contributeurs intéressés: {contributors}</p>
          <p>Ambassadeurs intéressés: {ambassadors}</p>
          <p>Beta-testeurs intéressés: {betas}</p>
        </div>
      </div>
    </main>
  );
}
