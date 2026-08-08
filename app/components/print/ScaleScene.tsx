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
// La variante « window » remplace le canapé par une fenêtre à la française :
// le vitrail se vend « à poser devant une fenêtre », le mettre au-dessus d'un
// canapé contredirait la carte que le client vient de choisir.

const SCENE_W_CM = 360;
const SCENE_H_CM = 240;
const FLOOR_CM = 12; // bande de sol au bas de la scène
const SOFA_W_CM = 180;
const EYE_LEVEL_CM = 145; // centre du tirage au-dessus du sol
const WINDOW_W_CM = 110;
const WINDOW_H_CM = 160;
const WINDOW_SILL_CM = 40; // hauteur d'allège sous la fenêtre

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
  const window_ = variant === "window";
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-slate-800"
      style={{ aspectRatio: `${SCENE_W_CM} / ${SCENE_H_CM}` }}
    >
      {/* mur : dégradé discret + halo de lumière, lisible sur slate-950 */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% 18%, rgba(248,250,252,0.07), transparent 70%)",
        }}
      />
      {/* sol / plinthe */}
      <div
        className="absolute inset-x-0 bottom-0 border-t border-slate-700/60 bg-slate-950/60"
        style={{ height: `${(FLOOR_CM / SCENE_H_CM) * 100}%` }}
      />

      {window_ && (
        // Fenêtre à la française, la lumière du jour derrière le vitrail.
        <div
          className="absolute left-1/2 -translate-x-1/2 overflow-hidden rounded-[3px] border-4 border-slate-600 bg-slate-700"
          style={{
            width: `${(WINDOW_W_CM / SCENE_W_CM) * 100}%`,
            height: `${(WINDOW_H_CM / SCENE_H_CM) * 100}%`,
            bottom: `${((FLOOR_CM + WINDOW_SILL_CM) / SCENE_H_CM) * 100}%`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 80% at 50% 30%, rgba(255,246,220,0.85), rgba(148,163,184,0.35) 80%)",
            }}
          />
          {/* croisillons des deux battants */}
          <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-slate-600" />
          <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-slate-600/80" />
        </div>
      )}

      {/* LE tirage, aux cm réels, centré à hauteur d'yeux */}
      <div
        className="absolute left-1/2 -translate-x-1/2 overflow-hidden rounded-[2px] shadow-[0_10px_25px_-8px_rgba(0,0,0,0.8)] ring-1 ring-white/25"
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
          // Reflet de verre : le vitrail est une plaque brillante devant la lumière.
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.28) 35%, transparent 45%)",
            }}
          />
        )}
      </div>

      {!window_ && (
        // canapé 180 cm — dessiné après le tirage : il passe devant
        <svg
          viewBox="0 0 180 78"
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 text-slate-700"
          style={{
            width: `${(SOFA_W_CM / SCENE_W_CM) * 100}%`,
            bottom: `${(FLOOR_CM / SCENE_H_CM) * 100}%`,
          }}
        >
          <rect x="14" y="0" width="152" height="36" rx="9" fill="currentColor" />
          <rect x="2" y="26" width="176" height="34" rx="9" fill="currentColor" />
          <rect x="0" y="14" width="22" height="48" rx="9" fill="currentColor" />
          <rect x="158" y="14" width="22" height="48" rx="9" fill="currentColor" />
          <rect x="16" y="60" width="10" height="18" rx="2" fill="currentColor" />
          <rect x="154" y="60" width="10" height="18" rx="2" fill="currentColor" />
          <line x1="90" y1="30" x2="90" y2="56" stroke="rgba(2,6,23,0.5)" strokeWidth="2" />
        </svg>
      )}

      {/* la cote, en chip : lisible même quand le tirage fait 18 px */}
      <span className="absolute left-2 top-2 rounded-md bg-slate-950/75 px-2 py-1 text-xs font-bold tabular-nums text-amber-400">
        {widthCm} × {heightCm} cm
      </span>
      <span className="absolute bottom-1.5 right-2 text-[10px] font-medium text-slate-400">
        {window_ ? "devant une fenêtre — à l'échelle" : "canapé 180 cm — à l'échelle"}
      </span>
    </div>
  );
}
