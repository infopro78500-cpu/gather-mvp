import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "event-photos";
const BATCH = 200; // nombre d'événements traités par exécution

// Purge les fichiers du bucket pour les événements expirés, afin que le
// stockage ne s'accumule pas indéfiniment. Appelé par un cron Vercel
// (qui envoie automatiquement l'en-tête Authorization: Bearer <CRON_SECRET>).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré." }, { status: 503 });
  }

  const { data: events, error } = await supabase
    .from("events")
    .select("id")
    .lt("expires_at", new Date().toISOString())
    .is("photos_purged_at", null)
    .limit(BATCH);

  if (error) {
    console.error("[cron cleanup] select error", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  let purgedEvents = 0;
  let deletedFiles = 0;

  for (const event of events ?? []) {
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(event.id, { limit: 2000 });

    if (listError) {
      console.error(`[cron cleanup] list error for ${event.id}`, listError);
      continue;
    }

    if (files && files.length > 0) {
      const paths = files.map((f) => `${event.id}/${f.name}`);
      const { error: removeError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(paths);
      if (removeError) {
        console.error(`[cron cleanup] remove error for ${event.id}`, removeError);
        continue;
      }
      deletedFiles += paths.length;
    }

    await supabase
      .from("events")
      .update({ photos_purged_at: new Date().toISOString() })
      .eq("id", event.id);
    purgedEvents += 1;
  }

  return NextResponse.json({ purgedEvents, deletedFiles });
}
