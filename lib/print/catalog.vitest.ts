import { describe, expect, it } from "vitest";
import {
  PRINT_PRODUCTS,
  getVariant,
  orderTotalCents,
  resolutionBadge,
  volumeDiscountPercent,
} from "./catalog";
import { pickBatchGroup } from "./groups";

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

  it("exclut par défaut les formats en attente de validation atelier", () => {
    expect(getVariant("forex", "70x100")).toBeNull();
    expect(getVariant("forex", "70x100", { includePending: true })).not.toBeNull();
    expect(getVariant("poster", "80x120")).not.toBeNull();
  });

  it("refuse produit ou format inconnus", () => {
    expect(getVariant("mug", "30x40")).toBeNull();
    expect(getVariant("poster", "10x15")).toBeNull();
  });

  it("applique la remise volume par palier", () => {
    expect(volumeDiscountPercent(1)).toBe(0);
    expect(volumeDiscountPercent(2)).toBe(10);
    expect(volumeDiscountPercent(3)).toBe(15);
    // 2 posters 30x40 : 690 − 10 % = 621 par pièce.
    expect(
      orderTotalCents([
        { productId: "poster", formatId: "30x40" },
        { productId: "poster", formatId: "30x40" },
      ])
    ).toBe(621 * 2);
    expect(orderTotalCents([{ productId: "poster", formatId: "inconnu" }])).toBeNull();
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
});
