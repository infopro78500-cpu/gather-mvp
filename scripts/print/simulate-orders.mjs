// Simulation de commandes d'impression — teste le pipeline de bout en bout
// (validation → copie des fichiers → file → construction de lot → email)
// sans UI ni paiement (pattern simulate-orders de Renka).
//
//   node scripts/print/simulate-orders.mjs <eventId> <cheminPhoto> [nbPieces]
//   node scripts/print/simulate-orders.mjs <eventId> --express
//
//   <cheminPhoto> : chemin storage d'une vraie photo du coffre, relatif au
//                   bucket event-photos et commençant par <eventId>/ (ex. :
//                   abc123/IMG_0042.jpg). La photo est copiée, jamais modifiée.
//   [nbPieces]    : défaut 8 = PRINT_BATCH_SIZE par défaut → déclenche un lot
//                   complet « poster » à la dernière commande.
//   --express     : commande la papeterie du jour J (présentoir + panneau,
//                   visuels générés, sans photo) avec une échéance à J+5 —
//                   elle doit partir IMMÉDIATEMENT, sans attendre le seuil.
//
// Prérequis : serveur local lancé (npm run dev), PRINT_ENABLED=1 dans
// .env.local, migration SQL passée. BASE_URL surchargeable (défaut
// http://localhost:3000).

const [eventId, sourcePath, countArg] = process.argv.slice(2);
const expressMode = process.argv.includes("--express");

if (!eventId || (!expressMode && !sourcePath)) {
  console.error(
    "Usage : node scripts/print/simulate-orders.mjs <eventId> <cheminPhoto> [nbPieces]\n" +
      "        node scripts/print/simulate-orders.mjs <eventId> --express"
  );
  process.exit(1);
}
if (!expressMode && !sourcePath.startsWith(`${eventId}/`)) {
  console.error(`⚠️ <cheminPhoto> doit commencer par "${eventId}/".`);
  process.exit(1);
}

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const count = Math.max(1, Number(countArg) || 8);

// ---- Mode express : la papeterie du jour J, visuels générés, date impérative.
if (expressMode) {
  const dueDate = new Date(Date.now() + 5 * 86_400_000).toISOString();
  const res = await fetch(`${BASE_URL}/api/print/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId,
      customerName: "Camille & Théo",
      customerEmail: "simulation+express@usegather.app",
      shippingAddress: { line1: "1 rue du Test", postalCode: "78500", city: "Sartrouville", country: "FR" },
      notes: "COMMANDE DE SIMULATION — ne pas produire",
      dueDate,
      pieces: [
        { productId: "presentoir", formatId: "lot-10", label: "Table 1" },
        { productId: "presentoir", formatId: "lot-10", label: "Table 2" },
        { productId: "panneau-bienvenue", formatId: "70x100", label: "12 septembre 2026" },
      ],
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok && body.success) {
    console.log(
      `✅ Commande express ${body.orderRef} — ${body.pieceCount} pièce(s), ` +
        `${(body.totalCents / 100).toFixed(2)} €, échéance ${new Date(dueDate).toLocaleDateString("fr-FR")}`
    );
    console.log(
      "\nLes pièces doivent être parties EN LOT IMMÉDIATEMENT (pas d'attente de seuil).\n" +
        "Vérifier : l'email atelier titré « URGENT », et le tableau de bord /atelier?cle=… (badge ⏱)."
    );
  } else {
    console.error(`❌ HTTP ${res.status} ${body.error ?? ""} ${body.message ?? ""}`);
    process.exit(1);
  }
  process.exit(0);
}

const firstNames = ["Alice", "Bruno", "Chloé", "David", "Emma", "Farid", "Gaëlle", "Hugo"];

let ok = 0;
for (let i = 0; i < count; i++) {
  const name = `${firstNames[i % firstNames.length]} Test`;
  const res = await fetch(`${BASE_URL}/api/print/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId,
      customerName: name,
      customerEmail: `simulation+${i + 1}@usegather.app`,
      shippingAddress: {
        line1: `${i + 1} rue du Test`,
        postalCode: "78500",
        city: "Sartrouville",
        country: "FR",
      },
      notes: "COMMANDE DE SIMULATION — ne pas produire",
      pieces: [
        {
          sourcePath,
          productId: "poster",
          formatId: "30x40",
          pxWidth: 4000,
          pxHeight: 3000,
        },
      ],
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok && body.success) {
    ok += 1;
    console.log(
      `✅ ${i + 1}/${count} — ${body.orderRef} (${body.pieceCount} pièce, ${(body.totalCents / 100).toFixed(2)} €)`
    );
  } else {
    console.error(`❌ ${i + 1}/${count} — HTTP ${res.status} ${body.error ?? ""} ${body.message ?? ""}`);
  }
}

console.log(
  `\n${ok}/${count} commande(s) passée(s). Un lot « papier-photo » part à ${
    process.env.PRINT_BATCH_SIZE || 8
  } pièces — vérifier l'email atelier et /atelier?cle=…` +
    "\nRappel : pièces marquées « COMMANDE DE SIMULATION » — à retirer de la file après le test."
);
