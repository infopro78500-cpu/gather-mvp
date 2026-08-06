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
 * Choisit le groupe de pièces du PROCHAIN lot parmi les pièces `pending`
 * triées par ancienneté (ordre d'entrée préservé) :
 *  - sans `force` : premier groupe (par pièce la plus ancienne) qui atteint
 *    batchSize — null si aucun n'est complet ;
 *  - avec `force` : le groupe de la pièce LA PLUS ANCIENNE (des appels
 *    répétés vident les groupes suivants lot par lot).
 * Renvoie le groupe ENTIER (l'appelant tronque à batchSize).
 */
export function pickBatchGroup<T extends GroupablePiece>(
  rows: readonly T[],
  batchSize: number,
  force: boolean
): T[] | null {
  if (!rows.length) return null;
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const k = materialKey(r.material);
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  if (force) return groups.get(materialKey(rows[0].material)) ?? null;
  for (const g of groups.values()) if (g.length >= batchSize) return g;
  return null;
}
