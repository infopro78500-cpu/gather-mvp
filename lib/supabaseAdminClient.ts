import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedAdminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (cachedAdminClient) return cachedAdminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isValidUrl = !!supabaseUrl && /^https?:\/\//.test(supabaseUrl);
  const hasServiceRoleKey =
    typeof serviceRoleKey === "string" && serviceRoleKey.length > 0;

  if (!isValidUrl || !hasServiceRoleKey) {
    console.error(
      "[Supabase] Missing or invalid env vars. NEXT_PUBLIC_SUPABASE_URL must be a valid http/https URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    );
    return null;
  }

  cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedAdminClient;
}
