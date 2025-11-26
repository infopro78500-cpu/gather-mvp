import React from "react";
import { LandingForm } from "../components/LandingForm";
export default function ComingSoonPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid gap-10 lg:grid-cols-[1.3fr_1fr] items-start">
        {/* Bloc gauche : pitch */}
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3 py-1 border border-teal-500/40 text-teal-300 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Gather — Coming Soon</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
              Partager toutes les photos d&apos;un événement
              <span className="text-teal-400">
                {" "}
                n&apos;a jamais été aussi simple.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl">
              Gather permet à un groupe de créer un coffre photo éphémère : un QR
              code, un PIN, tout le monde dépose ses photos au même endroit, sans
              compte. À la fin, chacun repart avec l&apos;intégralité des
              souvenirs.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-1">
              <p className="text-xs uppercase text-slate-400 tracking-wide">
                01 • Création
              </p>
              <p className="font-medium text-slate-100">Crée un coffre</p>
              <p className="text-xs text-slate-400">
                Tu choisis l&apos;événement, nous générons le QR code et le PIN.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-1">
              <p className="text-xs uppercase text-slate-400 tracking-wide">
                02 • Partage
              </p>
              <p className="font-medium text-slate-100">Tout le monde participe</p>
              <p className="text-xs text-slate-400">
                Les invités scannent, uploadent leurs photos en quelques secondes.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-1">
              <p className="text-xs uppercase text-slate-400 tracking-wide">
                03 • Récupération
              </p>
              <p className="font-medium text-slate-100">
                Tout le monde repart avec tout
              </p>
              <p className="text-xs text-slate-400">
                Téléchargement du coffre entier ou sélection personnalisée.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-400">
            <p className="font-medium text-slate-200">
              On construit Gather avec une communauté de personnes engagées.
            </p>
            <p>
              Investisseurs, contributeurs, ambassadeurs, testeurs… chacun
              sera récompensé à la hauteur de son implication.
            </p>
          </div>
        </section>

        {/* Bloc droit : formulaire */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/50 space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-50">
              Rejoindre le cercle early access
            </h2>
            <p className="text-sm text-slate-400">
              Laisse tes infos ci-dessous pour recevoir les news, les
              opportunités de contribution et l’accès aux premières versions.
            </p>
          </div>

          <LandingForm />

          <p className="text-[11px] leading-snug text-slate-500">
            Tes infos restent confidentielles. Aucun spam. Tu pourras te
            désinscrire à tout moment.
          </p>
        </section>
      </div>
    </main>
  );
}
