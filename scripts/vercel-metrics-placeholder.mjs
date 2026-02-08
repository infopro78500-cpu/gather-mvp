/*
  TODO: Implémenter la récupération des métriques Vercel via leur API.

  Exemple d'usage (à adapter dans un cron Vercel ou GitHub Action) :
  - Récupérer les stats Vercel (visitors, pageviews, bounce_rate)
  - Appeler l'RPC Supabase `upsert_vercel_metrics`

  Variables d'environnement attendues :
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
*/

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log(
  "TODO: Remplacer ce placeholder par la récupération Vercel API puis un appel RPC vers Supabase."
);

// Exemple de payload attendu (à remplacer par les vraies métriques Vercel) :
// const payload = {
//   day: new Date().toISOString().slice(0, 10),
//   visitors: 1234,
//   pageviews: 4321,
//   bounce_rate: 0.42,
// };
//
// await supabase.rpc(\"upsert_vercel_metrics\", payload);
