import { NextRequest, NextResponse } from "next/server";

import { getServerAuthClient } from "@/lib/supabase/serverAuthClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await getServerAuthClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
