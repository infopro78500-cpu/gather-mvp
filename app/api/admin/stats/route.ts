import { NextResponse } from "next/server";

import { getAdminContestStats } from "@/lib/adminStats";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function GET() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.error("[Supabase] Client not available for admin stats route.");
    return NextResponse.json(
      { error: "SUPABASE_NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  const { data, error } = await getAdminContestStats(supabase);

  if (error || !data) {
    console.error("Supabase admin stats error:", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json(data);
}
