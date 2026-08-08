// Catalogue impression Printerkut — SOURCE UNIQUE des produits, formats et
// prix (pattern offer.ts de Renka : « un prix se change ICI, jamais en dur
// dans le JSX »).
//
// ⚠️ STATUT : grille V1 du 07/08/2026 issue de
// docs/strategie/gamme-produits-impression.md — coûts matière réels (Antalis,
// Plexi-Cindar), prix marché nets relevés, positionnement 10-25 % en dessous.
// EN ATTENTE de validation par l'atelier (grille de cession + questions).
// Rien n'est exposé publiquement tant que PRINT_ENABLED n'est pas actif.
//
// PÉRIMÈTRE V1 (décision Nico du 07/08/2026) : on ne vend QUE les cinq
// supports que l'atelier produit déjà — Dibond, PVC, plexi, papier photo,
// canvas. La Gongzheng H2513GN PRO n'arrive pas tout de suite ; tout ce qui
// dépend de son encre blanche et de son plexi diffusant (rétroéclairé Day &
// Night, vitrail à blanc sélectif, bloc épais, petites pièces transparentes)
// est décrit dans le document de gamme §8 et attend la machine.
//
// PRODUCTION ACTUELLE — le rigide passe sur les Mimaki UJF MkII à plateau
// fixe (610×420 max, le « double plateau » double la cadence, pas le format) :
// impression DIRECTE jusqu'au 40×60, CONTRECOLLAGE (tirage Latex marouflé)
// au-delà. Les prix tiennent dans les deux méthodes ; `fitsUvBed()` et
// `piecesPerPass()` documentent la bascule et calent les seuils de lot.

/** Matière chargée en machine — clé de regroupement : un lot = UNE matière. */
export type MaterialId =
  | "papier-photo" // Latex 700W, rouleau
  | "canvas" // Latex 700W, rouleau + châssis
  | "forex" // PVC expansé 3 mm
  | "dibond" // alu composite 3 mm
  | "plexi"; // PMMA 3 mm

/** Machine de production — détermine la logique de regroupement. */
export type Machine = "latex-700w" | "uv-flatbed";

export interface PrintFormat {
  /** Clé stable ("30x40") — stockée en base, ne jamais renommer. */
  id: string;
  /** Dimensions d'UNE pièce (pas du lot) — servent au contrôle de
   *  résolution et à l'indicateur de cadrage. */
  widthCm: number;
  heightCm: number;
  priceCents: number;
  /** Coût de revient estimé (matière + encre + accroche + emballage), pour
   *  le suivi de marge — jamais affiché au client. */
  costCents: number;
  /** Nombre de pièces livrées, pour les lots de petites pièces. Défaut 1. */
  packQuantity?: number;
  /**
   * Encombrement de la pièce à plat sur le plateau, quand il diffère de la
   * face visible — cas du chevalet, dont le pied s'ajoute à la hauteur
   * imprimée. C'est cet encombrement qui commande l'imposition, pas le
   * format vu par le client. Défaut : les cotes de la face visible.
   */
  blankWidthCm?: number;
  blankHeightCm?: number;
}

export interface PrintProduct {
  /** Clé stable ("poster") — stockée en base, ne jamais renommer. */
  id: string;
  label: string;
  material: MaterialId;
  machine: Machine;
  description: string;
  /** Produit « signature » : pas de comparable marché, prix de valeur
   *  perçue — la règle du prix cassé NE s'y applique PAS (audit §9). */
  signature?: boolean;
  /** Produit à date impérative (jour J) : doit sortir de la file normale
   *  par la voie express, sans attendre le seuil de lot. */
  timeCritical?: boolean;
  /**
   * D'où vient le visuel imprimé :
   *  - "photo"     : une photo du coffre (défaut) — commande APRÈS l'événement
   *  - "generated" : un visuel composé par l'app (QR du coffre, prénoms,
   *                  date) — commandable À LA CRÉATION du coffre, avant le
   *                  jour J, quand le coffre est encore vide
   *  - "both"      : au choix du client, avec ou sans photo
   */
  source?: "photo" | "generated" | "both";
  /**
   * Le produit embarque une puce NFC. Implique une chaîne de production
   * supplémentaire : support à inlay intégré d'usine (jamais de pastille
   * collée), encodage unitaire, contrôle par tap, puis verrouillage en
   * lecture seule. Détail : docs/strategie/presentoir-nfc.md
   */
  nfc?: boolean;
  formats: PrintFormat[];
}

const EUR = (euros: number): number => Math.round(euros * 100);

/** La grille V1 — prix TTC en centimes, coûts de revient estimés. */
export const PRINT_PRODUCTS: readonly PrintProduct[] = [
  {
    id: "forex",
    label: "Panneau Forex",
    material: "forex",
    machine: "uv-flatbed",
    description: "PVC expansé 3 mm, impression UV directe — léger et rigide",
    formats: [
      { id: "20x30", widthCm: 20, heightCm: 30, priceCents: EUR(14.9), costCents: EUR(5.4) },
      { id: "30x40", widthCm: 30, heightCm: 40, priceCents: EUR(19.9), costCents: EUR(7.8) },
      { id: "40x60", widthCm: 40, heightCm: 60, priceCents: EUR(29.9), costCents: EUR(10.5) },
      { id: "50x70", widthCm: 50, heightCm: 70, priceCents: EUR(39.9), costCents: EUR(13.7) },
      { id: "60x90", widthCm: 60, heightCm: 90, priceCents: EUR(49.9), costCents: EUR(18.0) },
      { id: "80x120", widthCm: 80, heightCm: 120, priceCents: EUR(79.9), costCents: EUR(28.7) },
      { id: "100x150", widthCm: 100, heightCm: 150, priceCents: EUR(129), costCents: EUR(40.6) },
    ],
  },
  {
    id: "dibond",
    label: "Panneau aluminium",
    material: "dibond",
    machine: "uv-flatbed",
    description: "Aluminium composite 3 mm — finition galerie",
    formats: [
      { id: "20x30", widthCm: 20, heightCm: 30, priceCents: EUR(16.9), costCents: EUR(7.0) },
      { id: "30x40", widthCm: 30, heightCm: 40, priceCents: EUR(24.9), costCents: EUR(11.0) },
      { id: "40x60", widthCm: 40, heightCm: 60, priceCents: EUR(34.9), costCents: EUR(17.0) },
      { id: "50x70", widthCm: 50, heightCm: 70, priceCents: EUR(44.9), costCents: EUR(23.1) },
      { id: "60x90", widthCm: 60, heightCm: 90, priceCents: EUR(59.9), costCents: EUR(32.5) },
      { id: "80x120", widthCm: 80, heightCm: 120, priceCents: EUR(99.9), costCents: EUR(54.4) },
      { id: "100x150", widthCm: 100, heightCm: 150, priceCents: EUR(149), costCents: EUR(80.9) },
    ],
  },
  {
    id: "plexi",
    label: "Plexiglas",
    material: "plexi",
    machine: "uv-flatbed",
    description: "PMMA 3 mm, impression directe avec blanc de soutien — effet profondeur",
    formats: [
      { id: "20x30", widthCm: 20, heightCm: 30, priceCents: EUR(17.9), costCents: EUR(6.3) },
      { id: "30x40", widthCm: 30, heightCm: 40, priceCents: EUR(27.9), costCents: EUR(9.6) },
      { id: "40x60", widthCm: 40, heightCm: 60, priceCents: EUR(44.9), costCents: EUR(14.2) },
      { id: "50x70", widthCm: 50, heightCm: 70, priceCents: EUR(64.9), costCents: EUR(19.1) },
      { id: "60x90", widthCm: 60, heightCm: 90, priceCents: EUR(84.9), costCents: EUR(26.3) },
      { id: "80x120", widthCm: 80, heightCm: 120, priceCents: EUR(139), costCents: EUR(43.4) },
    ],
  },
  {
    id: "poster",
    label: "Poster photo",
    material: "papier-photo",
    machine: "latex-700w",
    description: "Papier photo 200 g semi-brillant",
    formats: [
      { id: "30x40", widthCm: 30, heightCm: 40, priceCents: EUR(6.9), costCents: EUR(2.7) },
      { id: "40x60", widthCm: 40, heightCm: 60, priceCents: EUR(9.9), costCents: EUR(3.4) },
      { id: "50x70", widthCm: 50, heightCm: 70, priceCents: EUR(12.9), costCents: EUR(4.5) },
      { id: "60x90", widthCm: 60, heightCm: 90, priceCents: EUR(14.9), costCents: EUR(5.5) },
      { id: "80x120", widthCm: 80, heightCm: 120, priceCents: EUR(24.9), costCents: EUR(10.4) },
      { id: "100x150", widthCm: 100, heightCm: 150, priceCents: EUR(39.9), costCents: EUR(13.4) },
    ],
  },
  {
    id: "canvas",
    label: "Toile canvas sur châssis",
    material: "canvas",
    machine: "latex-700w",
    description: "Toile polycoton 310 g, montée sur châssis bois",
    // Marge la plus faible de la gamme (33-44 %) : châssis + 46 % de chute de
    // toile. On ne descend pas sous le 30×40 (cf. gamme-produits §5.2).
    formats: [
      { id: "30x40", widthCm: 30, heightCm: 40, priceCents: EUR(21.9), costCents: EUR(12.3) },
      { id: "40x60", widthCm: 40, heightCm: 60, priceCents: EUR(29.9), costCents: EUR(18.1) },
      { id: "50x70", widthCm: 50, heightCm: 70, priceCents: EUR(39.9), costCents: EUR(22.9) },
      { id: "60x90", widthCm: 60, heightCm: 90, priceCents: EUR(49.9), costCents: EUR(30.7) },
      { id: "80x120", widthCm: 80, heightCm: 120, priceCents: EUR(69.9), costCents: EUR(46.7) },
      { id: "100x150", widthCm: 100, heightCm: 150, priceCents: EUR(99), costCents: EUR(64.9) },
    ],
  },
  {
    id: "panneau-bienvenue",
    label: "Panneau de bienvenue",
    material: "forex",
    machine: "uv-flatbed",
    description: "Forex 3 mm, jour J — porte le QR du coffre",
    timeCritical: true,
    source: "generated",
    formats: [
      { id: "50x70", widthCm: 50, heightCm: 70, priceCents: EUR(49.9), costCents: EUR(13.7) },
      { id: "70x100", widthCm: 70, heightCm: 100, priceCents: EUR(69.9), costCents: EUR(20.3) },
    ],
  },
  // ---- Produits SIGNATURE au blanc sélectif ----------------------------
  // Les Mimaki UJF MkII portent DÉJÀ l'encre blanche et le vernis : tout ce
  // qui tient sur le plateau (≤ 40×60) est produisible dès maintenant, sans
  // attendre la Gongzheng. Ces produits n'ont aucun comparable en labo photo
  // grand public — d'où `signature: true` et l'exclusion de la remise volume
  // (un prix cassé y détruit la valeur perçue, cf. gamme-produits §9).
  {
    id: "vitrail",
    label: "Vitrail photo",
    material: "plexi",
    machine: "uv-flatbed",
    description:
      "Plexi transparent à blanc sélectif — sujets opaques, fond transparent, à poser devant une fenêtre",
    signature: true,
    formats: [
      { id: "30x40", widthCm: 30, heightCm: 40, priceCents: EUR(69), costCents: EUR(9.6) },
      { id: "40x60", widthCm: 40, heightCm: 60, priceCents: EUR(89), costCents: EUR(14.2) },
    ],
  },
  // ---- La papeterie du jour J : commandée À LA CRÉATION du coffre --------
  // Ces produits ne partent pas d'une photo du coffre (il est encore vide) :
  // l'app compose le visuel. Le présentoir porte le QR du coffre — il est
  // donc à la fois un produit vendu ET le canal qui fait scanner les
  // invités : plus de scans → plus de photos → plus d'impressions après.
  {
    id: "presentoir",
    label: "Présentoir de table NFC",
    material: "plexi",
    machine: "uv-flatbed",
    description:
      "Chevalet à puce NFC intégrée, avec QR — l'invité pose son téléphone ou scanne ; un présentoir par table, chacun encodé sur sa table",
    timeCritical: true,
    // Le visuel est composé par l'app (QR + table + consigne), avec une photo
    // fournie par les mariés en option — le coffre est encore vide.
    source: "both",
    // Puce NFC INTÉGRÉE D'USINE : le fournisseur (le même que le Point Fixe
    // de Renka) livre le chevalet tag inclus. Aucune pastille à coller par
    // l'atelier — donc aucun rebut de pose. Restent à l'atelier : impression,
    // encodage unitaire par table, contrôle par tap, puis VERROUILLAGE en
    // lecture seule (un présentoir traîne toute une soirée à portée de tous).
    nfc: true,
    // Cotes réelles du bon de commande fournisseur (08/08/2026) :
    //   moyen : 105 + 50 × 70 mm  → face 7,0 × 10,5, à plat 7,0 × 15,5
    //   grand : 127,5 + 50 × 76 mm → face 7,6 × 12,75, à plat 7,6 × 17,75
    // Le « + 50 » est le pied : il occupe le plateau sans être la face vue
    // par le client. Rendement réel : 18 pièces par passe en moyen, 16 en
    // grand (et non 36/25, qui ne comptait que la face imprimée).
    // Coût : chevalet 1,20 $ pièce + quote-part DDP ≈ 1,40 $ ≈ 1,23 €.
    formats: [
      { id: "moyen-lot-5", widthCm: 7, heightCm: 10.5, blankHeightCm: 15.5, priceCents: EUR(45), costCents: EUR(10), packQuantity: 5 },
      { id: "moyen-lot-10", widthCm: 7, heightCm: 10.5, blankHeightCm: 15.5, priceCents: EUR(79), costCents: EUR(18), packQuantity: 10 },
      { id: "moyen-lot-15", widthCm: 7, heightCm: 10.5, blankHeightCm: 15.5, priceCents: EUR(109), costCents: EUR(26), packQuantity: 15 },
      { id: "moyen-lot-20", widthCm: 7, heightCm: 10.5, blankHeightCm: 15.5, priceCents: EUR(135), costCents: EUR(35), packQuantity: 20 },
      { id: "grand-lot-5", widthCm: 7.6, heightCm: 12.75, blankHeightCm: 17.75, priceCents: EUR(55), costCents: EUR(12), packQuantity: 5 },
      { id: "grand-lot-10", widthCm: 7.6, heightCm: 12.75, blankHeightCm: 17.75, priceCents: EUR(99), costCents: EUR(21), packQuantity: 10 },
      { id: "grand-lot-15", widthCm: 7.6, heightCm: 12.75, blankHeightCm: 17.75, priceCents: EUR(135), costCents: EUR(30), packQuantity: 15 },
      { id: "grand-lot-20", widthCm: 7.6, heightCm: 12.75, blankHeightCm: 17.75, priceCents: EUR(169), costCents: EUR(40), packQuantity: 20 },
    ],
  },
  {
    id: "marque-places",
    label: "Marque-places",
    material: "plexi",
    machine: "uv-flatbed",
    description:
      "Petites plaques plexi 6×9 à blanc sélectif — un par convive, avec ou sans photo, à poser sur les tables",
    signature: true,
    timeCritical: true,
    source: "both",
    // 42 pièces par passe de plateau : le meilleur €/heure-machine de la
    // gamme. Prix au lot, la dégressivité est déjà dans les paliers.
    formats: [
      { id: "lot-20", widthCm: 6, heightCm: 9, priceCents: EUR(79), costCents: EUR(9), packQuantity: 20 },
      { id: "lot-50", widthCm: 6, heightCm: 9, priceCents: EUR(169), costCents: EUR(18), packQuantity: 50 },
      { id: "lot-100", widthCm: 6, heightCm: 9, priceCents: EUR(299), costCents: EUR(32), packQuantity: 100 },
    ],
  },
  {
    id: "plaque-souvenir",
    label: "Plaque souvenir",
    material: "plexi",
    machine: "uv-flatbed",
    description:
      "Plaque plexi à blanc sélectif — cadeau d'invité, trophée de club, souvenir de séminaire",
    // Pas `signature` : en B2B (50 participants, une équipe entière) la
    // remise volume est attendue et normale.
    formats: [
      { id: "10x15", widthCm: 10, heightCm: 15, priceCents: EUR(12.9), costCents: EUR(2) },
      { id: "15x20", widthCm: 15, heightCm: 20, priceCents: EUR(17.9), costCents: EUR(2.4) },
    ],
  },
];

// Restent en V2, faute de plexi diffusant et de grand plateau : le
// rétroéclairé Day & Night et le bloc plexi épais (gamme-produits §8.1 et
// §8.4), plus la décoration murale au m² (§5.3).

/**
 * Remise volume V1 — notre avantage structurel : N pièces du même événement
 * sont produites dans la même passe et expédiées dans le même colis, donc le
 * forfait d'accroche et d'emballage s'amortit. Le marché photo-déco ne
 * propose qu'un −10 % dès 2 produits (gamme-produits §6).
 */
export function volumeDiscountPercent(pieceCount: number): number {
  if (pieceCount >= 50) return 40;
  if (pieceCount >= 25) return 35;
  if (pieceCount >= 10) return 30;
  if (pieceCount >= 5) return 20;
  if (pieceCount >= 2) return 10;
  return 0;
}

/**
 * Plateau de la plus grande machine rigide EN SERVICE (Mimaki UJF-6042 MkII,
 * 610 × 420 mm). Le « double plateau » de l'atelier charge en temps masqué :
 * il double la cadence, pas la surface. À remplacer par 2500×1300 quand la
 * Gongzheng est installée.
 */
export const UV_BED_MM = { width: 610, height: 420 } as const;

/** Le format tient-il sur le plateau, dans un sens ou dans l'autre ?
 *  Sinon la pièce passe par contrecollage (tirage Latex marouflé). */
export function fitsUvBed(format: PrintFormat): boolean {
  return piecesPerPass(format) > 0;
}

/**
 * Nombre de pièces d'un format qui tiennent sur une passe de plateau
 * (imposition simple, sans marge de coupe) — 0 si le format n'y entre pas.
 * C'est le « 23 cartes = une planche » de Renka transposé à la photo : il
 * cale les seuils de lot par matière (PRINT_BATCH_SIZE_<MATIERE>).
 */
export function piecesPerPass(format: PrintFormat): number {
  // On raisonne sur l'encombrement à plat : un chevalet occupe le plateau
  // avec son pied déplié, pas seulement sa face imprimée.
  const w = (format.blankWidthCm ?? format.widthCm) * 10;
  const h = (format.blankHeightCm ?? format.heightCm) * 10;
  const grid = (pieceW: number, pieceH: number) =>
    Math.floor(UV_BED_MM.width / pieceW) * Math.floor(UV_BED_MM.height / pieceH);
  return Math.max(grid(w, h), grid(h, w));
}

/** Option d'accroche : 4 entretoises inox coûtent ~15 € — jamais incluses. */
export const HANGING_KIT_CENTS = EUR(19.9);

/** Franchise de port (le marché va de 69 € à 200 €). */
export const FREE_SHIPPING_THRESHOLD_CENTS = EUR(79);

export interface PrintVariant {
  product: PrintProduct;
  format: PrintFormat;
}

/** Variante par clés stables — null si inconnue. */
export function getVariant(productId: string, formatId: string): PrintVariant | null {
  const product = PRINT_PRODUCTS.find((p) => p.id === productId);
  if (!product) return null;
  const format = product.formats.find((f) => f.id === formatId);
  if (!format) return null;
  return { product, format };
}

/**
 * Total en centimes, remise volume appliquée (arrondi par pièce).
 * Les produits **signature** sont exclus de la remise : ils n'ont pas de
 * comparable marché, et un prix cassé y détruit la valeur perçue (§9).
 */
export function orderTotalCents(
  pieces: { productId: string; formatId: string }[]
): number | null {
  const discount = volumeDiscountPercent(pieces.length);
  let total = 0;
  for (const piece of pieces) {
    const v = getVariant(piece.productId, piece.formatId);
    if (!v) return null;
    const rate = v.product.signature ? 0 : discount;
    total += Math.round((v.format.priceCents * (100 - rate)) / 100);
  }
  return total;
}

/** Nombre de pièces physiques livrées par une variante (lots compris). */
export function deliveredPieces(format: PrintFormat): number {
  return format.packQuantity ?? 1;
}

/**
 * Le produit exige-t-il une photo du coffre ? Faux pour la papeterie du jour
 * J, commandable à la création du coffre alors qu'il est encore vide — le
 * visuel est composé par l'app (QR, prénoms, date).
 */
export function requiresCoffrePhoto(product: PrintProduct): boolean {
  return (product.source ?? "photo") === "photo";
}

/** Produits commandables AVANT l'événement (papeterie du jour J). */
export function preEventProducts(): PrintProduct[] {
  return PRINT_PRODUCTS.filter((p) => !requiresCoffrePhoto(p));
}

/** Marge brute estimée d'une commande, en centimes (suivi interne). */
export function orderMarginCents(
  pieces: { productId: string; formatId: string }[]
): number | null {
  const total = orderTotalCents(pieces);
  if (total === null) return null;
  let cost = 0;
  for (const piece of pieces) {
    const v = getVariant(piece.productId, piece.formatId);
    if (!v) return null;
    cost += v.format.costCents;
  }
  return total - cost;
}

/** Libellé matière pour l'email atelier et le dashboard. */
export const MATERIAL_LABELS: Record<MaterialId, string> = {
  "papier-photo": "Papier photo (Latex 700W — rouleau)",
  canvas: "Toile canvas (Latex 700W — rouleau + châssis)",
  forex: "Forex PVC 3 mm (UV à plat)",
  dibond: "Aluminium composite 3 mm (UV à plat)",
  plexi: "Plexi 3 mm (UV à plat)",
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
