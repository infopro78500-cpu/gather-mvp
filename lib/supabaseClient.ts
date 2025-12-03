import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;
let initError: string | null = null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseAnonKey) {
  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
  initError =
    "Supabase n'est pas configuré : définis NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  if (typeof console !== "undefined") {
    console.error(initError);
  }
}

export const supabase = cachedClient;

export function getSupabaseClient(): SupabaseClient | null {
  return cachedClient;
}

export function getSupabaseStatus() {
  return { client: cachedClient, error: initError } as const;
}
