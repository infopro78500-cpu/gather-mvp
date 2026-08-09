"use client";

// Commande des présentoirs de table — le parcours ORGANISATEUR (option Pro).
// La photo des mariés + le style (fondu / voile, avec son curseur) en aperçu
// instantané, le nombre de tables qui remplit le lot du catalogue, la date du
// mariage qui déclenche la voie express. L'aperçu est une approximation CSS
// fidèle en géométrie ; les fichiers machine sont composés par le serveur.
//
// Deux modes de photo (idée Nico 09/08) : la MÊME photo pour toutes les tables,
// ou UNE PHOTO PAR TABLE (les convives de chaque table) — les tables laissées
// sans photo propre reprennent la première photo choisie.

import { useEffect, useMemo, useState } from "react";
import { tableStandLot } from "@/lib/print/catalog";

const euros = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }) + " €";

const field =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500";

/** Réduction côté client : ~2400 px suffisent largement pour 7 × 10,5 cm à
 *  300 dpi, et la route plafonne à 4 Mo. */
async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const long = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, 2400 / long);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/jpeg", 0.9)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

type TablePhoto = { file: File; url: string };

export default function TableStandOrder({
  eventId,
  deviceId,
  pin,
  defaultTableCount,
  onClose,
}: {
  eventId: string;
  deviceId: string;
  pin: string;
  defaultTableCount: number;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"same" | "per">("same");
  // Mode « même photo ».
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  // Mode « une photo par table » : indexé par numéro de table (1..N).
  const [tablePhotos, setTablePhotos] = useState<Record<number, TablePhoto>>({});
  const [focusTable, setFocusTable] = useState(1);

  const [style, setStyle] = useState<"fondu" | "voile">("fondu");
  const [veilOpacity, setVeilOpacity] = useState(0.8);
  const [fadeStart, setFadeStart] = useState(0.55);
  const [size, setSize] = useState<"moyen" | "grand">("moyen");
  const [tableCount, setTableCount] = useState(
    Math.min(20, Math.max(1, defaultTableCount || 10))
  );
  const [dueDate, setDueDate] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [line1, setLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderRef: string; total: number } | null>(null);

  useEffect(() => {
    if (!photoFile) return;
    const url = URL.createObjectURL(photoFile);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  // Révoque toutes les URLs par table au démontage (évite les fuites mémoire).
  useEffect(() => {
    return () => {
      setTablePhotos((prev) => {
        Object.values(prev).forEach((p) => URL.revokeObjectURL(p.url));
        return {};
      });
    };
  }, []);

  const setTablePhoto = (table: number, file: File | null) => {
    setTablePhotos((prev) => {
      const next = { ...prev };
      if (next[table]) URL.revokeObjectURL(next[table].url);
      if (file) next[table] = { file, url: URL.createObjectURL(file) };
      else delete next[table];
      return next;
    });
  };

  // La première photo renseignée (par ordre de table) — le repli des tables
  // sans photo propre, et la référence envoyée au serveur.
  const firstTablePhoto = useMemo(() => {
    const keys = Object.keys(tablePhotos)
      .map(Number)
      .sort((a, b) => a - b);
    return keys.length ? tablePhotos[keys[0]] : null;
  }, [tablePhotos]);

  const lot = useMemo(() => tableStandLot(size, tableCount), [size, tableCount]);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const postalOk = /^\d{5}$/.test(postalCode.trim());
  const hasPhoto = mode === "same" ? Boolean(photoFile) : Boolean(firstTablePhoto);
  const ready =
    hasPhoto && lot && name.trim() && emailOk && line1.trim() && postalOk && city.trim();

  const submit = async () => {
    if (!ready || !lot) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("eventId", eventId);
      form.set("deviceId", deviceId);
      form.set("tableCount", String(tableCount));
      form.set("size", size);
      form.set("style", style);
      form.set("veilOpacity", String(veilOpacity));
      form.set("fadeStart", String(fadeStart));
      form.set("customerName", name.trim());
      form.set("customerEmail", email.trim());
      form.set("line1", line1.trim());
      form.set("postalCode", postalCode.trim());
      form.set("city", city.trim());
      if (dueDate) form.set("dueDate", dueDate);

      if (mode === "same" && photoFile) {
        form.set("photo", await downscale(photoFile), "photo.jpg");
      } else if (mode === "per" && firstTablePhoto) {
        // La première photo sert de repli (`photo`), les autres surchargent
        // leur table (`photo_<i>`).
        form.set("photo", await downscale(firstTablePhoto.file), "photo.jpg");
        for (let i = 1; i <= tableCount; i++) {
          const p = tablePhotos[i];
          if (p) form.append(`photo_${i}`, await downscale(p.file), `photo_${i}.jpg`);
        }
      }

      const res = await fetch("/api/print/table-stands", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        orderRef?: string;
        totalCents?: number;
        message?: string;
      };
      if (!res.ok || !body.success) {
        throw new Error(body.message || "La commande n'a pas pu être enregistrée.");
      }
      setDone({ orderRef: body.orderRef ?? "", total: body.totalCents ?? 0 });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Aperçu : mêmes proportions que le rendu serveur. En mode « par table », il
  // suit la table en focus (repli sur la première photo).
  const ratio = size === "moyen" ? "7 / 10.5" : "7.6 / 12.75";
  const previewUrl =
    mode === "same"
      ? photoUrl
      : (tablePhotos[focusTable]?.url ?? firstTablePhoto?.url ?? null);
  const previewLabel = mode === "same" ? "Table 1" : `Table ${focusTable}`;

  const preview = (
    <div
      className="relative mx-auto w-44 overflow-hidden rounded-[3px] bg-white shadow-lg ring-1 ring-black/10"
      style={{ aspectRatio: ratio }}
    >
      {previewUrl ? (
        style === "fondu" ? (
          <div className="absolute inset-[4.5%] bottom-[40%] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, transparent ${fadeStart * 100}%, white 96%)`,
              }}
            />
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div
              className="absolute inset-x-[5%] bottom-[5%] top-1/2 rounded-md"
              style={{ background: `rgba(255,255,255,${veilOpacity})` }}
            />
          </>
        )
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-[10px] text-slate-400">
          {mode === "same" ? "Choisissez une photo" : "Ajoutez une photo par table"}
        </div>
      )}
      {previewUrl && (
        <div className="absolute inset-x-0 bottom-[5%] top-[52%] flex flex-col items-center justify-start gap-1">
          <p className="text-[13px] font-bold text-slate-900">{previewLabel}</p>
          <div className="grid h-14 w-14 grid-cols-4 gap-px bg-white p-1">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className={i % 3 ? "bg-slate-900" : "bg-white"} />
            ))}
          </div>
          <p className="text-[7px] font-semibold text-slate-900">
            Posez votre téléphone ou scannez
          </p>
          <p className="text-[6px] text-slate-600">ou code {pin}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Commander les présentoirs"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-800 bg-slate-950 text-slate-100 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-4">
          <div>
            <p className="font-semibold">🪧 Vos présentoirs de table</p>
            <p className="text-xs text-slate-400">
              Puce sans contact + QR — un visuel différent par table
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-900"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {done ? (
            <div className="space-y-3 py-8 text-center">
              <p className="text-3xl">🪧</p>
              <p className="text-lg font-semibold">Vos {tableCount} présentoirs partent en fabrication</p>
              <p className="text-sm text-slate-400">
                Référence <span className="font-mono text-slate-200">{done.orderRef}</span> —{" "}
                {euros(done.total)}. Chaque table aura son visuel et son lien propre.
              </p>
              <button
                onClick={onClose}
                className="mt-2 inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400"
              >
                Fermer
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-[11rem_1fr]">
              {/* L'aperçu vit à gauche et réagit à chaque réglage. */}
              <div className="space-y-2">
                {preview}
                <p className="text-center text-[10px] text-slate-400">
                  Aperçu — le fichier final est composé en haute définition
                </p>
              </div>

              <div className="space-y-4">
                {/* Mode photo : même partout, ou une par table. */}
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Photo
                  </p>
                  <div className="flex gap-2">
                    {(
                      [
                        ["same", "La même pour toutes"],
                        ["per", "Une par table"],
                      ] as const
                    ).map(([m, label]) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                          mode === m
                            ? "border-amber-500 bg-amber-500/10 text-amber-300"
                            : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {mode === "same" ? (
                    <label className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:bg-slate-800">
                      📷 {photoFile ? "Changer la photo" : "Choisir la photo (les mariés, vous deux…)"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                        {Array.from({ length: tableCount }, (_, i) => i + 1).map((t) => {
                          const p = tablePhotos[t];
                          return (
                            <label
                              key={t}
                              onClick={() => setFocusTable(t)}
                              className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border text-[10px] font-semibold ${
                                focusTable === t
                                  ? "border-amber-500 ring-1 ring-amber-500"
                                  : "border-slate-700"
                              } ${p ? "" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}
                            >
                              {p ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={p.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                                  <span className="absolute bottom-0 inset-x-0 bg-slate-950/70 py-0.5 text-center text-white">
                                    T{t}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-base leading-none">＋</span>
                                  <span>Table {t}</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  setTablePhoto(t, e.target.files?.[0] ?? null);
                                  setFocusTable(t);
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Les tables sans photo utiliseront la première photo choisie.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Style
                  </p>
                  <div className="flex gap-2">
                    {(["fondu", "voile"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                          style === s
                            ? "border-amber-500 bg-amber-500/10 text-amber-300"
                            : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        {s === "fondu" ? "Fondu cadre blanc" : "Voile translucide"}
                      </button>
                    ))}
                  </div>
                  <label className="mt-2 block text-xs text-slate-400">
                    {style === "fondu" ? "Longueur du fondu" : "Opacité du voile"}
                    <input
                      type="range"
                      min={style === "fondu" ? 0.3 : 0.4}
                      max={style === "fondu" ? 0.75 : 0.95}
                      step={0.01}
                      value={style === "fondu" ? fadeStart : veilOpacity}
                      onChange={(e) =>
                        style === "fondu"
                          ? setFadeStart(Number(e.target.value))
                          : setVeilOpacity(Number(e.target.value))
                      }
                      className="mt-1 w-full accent-amber-500"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-slate-400">
                    Taille
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value as "moyen" | "grand")}
                      className={`${field} mt-1`}
                    >
                      <option value="moyen">Moyen — 7 × 10,5 cm</option>
                      <option value="grand">Grand — 7,6 × 12,75 cm</option>
                    </select>
                  </label>
                  <label className="text-xs text-slate-400">
                    Nombre de tables
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={tableCount}
                      onChange={(e) => {
                        const n = Math.min(20, Math.max(1, Number(e.target.value) || 1));
                        setTableCount(n);
                        if (focusTable > n) setFocusTable(n);
                      }}
                      className={`${field} mt-1`}
                    />
                  </label>
                </div>

                <label className="block text-xs text-slate-400">
                  Date du mariage — vos présentoirs partent en priorité
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`${field} mt-1`}
                  />
                </label>

                <div className="space-y-2.5">
                  <input className={field} placeholder="Prénom et nom" aria-label="Prénom et nom" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                  <input className={field} type="email" placeholder="Email" aria-label="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input className={field} placeholder="Adresse" aria-label="Adresse" autoComplete="address-line1" value={line1} onChange={(e) => setLine1(e.target.value)} />
                  <div className="flex gap-2.5">
                    <input className={`${field} max-w-28`} placeholder="Code postal" aria-label="Code postal" inputMode="numeric" maxLength={5} autoComplete="postal-code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                    <input className={field} placeholder="Ville" aria-label="Ville" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Livraison en France métropolitaine.
                  </p>
                </div>

                {error && (
                  <p role="alert" className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
                    {error}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {!done && (
          <div className="border-t border-slate-800 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            {lot && (
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-slate-300">
                  Lot de {lot.packQuantity} présentoirs {size === "moyen" ? "moyens" : "grands"} —{" "}
                  {tableCount} visuels personnalisés
                </span>
                <span className="text-base font-bold tabular-nums text-amber-400">
                  {euros(lot.priceCents)}
                </span>
              </div>
            )}
            <button
              disabled={busy || !ready}
              onClick={() => void submit()}
              className="inline-flex w-full items-center justify-center rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy
                ? "Composition des visuels…"
                : !hasPhoto
                  ? mode === "same"
                    ? "Choisissez une photo"
                    : "Ajoutez au moins une photo"
                  : lot
                    ? `Commander — ${euros(lot.priceCents)}`
                    : "Choisissez le nombre de tables"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
