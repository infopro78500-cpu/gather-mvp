// Email atelier — l'interface principale de Printerkut (leçon Renka : rien à
// installer, rien à apprendre — un email = la matière à charger, les fichiers,
// et le bon de tri position → client).
//
// Envoi via l'API REST Resend (fetch pur, pas de dépendance) : c'est le
// fournisseur que l'atelier connaît déjà côté Renka. Pas de pièces jointes en
// V1 (les photos pèsent lourd) : LIENS SIGNÉS uniquement, valides 7 jours.

import "server-only";

import type { QueueRow } from "@/lib/print/queue";
import { MATERIAL_LABELS, type MaterialId } from "@/lib/print/catalog";

function esc(s: string): string {
  return s.replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;"
  );
}

export function materialLabel(material: string): string {
  return MATERIAL_LABELS[material as MaterialId] ?? material ?? "Matière non renseignée";
}

/**
 * Envoie l'email de lot à l'atelier. Lève si la config email manque ou si
 * Resend refuse — l'appelant traite l'échec comme non fatal (les liens
 * restent accessibles au dashboard).
 */
export async function sendBatchEmail(
  batchId: string,
  pieces: QueueRow[],
  signedLinks: (string | null)[],
  dueAt?: string | null
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.PRINT_EMAIL_TO;
  const from = process.env.PRINT_EMAIL_FROM || "onboarding@resend.dev";
  if (!key || !to) {
    throw new Error(
      "RESEND_API_KEY / PRINT_EMAIL_TO manquants — email atelier non envoyé (liens disponibles au dashboard /atelier)."
    );
  }

  const shortId = batchId.slice(0, 6);
  const date = new Date().toLocaleDateString("fr-FR");
  const label = materialLabel(pieces[0]?.material ?? "");

  const tableRows = pieces
    .map((p, i) => {
      const link = signedLinks[i]
        ? `<a href="${signedLinks[i]}">fichier</a>`
        : "⚠️ lien indisponible";
      return `<tr><td><strong>${i + 1}</strong></td><td>${esc(p.order_ref)}</td><td>${esc(
        p.customer_name
      )}</td><td>${esc(p.product)} ${esc(p.format)}</td><td>${link}</td></tr>`;
    })
    .join("");

  const missingLinks = signedLinks.filter((l) => !l).length;
  const warn = missingLinks
    ? `<p style="background:#ffe0e0;border:1px solid #d33;border-radius:6px;padding:10px">⚠️ <strong>${missingLinks} lien(s) indisponible(s)</strong> — récupérer ces fichiers depuis le tableau de bord atelier.</p>`
    : "";

  // Lot express : des pièces à date impérative (papeterie du jour J). Le
  // délai commande tout — c'est l'information à voir en premier.
  const dueLabel = dueAt ? new Date(dueAt).toLocaleDateString("fr-FR") : null;
  const daysLeft = dueAt
    ? Math.ceil((new Date(dueAt).getTime() - Date.now()) / 86_400_000)
    : null;
  const express = dueLabel
    ? `<p style="background:#FEE2E2;border:2px solid #DC2626;border-radius:6px;padding:12px;font-size:16px">
      ⏱️ <strong>LOT URGENT — à livrer pour le ${dueLabel}</strong>${
        daysLeft !== null
          ? ` (${daysLeft <= 0 ? "aujourd'hui ou dépassé" : `dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`})`
          : ""
      }.<br>
      Ce lot est parti <strong>sans attendre le seuil habituel</strong> : c'est de la papeterie de jour J, la date de l'événement ne bouge pas.</p>`
    : "";

  const html = `
    <h2>${dueLabel ? "⏱️ Lot URGENT" : "🖨️ Lot photo prêt"} — ${pieces.length} pièce${pieces.length > 1 ? "s" : ""} (lot ${shortId})</h2>
    ${express}
    ${warn}
    <p style="background:#eef7f4;border:1px solid #2a9d8f;border-radius:6px;padding:10px">
    🪪 <strong>Matière du lot : ${esc(label)}</strong> — un lot = une seule matière à charger.</p>
    <p>Liens valides ${7} jours. Imprimer chaque fichier au format indiqué,
    puis trier selon le tableau ci-dessous (numéro de pièce → commande client).
    Suivi et actions (imprimé / expédié / retirage) : tableau de bord atelier.</p>
    <h3>Bon de tri</h3>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead><tr><th>N°</th><th>Commande</th><th>Client</th><th>Produit</th><th>Fichier</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: dueLabel
        ? `⏱️ URGENT à livrer pour le ${dueLabel} — ${pieces.length} pièce${pieces.length > 1 ? "s" : ""} ${label} (lot ${shortId})`
        : `🖨️ Lot photo prêt — ${pieces.length} pièce${pieces.length > 1 ? "s" : ""} ${label} — ${date} (lot ${shortId})`,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status} : ${body.slice(0, 300)}`);
  }
}
