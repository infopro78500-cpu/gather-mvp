import { NextRequest, NextResponse } from "next/server";
import {
  hasOverduePending,
  maybeBuildBatch,
  purgeOldPrintFiles,
  recoverZombieClaims,
} from "@/lib/print/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BATCHES_PER_RUN = 10;

// Filet de sécurité quotidien de la file d'impression (pattern Renka) :
//  1. récupère les claims zombies (crash pendant une construction de lot) ;
//  2. construit tous les lots COMPLETS en attente ;
//  3. si la pièce la plus ancienne attend depuis plus de PRINT_MAX_WAIT_DAYS,
//     force des lots PARTIELS (une petite commande d'une matière rare ne doit
//     jamais attendre indéfiniment) ;
//  4. purge les fichiers de production des lots anciens (rétention).
// Appelé par le cron Vercel (Authorization: Bearer CRON_SECRET) ; déclenchement
// manuel possible : ?secret=<CRON_SECRET>&force=1
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré." }, { status: 503 });
  }
  const authorized =
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.nextUrl.searchParams.get("secret") === secret;
  if (!authorized) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const manualForce = request.nextUrl.searchParams.get("force") === "1";

  try {
    const zombies = await recoverZombieClaims();

    let fullBatches = 0;
    for (let i = 0; i < MAX_BATCHES_PER_RUN; i++) {
      const built = await maybeBuildBatch();
      if (!built) break;
      fullBatches += 1;
    }

    let partialBatches = 0;
    for (let i = 0; i < MAX_BATCHES_PER_RUN; i++) {
      const shouldForce = manualForce || (await hasOverduePending());
      if (!shouldForce) break;
      const built = await maybeBuildBatch({ force: true });
      if (!built) break;
      partialBatches += 1;
      if (manualForce) break; // un seul lot forcé par déclenchement manuel
    }

    const purgedFiles = await purgeOldPrintFiles();

    return NextResponse.json({ zombies, fullBatches, partialBatches, purgedFiles });
  } catch (e) {
    console.error("[print flush]", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
