import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { getServerUserId } from "@/lib/supabase/serverAuthClient";
import { isEventHost } from "@/lib/hostAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// « Un mot aux mariés » — la messagerie privée du chantier mariage.
// Promesse §4.3 du doc d'idée : la confidentialité est GARANTIE PAR LE
// SERVEUR. Les photos jointes vivent dans le bucket private-notes (aucune
// policy anon), les lignes sont en RLS service-role : l'invité ne peut que
// déposer (POST), seuls les mariés (host_device_id) lisent et suppriment.

const NOTES_BUCKET = "private-notes";
const MAX_MESSAGE = 1200;
const MAX_PHOTOS = 3; // plafond souple acté §4.1 : une lettre, pas un dépôt
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

async function loadEvent(eventId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { supabase: null, event: null };
  const { data } = await supabase
    .from("events")
    .select("id, name, host_device_id, host_user_id, pro_enabled_at, expires_at")
    .eq("id", eventId)
    .maybeSingle();
  return {
    supabase,
    event: data as {
      id: string;
      name: string | null;
      host_device_id: string | null;
      host_user_id: string | null;
      pro_enabled_at: string | null;
      expires_at: string | null;
    } | null,
  };
}

/** Dépôt d'un mot (invité) — multipart : message, authorName?, tableLabel?, photos[]. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await ctx.params;
  const { supabase, event } = await loadEvent(eventId);
  if (!supabase) return NextResponse.json({ error: "SUPABASE" }, { status: 503 });
  if (!event) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!event.pro_enabled_at) {
    return NextResponse.json({ error: "PRO_REQUIRED" }, { status: 403 });
  }
  if (event.expires_at && new Date(event.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "EVENT_EXPIRED" }, { status: 410 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const message = clean(form.get("message"), MAX_MESSAGE);
  const authorName = clean(form.get("authorName"), 80);
  const tableLabel = clean(form.get("tableLabel"), 40);
  if (!message) {
    return NextResponse.json({ error: "EMPTY_MESSAGE" }, { status: 422 });
  }

  const files = form
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_PHOTOS);
  const photoPaths: string[] = [];
  for (const file of files) {
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "PHOTO_TOO_LARGE" }, { status: 422 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "NOT_AN_IMAGE" }, { status: 422 });
    }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${eventId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(NOTES_BUCKET)
      .upload(path, new Uint8Array(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: false,
      });
    if (error) {
      return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
    }
    photoPaths.push(path);
  }

  const { error: insErr } = await supabase.from("private_notes").insert({
    event_id: eventId,
    table_label: tableLabel,
    author_name: authorName,
    message,
    photo_paths: photoPaths,
  });
  if (insErr) {
    // Le mot n'est pas enregistré : ne pas laisser ses photos orphelines.
    if (photoPaths.length) {
      await supabase.storage.from(NOTES_BUCKET).remove(photoPaths).then(
        () => {},
        () => {}
      );
    }
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Lecture des mots — MARIÉS UNIQUEMENT (host_device_id vérifié serveur). */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await ctx.params;
  const { supabase, event } = await loadEvent(eventId);
  if (!supabase) return NextResponse.json({ error: "SUPABASE" }, { status: 503 });
  if (!event) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const userId = await getServerUserId();
  if (!isEventHost(event, deviceId, userId)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("private_notes")
    .select("id, table_label, author_name, message, photo_paths, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });

  const notes = await Promise.all(
    ((data ?? []) as {
      id: string;
      table_label: string | null;
      author_name: string | null;
      message: string;
      photo_paths: string[];
      created_at: string;
    }[]).map(async (n) => ({
      id: n.id,
      tableLabel: n.table_label,
      authorName: n.author_name,
      message: n.message,
      createdAt: n.created_at,
      photos: await Promise.all(
        (Array.isArray(n.photo_paths) ? n.photo_paths : []).map(async (p) => {
          const { data: signed } = await supabase.storage
            .from(NOTES_BUCKET)
            .createSignedUrl(p, 3600);
          return signed?.signedUrl ?? null;
        })
      ).then((urls) => urls.filter((u): u is string => Boolean(u))),
    }))
  );
  return NextResponse.json({ notes });
}

/** Modération §4.4 : les mariés peuvent supprimer un mot (et ses photos). */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await ctx.params;
  const { supabase, event } = await loadEvent(eventId);
  if (!supabase) return NextResponse.json({ error: "SUPABASE" }, { status: 503 });
  if (!event) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  let body: { noteId?: string; deviceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const userId = await getServerUserId();
  if (!isEventHost(event, body.deviceId ?? null, userId)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (!body.noteId) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("private_notes")
    .delete()
    .eq("id", body.noteId)
    .eq("event_id", eventId)
    .select("photo_paths");
  if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  const paths = (data?.[0]?.photo_paths as string[] | undefined) ?? [];
  if (paths.length) {
    await supabase.storage.from(NOTES_BUCKET).remove(paths).then(
      () => {},
      () => {}
    );
  }
  return NextResponse.json({ ok: true, removed: data?.length ?? 0 });
}
