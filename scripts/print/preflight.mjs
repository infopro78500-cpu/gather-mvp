// Preflight du pipeline d'impression — vérifie EN LECTURE SEULE que tout est
// prêt avant d'ouvrir la vanne (pattern preflight-atelier de Renka).
//
//   node scripts/print/preflight.mjs
//
// Lit .env.local si présent (sans jamais afficher les valeurs).

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();

function loadEnvLocal() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const results = [];
const check = (label, ok, hint = "") =>
  results.push({ label, ok, hint });

// 1. Variables d'environnement.
const envVars = [
  ["NEXT_PUBLIC_SUPABASE_URL", true],
  ["SUPABASE_SERVICE_ROLE_KEY", true],
  ["CRON_SECRET", true],
  ["ATELIER_SECRET", true, "lien secret du dashboard /atelier"],
  ["RESEND_API_KEY", false, "sans lui : pas d'email atelier (liens au dashboard)"],
  ["PRINT_EMAIL_TO", false, "adresse atelier (printerkut@…)"],
  ["PRINT_EMAIL_FROM", false, "expéditeur vérifié Resend"],
  ["PRINT_ENABLED", false, "la route /api/print/order reste fermée tant que ≠ 1"],
];
for (const [name, required, hint] of envVars) {
  const present = Boolean(process.env[name]);
  check(
    `${required ? "env requis" : "env optionnel"} ${name}`,
    present || !required,
    present ? "" : hint || (required ? "MANQUANT" : "absent")
  );
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  report();
} else {
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 2. Tables (la migration 20260805120000_add_print_queue.sql est-elle passée ?).
  for (const table of ["print_queue", "print_batches"]) {
    const { error } = await supabase.from(table).select("id").limit(1);
    check(
      `table ${table}`,
      !error,
      error
        ? `absente ou inaccessible (${error.message}) — coller supabase/migrations/20260805120000_add_print_queue.sql dans le SQL Editor`
        : ""
    );
  }

  // 3. Buckets.
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
  const names = new Set((buckets ?? []).map((b) => b.name));
  check(
    "bucket print-files",
    !bucketErr && names.has("print-files"),
    "créé par la migration (insert storage.buckets)"
  );
  check("bucket event-photos", !bucketErr && names.has("event-photos"), "");

  // 4. État de la file (informatif).
  const { data: pending } = await supabase
    .from("print_queue")
    .select("created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (pending) {
    console.log(
      `\nℹ️  File : ${pending.length} pièce(s) en attente` +
        (pending[0] ? ` — la plus ancienne du ${pending[0].created_at}` : "")
    );
  }

  report();
}

function report() {
  console.log("\n=== Preflight impression Printerkut ===\n");
  let failures = 0;
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.label}${r.hint ? ` — ${r.hint}` : ""}`);
    if (!r.ok) failures += 1;
  }
  console.log(
    failures
      ? `\n${failures} point(s) bloquant(s) — pipeline PAS prêt.`
      : "\nTout est prêt côté infra. Restent : grille validée par l'atelier + Stripe devant la file."
  );
  process.exit(failures ? 1 : 0);
}
