import { NextRequest, NextResponse } from "next/server";

import { getServerAuthClient } from "@/lib/supabase/serverAuthClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Callback du magic-link : Supabase renvoie l'utilisateur ici avec soit un `code`
// (flux PKCE, défaut de @supabase/ssr), soit `token_hash` + `type`. On échange contre
// une session (posée en cookies) puis on redirige vers `next` (défaut /compte).
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/compte";
  // Sécurité : on ne redirige que vers un chemin interne (jamais une URL absolue fournie).
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/compte";

  const supabase = await getServerAuthClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=config`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "email" | "magiclink" | "recovery" | "invite" | "email_change",
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
