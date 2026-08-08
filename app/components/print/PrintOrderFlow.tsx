"use client";

// Tunnel de commande d'impression — le parcours client, de la sélection dans
// la galerie jusqu'à la commande partie à l'atelier.
//
// Quatre étapes, jamais plus : support → format → coordonnées → confirmation.
// Le panier est fusionné dans l'étape format (le récapitulatif est toujours
// visible en bas) : sur un mariage, l'invité commande deux ou trois photos
// depuis son téléphone, une étape de plus le ferait abandonner.
//
// Le choix se fait avec les yeux, pas avec du texte : à l'étape support la
// photo du client est rendue DANS chaque matière (MaterialMockup), à l'étape
// format les tailles sont à l'échelle les unes des autres et le format choisi
// s'affiche aux centimètres réels sur un mur avec un canapé de référence
// (ScaleScene — variante fenêtre pour le vitrail, posé pour la plaque).
// Personne ne visualise « 12× d'écart de surface » depuis un libellé en cm.
//
// ⚠️ Le paiement n'est pas branché : la commande part directement en file.
// Stripe s'insère entre « coordonnées » et l'appel à /api/print/order, sans
// rien réécrire — c'est une insertion, pas une refonte. La règle actée reste
// qu'on ne produit jamais sans avoir encaissé (cf. gamme-produits §10).

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  PRINT_PRODUCTS,
  getVariant,
  orderTotalCents,
  requiresCoffrePhoto,
  resolutionBadge,
  volumeDiscountPercent,
  type PrintFormat,
  type PrintProduct,
} from "@/lib/print/catalog";
import MaterialMockup from "./MaterialMockup";
import ScaleScene from "./ScaleScene";

export interface PrintablePhoto {
  /** Chemin storage dans le coffre — ce que l'API attend. */
  path: string;
  /** URL signée pour l'aperçu. */
  url: string;
  pxWidth?: number | null;
  pxHeight?: number | null;
}

interface Props {
  eventId: string;
  photos: PrintablePhoto[];
  onClose: () => void;
}

type Step = "support" | "format" | "coordonnees" | "confirmation";

const STEPS: Step[] = ["support", "format", "coordonnees"];

/** « 129 € », pas « 129,00 € » — mais « 14,90 € » garde ses centimes. */
const euros = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }) + " €";

/** Ordre de vente : entrée de gamme d'abord, les objets à poser en fin. */
const DISPLAY_ORDER = [
  "poster",
  "canvas",
  "forex",
  "dibond",
  "plexi",
  "vitrail",
  "plaque-souvenir",
];

/** Les produits commandables depuis la galerie : ceux qui naissent d'une photo. */
const PHOTO_PRODUCTS = PRINT_PRODUCTS.filter(requiresCoffrePhoto)
  .slice()
  .sort((a, b) => {
    const rank = (id: string) => {
      const i = DISPLAY_ORDER.indexOf(id);
      return i === -1 ? DISPLAY_ORDER.length : i;
    };
    return rank(a.id) - rank(b.id);
  });

// Le catalogue parle usine (« PVC expansé 3 mm, impression UV directe ») ;
// ici on parle au client — la spec matière reste visible en seconde ligne.
const TAGLINES: Record<string, string> = {
  poster: "Le classique à encadrer",
  canvas: "L'esprit tableau, toile tendue sur cadre bois",
  forex: "Léger et rigide, s'accroche partout",
  dibond: "L'aluminium, finition galerie",
  plexi: "Brillant, profond — les couleurs claquent",
  vitrail: "Fond transparent, à poser devant une fenêtre",
  "plaque-souvenir": "La petite plaque à poser, souvenir à offrir",
};

/** Dimensions du format orientées comme la photo du client. */
function orient(f: PrintFormat, landscape: boolean) {
  const long = Math.max(f.widthCm, f.heightCm);
  const short = Math.min(f.widthCm, f.heightCm);
  return landscape ? { w: long, h: short } : { w: short, h: long };
}

export default function PrintOrderFlow({ eventId, photos: input, onClose }: Props) {
  // Dimensions réelles des photos : la galerie ne les connaît pas, on les lit
  // depuis les images elles-mêmes. Sans ça le badge de résolution serait
  // décoratif — il ne bloquerait aucun format trop grand pour la photo.
  const [measured, setMeasured] = useState<Record<string, { w: number; h: number }>>({});
  const [errored, setErrored] = useState<Set<string>>(new Set());
  // Refs de skip : l'effet ne dépend que de `input`, or le parent recrée le
  // tableau à chaque render et la galerie se rafraîchit toutes les 8 s —
  // sans elles, chaque tick relancerait la mesure de photos déjà mesurées.
  const measuredRef = useRef(measured);
  measuredRef.current = measured;
  const erroredRef = useRef(errored);
  erroredRef.current = errored;
  useEffect(() => {
    let cancelled = false;
    for (const photo of input) {
      if (photo.pxWidth && photo.pxHeight) continue;
      if (measuredRef.current[photo.path] || erroredRef.current.has(photo.path)) continue;
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        setMeasured((m) => ({
          ...m,
          [photo.path]: { w: img.naturalWidth, h: img.naturalHeight },
        }));
      };
      img.onerror = () => {
        if (cancelled) return;
        setErrored((s) => new Set(s).add(photo.path));
      };
      img.src = photo.url;
    }
    return () => {
      cancelled = true;
    };
  }, [input]);

  // Une photo peut être retirée de la commande sans quitter le tunnel : sur
  // une sélection mixte, une seule photo trop petite bloquerait sinon tous
  // les formats pour tout le monde, sans issue.
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  // Photos pointées du doigt quand l'utilisateur touche un format bloqué :
  // « retirez-la » ne sert à rien s'il ne sait pas laquelle.
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const stripRef = useRef<HTMLDivElement | null>(null);

  const photos = useMemo(
    () =>
      input
        .filter((p) => !excluded.has(p.path))
        .map((p) => ({
          ...p,
          pxWidth: p.pxWidth ?? measured[p.path]?.w ?? null,
          pxHeight: p.pxHeight ?? measured[p.path]?.h ?? null,
        })),
    [input, measured, excluded]
  );

  const [step, setStep] = useState<Step>("support");
  const [product, setProduct] = useState<PrintProduct | null>(null);
  const [formatId, setFormatId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [line1, setLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [refCopied, setRefCopied] = useState(false);

  const first = photos[0] ?? null;
  const landscape =
    !!first?.pxWidth && !!first?.pxHeight && first.pxWidth > first.pxHeight;
  // Sélection mixte portrait + paysage : on ne peut pas promettre UN sens.
  // Les libellés repassent en convention portrait et on l'explique — chaque
  // photo sera tirée dans son sens à l'atelier.
  const mixed = photos.some(
    (p) =>
      p.pxWidth &&
      p.pxHeight &&
      p.pxWidth !== p.pxHeight &&
      (p.pxWidth > p.pxHeight) !== landscape
  );
  const effLandscape = mixed ? false : landscape;

  // Tant qu'une photo n'est pas mesurée, le verdict qualité est optimiste par
  // défaut — on le dit, et on retient « Continuer » le temps de l'analyse.
  const measuring = photos.some(
    (p) => (!p.pxWidth || !p.pxHeight) && !errored.has(p.path)
  );

  const format = product && formatId ? getVariant(product.id, formatId)?.format ?? null : null;
  const fmtO = format ? orient(format, effLandscape) : null;

  // Une pièce par photo sélectionnée, toutes dans le même produit/format :
  // c'est le cas réel (« je veux ces 3 photos en 30×40 »), et ça garde le
  // tunnel à quatre écrans.
  const pieces = useMemo(
    () =>
      product && formatId
        ? photos.map(() => ({ productId: product.id, formatId }))
        : [],
    [product, formatId, photos]
  );

  const total = pieces.length ? orderTotalCents(pieces) : null;
  const fullPrice = format ? format.priceCents * photos.length : 0;
  // Toujours dériver la remise affichée du delta réel : les produits
  // signature en sont exclus par orderTotalCents, afficher le pourcentage
  // théorique promettrait « −10 % » pour −0,00 €.
  const discountCents = total !== null ? fullPrice - total : 0;

  // Combien de photos seront recadrées pour remplir le format choisi (chaque
  // photo est comparée dans son meilleur sens, comme le fait l'atelier).
  const cropCount = format
    ? photos.filter((p) => {
        if (!p.pxWidth || !p.pxHeight) return false;
        const r = Math.max(p.pxWidth, p.pxHeight) / Math.min(p.pxWidth, p.pxHeight);
        const fr =
          Math.max(format.widthCm, format.heightCm) /
          Math.min(format.widthCm, format.heightCm);
        return Math.abs(r - fr) > 0.02;
      }).length
    : 0;

  /**
   * Verdict de la sélection pour un format : le pire des badges, COMBIEN de
   * photos posent problème, et combien n'ont pas pu être vérifiées (mesure en
   * échec) — une photo invérifiée ne doit jamais s'afficher « optimale ».
   */
  const verdict = useCallback(
    (f: PrintFormat) => {
      let worst: "ok" | "acceptable" | "insufficient" = "ok";
      let tooSmall = 0;
      let unknown = 0;
      for (const photo of photos) {
        if (!photo.pxWidth || !photo.pxHeight) {
          if (errored.has(photo.path)) unknown += 1;
          continue;
        }
        const b = resolutionBadge(photo.pxWidth, photo.pxHeight, f);
        if (b === "insufficient") {
          tooSmall += 1;
          worst = "insufficient";
        } else if (b === "acceptable" && worst !== "insufficient") {
          worst = "acceptable";
        }
      }
      return { badge: worst, tooSmall, unknown };
    },
    [photos, errored]
  );

  // Un format est présélectionné en arrivant sur l'étape (l'aperçu à
  // l'échelle vit tout de suite), et la sélection se replie sur le premier
  // format possible si une photo rétablie ou une mesure tardive vient de
  // bloquer le format choisi — y compris à l'étape coordonnées, d'où on
  // ramène l'utilisateur là où il peut voir pourquoi et corriger.
  useEffect(() => {
    if ((step !== "format" && step !== "coordonnees") || !product) return;
    const ok = (f: PrintFormat) => verdict(f).badge !== "insufficient";
    if (formatId) {
      const current = product.formats.find((f) => f.id === formatId);
      if (current && ok(current)) return;
    }
    const firstOk = product.formats.find(ok);
    setFormatId(firstOk ? firstOk.id : null);
    if (step === "coordonnees") setStep("format");
  }, [step, product, formatId, verdict]);

  const submit = async () => {
    if (!product || !formatId || photos.length === 0) return;
    // Filet de sécurité : le repli d'effet couvre déjà ce cas, mais une
    // commande inimprimable ne doit avoir AUCUN chemin vers l'atelier.
    if (format && verdict(format).badge === "insufficient") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/print/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          customerName: name.trim(),
          customerEmail: email.trim(),
          shippingAddress: { line1, postalCode, city, country: "FR" },
          pieces: photos.map((p) => ({
            sourcePath: p.path,
            productId: product.id,
            formatId,
            pxWidth: p.pxWidth ?? undefined,
            pxHeight: p.pxHeight ?? undefined,
          })),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        orderRef?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok || !body.success) {
        throw new Error(
          body.message ||
            (body.error === "PRINT_DISABLED"
              ? "L'impression n'est pas encore ouverte."
              : body.error === "INVALID_CUSTOMER"
                ? "Vérifiez l'email et les coordonnées saisies."
                : "La commande n'a pas pu être enregistrée.")
        );
      }
      setOrderRef(body.orderRef ?? null);
      setStep("confirmation");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Même règle que le serveur (route /api/print/order) : une divergence ferait
  // passer le client puis rejetterait au submit avec un message générique.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const postalOk = /^\d{5}$/.test(postalCode.trim());

  // Fermer depuis l'étape coordonnées avec des champs remplis perdrait tout :
  // on demande. Partout ailleurs, la croix ferme sans cérémonie.
  const requestClose = () => {
    const dirty =
      step === "coordonnees" &&
      [name, email, line1, postalCode, city].some((v) => v.trim() !== "");
    if (dirty && !window.confirm("Abandonner la commande en cours ?")) return;
    onClose();
  };
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  // La modale est un vrai dialogue : focus dedans, Échap ferme, Tab boucle.
  const sheetRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    sheetRef.current?.focus();
  }, [step]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        requestCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const root = sheetRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (active && !root.contains(active)) {
        e.preventDefault();
        firstEl.focus();
      } else if (e.shiftKey && (active === firstEl || active === root)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  const card =
    "rounded-xl border border-slate-700 bg-slate-900 transition-all duration-150";
  const primary =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed";
  const ghost =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800";
  const field =
    "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500";

  const stepIndex = STEPS.indexOf(step as (typeof STEPS)[number]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 animate-[fadeIn_0.2s_ease-out] sm:items-center">
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-flow-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-800 bg-slate-950 text-slate-100 outline-none animate-[sheetUp_0.28s_ease-out] sm:rounded-3xl"
      >
        {/* Poignée du bottom sheet, mobile uniquement */}
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-700 sm:hidden" />

        {/* En-tête */}
        <div className="border-b border-slate-800 p-4 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p id="print-flow-title" className="font-semibold">
                {step === "confirmation"
                  ? "Commande envoyée"
                  : `Imprimer ${photos.length} photo${photos.length > 1 ? "s" : ""}`}
              </p>
              {step !== "confirmation" && (
                <p className="text-xs text-slate-400">
                  {step === "support"
                    ? "Étape 1/3 · Choisissez le support"
                    : step === "format"
                      ? `Étape 2/3 · ${product?.label ?? ""} — choisissez la taille`
                      : "Étape 3/3 · Livraison"}
                </p>
              )}
            </div>
            <button
              onClick={requestClose}
              aria-label="Fermer"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-900"
            >
              ✕
            </button>
          </div>
          {step !== "confirmation" && (
            <div className="mt-3 flex gap-1.5">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    stepIndex >= i ? "bg-amber-500" : "bg-slate-800"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Les photos choisies, toujours visibles : on imprime CES photos-là. */}
          {step !== "confirmation" && photos.length > 0 && (
            <div ref={stripRef} className="mb-1 flex gap-2 overflow-x-auto pb-1">
              {photos.map((p) => (
                <span key={p.path} className="relative shrink-0 pt-1.5 pr-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt=""
                    className={`h-16 w-16 rounded-lg border object-cover ${
                      flagged.has(p.path)
                        ? "border-red-500 ring-2 ring-red-500"
                        : "border-slate-700"
                    }`}
                  />
                  {photos.length > 1 && (
                    <button
                      onClick={() => setExcluded((s) => new Set(s).add(p.path))}
                      aria-label="Retirer cette photo de la commande"
                      title="Retirer de la commande"
                      className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {step !== "confirmation" && excluded.size > 0 && photos.length > 0 && (
            <button
              onClick={() => setExcluded(new Set())}
              className="mb-2 text-xs text-amber-400 underline underline-offset-2"
            >
              {excluded.size} photo{excluded.size > 1 ? "s" : ""} retirée
              {excluded.size > 1 ? "s" : ""} — tout rétablir
            </button>
          )}

          {photos.length === 0 && step !== "confirmation" ? (
            <div className="space-y-4 py-10 text-center">
              <p className="text-sm text-slate-400">
                Toutes les photos ont été retirées de la commande.
              </p>
              <button onClick={() => setExcluded(new Set())} className={ghost}>
                Rétablir les photos
              </button>
            </div>
          ) : (
            <>
              {/* ---- Étape 1 : le support ---- */}
              {step === "support" && first && (
                <div key="support" className="animate-[stepIn_0.22s_ease-out]">
                  <div className="grid grid-cols-2 gap-3">
                    {PHOTO_PRODUCTS.map((p) => {
                      const from = Math.min(...p.formats.map((f) => f.priceCents));
                      const mockW =
                        p.id === "plaque-souvenir"
                          ? "w-24"
                          : landscape
                            ? "w-28"
                            : "w-20";
                      return (
                        <Fragment key={p.id}>
                          {p.id === DISPLAY_ORDER[0] && (
                            <p className="col-span-full text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                              Déco murale
                            </p>
                          )}
                          {p.id === "vitrail" && (
                            <p className="col-span-full mt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                              Objets photo
                            </p>
                          )}
                          <button
                            onClick={() => {
                              // Re-taper le même support ne doit pas écraser
                              // un format déjà choisi.
                              if (product?.id !== p.id) setFormatId(null);
                              setProduct(p);
                              setStep("format");
                            }}
                            className={`${card} group overflow-hidden text-left hover:border-amber-500 active:scale-[0.98]`}
                          >
                            {/* La photo DANS la matière, pas un pictogramme. */}
                            <span className="flex h-36 items-end justify-center rounded-t-xl bg-gradient-to-b from-slate-800/80 to-slate-900 px-4 pb-4 pt-4">
                              <span className={mockW}>
                                <MaterialMockup
                                  productId={p.id}
                                  url={first.url}
                                  landscape={landscape}
                                />
                              </span>
                            </span>
                            <span className="block p-3 pt-2">
                              <span className="flex items-start justify-between gap-2">
                                <span className="block text-sm font-semibold leading-tight">
                                  {p.label}
                                </span>
                                {p.signature && (
                                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                                    Signature
                                  </span>
                                )}
                              </span>
                              <span className="mt-1 block text-[11px] leading-snug text-slate-400">
                                {TAGLINES[p.id] ?? p.description}
                              </span>
                              <span className="mt-1.5 block text-sm font-bold text-amber-400">
                                dès {euros(from)}
                              </span>
                            </span>
                          </button>
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ---- Étape 2 : le format ---- */}
              {step === "format" && product && first && (
                <div key="format" className="animate-[stepIn_0.22s_ease-out]">
                  {measuring && (
                    <p className="mb-2 animate-pulse text-[11px] text-slate-400">
                      Analyse de la qualité de vos photos…
                    </p>
                  )}
                  {photos.length > 1 && (
                    <p className="mb-2 text-[11px] text-slate-400">
                      Aperçu sur votre première photo — les {photos.length} photos
                      seront tirées dans cette taille
                    </p>
                  )}

                  {/* L'aperçu vit en haut et réagit à chaque tap. */}
                  {fmtO &&
                    (Math.max(...product.formats.map((f) => Math.max(f.widthCm, f.heightCm))) >= 30 ? (
                      <div className="sticky top-0 z-10 bg-slate-950 pb-2">
                        <div className="mx-auto sm:max-w-md">
                          <ScaleScene
                            url={first.url}
                            widthCm={fmtO.w}
                            heightCm={fmtO.h}
                            variant={product.id === "vitrail" ? "window" : "wall"}
                          />
                        </div>
                      </div>
                    ) : (
                      // Les petits objets (plaque souvenir) n'ont rien à faire
                      // sur un mur : on les montre posés sur un meuble en
                      // chêne, dans la même pièce claire que la scène murale,
                      // aux proportions et à une taille qui suivent le format.
                      <div className="relative overflow-hidden rounded-xl border border-[#B7A88E]/40 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]">
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "radial-gradient(ellipse 70% 55% at 50% 35%, rgba(255,252,243,0.9), transparent 72%), linear-gradient(180deg, #F2EBDF 0%, #E8DDCB 60%, #DDD0BC 100%)",
                          }}
                        />
                        {/* dessus du meuble : le reflet de la plaque tombe dessus */}
                        <div
                          className="absolute inset-x-0 bottom-0 h-10"
                          style={{
                            background: "linear-gradient(180deg, #C9A478 0%, #B08C5E 100%)",
                            boxShadow: "inset 0 2px 3px rgba(255,255,255,0.35)",
                          }}
                        />
                        <div className="relative flex flex-col items-center pb-2 pt-6">
                          <span style={{ width: fmtO.w * 7 }}>
                            <MaterialMockup
                              productId={product.id}
                              url={first.url}
                              landscape={effLandscape}
                              ratio={fmtO.w / fmtO.h}
                            />
                          </span>
                        </div>
                        <span className="absolute left-2 top-2 rounded-md bg-stone-900/80 px-2 py-1 text-xs font-bold tabular-nums text-amber-300 shadow-sm">
                          {fmtO.w} × {fmtO.h} cm
                        </span>
                        <span className="absolute bottom-1 right-2 rounded bg-[#F7F1E6]/85 px-1.5 py-0.5 text-[10px] font-medium text-[#5B4936]">
                          à poser sur un meuble
                        </span>
                      </div>
                    ))}
                  {cropCount > 0 && (
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {photos.length === 1
                        ? "Votre photo sera légèrement recadrée pour remplir ce format."
                        : `${cropCount} photo${cropCount > 1 ? "s" : ""} sur ${photos.length} ${
                            cropCount > 1 ? "seront" : "sera"
                          } légèrement recadrée${cropCount > 1 ? "s" : ""} pour remplir ce format.`}
                    </p>
                  )}
                  {mixed && (
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Vos photos mélangent portrait et paysage — chacune sera
                      tirée dans son sens.
                    </p>
                  )}

                  <div className="mt-3 space-y-2">
                    {(() => {
                      const maxW = Math.max(
                        ...product.formats.map((f) => orient(f, effLandscape).w)
                      );
                      const maxH = Math.max(
                        ...product.formats.map((f) => orient(f, effLandscape).h)
                      );
                      // Échelle commune à toutes les lignes : le plus grand
                      // format remplit la vignette, chaque autre est réduit du
                      // même facteur — un 30×40 apparaît réellement ~12× plus
                      // petit en surface qu'un 100×150.
                      const scale = Math.min(72 / maxW, 80 / maxH);
                      return product.formats.map((f) => {
                        const { badge, tooSmall, unknown } = verdict(f);
                        const blocked = badge === "insufficient";
                        const selected = formatId === f.id;
                        const o = orient(f, effLandscape);
                        return (
                          <button
                            key={f.id}
                            aria-disabled={blocked}
                            onClick={() => {
                              if (blocked) {
                                // Montrer LESQUELLES : liseré rouge sur les
                                // vignettes fautives, remontées en vue.
                                setFlagged(
                                  new Set(
                                    photos
                                      .filter(
                                        (p) =>
                                          p.pxWidth &&
                                          p.pxHeight &&
                                          resolutionBadge(p.pxWidth, p.pxHeight, f) ===
                                            "insufficient"
                                      )
                                      .map((p) => p.path)
                                  )
                                );
                                stripRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "nearest",
                                });
                                return;
                              }
                              setFlagged(new Set());
                              setFormatId(f.id);
                            }}
                            className={`${card} flex w-full items-center gap-3 p-3 text-left ${
                              selected
                                ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
                                : blocked
                                  ? "cursor-not-allowed"
                                  : "hover:border-amber-500 active:scale-[0.98]"
                            }`}
                          >
                            {/* Ce format à l'échelle, posé sur la même ligne de
                                base que les autres — comme des cadres sur une
                                étagère ; le fantôme pointillé est le plus
                                grand format du produit, la référence commune. */}
                            <span className="relative flex h-[84px] w-[76px] shrink-0 items-end justify-center">
                              <span
                                className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[2px] border border-dashed border-slate-700"
                                style={{ width: maxW * scale, height: maxH * scale }}
                              />
                              <span
                                className={`relative overflow-hidden rounded-[1px] ring-1 ${
                                  selected ? "ring-amber-500" : "ring-slate-500"
                                } ${blocked ? "opacity-50 grayscale" : ""}`}
                                style={{ width: o.w * scale, height: o.h * scale }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={first.url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={`block text-base font-bold tabular-nums ${
                                  blocked ? "text-slate-500" : "text-slate-50"
                                }`}
                              >
                                {o.w} × {o.h} cm
                              </span>
                              <span className="mt-0.5 block text-xs">
                                {blocked ? (
                                  <span className="text-red-400">
                                    {tooSmall === photos.length
                                      ? photos.length > 1
                                        ? "Photos trop peu définies pour ce format"
                                        : "Photo trop peu définie pour ce format"
                                      : `${tooSmall} photo${tooSmall > 1 ? "s" : ""} sur ${photos.length} trop peu définie${tooSmall > 1 ? "s" : ""} — touchez pour ${tooSmall > 1 ? "les" : "la"} repérer en haut`}
                                  </span>
                                ) : unknown > 0 ? (
                                  <span className="text-amber-400">
                                    Qualité non vérifiée pour {unknown} photo
                                    {unknown > 1 ? "s" : ""} — l&apos;atelier
                                    contrôlera avant tirage
                                  </span>
                                ) : badge === "acceptable" ? (
                                  <span className="text-amber-400">
                                    Qualité correcte — à regarder à distance
                                  </span>
                                ) : (
                                  <span className="text-emerald-400">
                                    Qualité optimale
                                  </span>
                                )}
                              </span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-1">
                              <span className="text-base font-bold tabular-nums text-amber-400">
                                {euros(f.priceCents)}
                              </span>
                              {photos.length > 1 && (
                                <span className="text-[11px] text-slate-400">
                                  l&apos;unité
                                </span>
                              )}
                              {selected && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-slate-950">
                                  ✓
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Tailles à l&apos;échelle les unes des autres
                  </p>
                </div>
              )}

              {/* ---- Étape 3 : coordonnées ---- */}
              {step === "coordonnees" && (
                <div key="coordonnees" className="animate-[stepIn_0.22s_ease-out] space-y-3">
                  <input
                    className={field}
                    placeholder="Prénom et nom"
                    aria-label="Prénom et nom"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input
                    className={field}
                    type="email"
                    placeholder="Email"
                    aria-label="Email"
                    aria-invalid={email.trim() !== "" && !emailOk}
                    aria-describedby={
                      email.trim() !== "" && !emailOk ? "print-email-err" : undefined
                    }
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {email.trim() !== "" && !emailOk && (
                    <p id="print-email-err" className="text-[11px] text-red-300">
                      Vérifiez l&apos;adresse email — elle servira au suivi de la
                      commande.
                    </p>
                  )}
                  <input
                    className={field}
                    placeholder="Adresse"
                    aria-label="Adresse"
                    autoComplete="address-line1"
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <input
                      className={`${field} max-w-32`}
                      placeholder="Code postal"
                      aria-label="Code postal"
                      aria-invalid={postalCode.trim() !== "" && !postalOk}
                      aria-describedby={
                        postalCode.trim() !== "" && !postalOk ? "print-cp-err" : undefined
                      }
                      autoComplete="postal-code"
                      inputMode="numeric"
                      maxLength={5}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                    <input
                      className={field}
                      placeholder="Ville"
                      aria-label="Ville"
                      autoComplete="address-level2"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  {postalCode.trim() !== "" && !postalOk && (
                    <p id="print-cp-err" className="text-[11px] text-red-300">
                      Code postal français à 5 chiffres — nous livrons en France
                      uniquement.
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    Livraison en France métropolitaine. Aucun compte à créer —
                    ces informations servent uniquement à vous livrer.
                  </p>
                  {error && (
                    <p
                      role="alert"
                      className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200"
                    >
                      {error}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ---- Étape 4 : confirmation ---- */}
          {step === "confirmation" && (
            <div key="confirmation" className="animate-[stepIn_0.22s_ease-out] space-y-4 py-8 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500">
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7 text-slate-950"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  aria-hidden="true"
                >
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-lg font-semibold">
                Votre commande est partie à l&apos;atelier
              </p>
              {product && fmtO && total !== null && (
                <p className="text-sm text-slate-300">
                  {photos.length} × {product.label} {fmtO.w} × {fmtO.h} cm —{" "}
                  <span className="font-semibold">{euros(total)}</span>
                </p>
              )}
              {orderRef && (
                <p className="text-sm text-slate-400">
                  Référence{" "}
                  <span className="font-mono text-slate-200">{orderRef}</span>{" "}
                  <button
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(orderRef)
                        .then(() => setRefCopied(true))
                        .catch(() => {});
                    }}
                    className="ml-1 rounded border border-slate-700 px-1.5 py-0.5 text-[11px] text-slate-300 hover:bg-slate-900"
                  >
                    {refCopied ? "Copiée ✓" : "Copier"}
                  </button>
                </p>
              )}
              <p className="text-sm text-slate-400">
                Vous recevrez un email dès qu&apos;elle sera expédiée.
              </p>
              <button onClick={onClose} className={`${primary} mt-2`}>
                Revenir à la galerie
              </button>
            </div>
          )}
        </div>

        {/* Pied : récapitulatif toujours visible + action */}
        {step !== "confirmation" && (
          <div className="border-t border-slate-800 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            {format && fmtO && total !== null && (
              <div className="mb-3 space-y-1 text-sm">
                <div className="flex justify-between gap-3 text-slate-300">
                  <span className="min-w-0">
                    {photos.length} × {product?.label} {fmtO.w} × {fmtO.h} cm
                    {photos.length > 1 && (
                      <span className="text-slate-400">
                        {" "}
                        ({euros(format.priceCents)} l&apos;unité)
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">{euros(fullPrice)}</span>
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>
                      Remise volume {volumeDiscountPercent(pieces.length)} % (
                      {photos.length} pièces)
                    </span>
                    <span className="tabular-nums">−{euros(discountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">{euros(total)}</span>
                </div>
                <p className="text-xs text-slate-400">
                  {total >= FREE_SHIPPING_THRESHOLD_CENTS
                    ? "Livraison offerte"
                    : `Hors livraison — offerte dès ${euros(FREE_SHIPPING_THRESHOLD_CENTS)}, plus que ${euros(FREE_SHIPPING_THRESHOLD_CENTS - total)}`}
                </p>
                {total < FREE_SHIPPING_THRESHOLD_CENTS && (
                  <div className="h-1 rounded-full bg-slate-800">
                    <div
                      className="h-1 rounded-full bg-amber-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (total / FREE_SHIPPING_THRESHOLD_CENTS) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              {step !== "support" && (
                <button
                  onClick={() => setStep(step === "format" ? "support" : "format")}
                  className={ghost}
                >
                  Retour
                </button>
              )}
              {step === "format" && (
                <button
                  disabled={!formatId || measuring || photos.length === 0}
                  onClick={() => setStep("coordonnees")}
                  className={`${primary} flex-1`}
                >
                  {measuring ? "Analyse…" : "Continuer"}
                </button>
              )}
              {step === "coordonnees" && (
                <button
                  disabled={
                    busy ||
                    photos.length === 0 ||
                    !format ||
                    verdict(format).badge === "insufficient" ||
                    !name.trim() ||
                    !emailOk ||
                    !line1.trim() ||
                    !postalOk ||
                    !city.trim()
                  }
                  onClick={() => void submit()}
                  className={`${primary} flex-1`}
                >
                  {busy
                    ? "Envoi…"
                    : `Commander — ${total !== null ? euros(total) : ""}`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
