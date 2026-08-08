import { describe, expect, it } from "vitest";
import {
  PRINT_PRODUCTS,
  fitsUvBed,
  getVariant,
  orderMarginCents,
  orderTotalCents,
  piecesPerPass,
  resolutionBadge,
  volumeDiscountPercent,
} from "./catalog";
import { pickBatchGroup, resolveBatchSize } from "./groups";

const EUR_2990 = 2990;
const EUR_1050 = 1050;

describe("catalogue impression", () => {
  it("expose des clés stables uniques (produit et format)", () => {
    const productIds = PRINT_PRODUCTS.map((p) => p.id);
    expect(new Set(productIds).size).toBe(productIds.length);
    for (const product of PRINT_PRODUCTS) {
      const formatIds = product.formats.map((f) => f.id);
      expect(new Set(formatIds).size).toBe(formatIds.length);
      for (const format of product.formats) {
        expect(format.priceCents).toBeGreaterThan(0);
        expect(format.widthCm).toBeLessThan(format.heightCm);
      }
    }
  });

  it("garde une marge positive sur chaque variante", () => {
    for (const product of PRINT_PRODUCTS) {
      for (const format of product.formats) {
        expect(format.priceCents).toBeGreaterThan(format.costCents);
      }
    }
  });

  it("refuse produit ou format inconnus", () => {
    expect(getVariant("mug", "30x40")).toBeNull();
    expect(getVariant("poster", "10x15")).toBeNull();
    // Le 70×100 n'existe que sur le panneau de bienvenue, pas sur le Forex nu.
    expect(getVariant("forex", "70x100")).toBeNull();
    expect(getVariant("panneau-bienvenue", "70x100")).not.toBeNull();
  });

  it("applique la remise volume par palier", () => {
    expect(volumeDiscountPercent(1)).toBe(0);
    expect(volumeDiscountPercent(2)).toBe(10);
    expect(volumeDiscountPercent(5)).toBe(20);
    expect(volumeDiscountPercent(10)).toBe(30);
    expect(volumeDiscountPercent(25)).toBe(35);
    expect(volumeDiscountPercent(50)).toBe(40);
    // 2 posters 30x40 : 690 − 10 % = 621 par pièce.
    expect(
      orderTotalCents([
        { productId: "poster", formatId: "30x40" },
        { productId: "poster", formatId: "30x40" },
      ])
    ).toBe(621 * 2);
    expect(orderTotalCents([{ productId: "poster", formatId: "inconnu" }])).toBeNull();
  });

  it("s'en tient aux cinq supports produisibles aujourd'hui", () => {
    // Décision Nico du 07/08/2026 : pas de produit dépendant de la Gongzheng
    // (encre blanche, plexi diffusant) tant qu'elle n'est pas livrée.
    expect(PRINT_PRODUCTS.some((p) => p.signature)).toBe(false);
    const materials = new Set(PRINT_PRODUCTS.map((p) => p.material));
    expect([...materials].sort()).toEqual([
      "canvas",
      "dibond",
      "forex",
      "papier-photo",
      "plexi",
    ]);
  });

  it("cale l'imposition sur le plateau Mimaki en service", () => {
    const per = (productId: string, formatId: string) =>
      piecesPerPass(getVariant(productId, formatId)!.format);
    // Plateau 610×420 : 4 × 20×30, 2 × 30×40, 1 × 40×60 (au ras).
    expect(per("forex", "20x30")).toBe(4);
    expect(per("forex", "30x40")).toBe(2);
    expect(per("forex", "40x60")).toBe(1);
    // Au-delà, la pièce n'entre plus : contrecollage.
    expect(per("forex", "50x70")).toBe(0);
    expect(fitsUvBed(getVariant("forex", "40x60")!.format)).toBe(true);
    expect(fitsUvBed(getVariant("forex", "100x150")!.format)).toBe(false);
  });

  it("calcule une marge de commande cohérente", () => {
    const marge = orderMarginCents([{ productId: "forex", formatId: "40x60" }]);
    // 29,90 € − 10,50 € de coût de revient.
    expect(marge).toBe(EUR_2990 - EUR_1050);
  });

  it("évalue la résolution dans le meilleur sens (portrait/paysage)", () => {
    const poster3040 = getVariant("poster", "30x40")!.format;
    // 12 Mpx smartphone (4000×3000) : large en 30×40.
    expect(resolutionBadge(4000, 3000, poster3040)).toBe("ok");
    const poster80120 = getVariant("poster", "80x120")!.format;
    // La même photo en 80×120 : ~95 dpi → refusée.
    expect(resolutionBadge(4000, 3000, poster80120)).toBe("insufficient");
    // Photo paysage sur format portrait : le meilleur sens doit être retenu.
    expect(resolutionBadge(3000, 4000, poster3040)).toBe(
      resolutionBadge(4000, 3000, poster3040)
    );
  });
});

describe("regroupement par matière", () => {
  const piece = (material: string | null, tag: number) => ({ material, tag });

  it("choisit le premier groupe complet par ancienneté", () => {
    const rows = [
      piece("forex", 1),
      piece("canvas", 2),
      piece("forex", 3),
      piece("canvas", 4),
      piece("canvas", 5),
    ];
    const group = pickBatchGroup(rows, 3, false);
    expect(group?.map((p) => p.tag)).toEqual([2, 4, 5]);
  });

  it("sans groupe complet, renvoie null sauf force", () => {
    const rows = [piece("forex", 1), piece("canvas", 2)];
    expect(pickBatchGroup(rows, 3, false)).toBeNull();
    // force : le groupe de la pièce la plus ancienne.
    expect(pickBatchGroup(rows, 3, true)?.map((p) => p.tag)).toEqual([1]);
  });

  it("regroupe les matières null ensemble", () => {
    const rows = [piece(null, 1), piece(null, 2)];
    expect(pickBatchGroup(rows, 2, false)?.length).toBe(2);
  });

  it("applique un seuil dédié par matière quand il existe", () => {
    expect(resolveBatchSize("plexi", { plexi: 3 }, 8)).toBe(3);
    expect(resolveBatchSize("canvas", { plexi: 3 }, 8)).toBe(8);
    expect(resolveBatchSize(null, {}, 8)).toBe(8);
    // Un seuil fonction : le groupe plexi part à 3 même si le global est 8.
    const rows = [piece("plexi", 1), piece("plexi", 2), piece("plexi", 3), piece("canvas", 4)];
    const group = pickBatchGroup(rows, (m) => resolveBatchSize(m, { plexi: 3 }, 8), false);
    expect(group?.map((p) => p.tag)).toEqual([1, 2, 3]);
  });
});
