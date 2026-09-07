# Chantier — Comptes hôtes (authentification organisateur)

> **Statut** : cadrage validé le 31/08/2026, implémentation en cours. Socle de la V1 « lançable » (`decisions-validees.md §6`). Le *pourquoi* est au `journal-decisions.md` ; ce doc est le **plan de référence** du chantier.

## 1. Décision cadrante (Nico, 31/08)

**Modèle progressif** — la création d'un coffre reste **instantanée et sans compte** (jeton d'appareil, comme aujourd'hui). Le compte est un **upgrade proposé après** : « sécurise ton coffre / retrouve-le sur tous tes appareils » → connexion **magic link** (sans mot de passe) → le coffre est **rattaché** au compte (`host_user_id`). Zéro friction à l'entrée ; les invités restent **sans compte** (valeur cœur, non négociable).

## 2. Pourquoi (rappel)

Le jeton d'appareil (`host_device_id`) est un secret **rejouable, non-expirable, non-révocable** : suffisant pour la bêta, insuffisant pour un lancement public. Les comptes hôtes (POINT-SITUATION §4) le **remplacent comme autorité**, apportent la **gestion multi-appareils**, et sont un **prérequis** du paiement (rattacher une commande à un compte) et du segment écoles (RGPD).

## 3. État actuel (cartographie du 31/08)

- **Autorité d'identité** : `host_device_id` (localStorage `gather_device_id`, **clé intouchable**), écrit à la création (`app/page.tsx:58`), comparé côté serveur.
- **7 points host-gated serveur** (l'autorité réelle) : (1) primitive `/api/events/[id]/host`, (2) suppression photos, (3) réglages concours, (4) lecture mots privés, (5) modération mots privés, (6) activation Pro + nb tables, (7) commande présentoirs. Gates UI clientes = confort, reposent sur `{isHost}` de (1).
- **Auth existante = inerte** : `/login` appelle `signInWithOtp` mais sans `emailRedirectTo`, sans callback, sans session serveur ; page orpheline. `host_user_id` existe en base mais **quasi toujours NULL**. Pas de `@supabase/ssr`, pas de `middleware.ts` (le seul middleware est `proxy.ts` = Basic auth admin).
- **Mobile (Capacitor)** : aucun deep-link / App Link → le retour du magic-link ne rentre pas dans l'app native. `AndroidManifest.xml` n'a qu'un intent-filter LAUNCHER.

## 4. Architecture cible

### 4.1 Identité
`host_user_id` (= `auth.uid()`) devient l'**autorité principale**. `host_device_id` reste en **fallback** : (a) pour les coffres non encore réclamés, (b) juste après création avant le rattachement. Un appelant est hôte si **`host_user_id = auth.uid()` OU (legacy) `host_device_id = deviceId`**.

### 4.2 Session
Adopter **`@supabase/ssr`** (cookies) : client navigateur + client serveur + rafraîchissement en middleware. Le host-gating reste **applicatif** (routes serttait service-role qui lisent `host_user_id`/`host_device_id`) — pas de bascule RLS `auth.uid()` dans un premier temps (moindre risque, cohérent avec l'existant). RLS `auth.uid()` = optimisation possible plus tard.

### 4.3 Rattachement (claim)
Une route `POST /api/events/[id]/claim` (session requise) qui, si l'appelant prouve le jeton d'appareil du coffre (ou vient de le créer), pose `host_user_id = auth.uid()`. Depuis un autre appareil, le rattachement se fait via un lien/preuve (à préciser en Phase 2).

## 5. Plan par phases

> **Avancement au 31/08** : Phases 0, 1 et 2 **faites** (socle session + login magic link + dashboard « Mes coffres » + rattachement à la création + bascule des 7 gates en double-identité + route/UI de claim). Reste **Phase 3 (mobile)** + le rafraîchissement de session en middleware (Phase 0.5, différé).

- **Phase 0 — Socle session** : `@supabase/ssr`, helpers client/serveur, route de callback OTP (`/auth/confirm`), `/login` re-câblé (redirect + message), rafraîchissement de session fusionné dans `proxy.ts` sans casser le Basic auth admin. Un bouton « Me connecter / Mon compte » minimal.
- **Phase 1 — Compte & tableau de bord** : page « Mes coffres » (liste des events où `host_user_id = auth.uid()`), déconnexion. Rattachement à la création (si session active → `host_user_id` posé direct).
- **Phase 2 — Rattachement & bascule d'autorité** : flux « réclamer ce coffre » sur la page de gestion ; les 7 gates deviennent double-identité (`auth.uid()` OU `deviceId`) ; migration douce des coffres device→compte.
- **Phase 3 — Mobile** : deep-link / App Links (AndroidManifest + `assetlinks.json` + Universal Links iOS + listener `appUrlOpen`), stockage de session. **Sans jamais renommer `gather_device_id`.**

## 6. Sous-décisions (recommandations — je pars là-dessus sauf avis contraire)

| Sujet | Recommandation | Pourquoi |
|---|---|---|
| Méthode d'auth | **Magic link seul** pour V1 | Déjà amorcé, sans mot de passe = moins de friction et rien à stocker/fuiter. OAuth Google = plus tard |
| Gating | **Applicatif, double-identité** (`auth.uid()` OU device) | Cohérent avec les 7 routes actuelles, transition sans rupture. RLS `auth.uid()` = optimisation ultérieure |
| Mobile | **Web d'abord**, deep-link en Phase 3 | Le flux web débloque la V1 ; les App Links sont un chantier natif à part |
| Coffres existants | **Rattachables** (claim depuis le même appareil) | Personne n'est enfermé dehors ; pas de big-bang |

## 8. Phase 3 — Mobile (runbook)

**Décision d'architecture (31/08)** : l'app Next a des routes serveur → **pas d'export statique** possible. L'app native charge donc le **site live** (`capacitor.config.ts` → `server.url = https://usegather.app`) : une coque autour de `usegather.app`. L'auth marche alors nativement (même origine), et les **App Links / Universal Links** font ouvrir l'app par le magic link.

**Fait côté code (déployable, web non impacté)** :
- `capacitor.config.ts` : `server.url = https://usegather.app`, `androidScheme = https`.
- `@capacitor/app@^6` installé ; composant `MobileDeepLinkHandler` (monté dans `layout.tsx`) : sur `appUrlOpen`, route vers le chemin `/auth/…` interne (no-op sur le web).
- `AndroidManifest.xml` : intent-filter App Links (`autoVerify`, `https://usegather.app/auth…`).
- `public/.well-known/assetlinks.json` (Android) + `public/.well-known/apple-app-site-association` (iOS), servis sur `usegather.app` ; header `Content-Type: application/json` pour l'AASA (`next.config.ts`).
- `www/index.html` placeholder (pour que `cap sync` ait un webDir).

**À faire par toi (build natif — je ne peux ni produire les valeurs ni tester d'ici)** :
1. **Android — empreinte SHA256** : `keytool -list -v -keystore <ta clé>` (ou onglet App signing de la Play Console). La coller dans `public/.well-known/assetlinks.json` (remplacer `REMPLACER_PAR_EMPREINTE_SHA256…`). Empreintes debug ET release à mettre pendant les tests.
2. **iOS — Team ID** : depuis ton compte Apple Developer. La coller dans `public/.well-known/apple-app-site-association` (`REMPLACER_TEAM_ID`).
3. **Projet iOS** : `npx cap add ios` (le projet est incomplet), puis dans Xcode → cible App → Signing & Capabilities → **Associated Domains** → `applinks:usegather.app`.
4. **Sync + build** : redéployer d'abord (pour publier les `.well-known`), puis `npx cap sync`, ouvrir Android Studio / Xcode, builder sur un appareil.
5. **Vérifier** : `curl https://usegather.app/.well-known/assetlinks.json` et `…/apple-app-site-association` (200 + JSON) ; installer l'app ; se déconnecter ; demander un magic link ; **le clic doit ouvrir l'app** (pas le navigateur) et te connecter.

**Supabase** : les Redirect URLs incluent déjà `https://usegather.app/**` (fait le 31/08) — rien à changer.

**Point de vigilance store** : `server.url` charge du code distant → Apple peut regarder la « minimum functionality » (§4.2). L'app a des features natives réelles (caméra, partage, capture hors-ligne) — acceptable, mais à garder en tête pour la revue.

## 7. Points de vigilance

- **`gather_device_id` / `gather_voter_id` / `gather-upload-queue`** : jamais renommer (efface identité/votes/file d'upload).
- **`proxy.ts`** : le middleware fait déjà le Basic auth `/admin` ; la session Supabase doit s'y ajouter **sans** casser ça (matcher élargi avec soin).
- **Sécurité** : ne pas réintroduire de lecture anon de `host_user_id`/`host_device_id` (durcissement colonne `20260809120000` + RPC `get_public_event` à préserver).
- **Email** : le magic link part de Supabase Auth (SMTP) — vérifier le domaine d'envoi / la délivrabilité (lié à la notice « email bounce » vue le 31/08).
