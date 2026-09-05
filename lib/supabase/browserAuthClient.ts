import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Client navigateur pour l'AUTH organisateur (session en cookies, lisible côté serveur).
// Distinct de getSupabaseClient() (lib/supabaseClient.ts) qui sert les lectures data anon.
let cached: SupabaseClient | null = null;

export function getBrowserAuthClient(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isValidUrl = !!url && /^https?:\/\//.test(url);
  const hasKey = typeof anonKey === "string" && anonKey.length > 0;

  if (!isValidUrl || !hasKey) {
    console.error(
      "[Supabase auth] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquants ou invalides."
    );
    return null;
  }

  cached = createBrowserClient(url, anonKey);
  return cached;
}
