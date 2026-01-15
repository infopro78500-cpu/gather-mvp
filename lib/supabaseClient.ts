import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isValidUrl = !!supabaseUrl && /^https?:\/\//.test(supabaseUrl);
  const hasAnonKey = typeof supabaseAnonKey === "string" && supabaseAnonKey.length > 0;

  if (!isValidUrl || !hasAnonKey) {
    console.error(
      "[Supabase] Missing or invalid env vars. NEXT_PUBLIC_SUPABASE_URL must be a valid http/https URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."
    );
    return null;
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
}
