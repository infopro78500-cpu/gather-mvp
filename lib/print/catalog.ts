// Catalogue impression Printerkut — SOURCE UNIQUE des produits, formats et
// prix (pattern offer.ts de Renka : « un prix se change ICI, jamais en dur
// dans le JSX »).
//
// ⚠️ STATUT : GRILLE DRAFT du 05/08/2026 — issue de l'audit
// docs/strategie/audit-integration-printerkut.md, EN ATTENTE de validation
// par l'atelier (grille + question n°1 sur la machine rigide). Ne rien
// exposer publiquement tant que PRINT_ENABLED n'est pas actif et que les
// variantes `pendingWorkshopValidation` n'ont pas été tranchées.

/** Matière chargée en machine — clé de regroupement : un lot = UNE matière. */
export type MaterialId =
  | "papier-photo"   // Latex 700W, rouleau
  | "canvas"         // Latex 700W, rouleau + châssis
  | "forex"          // Mimaki UV, plaque PVC 5 mm
  | "dibond"         // Mimaki UV, plaque alu 3 mm
  | "plexi";         // Mimaki UV, plaque 4 mm (blanc de soutien)

/** Machine de production — détermine la logique de regroupement. */
export type Machine = "latex-700w" | "mimaki-uv";

export interface PrintFormat {
  /** Clé stable ("30x40") — stockée en base, ne jamais renommer. */
  id: string;
  widthCm: number;
  heightCm: number;
  priceCents: number;
  /** Format conditionné à la réponse atelier (grande table JFX ou
   *  contrecollage) — question n°1 de l'audit. Exclu tant que non validé. */
  pendingWorkshopValidation?: boolean;
}

export interface PrintProduct {
  /** Clé stable ("poster") — stockée en base, ne jamais renommer. */
  id: string;
  label: string;
  material: MaterialId;
  machine: Machine;
  description: string;
  formats: PrintFormat[];
}

const EUR = (euros: number): number => Math.round(euros * 100);

/** La grille V1 (draft audit 05/08/2026) — prix TTC en centimes. */
export const PRINT_PRODUCTS: readonly PrintProduct[] = [
  {
    id: "poster",
    label: "Poster photo",
    material: "papier-photo",
    machine: "latex-700w",
    description: "Papier photo mat ou satiné ~250 g",
    formats: [
      { id: "30x40", widthCm: 30, heightCm: 40, priceCents: EUR(6.9) },
      { id: "40x60", widthCm: 40, heightCm: 60, priceCents: EUR(9.9) },
      { id: "50x70", widthCm: 50, heightCm: 70, priceCents: EUR(12.9) },
      { id: "60x90", widthCm: 60, heightCm: 90, priceCents: EUR(14.9) },
      { id: "80x120", widthCm: 80, heightCm: 120, priceCents: EUR(24.9) },
    ],
  },
  {
    id: "canvas",
    label: "Toile canvas sur châssis",
    material: "canvas",
    machine: "latex-700w",
    description: "Toile imprimée Latex, montée sur châssis bois",
    formats: [
      { id: "30x40", widthCm: 30, heightCm: 40, priceCents: EUR(19.9) },
      { id: "40x60", widthCm: 40, heightCm: 60, priceCents: EUR(29.9) },
      { id: "50x70", widthCm: 50, heightCm: 70, priceCents: EUR(44.9) },
      { id: "60x90", widthCm: 60, heightCm: 90, priceCents: EUR(49.9) },
      { id: "80x120", widthCm: 80, heightCm: 120, priceCents: EUR(69.9) },
    ],
  },
  {
    id: "forex",
    label: "Panneau Forex (PVC)",
    material: "forex",
    machine: "mimaki-uv",
    description: "PVC expansé 5 mm, impression UV directe",
    formats: [
      { id: "30x40", widthCm: 30, heightCm: 40, priceCents: EUR(19.9) },
      { id: "40x60", widthCm: 40, heightCm: 60, priceCents: EUR(29.9) },
      { id: "60x90", widthCm: 60, heightCm: 90, priceCents: EUR(44.9), pendingWorkshopValidation: true },
      { id: "70x100", widthCm: 70, heightCm: 100, priceCents: EUR(49.9), pendingWorkshopValidation: true },
    ],
  },
  {
    id: "dibond",
    label: "Alu-Dibond",
    material: "dibond",
    machine: "mimaki-uv",
    description: "Panneau aluminium composite 3 mm",
    formats: [
      { id: "30x40", widthCm: 30, heightCm: 40, priceCents: EUR(24.9) },
      { id: "40x60", widthCm: 40, heightCm: 60, priceCents: EUR(34.9) },
      { id: "60x90", widthCm: 60, heightCm: 90, priceCents: EUR(54.9), pendingWorkshopValidation: true },
    ],
  },
  {
    id: "plexi",
    label: "Plexiglas",
    material: "plexi",
    machine: "mimaki-uv",
    description: "Plexi 4 mm, impression directe avec blanc de soutien",
    formats: [
      { id: "30x40", widthCm: 30, heightCm: 40, priceCents: EUR(29.9) },
      { id: "40x60", widthCm: 40, heightCm: 60, priceCents: EUR(39.9) },
      { id: "60x90", widthCm: 60, heightCm: 90, priceCents: EUR(69) , pendingWorkshopValidation: true },
    ],
  },
];

/** Remise volume V1 (draft) : −10 % dès 2 pièces, −15 % dès 3 pièces. */
export function volumeDiscountPercent(pieceCount: number): number {
  if (pieceCount >= 3) return 15;
  if (pieceCount >= 2) return 10;
  return 0;
}

export interface PrintVariant {
  product: PrintProduct;
  format: PrintFormat;
}

/** Variante par clés stables — null si inconnue OU non validée atelier. */
export function getVariant(
  productId: string,
  formatId: string,
  opts?: { includePending?: boolean }
): PrintVariant | null {
  const product = PRINT_PRODUCTS.find((p) => p.id === productId);
  if (!product) return null;
  const format = product.formats.find((f) => f.id === formatId);
  if (!format) return null;
  if (format.pendingWorkshopValidation && !opts?.includePending) return null;
  return { product, format };
}

/** Total en centimes, remise volume appliquée (arrondi par pièce). */
export function orderTotalCents(
  pieces: { productId: string; formatId: string }[]
): number | null {
  const discount = volumeDiscountPercent(pieces.length);
  let total = 0;
  for (const piece of pieces) {
    const v = getVariant(piece.productId, piece.formatId);
    if (!v) return null;
    total += Math.round((v.format.priceCents * (100 - discount)) / 100);
  }
  return total;
}

/** Libellé matière pour l'email atelier et le dashboard. */
export const MATERIAL_LABELS: Record<MaterialId, string> = {
  "papier-photo": "Papier photo (Latex 700W — rouleau)",
  canvas: "Toile canvas (Latex 700W — rouleau + châssis)",
  forex: "Forex PVC 5 mm (Mimaki UV)",
  dibond: "Alu-Dibond 3 mm (Mimaki UV)",
  plexi: "Plexi 4 mm (Mimaki UV — blanc de soutien)",
};

/**
 * Badge résolution : à 300 dpi natif il faut ~118 px/cm ; en déco murale
 * (vue à distance) 150 dpi restent bons, sous 100 dpi on refuse.
 * Leçon Renka : tout investissement qualité se valide sur un TIRAGE RÉEL.
 */
export function resolutionBadge(
  pxWidth: number,
  pxHeight: number,
  format: PrintFormat
): "ok" | "acceptable" | "insufficient" {
  // La photo peut être posée en portrait ou paysage : on prend le meilleur sens.
  const dpiA = Math.min(
    (pxWidth / format.widthCm) * 2.54,
    (pxHeight / format.heightCm) * 2.54
  );
  const dpiB = Math.min(
    (pxWidth / format.heightCm) * 2.54,
    (pxHeight / format.widthCm) * 2.54
  );
  const dpi = Math.max(dpiA, dpiB);
  if (dpi >= 150) return "ok";
  if (dpi >= 100) return "acceptable";
  return "insufficient";
}
