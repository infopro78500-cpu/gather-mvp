# Usegather (ex-Gather) — coffres photo d'événement

App de partage photo d'événement : l'organisateur crée un « coffre » (PIN 6 chiffres + QR code), les invités déposent photos/vidéos **sans compte**, tout le monde télécharge l'album en ZIP. Éphémère par défaut (24 h / 7 jours), purge automatique du stockage à expiration. Beachhead : **le mariage, en France** (251 000 unions en 2025, INSEE). Monétisation cible : freemium + **impression via Printerkut** (partenaire de production dédié, société du frère de Nico).

Stack : Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 · Supabase (Postgres, Storage bucket privé `event-photos`, URLs signées) · Vercel · Capacitor 6 (embryonnaire, appId `com.usegather.app`).

## Équipe — 4 associés

- **Nico — CEO / fondateur** : drive le projet, produit & marque, accès Printerkut. C'est « le patron » : les décisions produit/marque se prennent avec lui.
- **Arnaud — lead dev** : le code, la sécurité (chantier n°1 depuis la passation du 06/07/2026).
- **Jérem — finance & juridique** : structuration société (Luxembourg vs France, en cours), financement.
- **Corentin — commercial & marketing** : acquisition, partenariats, go-to-market.

## Pilotage — à respecter dans toute session

Le **quotidien** vit dans le cockpit Notion « 🎯 Usegather — Cockpit projet » (base Tâches : Branche ×7, Type Tâche/Décision, Priorité, Qui — 7 vues, dont 📥 Inbox = les lignes sans branche, à trier au point d'équipe hebdo). Une routine planifiée locale (`brief-dominical-usegather`, dimanche 18 h) met à jour la section « 🧭 Brief du dimanche » du cockpit : plan de semaine proposé, tâches > 2 semaines, décision à trancher. Le **durable** vit ici :

| Document | Rôle |
|---|---|
| `docs/decisions-validees.md` | décisions actées — **fait foi**, ne jamais contredire sans décision nouvelle |
| `docs/journal-decisions.md` | le **pourquoi** des choix (format Décision / Pourquoi / Impact, plus récent en haut) |
| `docs/journal-sessions.md` | trace factuelle de chaque session de travail |
| `docs/roadmap.md` | NOW / NEXT / LATER / DONE — les pourquoi n'y vont pas |

**Règles de session Claude :**
1. Avant de proposer ou trancher quoi que ce soit de structurant : lire `docs/decisions-validees.md` et `docs/roadmap.md`.
2. **Double écriture** : toute décision structurante → entrée dans `journal-decisions.md` **ET** ligne Notion (Type = Décision), avec liens croisés.
3. Fin de session significative → entrée dans `journal-sessions.md` (bref, factuel).
4. Une décision validée ne se ré-ouvre que sur fait nouveau — jamais par confort.

## Règles techniques intouchables

- Clés locales à **ne jamais renommer** : localStorage `gather_device_id`, `gather_voter_id`, IndexedDB `gather-upload-queue` — les renommer efface l'identité appareil, les votes et la file d'upload des utilisateurs.
- Marque : **« Usegather »** partout en public — jamais « Gather » seul (non protégé, marques tierces, cf. décisions §1). Email : `contact@usegather.app`.
- Domaine : `usegather.app` = canonique. Le projet Vercel `gather-mvp` ne doit **jamais** être supprimé : les QR déjà imprimés pointent `gather-mvp.vercel.app`, conservé en redirection.
- `/admin` et `/api/admin` protégés par Basic auth (`proxy.ts`, env `ADMIN_PASSWORD`). Purge quotidienne : `api/cron/cleanup-expired` (les événements peuvent être préservés de la purge). Coûts Supabase contenus par cache d'URLs signées + miniatures (08/07/2026).
- Next 16 : conventions ≠ données d'entraînement — lire `node_modules/next/dist/docs/` au besoin (ex. : middleware → `proxy.ts`).

## Vérification

`npm run check:release` = lint + typecheck + tests + build. Smoke : `npm run smoke`. Métadonnées, `lang="fr"` et `metadataBase https://usegather.app` fixés le 04/08/2026.

## Références

État des lieux complet : `docs/DOSSIER_TECHNIQUE_GATHER.md` · audit fonctionnel : `AUDIT.md` · analytics produit : `docs/analytics-product.md` + `docs/ANALYTICS_PRODUCT_SYSTEM.md` · stockage/KPI : `KPI_STORAGE_SYSTEM.md` · stratégie : `docs/strategie/` (point de situation, deck v2, briefing Luxembourg, benchmark impression).
