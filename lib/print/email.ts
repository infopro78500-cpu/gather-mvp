// Email atelier — l'interface principale de Printerkut (leçon Renka : rien à
// installer, rien à apprendre — un email = la matière à charger, les fichiers,
// et le bon de tri position → client).
//
// Envoi via l'API REST Resend (fetch pur, pas de dépendance) : c'est le
// fournisseur que l'atelier connaît déjà côté Renka. Pas de pièces jointes en
// V1 (les photos pèsent lourd) : LIENS SIGNÉS uniquement, valides 7 jours.

import "server-only";

import type { QueueRow } from "@/lib/print/queue";
import { MATERIAL_LABELS, PRINT_PRODUCTS, type MaterialId } from "@/lib/print/catalog";

function esc(s: string): string {
  return s.replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;"
  );
}

export function materialLabel(material: string): string {
  return MATERIAL_LABELS[material as MaterialId] ?? material ?? "Matière non renseignée";
}

/** « Panneau Forex — 30 × 40 cm » : l'atelier lit des centimètres, pas des
 *  clés catalogue (« forex 30x40 » ne dit ni la taille réelle ni le produit). */
export function pieceLabel(product: string, format: string): string {
  const p = PRINT_PRODUCTS.find((x) => x.id === product);
  const f = p?.formats.find((x) => x.id === format);
  if (!p || !f) return `${product} ${format}`;
  const lot = f.packQuantity ? ` (lot de ${f.packQuantity})` : "";
  return `${p.label} — ${f.widthCm} × ${f.heightCm} cm${lot}`;
}

/** Sens d'impression déduit des pixels de la photo : c'est LA consigne de
 *  cadrage que la commande transporte (la photo est tirée dans son sens). */
export function pieceOrientation(
  pxWidth?: number | null,
  pxHeight?: number | null
): "paysage" | "portrait" | null {
  if (!pxWidth || !pxHeight || pxWidth === pxHeight) return null;
  return pxWidth > pxHeight ? "paysage" : "portrait";
}

const eurosStr = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }) + " €";

function resendConfig(): { key: string; from: string } {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY manquant — email non envoyé.");
  return { key, from: process.env.PRINT_EMAIL_FROM || "onboarding@resend.dev" };
}

async function sendViaResend(payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
  key: string;
}): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${payload.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status} : ${body.slice(0, 300)}`);
  }
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
  dueAt?: string | null,
  linkDays = 7
): Promise<void> {
  const to = process.env.PRINT_EMAIL_TO;
  if (!to) {
    throw new Error(
      "PRINT_EMAIL_TO manquant — email atelier non envoyé (liens disponibles au dashboard /atelier)."
    );
  }
  const { key, from } = resendConfig();

  const shortId = batchId.slice(0, 6);
  const date = new Date().toLocaleDateString("fr-FR");
  const label = materialLabel(pieces[0]?.material ?? "");

  const tableRows = pieces
    .map((p, i) => {
      const link = signedLinks[i]
        ? `<a href="${signedLinks[i]}">fichier</a>`
        : "⚠️ lien indisponible";
      const sens = pieceOrientation(p.px_width, p.px_height);
      return `<tr><td><strong>${i + 1}</strong></td><td>${esc(p.order_ref)}</td><td>${esc(
        p.customer_name
      )}</td><td>${esc(pieceLabel(p.product, p.format))}</td><td>${
        sens ? esc(sens) : "—"
      }</td><td>${link}</td></tr>`;
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
    <p>Liens valides ${linkDays} jours. Imprimer chaque fichier au format indiqué
    (colonne « Sens » = orientation de tirage de la photo), puis trier selon le
    tableau ci-dessous (numéro de pièce → commande client).
    Suivi et actions (imprimé / expédié / retirage) : tableau de bord atelier.</p>
    <h3>Bon de tri</h3>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead><tr><th>N°</th><th>Commande</th><th>Client</th><th>Produit</th><th>Sens</th><th>Fichier</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  await sendViaResend({
    key,
    from,
    to,
    subject: dueLabel
      ? `⏱️ URGENT à livrer pour le ${dueLabel} — ${pieces.length} pièce${pieces.length > 1 ? "s" : ""} ${label} (lot ${shortId})`
      : `🖨️ Lot photo prêt — ${pieces.length} pièce${pieces.length > 1 ? "s" : ""} ${label} — ${date} (lot ${shortId})`,
    html,
  });
}

/**
 * Confirmation de commande au CLIENT — envoyée juste après la mise en file
 * (best-effort : son échec ne casse jamais une commande). Sans elle, le seul
 * reçu du client est un écran de confirmation qu'il a déjà fermé.
 */
export async function sendCustomerOrderEmail(input: {
  to: string;
  name: string;
  orderRef: string;
  items: { label: string; count: number }[];
  totalCents: number;
  address?: { line1?: unknown; postalCode?: unknown; city?: unknown } | null;
}): Promise<void> {
  const { key, from } = resendConfig();
  const rows = input.items
    .map(
      (it) =>
        `<tr><td>${it.count} ×</td><td>${esc(it.label)}</td></tr>`
    )
    .join("");
  const addr = input.address
    ? [input.address.line1, input.address.postalCode, input.address.city]
        .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        .join(", ")
    : "";
  const html = `
    <h2>Merci ${esc(input.name)} — votre commande est bien reçue</h2>
    <p>Référence : <strong>${esc(input.orderRef)}</strong></p>
    <table cellpadding="4" cellspacing="0">${rows}</table>
    <p><strong>Total : ${eurosStr(input.totalCents)}</strong></p>
    ${addr ? `<p>Livraison : ${esc(addr)} (France métropolitaine)</p>` : ""}
    <p>Vos tirages partent en fabrication dans notre atelier français.
    Vous recevrez un email dès l'expédition.</p>
    <p style="color:#666;font-size:13px">Usegather — contact@usegather.app</p>
  `;
  await sendViaResend({
    key,
    from,
    to: input.to,
    subject: `Commande ${input.orderRef} bien reçue — Usegather`,
    html,
  });
}

/** Email d'expédition au CLIENT — c'est la promesse affichée dans le tunnel
 *  (« vous recevrez un email dès qu'elle sera expédiée ») : elle se tient ici,
 *  déclenchée par « Marquer expédiée » au dashboard atelier. */
export async function sendCustomerShippedEmail(input: {
  to: string;
  name: string;
  orderRef: string;
}): Promise<void> {
  const { key, from } = resendConfig();
  const html = `
    <h2>📦 ${esc(input.name)}, votre commande est en route</h2>
    <p>Votre commande <strong>${esc(input.orderRef)}</strong> vient d'être
    expédiée par notre atelier. Elle arrive dans votre boîte aux lettres
    d'ici quelques jours.</p>
    <p style="color:#666;font-size:13px">Usegather — contact@usegather.app</p>
  `;
  await sendViaResend({
    key,
    from,
    to: input.to,
    subject: `📦 Commande ${input.orderRef} expédiée — Usegather`,
    html,
  });
}
