"use client";

// Tunnel de commande d'impression — le parcours client, de la sélection dans
// la galerie jusqu'à la commande partie à l'atelier.
//
// Quatre étapes, jamais plus : support → format → coordonnées → confirmation.
// Le panier est fusionné dans l'étape format (le récapitulatif est toujours
// visible en bas) : sur un mariage, l'invité commande deux ou trois photos
// depuis son téléphone, une étape de plus le ferait abandonner.
//
// ⚠️ Le paiement n'est pas branché : la commande part directement en file.
// Stripe s'insère entre « coordonnées » et l'appel à /api/print/order, sans
// rien réécrire — c'est une insertion, pas une refonte. La règle actée reste
// qu'on ne produit jamais sans avoir encaissé (cf. gamme-produits §10).

import { useEffect, useMemo, useState } from "react";
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

const euros = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";

/** Les produits commandables depuis la galerie : ceux qui naissent d'une photo. */
const PHOTO_PRODUCTS = PRINT_PRODUCTS.filter(requiresCoffrePhoto);

/** Bandes coupées par le format, pour l'aperçu de cadrage. */
function cropBands(px: { w: number; h: number }, format: PrintFormat) {
  const imgRatio = px.w / px.h;
  const long = Math.max(format.widthCm, format.heightCm);
  const short = Math.min(format.widthCm, format.heightCm);
  const target = imgRatio >= 1 ? long / short : short / long;
  if (Math.abs(imgRatio - target) < 0.01) return { h: 0, v: 0 };
  return imgRatio > target
    ? { h: (1 - target / imgRatio) / 2, v: 0 }
    : { h: 0, v: (1 - imgRatio / target) / 2 };
}

export default function PrintOrderFlow({ eventId, photos: input, onClose }: Props) {
  // Dimensions réelles des photos : la galerie ne les connaît pas, on les lit
  // depuis les images elles-mêmes. Sans ça le badge de résolution serait
  // décoratif — il ne bloquerait aucun format trop grand pour la photo.
  const [measured, setMeasured] = useState<Record<string, { w: number; h: number }>>({});
  useEffect(() => {
    let cancelled = false;
    for (const photo of input) {
      if (photo.pxWidth && photo.pxHeight) continue;
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        setMeasured((m) => ({
          ...m,
          [photo.path]: { w: img.naturalWidth, h: img.naturalHeight },
        }));
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

  const format = product && formatId ? getVariant(product.id, formatId)?.format ?? null : null;

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
  const discount = volumeDiscountPercent(pieces.length);
  const fullPrice = format ? format.priceCents * photos.length : 0;

  /**
   * Verdict de la sélection pour un format : le pire des badges, et surtout
   * COMBIEN de photos posent problème — sans ce compte, un format grisé ne
   * dit pas à l'utilisateur ce qu'il doit faire.
   */
  const verdict = (f: PrintFormat) => {
    let worst: "ok" | "acceptable" | "insufficient" = "ok";
    let tooSmall = 0;
    for (const photo of photos) {
      if (!photo.pxWidth || !photo.pxHeight) continue;
      const b = resolutionBadge(photo.pxWidth, photo.pxHeight, f);
      if (b === "insufficient") {
        tooSmall += 1;
        worst = "insufficient";
      } else if (b === "acceptable" && worst !== "insufficient") {
        worst = "acceptable";
      }
    }
    return { badge: worst, tooSmall };
  };

  const submit = async () => {
    if (!product || !formatId) return;
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

  const card = "rounded-xl border border-slate-700 bg-slate-900";
  const primary =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed";
  const ghost =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800";
  const field =
    "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-800 bg-slate-950 text-slate-100 sm:rounded-3xl">
        {/* En-tête */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-4">
          <div>
            <p className="font-semibold">
              {step === "confirmation"
                ? "Commande envoyée"
                : `Imprimer ${photos.length} photo${photos.length > 1 ? "s" : ""}`}
            </p>
            {step !== "confirmation" && (
              <p className="text-xs text-slate-400">
                {step === "support"
                  ? "Choisissez le support"
                  : step === "format"
                    ? product?.label
                    : "Où livrer ?"}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-900"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Les photos choisies, toujours visibles : on imprime CES photos-là. */}
          {step !== "confirmation" && (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {photos.map((p) => (
                <span key={p.path} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt=""
                    className="h-16 w-16 rounded-lg border border-slate-700 object-cover"
                  />
                  {photos.length > 1 && (
                    <button
                      onClick={() => setExcluded((s) => new Set(s).add(p.path))}
                      aria-label="Retirer cette photo de la commande"
                      title="Retirer de la commande"
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* ---- Étape 1 : le support ---- */}
          {step === "support" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {PHOTO_PRODUCTS.map((p) => {
                const from = Math.min(...p.formats.map((f) => f.priceCents));
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProduct(p);
                      setFormatId(null);
                      setStep("format");
                    }}
                    className={`${card} flex gap-3 p-3 text-left hover:border-amber-500`}
                  >
                    {/* La photo dans le produit, pas un pictogramme. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photos[0]?.url}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold">{p.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {p.description}
                      </span>
                      <span className="mt-1.5 block text-sm font-semibold text-amber-400">
                        dès {euros(from)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ---- Étape 2 : le format ---- */}
          {step === "format" && product && (
            <div className="space-y-2">
              {product.formats.map((f) => {
                const { badge, tooSmall } = verdict(f);
                const blocked = badge === "insufficient";
                const bands =
                  photos[0]?.pxWidth && photos[0]?.pxHeight
                    ? cropBands({ w: photos[0].pxWidth, h: photos[0].pxHeight }, f)
                    : null;
                return (
                  <button
                    key={f.id}
                    disabled={blocked}
                    onClick={() => setFormatId(f.id)}
                    className={`${card} flex w-full items-center gap-3 p-3 text-left ${
                      formatId === f.id ? "border-amber-500 ring-1 ring-amber-500" : ""
                    } ${blocked ? "opacity-40" : "hover:border-amber-500"}`}
                  >
                    {/* Aperçu du cadrage : les zones assombries seront coupées. */}
                    <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photos[0]?.url} alt="" className="h-full w-full object-cover" />
                      {bands && bands.h > 0 && (
                        <>
                          <span className="absolute inset-y-0 left-0 bg-black/60" style={{ width: `${bands.h * 100}%` }} />
                          <span className="absolute inset-y-0 right-0 bg-black/60" style={{ width: `${bands.h * 100}%` }} />
                        </>
                      )}
                      {bands && bands.v > 0 && (
                        <>
                          <span className="absolute inset-x-0 top-0 bg-black/60" style={{ height: `${bands.v * 100}%` }} />
                          <span className="absolute inset-x-0 bottom-0 bg-black/60" style={{ height: `${bands.v * 100}%` }} />
                        </>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {f.widthCm} × {f.heightCm} cm
                      </span>
                      <span className="mt-0.5 block text-xs">
                        {blocked ? (
                          <span className="text-red-400">
                            {tooSmall === photos.length
                              ? "Photo trop peu définie pour ce format"
                              : `${tooSmall} photo${tooSmall > 1 ? "s" : ""} sur ${photos.length} trop peu définie${tooSmall > 1 ? "s" : ""} — retirez-la du haut de l'écran`}
                          </span>
                        ) : badge === "acceptable" ? (
                          <span className="text-amber-400">
                            Qualité correcte — à regarder à distance
                          </span>
                        ) : (
                          <span className="text-emerald-400">Qualité optimale</span>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold">
                      {euros(f.priceCents)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ---- Étape 3 : coordonnées ---- */}
          {step === "coordonnees" && (
            <div className="space-y-3">
              <input className={field} placeholder="Prénom et nom" value={name} onChange={(e) => setName(e.target.value)} />
              <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className={field} placeholder="Adresse" value={line1} onChange={(e) => setLine1(e.target.value)} />
              <div className="flex gap-3">
                <input className={`${field} w-32`} placeholder="Code postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                <input className={field} placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <p className="text-xs text-slate-500">
                Aucun compte à créer. Ces informations servent uniquement à vous livrer.
              </p>
              {error && (
                <p className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* ---- Étape 4 : confirmation ---- */}
          {step === "confirmation" && (
            <div className="space-y-3 py-6 text-center">
              <p className="text-4xl">✅</p>
              <p className="text-lg font-semibold">Votre commande est partie à l&apos;atelier</p>
              {orderRef && (
                <p className="text-sm text-slate-400">
                  Référence <span className="font-mono text-slate-200">{orderRef}</span>
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
          <div className="border-t border-slate-800 p-4">
            {format && total !== null && (
              <div className="mb-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>
                    {photos.length} × {product?.label} {format.widthCm}×{format.heightCm}
                  </span>
                  <span>{euros(fullPrice)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Remise {discount} % ({photos.length} pièces)</span>
                    <span>−{euros(fullPrice - total)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{euros(total)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {total >= FREE_SHIPPING_THRESHOLD_CENTS
                    ? "Livraison offerte"
                    : `Plus que ${euros(FREE_SHIPPING_THRESHOLD_CENTS - total)} pour la livraison offerte`}
                </p>
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
                  disabled={!formatId}
                  onClick={() => setStep("coordonnees")}
                  className={`${primary} flex-1`}
                >
                  Continuer
                </button>
              )}
              {step === "coordonnees" && (
                <button
                  disabled={busy || !name.trim() || !email.trim() || !line1.trim() || !city.trim()}
                  onClick={() => void submit()}
                  className={`${primary} flex-1`}
                >
                  {busy ? "Envoi…" : `Commander — ${total !== null ? euros(total) : ""}`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
