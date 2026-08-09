import { describe, expect, it } from "vitest";
import { tableStandLot } from "./catalog";

// L'arithmétique du lot de présentoirs : le palier qui COUVRE N tables.
// C'est elle qui fixe le prix payé — une régression ici est une erreur de
// facturation, pas un bug d'affichage.
describe("tableStandLot", () => {
  it("prend le plus petit palier suffisant", () => {
    expect(tableStandLot("moyen", 1)?.packQuantity).toBe(5);
    expect(tableStandLot("moyen", 5)?.packQuantity).toBe(5);
    expect(tableStandLot("moyen", 6)?.packQuantity).toBe(10);
    expect(tableStandLot("moyen", 12)?.packQuantity).toBe(15);
    expect(tableStandLot("grand", 16)?.packQuantity).toBe(20);
  });

  it("refuse au-delà du plus grand lot ou en dessous d'une table", () => {
    expect(tableStandLot("moyen", 21)).toBeNull();
    expect(tableStandLot("grand", 0)).toBeNull();
    expect(tableStandLot("moyen", Number.NaN)).toBeNull();
  });

  it("le prix du lot correspond bien au palier retenu", () => {
    // 12 tables en moyen → lot de 15 à 109 € (grille validée avec l'atelier).
    expect(tableStandLot("moyen", 12)?.priceCents).toBe(10900);
  });
});
