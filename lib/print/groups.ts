// Regroupement de la file d'impression PAR MATIÈRE — un lot = UNE matière
// chargée en machine (enseignement direct de Renka : un lot mixte est
// inimprimable, l'atelier ne charge qu'un stock à la fois).
//
// Module PUR (aucun import) : partagé entre la file serverless, le dashboard
// atelier et les scripts Node.
//
// Le seuil de lot (PRINT_BATCH_SIZE) est un réglage d'environnement : la
// bonne valeur par machine/matière est la question n°9 de l'audit (l'équivalent
// photo du « 23 cartes = 1 planche » de Renka) — à caler avec l'atelier.

export interface GroupablePiece {
  /** Clé matière de la pièce (papier-photo, canvas, forex, dibond, plexi). */
  material?: string | null;
}

/** Clé de groupe (les null/undefined partagent la même clé). */
export function materialKey(material: string | null | undefined): string {
  return material ?? "";
}

/**
 * Résout le seuil de lot d'une matière : valeur dédiée si fournie (réglage
 * `PRINT_BATCH_SIZE_<MATIERE>` côté serveur), sinon le seuil global. Fonction
 * pure — la lecture d'environnement reste dans lib/print/queue.ts.
 */
export function resolveBatchSize(
  material: string | null | undefined,
  overrides: Readonly<Record<string, number>>,
  fallback: number
): number {
  const dedicated = overrides[materialKey(material)];
  return dedicated && dedicated > 0 ? dedicated : fallback;
}

/**
 * Choisit le groupe de pièces du PROCHAIN lot parmi les pièces `pending`
 * triées par ancienneté (ordre d'entrée préservé) :
 *  - sans `force` : premier groupe (par pièce la plus ancienne) qui atteint
 *    son seuil — null si aucun n'est complet ;
 *  - avec `force` : le groupe de la pièce LA PLUS ANCIENNE (des appels
 *    répétés vident les groupes suivants lot par lot).
 * `batchSize` : seuil global (number) ou seuil par matière (fonction).
 * Renvoie le groupe ENTIER (l'appelant tronque au seuil de la matière).
 */
export function pickBatchGroup<T extends GroupablePiece>(
  rows: readonly T[],
  batchSize: number | ((material: string | null | undefined) => number),
  force: boolean
): T[] | null {
  if (!rows.length) return null;
  const sizeFor = typeof batchSize === "number" ? () => batchSize : batchSize;
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const k = materialKey(r.material);
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  if (force) return groups.get(materialKey(rows[0].material)) ?? null;
  for (const [key, g] of groups.entries())
    if (g.length >= sizeFor(key)) return g;
  return null;
}
