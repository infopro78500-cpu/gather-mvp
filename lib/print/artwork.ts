// Génération des visuels de la papeterie du jour J (server-only).
//
// Ces produits — présentoir de table, panneau de bienvenue, marque-places —
// se commandent À LA CRÉATION du coffre, quand il est encore vide : il n'y a
// donc aucune photo d'invité à imprimer. L'app compose le visuel : le QR du
// coffre, le titre de l'événement, la consigne de scan, et le cas échéant le
// nom de la table ou du convive.
//
// Le QR est encodé par `qr.js` — l'encodeur qu'utilise déjà `react-qr-code`
// côté client, donc le QR imprimé est identique à celui affiché dans l'app.
// On dessine nous-mêmes le SVG (Next 16 interdit `react-dom/server` dans une
// route), puis sharp rasterise à la résolution d'impression.

import "server-only";

import QRCodeEncoder from "qr.js/lib/QRCode";
import ErrorCorrectLevel from "qr.js/lib/ErrorCorrectLevel";
import sharp from "sharp";
import type { PrintFormat } from "@/lib/print/catalog";

/** Résolution d'impression des visuels générés (vectoriels à la source). */
const PRINT_DPI = 300;

const INK = "#1A1A18";
const PAPER = "#FFFFFF";

export interface ArtworkInput {
  /** URL encodée dans le QR (page de dépôt du coffre). */
  joinUrl: string;
  /** Titre affiché — nom de l'événement, ou des mariés. */
  title: string;
  /** Ligne secondaire : date, table, prénom du convive… */
  subtitle?: string | null;
  /** Consigne de scan. Laisser vide pour un visuel sans texte d'action. */
  callToAction?: string | null;
  /** Le PIN du coffre, affiché en repli pour qui ne peut pas scanner. */
  pin?: string | null;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;"
  );
}

/**
 * Réduit la taille de police pour qu'une ligne tienne dans la largeur
 * disponible, et tronque en dernier recours. Sans ça, un nom d'événement un
 * peu long (« Mariage de Camille et Théo ») sort coupé des deux côtés sur le
 * produit imprimé — le genre de défaut qu'on ne voit qu'une fois la pièce
 * physique entre les mains.
 *
 * La largeur est estimée à partir du nombre de caractères (pas de métriques
 * de police disponibles côté serveur) : ~0,55 em par caractère en normal,
 * ~0,58 en gras. L'estimation est volontairement pessimiste.
 */
function fitLine(
  text: string,
  baseSize: number,
  maxWidth: number,
  bold: boolean
): { content: string; size: number } {
  const ratio = bold ? 0.58 : 0.55;
  const minSize = baseSize * 0.55; // en dessous, ça devient illisible
  let size = Math.min(baseSize, maxWidth / (text.length * ratio));
  if (size >= minSize) return { content: text, size: Math.round(size) };

  // Toujours trop long à la taille plancher : on tronque proprement.
  size = minSize;
  const maxChars = Math.max(4, Math.floor(maxWidth / (size * ratio)) - 1);
  return { content: text.slice(0, maxChars).trimEnd() + "…", size: Math.round(size) };
}

/**
 * Le QR seul, en SVG — aucune police requise, que des rectangles, donc
 * insensible aux polices disponibles dans l'environnement d'exécution.
 * Les modules sont fusionnés par lignes horizontales pour limiter le nombre
 * de rectangles (un QR de 29×29 passe de ~420 à ~120 formes).
 */
function qrSvg(value: string, sizePx: number, x: number, y: number): string {
  const qr = new QRCodeEncoder(-1, ErrorCorrectLevel.M);
  qr.addData(value);
  qr.make();
  const modules = qr.modules;
  const count = modules.length;
  // Marge de silence obligatoire autour du QR : 4 modules, norme ISO 18004.
  const quiet = 4;
  const total = count + quiet * 2;
  const unit = sizePx / total;

  const rects: string[] = [];
  for (let row = 0; row < count; row++) {
    let runStart = -1;
    for (let col = 0; col <= count; col++) {
      const on = col < count && modules[row][col];
      if (on && runStart === -1) runStart = col;
      if (!on && runStart !== -1) {
        const rx = (quiet + runStart) * unit;
        const ry = (quiet + row) * unit;
        const rw = (col - runStart) * unit;
        rects.push(
          `<rect x="${(x + rx).toFixed(2)}" y="${(y + ry).toFixed(2)}" width="${rw.toFixed(2)}" height="${unit.toFixed(2)}"/>`
        );
        runStart = -1;
      }
    }
  }

  return `<rect x="${x}" y="${y}" width="${sizePx}" height="${sizePx}" fill="${PAPER}"/><g fill="${INK}">${rects.join("")}</g>`;
}

/**
 * Compose le visuel complet et le rasterise en PNG à 300 dpi.
 *
 * ⚠️ Le texte est rendu par le moteur SVG de sharp, qui dépend des polices
 * présentes dans l'environnement d'exécution. C'est exactement le genre de
 * détail qui marche en local et sort blanc en production (cf. les tirages
 * ratés de Renka). Pour produire des échantillons à contrôler À L'ŒIL :
 *   PRINT_ARTWORK_OUT=<dossier> npx vitest run lib/print/artwork.vitest.ts
 * À refaire une fois déployé sur Vercel, avant d'ouvrir la vente.
 */
export async function renderGeneratedArtwork(
  format: PrintFormat,
  input: ArtworkInput
): Promise<Buffer> {
  const widthPx = Math.round((format.widthCm / 2.54) * PRINT_DPI);
  const heightPx = Math.round((format.heightCm / 2.54) * PRINT_DPI);

  // Mise en page proportionnelle au format : le QR occupe une part fixe de
  // la largeur, et le bloc complet est centré verticalement — sans quoi les
  // formats très allongés (panneau 70×100) laissent un grand vide en bas.
  const qrSize = Math.round(widthPx * 0.62);
  const qrX = Math.round((widthPx - qrSize) / 2);

  const titleSize = Math.round(widthPx * 0.075);
  const subtitleSize = Math.round(widthPx * 0.045);
  const ctaSize = Math.round(widthPx * 0.05);
  const pinSize = Math.round(widthPx * 0.038);

  const gap = Math.round(widthPx * 0.05);
  const titleBlock = titleSize * 1.2;
  const subtitleBlock = input.subtitle ? subtitleSize * 1.6 : 0;
  const ctaBlock = input.callToAction ? ctaSize * 1.6 : 0;
  const pinBlock = input.pin ? pinSize * 1.5 : 0;
  const contentHeight =
    titleBlock + subtitleBlock + gap + qrSize + (ctaBlock ? gap : 0) + ctaBlock + pinBlock;

  let cursor = Math.round((heightPx - contentHeight) / 2);
  const titleY = cursor + titleSize;
  cursor += titleBlock;
  const subtitleY = cursor + subtitleSize;
  cursor += subtitleBlock + gap;
  const qrY = Math.round(cursor);
  cursor += qrSize + (ctaBlock ? gap : 0);
  const ctaY = cursor + ctaSize;
  cursor += ctaBlock;
  const pinY = cursor + pinSize;

  const qr = qrSvg(input.joinUrl, qrSize, qrX, qrY);

  // Largeur utile : le texte ne doit jamais toucher le bord de la pièce.
  const maxTextWidth = widthPx * 0.86;

  const text = (
    content: string | null | undefined,
    y: number,
    size: number,
    weight: string
  ) => {
    if (!content) return "";
    const fitted = fitLine(content, size, maxTextWidth, weight === "700" || weight === "600");
    return `<text x="${widthPx / 2}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${fitted.size}" font-weight="${weight}" fill="${INK}" text-anchor="middle">${escapeXml(fitted.content)}</text>`;
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
  <rect width="${widthPx}" height="${heightPx}" fill="${PAPER}"/>
  ${text(input.title, titleY, titleSize, "700")}
  ${text(input.subtitle, subtitleY, subtitleSize, "400")}
  ${qr}
  ${text(input.callToAction, ctaY, ctaSize, "600")}
  ${text(input.pin ? `ou code ${input.pin}` : null, pinY, pinSize, "400")}
</svg>`;

  return sharp(Buffer.from(svg))
    .png()
    .withMetadata({ density: PRINT_DPI })
    .toBuffer();
}

/** Consigne par défaut selon le produit. */
export function defaultCallToAction(productId: string): string {
  switch (productId) {
    case "presentoir-qr":
      return "Scannez pour partager vos photos";
    case "panneau-bienvenue":
      return "Scannez — partagez vos photos du jour";
    default:
      return "Scannez pour partager";
  }
}
