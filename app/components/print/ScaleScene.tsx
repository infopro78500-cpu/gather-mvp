"use client";

// Scène d'échelle : le tirage aux centimètres réels, sur un mur, à côté d'un
// canapé de 180 cm — la référence que tout le monde connaît. C'est l'effet
// « RoomView » de WhiteWall en 3 Ko de SVG : un 20×30 paraît minuscule, un
// 100×150 domine le mur, et personne n'a plus à visualiser « 12× d'écart de
// surface » depuis un libellé en cm.
//
// Le conteneur représente un mur de 360 × 240 cm : la conversion se réduit à
// largeur CSS (%) = widthCm / 360 × 100, la hauteur suit d'elle-même par
// l'aspect-ratio du conteneur et celui du tirage. Le centre du tirage est
// accroché à hauteur d'yeux (145 cm au-dessus du sol) — la règle réelle des
// accrocheurs de galerie ; les très grands formats descendent légèrement
// derrière le canapé, dessiné après eux dans le DOM, comme dans un salon.
//
// Direction artistique : intérieur scandinave clair et chaud — mur greige,
// sol chêne, lumière du jour douce. Tout le décor vit dans un couloir
// chromatique sable désaturé : la photo du client, plus saturée et plus
// contrastée, est mécaniquement l'élément le plus riche de la scène, et un
// halo discret derrière le tirage guide l'œil. Dans la modale slate-950, la
// carte claire attire le regard comme un polaroid posé sur une table noire.
//
// La variante « window » remplace le salon par une fenêtre à la française
// (chêne clair, ciel doux, voilage) : le vitrail se vend « à poser devant une
// fenêtre », le mettre au-dessus d'un canapé contredirait la carte que le
// client vient de choisir. Il est suspendu par deux câbles devant les
// carreaux, la lumière du ciel le traverse.

const SCENE_W_CM = 360;
const SCENE_H_CM = 240;
const FLOOR_CM = 12; // bande de sol au bas de la scène
const SOFA_W_CM = 180;
const EYE_LEVEL_CM = 145; // centre du tirage au-dessus du sol
// Décor de la variante « wall » — tout est en cm réels, comme le tirage.
const PLINTH_CM = 10; // plinthe au-dessus de la ligne de sol
const RUG_W_CM = 210; // tapis : déborde de 15 cm de chaque côté du canapé
const PLANT_W_CM = 56;
const PLANT_H_CM = 140; // plante en pot, feuillage compris
// Variante « window ».
const WINDOW_W_CM = 110;
const WINDOW_H_CM = 160;
const WINDOW_SILL_CM = 40; // hauteur d'allège sous la fenêtre
const GLAZING_INSET = "3.1% 4.5%"; // dormant 5 cm : 5/160 et 5/110
const SILL_LEDGE_CM = 4; // épaisseur de l'appui de fenêtre
const SILL_OVERHANG_CM = 5; // débord de l'appui de chaque côté
const CURTAIN_W_CM = 38; // voilage léger, côté gauche

export default function ScaleScene({
  url,
  widthCm,
  heightCm,
  variant = "wall",
}: {
  url: string;
  /** Dimensions déjà orientées comme la photo (paysage ou portrait). */
  widthCm: number;
  heightCm: number;
  variant?: "wall" | "window";
}) {
  const printBottomCm = Math.max(FLOOR_CM + 2, FLOOR_CM + EYE_LEVEL_CM - heightCm / 2);
  const printTopCm = printBottomCm + heightCm;
  const printCenterCm = printBottomCm + heightCm / 2;
  const window_ = variant === "window";
  const windowBottomCm = FLOOR_CM + WINDOW_SILL_CM; // 52 cm
  const windowTopCm = windowBottomCm + WINDOW_H_CM; // 212 cm
  // Câbles de suspension : du haut de la fenêtre au haut du tirage. Les très
  // grands formats dépassent le haut de la fenêtre — les câbles disparaissent.
  const wireHeightCm = Math.max(0, windowTopCm - printTopCm);
  const wireOffsetPct = ((widthCm * 0.3) / SCENE_W_CM) * 100;
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-[#B7A88E]/40 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]"
      style={{ aspectRatio: `${SCENE_W_CM} / ${SCENE_H_CM}` }}
    >
      {/* ── la pièce, commune aux deux variantes ── */}
      {/* mur greige chaud : lumière du jour depuis le haut-gauche,
          rai diagonal doux, léger assombrissement du coin bas-droit */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "linear-gradient(104deg, rgba(255,248,232,0) 30%, rgba(255,248,232,0.32) 45%, rgba(255,248,232,0) 60%)",
            "radial-gradient(ellipse 130% 95% at 16% 0%, rgba(255,250,240,0.5), transparent 62%)",
            "radial-gradient(ellipse 95% 75% at 92% 100%, rgba(135,110,80,0.16), transparent 60%)",
            "linear-gradient(180deg, #F2EBDF 0%, #E8DDCB 60%, #DDD0BC 100%)",
          ].join(", "),
        }}
      />
      {/* halo discret derrière le tirage : guide le regard vers le produit */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 44% 38% at 50% ${(
            ((SCENE_H_CM - printCenterCm) / SCENE_H_CM) * 100
          ).toFixed(2)}%, rgba(255,252,243,0.9), rgba(255,252,243,0) 70%)`,
        }}
      />
      {/* sol chêne : lattes de 45 cm (12,5 % de 360) + ombre de contact au mur */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: `${(FLOOR_CM / SCENE_H_CM) * 100}%`,
          background: [
            "linear-gradient(180deg, rgba(96,72,45,0.38) 0%, rgba(96,72,45,0) 55%)",
            "repeating-linear-gradient(90deg, rgba(101,74,45,0) 0, rgba(101,74,45,0) calc(12.5% - 1px), rgba(101,74,45,0.4) calc(12.5% - 1px), rgba(101,74,45,0.4) 12.5%)",
            "linear-gradient(90deg, #C9A478 0%, #BD9566 50%, #C6A074 100%)",
          ].join(", "),
        }}
      />
      {/* plinthe de 10 cm, posée sur la ligne de sol */}
      <div
        className="absolute inset-x-0"
        style={{
          bottom: `${(FLOOR_CM / SCENE_H_CM) * 100}%`,
          height: `${(PLINTH_CM / SCENE_H_CM) * 100}%`,
          background: "linear-gradient(180deg, #F7F1E6 0%, #EAE2CF 100%)",
          boxShadow: "0 1px 3px rgba(96,72,45,0.35)",
        }}
      />

      {!window_ && (
        // tapis vu de face, sous le canapé (dessiné avant tirage et canapé)
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: `${(RUG_W_CM / SCENE_W_CM) * 100}%`,
            height: "3.8%",
            bottom: "0.7%",
            background: "linear-gradient(180deg, #EDE2CB 0%, #D9CBAE 100%)",
            boxShadow:
              "0 2px 5px rgba(93,71,48,0.35), inset 0 -2px 4px rgba(120,95,65,0.22)",
          }}
        />
      )}

      {window_ && (
        <>
          {/* fenêtre à la française : dormant chêne clair, ciel doux derrière */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-[3px]"
            style={{
              width: `${(WINDOW_W_CM / SCENE_W_CM) * 100}%`,
              height: `${(WINDOW_H_CM / SCENE_H_CM) * 100}%`,
              bottom: `${(windowBottomCm / SCENE_H_CM) * 100}%`,
              background: "linear-gradient(165deg, #CBAE83 0%, #B08F63 100%)",
              boxShadow: "0 3px 12px rgba(92,72,48,0.2)",
            }}
          >
            {/* vitrage : ciel bleu doux → lumière dorée d'horizon */}
            <div
              className="absolute overflow-hidden rounded-[2px]"
              style={{
                inset: GLAZING_INSET,
                background:
                  "radial-gradient(ellipse 130% 45% at 50% 92%, rgba(255,222,160,0.8), transparent 65%), linear-gradient(to bottom, #A9C8E2 0%, #C7DCEC 45%, #EBE2C6 75%, #F6D8A3 100%)",
                boxShadow: "inset 0 4px 12px rgba(75,58,38,0.3)",
              }}
            />
            {/* meneau central des deux battants (≈ 4 cm) */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: "3.1%",
                bottom: "3.1%",
                width: "3.6%",
                background:
                  "linear-gradient(90deg, #BEA173 0%, #A9895B 55%, #BEA173 100%)",
              }}
            />
            {/* petits bois : 6 carreaux au total */}
            <div
              className="absolute"
              style={{ left: "4.5%", right: "4.5%", top: "35%", height: "1.25%", background: "#B29169" }}
            />
            <div
              className="absolute"
              style={{ left: "4.5%", right: "4.5%", top: "64%", height: "1.25%", background: "#B29169" }}
            />
          </div>

          {/* appui de fenêtre, léger débord */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-[1px]"
            style={{
              width: `${((WINDOW_W_CM + 2 * SILL_OVERHANG_CM) / SCENE_W_CM) * 100}%`,
              height: `${(SILL_LEDGE_CM / SCENE_H_CM) * 100}%`,
              bottom: `${((windowBottomCm - SILL_LEDGE_CM) / SCENE_H_CM) * 100}%`,
              background: "linear-gradient(to bottom, #F1E9DA 0%, #D8CBB1 100%)",
              boxShadow: "0 4px 8px rgba(92,72,48,0.28)",
            }}
          />

          {/* voilage léger, côté gauche, jusqu'au sol */}
          <div
            className="absolute"
            style={{
              left: `${(((SCENE_W_CM - WINDOW_W_CM) / 2 - 7) / SCENE_W_CM) * 100}%`,
              bottom: `${(FLOOR_CM / SCENE_H_CM) * 100}%`,
              width: `${(CURTAIN_W_CM / SCENE_W_CM) * 100}%`,
              height: `${((windowTopCm + 10 - FLOOR_CM) / SCENE_H_CM) * 100}%`,
              background:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(235,226,209,0.32) 11%, rgba(255,255,255,0.6) 22%), linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0.24))",
              backdropFilter: "blur(1.5px)",
              WebkitBackdropFilter: "blur(1.5px)",
              borderRadius: "0 0 2px 2px",
              boxShadow: "inset -2px 0 4px rgba(92,72,48,0.06)",
            }}
          />

          {/* câbles de suspension du vitrail */}
          {wireHeightCm > 0 && (
            <>
              <div
                className="absolute w-px"
                style={{
                  left: `calc(50% - ${wireOffsetPct}%)`,
                  bottom: `${(printTopCm / SCENE_H_CM) * 100}%`,
                  height: `${(wireHeightCm / SCENE_H_CM) * 100}%`,
                  background:
                    "linear-gradient(to bottom, rgba(122,101,72,0.15), rgba(122,101,72,0.55))",
                }}
              />
              <div
                className="absolute w-px"
                style={{
                  left: `calc(50% + ${wireOffsetPct}%)`,
                  bottom: `${(printTopCm / SCENE_H_CM) * 100}%`,
                  height: `${(wireHeightCm / SCENE_H_CM) * 100}%`,
                  background:
                    "linear-gradient(to bottom, rgba(122,101,72,0.15), rgba(122,101,72,0.55))",
                }}
              />
            </>
          )}
        </>
      )}

      {/* LE tirage, aux cm réels, centré à hauteur d'yeux — bord franc,
          ombre chaude et douce sur mur clair (jamais de noir pur) */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 overflow-hidden rounded-[2px] ${
          window_
            ? "shadow-[0_16px_32px_-12px_rgba(80,60,35,0.5)] ring-1 ring-white/60"
            : "shadow-[0_16px_34px_-12px_rgba(88,66,42,0.55),0_5px_12px_-5px_rgba(88,66,42,0.4)] ring-1 ring-[#5E4A32]/15"
        }`}
        style={{
          width: `${(widthCm / SCENE_W_CM) * 100}%`,
          aspectRatio: `${widthCm} / ${heightCm}`,
          bottom: `${(printBottomCm / SCENE_H_CM) * 100}%`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className={`h-full w-full object-cover ${window_ ? "opacity-90" : ""}`}
        />
        {window_ && (
          <>
            {/* la lumière du ciel traverse la plaque */}
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 85% 60% at 50% 25%, rgba(255,246,219,0.3), transparent 65%)",
              }}
            />
            {/* reflet de verre : plaque brillante devant la lumière */}
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(105deg, transparent 22%, rgba(255,255,255,0.32) 32%, transparent 42%, transparent 58%, rgba(255,255,255,0.14) 66%, transparent 74%)",
              }}
            />
          </>
        )}
      </div>

      {!window_ && (
        <>
          {/* canapé 180 cm — dessiné après le tirage : il passe devant.
              viewBox en cm réels ; les 4 unités sous les pieds (y 86→90)
              portent l'ombre au sol, d'où le bottom décalé de 4 cm pour que
              les pieds touchent exactement la ligne de sol. */}
          <svg
            viewBox="0 0 180 90"
            aria-hidden="true"
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              width: `${(SOFA_W_CM / SCENE_W_CM) * 100}%`,
              bottom: `${((FLOOR_CM - 4) / SCENE_H_CM) * 100}%`,
            }}
          >
            <defs>
              <linearGradient id="usg-sofa-frame" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#C8B190" />
                <stop offset="1" stopColor="#B0966F" />
              </linearGradient>
              <linearGradient id="usg-sofa-back" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#E0CDAF" />
                <stop offset="1" stopColor="#CDB795" />
              </linearGradient>
              <linearGradient id="usg-sofa-seat" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#EDDFC7" />
                <stop offset="1" stopColor="#D9C5A4" />
              </linearGradient>
              <linearGradient id="usg-sofa-leg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#A97C50" />
                <stop offset="1" stopColor="#8A6140" />
              </linearGradient>
              <radialGradient id="usg-sofa-shadow">
                <stop offset="0" stopColor="#5D462E" stopOpacity="0.38" />
                <stop offset="1" stopColor="#5D462E" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* ombre au sol, puis dossier, coussins deux tons, structure,
                accoudoirs arrondis et pieds bois fuselés */}
            <ellipse cx="90" cy="86" rx="82" ry="3.4" fill="url(#usg-sofa-shadow)" />
            <rect x="12" y="8" width="156" height="54" rx="10" fill="#B79C77" />
            <rect x="21" y="12" width="67" height="38" rx="8" fill="url(#usg-sofa-back)" />
            <rect x="92" y="12" width="67" height="38" rx="8" fill="url(#usg-sofa-back)" />
            <rect x="6" y="60" width="168" height="13" rx="6" fill="url(#usg-sofa-frame)" />
            <rect x="20" y="44" width="68" height="18" rx="7" fill="url(#usg-sofa-seat)" />
            <rect x="92" y="44" width="68" height="18" rx="7" fill="url(#usg-sofa-seat)" />
            <rect x="0" y="28" width="21" height="45" rx="9" fill="url(#usg-sofa-frame)" />
            <rect x="159" y="28" width="21" height="45" rx="9" fill="url(#usg-sofa-frame)" />
            <path d="M20 73 L27 73 L25.2 86 L21.8 86 Z" fill="url(#usg-sofa-leg)" />
            <path d="M62 73 L68 73 L66.6 86 L63.4 86 Z" fill="url(#usg-sofa-leg)" opacity="0.85" />
            <path d="M112 73 L118 73 L116.6 86 L113.4 86 Z" fill="url(#usg-sofa-leg)" opacity="0.85" />
            <path d="M153 73 L160 73 L158.2 86 L154.8 86 Z" fill="url(#usg-sofa-leg)" />
          </svg>

          {/* plante en pot ~140 cm : respiration à gauche et 2e référence
              d'échelle ; feuillage en lames d'ellipses pivotées autour du
              col du pot, deux verts sauge + un vert clair côté lumière. */}
          <svg
            viewBox={`0 0 ${PLANT_W_CM} ${PLANT_H_CM}`}
            aria-hidden="true"
            className="absolute"
            style={{
              left: "6%",
              width: `${(PLANT_W_CM / SCENE_W_CM) * 100}%`,
              bottom: `${((FLOOR_CM - 2) / SCENE_H_CM) * 100}%`,
            }}
          >
            <defs>
              <linearGradient id="usg-plant-pot" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#CE9A70" />
                <stop offset="1" stopColor="#A06D46" />
              </linearGradient>
              <radialGradient id="usg-plant-shadow">
                <stop offset="0" stopColor="#5D462E" stopOpacity="0.32" />
                <stop offset="1" stopColor="#5D462E" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="28" cy="138" rx="20" ry="2.4" fill="url(#usg-plant-shadow)" />
            <ellipse cx="28" cy="62" rx="4" ry="44" transform="rotate(-17 28 106)" fill="#6C8663" />
            <ellipse cx="28" cy="62" rx="4" ry="44" transform="rotate(17 28 106)" fill="#6C8663" />
            <ellipse cx="28" cy="56" rx="4.5" ry="50" transform="rotate(-8 28 106)" fill="#7E9878" />
            <ellipse cx="28" cy="56" rx="4.5" ry="50" transform="rotate(8 28 106)" fill="#8CA684" />
            <ellipse cx="28" cy="54" rx="5" ry="52" fill="#8CA684" />
            <path
              d="M14 106 H42 L39.4 136 Q39.1 139 36 139 H20 Q16.9 139 16.6 136 Z"
              fill="url(#usg-plant-pot)"
            />
            <rect x="12.5" y="103" width="31" height="6" rx="3" fill="#D5A276" />
          </svg>
        </>
      )}

      {/* la cote, en chip : lisible même quand le tirage fait 18 px */}
      <span className="absolute left-2 top-2 rounded-md bg-stone-900/80 px-2 py-1 text-xs font-bold tabular-nums text-amber-300 shadow-sm">
        {widthCm} × {heightCm} cm
      </span>
      <span className="absolute bottom-1 right-2 rounded bg-[#F7F1E6]/85 px-1.5 py-0.5 text-[10px] font-medium text-[#5B4936]">
        {window_ ? "devant une fenêtre — à l'échelle" : "canapé 180 cm — à l'échelle"}
      </span>
    </div>
  );
}
