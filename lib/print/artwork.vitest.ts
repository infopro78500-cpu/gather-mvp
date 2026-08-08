import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { defaultCallToAction, renderGeneratedArtwork } from "./artwork";
import { getVariant } from "./catalog";

// Dossier d'échantillons : PRINT_ARTWORK_OUT=<dossier> pour garder les PNG
// et les contrôler à l'œil (le rendu du texte dépend des polices présentes
// dans l'environnement — un contrôle visuel reste obligatoire avant
// d'ouvrir la vente, sur Vercel comme en local).
const outDir = process.env.PRINT_ARTWORK_OUT ?? fs.mkdtempSync(path.join(os.tmpdir(), "artwork-"));

describe("visuels générés de la papeterie du jour J", () => {
  it("rend un présentoir 10×15 à 300 dpi", async () => {
    const format = getVariant("presentoir-qr", "lot-10")!.format;
    const png = await renderGeneratedArtwork(format, {
      joinUrl: "https://usegather.app/join?pin=123456",
      title: "Camille & Théo",
      subtitle: "Table 3",
      callToAction: defaultCallToAction("presentoir-qr"),
      pin: "123456",
    });
    fs.writeFileSync(path.join(outDir, "presentoir-10x15.png"), png);

    const meta = await sharp(png).metadata();
    // 10 × 15 cm à 300 dpi.
    expect(meta.width).toBe(1181);
    expect(meta.height).toBe(1772);
    expect(meta.format).toBe("png");
  });

  it("rend un panneau de bienvenue 70×100", async () => {
    const format = getVariant("panneau-bienvenue", "70x100")!.format;
    const png = await renderGeneratedArtwork(format, {
      joinUrl: "https://usegather.app/join?pin=654321",
      title: "Bienvenue",
      subtitle: "Camille & Théo — 12 septembre 2026",
      callToAction: defaultCallToAction("panneau-bienvenue"),
      pin: "654321",
    });
    fs.writeFileSync(path.join(outDir, "panneau-70x100.png"), png);

    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(8268);
    expect(meta.height).toBe(11811);
  });

  it("garde un titre trop long dans les marges de la pièce", async () => {
    // Un nom d'événement long sortait coupé des deux côtés : la police doit
    // se réduire, puis le texte se tronquer, jamais déborder.
    const format = getVariant("presentoir-qr", "lot-10")!.format;
    const png = await renderGeneratedArtwork(format, {
      joinUrl: "https://usegather.app/join?pin=222222",
      title: "Mariage de Camille Delacroix-Fontaine et Théodore Vandenberghe",
      subtitle: "Table 12 — les copains de la fac de médecine de Montpellier",
      callToAction: defaultCallToAction("presentoir-qr"),
      pin: "222222",
    });
    fs.writeFileSync(path.join(outDir, "presentoir-titre-long.png"), png);

    // Les marges latérales doivent rester vierges : si le texte débordait,
    // on trouverait de l'encre à ras du bord. On balaie les pixels plutôt
    // que de se fier à des statistiques agrégées.
    const meta = await sharp(png).metadata();
    const bandWidth = Math.floor(meta.width! * 0.04);
    for (const left of [0, meta.width! - bandWidth]) {
      const data = await sharp(png)
        .extract({ left, top: 0, width: bandWidth, height: meta.height! })
        .greyscale()
        .raw()
        .toBuffer();
      const inked = [...data].filter((v) => v < 200).length;
      expect(inked).toBe(0);
    }
  });

  it("produit une image non vide et contrastée (le QR est bien dessiné)", async () => {
    const format = getVariant("presentoir-qr", "lot-5")!.format;
    const png = await renderGeneratedArtwork(format, {
      joinUrl: "https://usegather.app/join?pin=111111",
      title: "Test",
      callToAction: null,
      pin: null,
    });
    const stats = await sharp(png).stats();
    // Une page blanche aurait un écart-type nul : le QR doit créer du contraste.
    expect(stats.channels[0].stdev).toBeGreaterThan(10);
  });
});
