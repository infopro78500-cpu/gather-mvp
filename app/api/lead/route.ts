import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseFromEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error(
      "Supabase env vars missing in /api/lead (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
    return null;
  }

  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseFromEnv();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "SUPABASE_NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    const {
      email,
      full_name,
      interest_investing,
      interest_contributing,
      interest_ambassador,
      interest_beta_tester,
      message,
      source,
    } = body;

    const { error } = await supabase.from("leads_landing").insert([
      {
        email,
        full_name,
        interest_investing,
        interest_contributing,
        interest_ambassador,
        interest_beta_tester,
        message,
        source,
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { success: false, error: "DB_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("API /api/lead error:", e);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
