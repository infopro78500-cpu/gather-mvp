# Dossier technique — Gather MVP

**Date : 6 juillet 2026**
**Destinataire : Arnaud (reprise du développement)**
**Dépôt : https://github.com/infopro78500-cpu/gather-mvp**

---

## 1. Vision produit

Gather a pour ambition de devenir **le standard du partage de photos en commun en quelques clics** : un organisateur crée un « événement » (mariage, soirée, voyage…), obtient un code PIN à 6 chiffres et un QR code, et tous les participants peuvent déposer / consulter / télécharger les photos de l'événement sans créer de compte.

Le produit est aujourd'hui au stade **MVP fonctionnel** : les flux principaux marchent, mais il reste du travail de sécurisation, de robustesse et de finition avant une mise en production sérieuse (voir sections 9 et 10).

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

> **Projet actif depuis le 6 juillet 2026** : `gather-mvp-restored` (réf. `uvpgaxggzltjitpqcvlv`, région `eu-west-1`). Le projet original (`qyiymuwkphiccomakiar`) a été mis en pause pour inactivité et n'était plus restaurable après 90 jours — voir §9, point 0. Toutes les données (base + 234 photos) ont été reconstruites à l'identique dans ce nouveau projet.

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

## 8. Chantiers de sécurité/robustesse déjà traités (6 juillet 2026)

En attendant l'arrivée d'Arnaud, une partie de la priorité 1 (sécurité) et de la priorité 2 (robustesse) de la roadmap a été traitée :

- **`/admin` et `/api/admin/*` protégés** par mot de passe (Basic Auth via `middleware.ts`, variable `ADMIN_PASSWORD`). **À reporter dans les variables d'environnement Vercel.**
- **Suppression de photos** (simple et multiple) déplacée derrière une route serveur (`/api/events/[eventId]/photos/delete`) qui vérifie le `deviceId` côté serveur avant d'utiliser la clé service_role — le client anonyme n'a plus le droit `DELETE` direct sur le bucket storage (policy RLS retirée en base + migration `20260706120000_harden_storage_delete_policy.sql`).
- **Modification d'événement (mode concours)** déplacée derrière une route serveur (`/api/events/[eventId]/contest-settings`) qui vérifie que le `deviceId` correspond bien à `host_device_id` avant d'appliquer le changement — **auparavant n'importe qui connaissant l'URL `/event/{eventId}/edit` pouvait modifier le concours de n'importe quel événement, sans aucune vérification**. La page affiche maintenant un message si vous n'êtes pas l'hôte.
- **Collision de PIN gérée** : la création d'événement réessaie automatiquement (jusqu'à 5 fois) si le PIN généré est déjà pris, au lieu d'afficher une erreur générique.
- **Pagination** : la galerie photos peut désormais charger au-delà de 200 fichiers (pagination interne jusqu'à 2000) ; le dashboard admin des leads a une vraie pagination (50/page) avec des compteurs globaux exacts (auparavant les statistiques d'intérêt étaient calculées seulement sur les 50 derniers leads).
- **CI GitHub Actions** ajoutée (`.github/workflows/ci.yml`) : lint + typecheck + tests + build sur chaque push/PR vers `main`.
- **Lien de gestion d'événement ajouté** : la page `/event/{eventId}/edit` (mode concours) existait mais n'était reliée nulle part — aucun bouton n'y menait, seul un organisateur connaissant l'URL par cœur pouvait l'atteindre. Un bouton « ⚙️ Gérer l'événement » a été ajouté dans les « Actions avancées » de la page événement (visible seulement pour l'hôte), avec un lien de retour vers l'événement depuis la page de gestion.
- **Système de notifications (toasts)** : tous les `alert()`/messages bloquants natifs ont été remplacés par des notifications non intrusives (`app/components/ui/ToastProvider.tsx`), y compris l'agrégation des erreurs d'upload (fichiers trop lourds, trop nombreux).
- **Vitest installé** : tests unitaires sur la logique critique (génération/collision de PIN, permissions de suppression de photo, expiration d'événement), intégrés à `npm run check:release` et à la CI.
- **Découpage du fichier `app/events/[pin]/page.tsx` poursuivi** : en plus du panneau de partage/QR, la visionneuse plein écran (`PhotoLightbox.tsx`) et le classement du concours (`ContestLeaderboard.tsx`) ont été extraits (1593 → 1287 lignes). Toujours un fichier volumineux, mais la logique de permission et de génération de PIN a aussi été mutualisée dans `lib/photoPermissions.ts` et `lib/pin.ts` (au lieu d'être dupliquée entre client et serveur).
- **Identité visuelle des 3 blocs de la page événement** : chaque carte a maintenant sa couleur d'accent (bleu = info événement, émeraude = photos, ambre = partage/PIN), au lieu d'un style neutre identique partout.
- **Upload vidéo débloqué** : le sélecteur de fichier n'acceptait que les images (`accept="image/*"`), alors que l'offre gratuite promet des « vidéos courtes ». Vidéos acceptées (50 Mo max, vs 10 Mo pour les photos), affichées correctement en galerie et dans la visionneuse (`<video>` au lieu d'une image cassée).
- **Résilience réseau à l'upload** : un upload qui échoue (coupure réseau) est maintenant réessayé automatiquement (jusqu'à 3 tentatives avec délai croissant) au lieu d'être perdu silencieusement sans aucun message à l'utilisateur.
- **Capture hors ligne + synchronisation automatique** : les photos/vidéos sélectionnées sans connexion (ou dont l'upload échoue malgré les réessais) sont mises en file d'attente locale (IndexedDB), visibles via un badge « en attente », et envoyées automatiquement dès que la connexion revient — sans que l'utilisateur ait besoin de recommencer. La file survit à la fermeture de l'onglet. Logique de réessai factorisée et testée (`lib/uploadHelpers.ts`, `withRetry`).
- **Service Worker minimal** (`public/sw.js`, actif en production uniquement) : garde l'app accessible pendant une coupure réseau au lieu de l'erreur navigateur "pas de connexion" — fait main plutôt que `next-pwa`, incompatible avec Turbopack (utilisé par défaut en Next.js 16).
- **Fondations RGPD** (7 juillet 2026) : pages **Politique de confidentialité** et **Mentions légales** (`app/legal/`), reliées par un pied de page global (`SiteFooter.tsx`) présent sur toutes les pages. Contenu honnête et exact, avec des champs `[À COMPLÉTER]` pour les infos que seul le porteur a (raison sociale, SIRET, e-mail de contact). **Ne vaut pas « conformité totale » — à faire relire par un juriste avant exploitation, surtout pour le B2B écoles/care (données de mineurs et de personnes vulnérables).** Bon point acquis au passage : l'app est déjà légère en traçage (Vercel Analytics sans cookie, aucun tracker tiers).
- **Collecte de leads sécurisée et durcie** (7 juillet 2026, vérifié en production) : la table `leads_landing` avait une policy SELECT publique — **n'importe qui avec la clé anon (dans le bundle) pouvait lire tous les emails/noms/messages des prospects** (fuite confirmée en aspirant un vrai lead depuis l'extérieur). Les policies anon (lecture ET écriture) ont été supprimées : la table n'est plus accessible via la clé anon. Toute lecture passe par le dashboard admin (service role, derrière Basic Auth), toute écriture par `/api/lead` (service role). L'API a été durcie : validation serveur de l'email + plafonds de taille sur chaque champ, honeypot anti-bot, capture UTM/referrer, et upsert sur l'email (anti-doublon). Correction UX au passage : la plupart des inscriptions redirigeaient vers des pages inexistantes (404) — nouvelle page `/merci` adaptative, plus case de consentement RGPD + lien vers la politique de confidentialité sur le formulaire.
- **Bucket photos passé en privé + URLs signées** (7 juillet 2026, vérifié en production) : auparavant, quiconque avait l'URL d'une photo pouvait y accéder indéfiniment, sans PIN. Le bucket `event-photos` est désormais privé (migration `20260707120000`) ; l'app génère des URLs signées d'1h (`createSignedUrl`) pour la galerie, l'upload et la synchro hors ligne. Les URLs partagées/mises en cache expirent au lieu de donner un accès public permanent. **Ordre de déploiement critique respecté** : code des URLs signées déployé et vérifié en prod *avant* de flipper le bucket, pour éviter toute fenêtre de photos cassées. Note : la clé anon peut toujours générer une URL signée pour n'importe quel chemin du bucket (pas de restriction par événement côté serveur, faute de vraie notion de membre) — c'est un vrai durcissement (fin des URLs publiques permanentes, expiration) mais pas un contrôle d'accès complet.

> **Écart avec le pitch deck investisseur** : le deck (`GATHER (3).pdf`) présente un parcours en 6 étapes dont 3 ne correspondaient pas à la réalité du code (capture offline, sync automatique, IA locale). Les points ci-dessus rendent maintenant **vraies les étapes « photos offline » et « sync automatique »**, sur la stack web actuelle, sans attendre l'app native. Seule l'étape « IA locale » (reconnaissance faciale) reste hors de portée sans app native — décision prise de la reporter à la construction de l'app native plutôt que de bricoler un succédané maintenant. Le deck contenait aussi une promesse de « chiffrement de bout en bout » incompatible avec le modèle actuel d'accès par PIN sans compte : à reformuler en « chiffrement au repos et en transit » (déjà vrai aujourd'hui) avant toute présentation à un investisseur technique.

**Reste dans la roadmap** : passer le bucket photos en privé avec URLs signées, mettre en place de vrais comptes hôtes.

## 9. Dette technique et limites connues (honnêteté totale)

0. **Offre Supabase gratuite = risque de panne totale (corrigé une fois, va se reproduire)** : le projet Supabase original (`qyiymuwkphiccomakiar`) a été mis en pause automatiquement pour inactivité et, passé 90 jours, n'était plus restaurable depuis le dashboard. Le 6 juillet 2026, il a fallu télécharger les sauvegardes (base + fichiers du bucket `event-photos`) et tout reconstruire dans un nouveau projet (`gather-mvp-restored`, `eu-west-1`). **Tant que le projet reste sur l'offre gratuite, ce risque se reproduira.** Passer sur l'offre Pro Supabase (~25$/mois, ne se met jamais en pause) est un prérequis absolu avant toute mise en production.
1. **Sécurité — chantier n°1 (largement traité, voir §8)** : `/admin` protégé, écritures sensibles (suppression photo, modification concours) derrière des routes serveur validées, **bucket photos passé en privé avec URLs signées** (7 juillet). Restent : brancher l'auth OTP sur les flux événement, mettre en place de vrais comptes hôtes (le `deviceId` localStorage reste falsifiable), et affiner le contrôle d'accès storage par événement (aujourd'hui la clé anon peut signer n'importe quel chemin du bucket).
2. ~~**Unicité du PIN non garantie**~~ — **corrigé le 6 juillet 2026** (retry automatique, voir §8).
3. ~~**Pas de pagination**~~ — **corrigé le 6 juillet 2026** (galerie + leads admin, voir §8).
4. ~~**Robustesse UX (alert/confirm natifs)**~~ — **corrigé le 6 juillet 2026** pour les notifications (toasts, voir §8) ; les `window.confirm` avant suppression restent volontairement (vraies confirmations bloquantes).
5. **Pipeline IA locale** (script Python de doublons) non déployable telle quelle (dépendance serveur). **Décision consciente** : reporté à la construction de l'app native (voir §8, écart deck) plutôt que de bricoler un succédané web maintenant.
6. **Fichier monolithe** : `app/events/[pin]/page.tsx` est remonté à ~1470 lignes malgré les extractions (voir §8) — la logique d'upload/file d'attente hors ligne ajoutée le 7 juillet a repris de la place. Un passage en hook personnalisé (`useUploadQueue`) permettrait de le sortir du composant.
7. **Branches accumulées** : nombreuses branches `codex/*` historiques sur GitHub (mergées pour la plupart) — sans impact sur le code, à purger à l'occasion.

> Nettoyage déjà effectué le 6 juillet 2026 : suppression des fichiers parasites versionnés (`tatus`, `top tracking .env.local`, `lint/`, fichiers IDE `.idea/`), retrait du script npm cassé `analytics:report`, réécriture du README, enrichissement du `.gitignore`, réalignement du `main` GitHub sur l'état à jour. Voir aussi §8 pour les chantiers de sécurité/robustesse traités le même jour.

---

## 10. Roadmap suggérée vers la production

**Priorité 0 — Éviter une nouvelle panne**
- Passer Supabase sur l'offre **Pro** (~25$/mois) dès que possible : sur l'offre gratuite, le projet se remet en pause après une période d'inactivité et devient irrécupérable après 90 jours (voir §9, point 0 — déjà vécu une fois le 6 juillet 2026). **Seul point encore non traité — nécessite un paiement, donc une action de Nico.**

**Priorité 1 — Sécurité (bloquant production)**
- ~~Protéger `/admin` et `/api/admin/*`~~ ✅ fait le 6 juillet 2026 (Basic Auth).
- ~~Déplacer les écritures sensibles (suppression photos, modification concours) derrière des routes serveur avec validation~~ ✅ fait le 6 juillet 2026.
- ~~Passer le bucket photos en privé + URLs signées~~ ✅ fait le 7 juillet 2026 (vérifié en production).
- ~~Fondations RGPD (politique de confidentialité, mentions légales)~~ ✅ fait le 7 juillet 2026 — **à faire relire par un juriste et compléter (raison sociale, contact) avant exploitation**.
- Mettre en place de vrais comptes hôtes (au lieu du `deviceId` localStorage) pour une vérification d'identité plus robuste — **reste à faire**, chantier plus lourd (lié à l'app native).

**Priorité 2 — Robustesse**
- ~~Unicité du PIN (retry automatique)~~ ✅ fait le 6 juillet 2026.
- ~~Pagination galerie/leads~~ ✅ fait le 6 juillet 2026.
- ~~CI GitHub Actions (lint + typecheck + build)~~ ✅ fait le 6 juillet 2026, tests inclus depuis.
- ~~Messages d'erreur agrégés à l'upload, toasts~~ ✅ fait le 6 juillet 2026.
- ~~Mettre en place Vitest + tests sur les flux critiques~~ ✅ fait le 6 juillet 2026 (PIN, permissions de suppression, expiration).
- ~~Réessai automatique à l'upload, capture hors ligne + synchronisation automatique~~ ✅ fait le 7 juillet 2026 (voir §8) — rend vraies les étapes « offline » et « sync automatique » du pitch deck sur la stack web actuelle.

**Priorité 3 — Métier & croissance**
- Compte utilisateur réel pour les hôtes (retrouver ses événements multi-appareils).
- **App mobile native (React Native ou natif)**, prérequis pour deux promesses du pitch deck qui ne sont pas faisables en web : offline-first « vrai » (tâche de fond même app fermée) et IA locale / reconnaissance faciale sur l'appareil. Le pipeline Capacitor actuel (webview) est embryonnaire et ne suffit pas pour ces deux usages.
- Industrialiser les analytics (cron réel pour `vercel_web_metrics_daily`).
- Poursuivre le découpage de `app/events/[pin]/page.tsx` (partage/QR, visionneuse et classement concours déjà extraits — voir §8) : envisager d'extraire la logique d'upload/file d'attente dans un hook dédié.

---

## 11. Contacts et accès à transmettre à Arnaud

- [ ] Accès **GitHub** au dépôt (collaborateur ou transfert d'organisation)
- [ ] Accès **Vercel** au projet (membre d'équipe)
- [ ] Accès **Supabase** au projet (dashboard + clés)
- [ ] Fichier `.env.local` (par canal sécurisé : gestionnaire de mots de passe, pas WhatsApp)
- [ ] Compte utilisé pour les PRs assistées par IA (Codex/Claude), si conservé
