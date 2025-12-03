# Audit fonctionnel Gather (Next.js + Supabase)

Ce document synthétise l'état des fonctionnalités observées dans le dépôt, sans spéculation ni prise en compte du dossier `ia_local`.

## 1) Structure du projet
- **app/** : routes et pages Next.js avec séparation `core` (socle commun) et `versions` (landings V1/V2/V3-fêtes). Les routes fonctionnelles (`events`, `join`, `admin`, `coming-soon`, `infos`, `login`) sont implémentées dans `app/core/...` puis réexportées depuis leurs chemins publics. Composants UI partagés dans `app/core/components/` (EventHeader, LandingForm) et landing générique dans `app/core/landing/CreateEventLanding`.
- **app/api/** : route API `/api/lead` pour insérer des leads Supabase.
- **lib/** : utilitaires communs, notamment `supabaseClient` (instanciation Supabase avec variables d'environnement publiques) et `deviceId` (génération/stockage d'un identifiant local).
- **types/** : types partagés `EventData` et `Photo`.
- **public/** : assets (ex. `gather-logo.png`).
- **utils/** : script `image_utils.py` (hors périmètre fonctionnel web).

## 2) Pages et rôles
- **/ (app/page.tsx)** : point d'entrée qui choisit une landing (`v1`, `v2`, `v3-fetes`) via la variable d'env `GATHER_LANDING_VERSION`, en important les pages `app/versions/...`. La landing actuelle par défaut est V3 fêtes.
- **/join** : saisie PIN (validation regex 6 chiffres) puis redirection vers `/events/{pin}`.
- **/events/[pin]** : page évènement (chargement Supabase par PIN, en-tête, partage lien/QR, galerie avec upload/suppression/téléchargement ZIP, permissions deviceId/host).
- **/login** : login OTP e-mail via `supabase.auth.signInWithOtp` avec message de statut.
- **/coming-soon** : landing marketing avec formulaire `LandingForm`.
- **/admin** : tableau des leads (derniers 50) + compteurs simples.
- **/admin/stats** : page placeholder "en construction".
- **/infos/** : pages contenus statiques d'orientation (hors flux principaux).

## 3) Supabase et utilitaires
- **Client** : `lib/supabaseClient.ts` crée un client public à partir des variables d'environnement `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Device ID** : `lib/deviceId.ts` fournit un identifiant persistant stocké dans `localStorage` (créé via `crypto.randomUUID()` en l'absence d'ID).

## 4) Fonctionnalités observées
### Évènements
- **Création** : `app/core/landing/CreateEventLanding` (utilisée par `app/versions/v1|v2|v3-fetes`) génère un PIN 6 chiffres, vérifie le nom non vide, récupère `deviceId`, tente d'obtenir `userId` via `supabase.auth.getUser` (non bloquant), insère `{name,pin,host_device_id,host_user_id}` dans la table `events`, puis redirige vers `/events/{pin}`.
- **Chargement événement** : `app/events/[pin]/page.tsx` récupère l'évènement par `pin` via `maybeSingle`, gère erreurs/absence.
- **Permissions hôte** : comparaison `event.host_device_id === deviceId` pour activer la suppression universelle.

### Accès via PIN / QR
- **Page /join** : validation PIN 6 chiffres et redirection côté client.
- **Lien & QR** : dans `/events/[pin]`, construction `shareUrl` depuis `window.location.origin` et affichage champ + bouton copie + QRCode.

### Galerie photos (bucket `event-photos`)
- **Listing** : `refreshPhotos` liste jusqu’à 200 fichiers dans le dossier `event.id`, construit `publicUrl` pour chaque fichier, déduit `uploaderDeviceId` depuis le préfixe `deviceId__...`.
- **Affichage** : grille responsive, compteur, lightbox simple.

### Upload
- **Sélection** : input multiple, limite 20 fichiers, rejet silencieux >10Mo (skip).
- **Nom** : normalisation (NFKD, suppression accents/caractères spéciaux), format `${deviceId}__${timestamp}-${safeName}` sous chemin `${event.id}/...`.
- **Après upload** : ajout local puis `refreshPhotos`; input reset.

### Suppression
- **Individuelle** : bouton par photo si hôte ou uploader (deviceId). Confirmation JS, suppression via `storage.remove`, refresh.
- **Multiple** : mode sélection avec checkboxes, filtrage des paths autorisés par `canDeletePhoto`, confirmation, suppression via `storage.remove([...])`, refresh.

### Téléchargement ZIP
- **Global** : bouton "Télécharger toutes les photos (ZIP)" récupère chaque `photo.url`, ajoute au ZIP JSZip, fichier nommé `coffre-{pin}.zip`, déclenche `saveAs`. Pas de sélection partielle ni pagination.

### Auth utilisateur
- **Login OTP** : `app/login/page.tsx` envoie OTP par email. Aucune autre utilisation de session utilisateur côté évènement (seul `getUser` optionnel lors de la création pour renseigner `host_user_id`). Pas de vérification d’auth sur les actions.

### Landing / Leads
- **Formulaire** : `LandingForm` collecte email, nom, intérêts (4 cases), message, source fixe `coming_soon`. POST JSON vers `/api/lead`, affiche erreurs/succès, redirige selon intérêts (pages infos ou `/merci`).
- **API** : `/api/lead` insère la charge utile dans la table `leads_landing` via Supabase.
- **Admin** : `/admin` liste les 50 derniers leads (ordre inverse), affiche comptes par intérêt et tableau sans pagination.

## 5) Données Supabase déduites
- **Table `events`** : champs utilisés `id`, `name`, `pin`, `host_device_id`, `host_user_id` (peut être null).
- **Bucket `event-photos`** : répertoires par `event.id`, fichiers nommés `deviceId__timestamp-safeName`; URLs publiques générées via `getPublicUrl`.
- **Table `leads_landing`** : colonnes `email`, `full_name`, `interest_investing`, `interest_contributing`, `interest_ambassador`, `interest_beta_tester`, `message`, `source`; sélection limitée à 50 éléments côté admin, aucun offset.

## 6) Flux utilisateurs constatés
- **Flux 1 : Créer un évènement** — Saisie nom → génération PIN → récupération deviceId (+ userId facultatif) → insert Supabase → redirection `/events/{pin}`.
- **Flux 2 : Rejoindre un évènement** — Saisie PIN 6 chiffres sur `/join` → redirection `/events/{pin}` → fetch Supabase par PIN → affichage header + partage.
- **Flux 3 : Uploader des photos** — Sélection ≤20 fichiers → contrôle taille 10Mo → normalisation nom + chemin `event.id/...` → upload Supabase Storage → ajout local + refresh liste.
- **Flux 4 : Supprimer des photos** — Bouton (si hôte ou uploader) ou mode multi-sélection → confirmation → `storage.remove` → refresh.
- **Flux 5 : Télécharger en ZIP** — Parcours toutes les photos listées → fetch individuel → génération ZIP JSZip → téléchargement `coffre-{pin}.zip`.
- **Flux 6 : Lead collection** — Formulaire coming-soon → POST `/api/lead` → insert `leads_landing` → redirection pages infos/merci → admin `/admin` consulte les 50 derniers leads.

## 7) Points sensibles / limites
- **Sécurité/RLS** : aucune vérification d'auth ou de RLS côté client; permissions basées uniquement sur `deviceId` local pour la suppression; bucket public via URLs publiques.
- **Absence de pagination** : listing photos limité à 200 fichiers, pas de pagination ou lazy load; admin leads limité à 50 sans navigation.
- **Validations limitées** : upload ignore silencieusement fichiers >10Mo; création évènement ne vérifie pas unicité du PIN; join redirige sans vérifier existence avant navigation.
- **Robustesse** : pas de feedback toast (alert/confirm natifs seulement); téléchargements ZIP téléchargent toujours tout, pas de sélection.
- **Pages incomplètes** : `/admin/stats` vide; aucune vue "merci" dans code actuel (seule redirection présumée).

## 8) Synthèse
- **Fonctionnel** : création d’évènement avec PIN + host_device_id, accès par PIN/QR, galerie avec upload (multi, limites), suppression (simple/multi) conditionnée par deviceId/hôte, téléchargement ZIP global, collecte de leads via API et dashboard simple.
- **Partiel/fragile** : absence de validations serveur, dépendance totale au `localStorage` pour permissions, pas de pagination, auth OTP non utilisée dans le flux événementiel, limitations de taille sans message agrégé.
- **Manquant/esquissé** : RLS/policies, contrôle d’accès hôte/auth, gestion sélectionnelle du téléchargement, stats admin, vérification existence événement avant redirection.
