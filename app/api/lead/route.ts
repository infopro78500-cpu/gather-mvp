import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "../../../lib/supabaseClient";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error("Supabase non configuré pour /api/lead");
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
      return NextResponse.json({ success: false, error: "DB_ERROR" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("API /api/lead error:", e);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
