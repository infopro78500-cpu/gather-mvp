import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

// Client serveur pour l'AUTH organisateur : lit/écrit la session dans les cookies Next.
// À utiliser dans les Route Handlers et Server Components pour connaître `auth.uid()`.
export async function getServerAuthClient(): Promise<SupabaseClient | null> {
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

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Appelé depuis un Server Component (cookies en lecture seule) : sans effet.
          // Le rafraîchissement de session sera assuré par le middleware (phase ultérieure).
        }
      },
    },
  });
}
