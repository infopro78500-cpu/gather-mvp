# Dossier technique — Gather MVP

**Date : 6 juillet 2026**
**Destinataire : Arnaud (reprise du développement)**
**Dépôt : https://github.com/infopro78500-cpu/gather-mvp**

---

## 1. Vision produit

Gather a pour ambition de devenir **le standard du partage de photos en commun en quelques clics** : un organisateur crée un « événement » (mariage, soirée, voyage…), obtient un code PIN à 6 chiffres et un QR code, et tous les participants peuvent déposer / consulter / télécharger les photos de l'événement sans créer de compte.

Le produit est aujourd'hui au stade **MVP fonctionnel** : les flux principaux marchent, mais il reste du travail de sécurisation, de robustesse et de finition avant une mise en production sérieuse (voir sections 8 et 9).

---

## 2. Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Framework web | Next.js (App Router) | 16.x |
| UI | React + TypeScript | React 19.2 / TS 5 |
| Styles | Tailwind CSS | 4.x |
| Backend as a Service | Supabase (Postgres + Auth + Storage) | supabase-js 2.85 |
| Mobile (wrapper natif) | Capacitor (Android + iOS) | 6.2 |
| Hébergement web | Vercel (+ Vercel Analytics) | — |
| Divers | JSZip + file-saver (export ZIP), react-qr-code, luxon, phosphor-react (icônes, vendorisé dans `lib/phosphor-react`) | — |

**Il n'y a pas de serveur backend dédié** : le front parle directement à Supabase (client public) ; quelques routes API Next.js servent pour les leads, la santé, les stats admin et le mode concours.

### Plateformes / comptes utilisés
- **GitHub** : dépôt `infopro78500-cpu/gather-mvp`, travail par branches + Pull Requests (beaucoup de branches `codex/*` générées avec assistance IA).
- **Vercel** : hébergement + déploiement continu du front, Analytics activé, API Vercel interrogée côté serveur pour les KPI de trafic.
- **Supabase** : base Postgres, Auth (OTP e-mail), Storage (bucket `event-photos`), migrations SQL versionnées dans `supabase/migrations/`.

---

## 3. Structure du dépôt

```
app/                  Pages et routes Next.js (App Router)
  page.tsx            Création d'événement (PIN 6 chiffres)
  join/               Rejoindre un événement par PIN
  events/[pin]/       Page événement : galerie, upload, partage, concours (~1600 lignes, cœur du produit)
  event/[eventId]/edit/  Édition d'un événement
  login/              Connexion OTP e-mail (Supabase Auth)
  coming-soon/        Landing marketing + formulaire de leads
  admin/              Dashboard admin : leads + KPI storage + KPI produit + trafic Vercel
  infos/              Pages statiques (investisseurs…)
  api/                Routes API : /api/lead, /api/health, /api/admin/stats,
                      /api/events/[eventId]/contest/*, /api/scan, /api/events/[eventId]/upload-image
  components/         Composants UI (galerie, uploader, concours, thème Noël…)
  lib/analyticsProduct.ts  Agrégation des KPI produit + appel API Vercel
lib/                  Utilitaires partagés : supabaseClient, supabaseAdminClient (service role),
                      deviceId, voterId, photoId, eventLifetimes (+ test), adminStats, storageKpis
pages/api/            scan-hash.ts (ancienne API pages router, scan IA)
supabase/migrations/  6 migrations SQL (expiration, mode concours, vues KPI, analytics produit)
scripts/              smoke.mjs, health.test.mjs, analytics.smoke.mjs, vercel-metrics-placeholder.mjs
types/                Types partagés (EventData, Photo)
android/ + ios/       Projets natifs Capacitor (webDir : www/)
ia_local/ + utils/    Scripts Python de détection de doublons d'images (expérimental, hors web)
docs/                 Documentation analytics
AUDIT.md              Audit fonctionnel détaillé (très bon point d'entrée)
KPI_STORAGE_SYSTEM.md Spécification des KPI storage (source de vérité)
KPI_AUDIT.md          Audit des KPI
```

---

## 4. Fonctionnalités implémentées (ce qui est fait)

### Cœur produit
- **Création d'événement** : nom + génération PIN aléatoire 6 chiffres, insert Supabase (`events`), identification de l'hôte par `deviceId` (localStorage) et éventuellement `host_user_id` si connecté. Redirection vers `/events/{pin}`.
- **Rejoindre par PIN ou QR code** : page `/join`, lien de partage + QR généré sur la page événement.
- **Galerie photos** : listing (max 200 fichiers), grille responsive, lightbox, compteur.
- **Upload** : multi-fichiers (max 20, 10 Mo/fichier), noms normalisés `deviceId__timestamp-nom`, stockés dans le bucket public `event-photos` sous `event.id/`.
- **Suppression** : individuelle ou multi-sélection ; autorisée pour l'hôte (tout) ou l'uploader (ses photos), contrôle basé sur le `deviceId`.
- **Téléchargement ZIP** : export de toutes les photos (`coffre-{pin}.zip`) via JSZip.
- **Expiration d'événement** : durée de vie configurable (`expires_at`), logique dans `lib/eventLifetimes.ts` (testée), migration SQL dédiée.
- **Mode concours** : activation par événement, likes/votes sur photos (`photo_likes`, `voterId`), compte à rebours, routes API `contest/state` et `toggle-like`.
- **Thème saisonnier** : composants « Christmas » (guirlande QR, neige…).

### Acquisition / marketing
- **Landing coming-soon** avec formulaire de leads (email, nom, centres d'intérêt) → table `leads_landing` via `/api/lead`.
- **Dashboard admin `/admin`** : liste des 50 derniers leads + compteurs.

### Analytics & KPI (gros chantier récent, PRs #109 → #121)
- **Instrumentation en base** : table append-only `analytics_events` alimentée par des triggers Postgres sur `events`, `members`, `photos`, `photo_likes`.
- **Vues SQL KPI** : `kpi_product_global`, `kpi_product_timeseries_daily`, `kpi_product_events`, `event_kpi_engagement`, `event_storage_stats`.
- **Dashboard admin** : sections KPI storage (fichiers, volumes MB, event le plus coûteux…), KPI produit (events/photos/membres/votes sur 30 jours, concours vs classique) et bloc trafic Vercel (via `VERCEL_TOKEN`/`VERCEL_PROJECT_ID`, ou table `vercel_web_metrics_daily` alimentée par la RPC sécurisée `upsert_vercel_metrics`).
- Docs de référence : `KPI_STORAGE_SYSTEM.md`, `docs/ANALYTICS_PRODUCT_SYSTEM.md`, `docs/analytics-product.md`.

### Mobile
- **Capacitor 6** configuré (`com.gather.app`), projets `android/` et `ios/` présents, scripts `cap:sync` / `cap:android`. Statut : embryonnaire — le webDir `www/` est gitignoré, pas de pipeline de build mobile établi.

### IA locale (expérimental)
- Scripts Python de détection de doublons d'images (`ia_local/`, `utils/image_utils.py`), exposés via `/api/scan`, `/api/events/[eventId]/upload-image` (spawn d'un process Python) et `pages/api/scan-hash.ts`, avec le composant `LocalScanIA`. **Ne fonctionne pas sur Vercel** (nécessite Python local) : à considérer comme un prototype.

---

## 5. Base de données Supabase

**Tables** : `events` (id, name, pin, host_device_id, host_user_id, expires_at, mode concours…), `leads_landing`, `photo_likes`, `analytics_events`, `vercel_web_metrics_daily` (optionnelle), + `members`/`photos` référencées par les triggers analytics.

**Storage** : bucket **public** `event-photos`, un dossier par `event.id`.

**Migrations** (dans `supabase/migrations/`, à appliquer dans l'ordre) :
1. `20250211` ajout expiration des événements
2. `20250305` mode concours
3. `20250310` `contest_enabled_at`
4. `20250312` vue `event_kpi_engagement`
5. `20250320` pipeline analytics produit (table + triggers + vues)
6. `20250325` correctifs des vues KPI

---

## 6. Normes et process en place

### Qualité de code
- **TypeScript strict** partout côté app, ESLint 9 avec `eslint-config-next`.
- Commandes : `npm run lint`, `npm run typecheck`.
- **Gate de release** : `npm run check:release` (lint + typecheck + build) et `npm run release:verify` (+ health test + smoke tests).
- **Tests** : légers — `scripts/health.test.mjs` (endpoint `/api/health`), `scripts/smoke.mjs` (pages clés, branding, dates invalides), `scripts/analytics.smoke.mjs`, `lib/eventLifetimes.test.ts`. **Pas de framework de tests unitaires (Jest/Vitest) installé.**

### Workflow Git
- Branche principale : `main`. Travail par branches de feature (`feat/…`, `codex/…`) mergées via Pull Requests GitHub (121 PRs à ce jour).
- Messages de commit en anglais, impératif court (« Add… », « Fix… », « Harden… »).
- **Note (6 juillet 2026)** : le `main` GitHub était resté figé sur une ancienne lignée (époque PR #29) alors que le travail récent (PRs #30 → #121) vivait sur une autre lignée ; `main` a été réaligné sur l'état actuel lors du nettoyage de remise en main. L'ancienne version est conservée dans la branche `backup/ancien-main-design-v2` (elle contient une variante « design system v2 » de la homepage, non reprise).

### Conventions observées
- UI et textes produit **en français**.
- Composants React fonctionnels + hooks, styles Tailwind inline.
- Toute évolution de schéma DB passe par une **migration SQL versionnée**.
- Les définitions de KPI sont documentées avant implémentation (`KPI_STORAGE_SYSTEM.md` = source de vérité).

### Variables d'environnement (`.env.local`, non versionné)
| Variable | Usage |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase (client public + admin) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase (front) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (routes serveur admin — **ne jamais exposer au front**) |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` (optionnel) | Appel API Vercel pour les KPI de trafic |
| `SMOKE_BASE_URL` | Cible des smoke tests (sinon serveur local lancé automatiquement) |

---

## 7. Prise en main (onboarding)

1. Cloner le dépôt, `npm install` (Node 20+).
2. Créer `.env.local` avec les clés Supabase (à transmettre par canal sécurisé, **pas par WhatsApp**).
3. `npm run dev` → http://localhost:3000.
4. Lire `AUDIT.md` (état fonctionnel détaillé) puis `app/events/[pin]/page.tsx` (cœur du produit).
5. Vérifier un cycle complet : créer un événement → rejoindre via PIN → uploader → supprimer → ZIP.
6. Avant tout merge : `npm run check:release`.

---

## 8. Dette technique et limites connues (honnêteté totale)

1. **Sécurité — chantier n°1** : pas de RLS (Row Level Security) ni de vérification serveur ; les permissions reposent uniquement sur le `deviceId` en localStorage (falsifiable) ; le bucket photos est public (quiconque a l'URL peut voir les fichiers) ; l'auth OTP existe mais n'est pas branchée sur les flux événement ; `/admin` n'est pas protégé.
2. **Unicité du PIN non garantie** à la création (collision possible).
3. **Pas de pagination** : galerie plafonnée à 200 fichiers, leads à 50.
4. **Robustesse UX** : fichiers >10 Mo ignorés silencieusement, `alert/confirm` natifs, ZIP toujours intégral.
5. **Pipeline IA locale** non déployable telle quelle (dépendance Python côté serveur).
6. **Fichier monolithe** : `app/events/[pin]/page.tsx` ≈ 1600 lignes, à découper en composants.
7. **Branches accumulées** : nombreuses branches `codex/*` historiques sur GitHub (mergées pour la plupart) — sans impact sur le code, à purger à l'occasion.

> Nettoyage déjà effectué le 6 juillet 2026 : suppression des fichiers parasites versionnés (`tatus`, `top tracking .env.local`, `lint/`, fichiers IDE `.idea/`), retrait du script npm cassé `analytics:report`, réécriture du README, enrichissement du `.gitignore`, réalignement du `main` GitHub sur l'état à jour.

---

## 9. Roadmap suggérée vers la production

**Priorité 1 — Sécurité (bloquant production)**
- Activer RLS sur toutes les tables + policies Supabase.
- Passer le bucket en privé + URLs signées (ou policies storage).
- Protéger `/admin` et `/api/admin/*` (auth + rôle).
- Déplacer les écritures sensibles (création event, suppression) derrière des routes serveur avec validation.

**Priorité 2 — Robustesse**
- Unicité du PIN (contrainte DB + retry), pagination galerie/leads, messages d'erreur agrégés à l'upload, toasts.
- Mettre en place Vitest + quelques tests sur les flux critiques ; CI GitHub Actions (lint + typecheck + build + tests).

**Priorité 3 — Métier & croissance**
- Compte utilisateur réel pour les hôtes (retrouver ses événements multi-appareils).
- Finaliser le pipeline mobile Capacitor (build, stores) si le mobile reste un objectif.
- Industrialiser les analytics (cron réel pour `vercel_web_metrics_daily`).
- Découper `app/events/[pin]/page.tsx` en composants.

---

## 10. Contacts et accès à transmettre à Arnaud

- [ ] Accès **GitHub** au dépôt (collaborateur ou transfert d'organisation)
- [ ] Accès **Vercel** au projet (membre d'équipe)
- [ ] Accès **Supabase** au projet (dashboard + clés)
- [ ] Fichier `.env.local` (par canal sécurisé : gestionnaire de mots de passe, pas WhatsApp)
- [ ] Compte utilisé pour les PRs assistées par IA (Codex/Claude), si conservé
