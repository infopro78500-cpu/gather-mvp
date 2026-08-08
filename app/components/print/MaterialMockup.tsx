"use client";

// Mockups matière 100 % CSS : la photo du client DEVIENT le produit.
// C'est le contraste entre les cartes qui vend — même photo, sept rendus :
// trame + plis de la toile, reflet du plexi, tranche argentée de l'alu,
// tranche PVC du forex, papier plat du poster, lumière traversante du
// vitrail, plaque debout avec son reflet.
//
// Tout en <span> (valide à l'intérieur d'un <button>), aucun asset externe.
// La racine est pilotée par la largeur du parent (poser dans un wrapper
// w-20 → w-32) ; `landscape` suit l'orientation de la photo du client.

/* eslint-disable @next/next/no-img-element */

interface MockupProps {
  url: string;
  landscape?: boolean;
}

const aspect = (landscape?: boolean) =>
  landscape ? "aspect-[4/3]" : "aspect-[3/4]";

/** POSTER — papier plat : ombre douce, lumière rasante, fin bord clair. */
export function PosterMockup({ url, landscape }: MockupProps) {
  return (
    <span
      className={`relative block ${aspect(landscape)} w-full overflow-hidden rounded-[3px] bg-slate-800 shadow-[0_10px_22px_-8px_rgba(0,0,0,0.85)] ring-1 ring-white/15`}
    >
      <img src={url} alt="" className="h-full w-full object-cover" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/15" />
    </span>
  );
}

/** TOILE CANVAS — trame croisée subtile, bords repliés du châssis, mat. */
export function CanvasMockup({ url, landscape }: MockupProps) {
  return (
    <span
      className={`relative block ${aspect(landscape)} w-full overflow-hidden rounded-[2px] shadow-[0_12px_20px_-10px_rgba(0,0,0,0.8)]`}
    >
      <img
        src={url}
        alt=""
        className="h-full w-full object-cover saturate-[.92] contrast-[.95]"
      />
      {/* trame textile : deux répétitions croisées très discrètes */}
      <span
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 3px)",
        }}
      />
      {/* la photo « tourne » sur les tranches droite et basse du châssis */}
      <span className="pointer-events-none absolute inset-y-0 right-0 w-[8%] bg-gradient-to-r from-transparent via-black/20 to-black/50" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[6%] bg-gradient-to-b from-transparent via-black/20 to-black/50" />
      {/* arêtes du pli */}
      <span className="pointer-events-none absolute inset-y-0 right-[8%] w-px bg-white/20" />
      <span className="pointer-events-none absolute inset-x-0 bottom-[6%] h-px bg-white/15" />
    </span>
  );
}

/** FOREX — panneau mat, tranche PVC 3 mm claire, ombre décollée du mur. */
export function ForexMockup({ url, landscape }: MockupProps) {
  return (
    <span className="relative block w-full pb-[5px]">
      {/* ombre portée : le panneau flotte sur ses fixations */}
      <span className="absolute inset-x-[6%] bottom-0 top-[10%] rounded-[2px] bg-black/60 blur-[7px]" />
      <span
        className={`relative block ${aspect(landscape)} w-full overflow-hidden rounded-t-[2px]`}
      >
        <img src={url} alt="" className="h-full w-full object-cover" />
        <span className="pointer-events-none absolute inset-0 bg-white/[0.02]" />
      </span>
      {/* tranche 3 mm biseautée */}
      <span className="absolute inset-x-0 bottom-0 h-[5px] rounded-b-[2px] bg-gradient-to-b from-slate-100 via-slate-300 to-slate-500" />
    </span>
  );
}

/** ALUMINIUM — coins vifs, photo contrastée, tranche argentée, ombre nette. */
export function DibondMockup({ url, landscape }: MockupProps) {
  return (
    <span className="relative block w-full pb-[4px]">
      <span className="absolute inset-x-[8%] bottom-px top-[15%] bg-black/70 blur-[4px]" />
      <span className={`relative block ${aspect(landscape)} w-full overflow-hidden`}>
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover contrast-110 saturate-110"
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/10" />
      </span>
      {/* tranche alu brossé */}
      <span
        className="absolute inset-x-0 bottom-0 h-[4px]"
        style={{
          background:
            "linear-gradient(90deg, #64748b 0%, #e2e8f0 18%, #94a3b8 40%, #f8fafc 62%, #64748b 100%)",
        }}
      />
    </span>
  );
}

/** PLEXIGLAS — reflet diagonal, coins à peine arrondis, tranche lumineuse. */
export function PlexiMockup({ url, landscape }: MockupProps) {
  return (
    <span
      className={`relative block ${aspect(landscape)} w-full overflow-hidden rounded-md shadow-[0_18px_36px_-12px_rgba(0,0,0,0.9)]`}
    >
      <img src={url} alt="" className="h-full w-full object-cover saturate-110" />
      {/* reflet diagonal du brillant */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.28) 42%, rgba(255,255,255,0.10) 48%, transparent 56%)",
        }}
      />
      {/* liseré : la lumière entre par la tranche du PMMA */}
      <span className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-white/45" />
      <span className="pointer-events-none absolute inset-0 rounded-md shadow-[inset_0_0_6px_rgba(255,255,255,0.25)]" />
    </span>
  );
}

/** VITRAIL — verre devant une fenêtre : lumière derrière, gloss, bord givré. */
export function VitrailMockup({ url, landscape }: MockupProps) {
  return (
    // `isolate` OBLIGATOIRE : confine le mix-blend au mockup (sinon il
    // se mélange avec le fond slate-950 de la modale).
    <span
      className={`relative isolate block ${aspect(landscape)} w-full overflow-hidden rounded-[3px] shadow-[0_14px_30px_-10px_rgba(186,215,247,0.25)]`}
    >
      {/* lumière de fenêtre DERRIÈRE le verre */}
      <span
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 28%, rgba(255,246,220,0.95), rgba(148,163,184,0.35) 75%)",
        }}
      />
      {/* multiply : les sujets restent opaques, les clairs laissent passer la lumière */}
      <img
        src={url}
        alt=""
        className="relative h-full w-full object-cover opacity-80 mix-blend-multiply"
      />
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.35) 30%, transparent 38%)",
        }}
      />
      {/* bord givré */}
      <span className="pointer-events-none absolute inset-0 rounded-[3px] shadow-[inset_0_0_10px_3px_rgba(255,255,255,0.35)]" />
    </span>
  );
}

/** PLAQUE SOUVENIR — petite plaque debout, socle, reflet estompé dessous. */
export function PlaqueMockup({
  url,
  landscape,
  ratio,
}: MockupProps & {
  /** Ratio largeur/hauteur du format réel — sans lui, 2:3 ou 3:2 générique. */
  ratio?: number;
}) {
  return (
    <span className="flex w-full flex-col items-center">
      <span
        className={`relative z-10 block ${ratio ? "w-full" : landscape ? "w-4/5" : "w-3/5"} overflow-hidden rounded-sm shadow-[0_6px_14px_-4px_rgba(0,0,0,0.8)] ring-1 ring-white/40`}
        style={{ aspectRatio: ratio ?? (landscape ? 3 / 2 : 2 / 3) }}
      >
        <img src={url} alt="" className="h-full w-full object-cover" />
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.30) 45%, transparent 52%)",
          }}
        />
      </span>
      {/* socle */}
      <span
        className={`z-10 -mt-px h-[4px] ${ratio ? "w-full" : landscape ? "w-[88%]" : "w-[68%]"} rounded-full bg-gradient-to-b from-slate-400 to-slate-600`}
      />
      {/* reflet vertical : image inversée, fondue par mask */}
      <span
        className={`block aspect-[2/1] ${ratio ? "w-full" : landscape ? "w-4/5" : "w-3/5"} overflow-hidden opacity-40`}
        style={{
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 70%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 70%)",
        }}
      >
        <img
          src={url}
          alt=""
          className="h-full w-full -scale-y-100 object-cover object-bottom"
        />
      </span>
    </span>
  );
}

/** Dispatch par id catalogue (clés stables de lib/print/catalog.ts). */
export default function MaterialMockup({
  productId,
  url,
  landscape,
  ratio,
}: {
  productId: string;
  url: string;
  landscape?: boolean;
  /** Ratio réel du format — utilisé par la plaque posée. */
  ratio?: number;
}) {
  switch (productId) {
    case "canvas":
      return <CanvasMockup url={url} landscape={landscape} />;
    case "forex":
    case "panneau-bienvenue":
      return <ForexMockup url={url} landscape={landscape} />;
    case "dibond":
      return <DibondMockup url={url} landscape={landscape} />;
    case "plexi":
      return <PlexiMockup url={url} landscape={landscape} />;
    case "vitrail":
      return <VitrailMockup url={url} landscape={landscape} />;
    case "plaque-souvenir":
      return <PlaqueMockup url={url} landscape={landscape} ratio={ratio} />;
    default:
      return <PosterMockup url={url} landscape={landscape} />;
  }
}
