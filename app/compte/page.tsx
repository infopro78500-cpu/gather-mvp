import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerAuthClient } from "@/lib/supabase/serverAuthClient";
import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";

export const dynamic = "force-dynamic";

type CoffreRow = {
  id: string;
  name: string | null;
  pin: string | null;
  created_at: string | null;
  expires_at: string | null;
  is_closed: boolean | null;
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

export default async function ComptePage() {
  const supabase = await getServerAuthClient();
  if (!supabase) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
        <p className="text-sm text-slate-400">Supabase n&apos;est pas configuré.</p>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Lecture des coffres rattachés au compte : côté serveur, en service role
  // (bypass RLS), filtrée sur l'id de l'utilisateur validé. `events` reste fermé
  // à toute lecture anon/authenticated directe.
  let coffres: CoffreRow[] = [];
  let loadError = false;
  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("events")
      .select("id, name, pin, created_at, expires_at, is_closed")
      .eq("host_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      loadError = true;
    } else {
      coffres = (data ?? []) as CoffreRow[];
    }
  } else {
    loadError = true;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Mes coffres</h1>
            <p className="text-sm text-slate-400 mt-1">
              Connecté : <span className="text-slate-200">{user.email}</span>
            </p>
          </div>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="text-sm px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Se déconnecter
            </button>
          </form>
        </header>

        {loadError ? (
          <p className="text-sm text-red-400">
            Impossible de charger tes coffres pour le moment.
          </p>
        ) : coffres.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center space-y-3">
            <p className="text-slate-300">Aucun coffre rattaché à ton compte pour l&apos;instant.</p>
            <p className="text-sm text-slate-500">
              Crée un coffre pendant que tu es connecté, il apparaîtra ici et tu
              le retrouveras sur tous tes appareils.
            </p>
            <Link
              href="/"
              className="inline-block mt-1 px-4 py-2 bg-teal-500 text-slate-900 font-semibold rounded-md hover:bg-teal-400"
            >
              Créer un coffre
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {coffres.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {c.name || "Coffre sans nom"}
                    {c.is_closed ? (
                      <span className="ml-2 text-xs text-slate-500">(fermé)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    Créé le {formatDate(c.created_at)}
                    {c.pin ? ` · PIN ${c.pin}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.pin ? (
                    <Link
                      href={`/events/${c.pin}`}
                      className="text-sm px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      Galerie
                    </Link>
                  ) : null}
                  <Link
                    href={`/event/${c.id}/edit`}
                    className="text-sm px-3 py-1.5 rounded-md bg-slate-800 text-slate-100 hover:bg-slate-700"
                  >
                    Gérer
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="pt-2">
          <Link href="/" className="text-sm text-teal-400 hover:text-teal-300">
            ← Accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
