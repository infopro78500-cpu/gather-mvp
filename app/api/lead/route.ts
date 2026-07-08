import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254;
const MAX_NAME = 120;
const MAX_MESSAGE = 2000;
const MAX_UTM = 200;

const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    console.error("[Supabase] Admin client not available for /api/lead");
    return NextResponse.json(
      { success: false, error: "SUPABASE_NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  // Honeypot : champ invisible que seuls les bots remplissent. On répond
  // "succès" pour ne pas leur signaler la détection, mais on n'enregistre rien.
  if (clean(body.company, 100)) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const email = clean(body.email, MAX_EMAIL)?.toLowerCase() ?? null;
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { success: false, error: "INVALID_EMAIL" },
      { status: 422 }
    );
  }

  const record = {
    email,
    full_name: clean(body.full_name, MAX_NAME),
    interest_investing: Boolean(body.interest_investing),
    interest_contributing: Boolean(body.interest_contributing),
    interest_ambassador: Boolean(body.interest_ambassador),
    interest_beta_tester: Boolean(body.interest_beta_tester),
    message: clean(body.message, MAX_MESSAGE),
    source: clean(body.source, 60) ?? "coming_soon",
    utm_source: clean(body.utm_source, MAX_UTM),
    utm_medium: clean(body.utm_medium, MAX_UTM),
    utm_campaign: clean(body.utm_campaign, MAX_UTM),
    referrer: clean(body.referrer, 500),
  };

  // Upsert sur l'email : une nouvelle soumission du même email met à jour la
  // ligne existante au lieu de créer un doublon.
  const { error } = await supabase
    .from("leads_landing")
    .upsert(record, { onConflict: "email" });

  if (error) {
    console.error("Supabase upsert error:", error);
    return NextResponse.json({ success: false, error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
