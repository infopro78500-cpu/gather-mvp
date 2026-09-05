import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerAuthClient } from "@/lib/supabase/serverAuthClient";

export const dynamic = "force-dynamic";

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

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-sm p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Mon compte</h1>
          <p className="text-sm text-slate-400 mt-1">
            Connecté en tant que{" "}
            <span className="font-medium text-slate-200">{user.email}</span>.
          </p>
        </div>

        {/* Le tableau « Mes coffres » arrive en Phase 1 du chantier comptes hôtes. */}
        <p className="text-sm text-slate-500">
          Bientôt : retrouve ici tous les coffres rattachés à ton compte, depuis
          n&apos;importe quel appareil.
        </p>

        <div className="flex items-center justify-between pt-2">
          <Link href="/" className="text-sm text-teal-400 hover:text-teal-300">
            ← Accueil
          </Link>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="text-sm px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
