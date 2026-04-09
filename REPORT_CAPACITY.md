# Rapport technique — capacité & goulots (Gather MVP)

## Résumé exécutif
- Projet Next.js **16.0.9** avec **App Router** (`/app`) et une **API Pages Router** résiduelle (`/pages/api/scan-hash.ts`).
- Les parcours clés reposent sur **Supabase** côté client (auth + table `events`) et **Supabase Storage** pour les photos (`event-photos`).
- La page d’évènement rafraîchit la liste Storage **toutes les 8 secondes** et **limite à 200** fichiers : c’est la principale source de charge côté Storage.
- Les uploads photos sont **validés uniquement côté client** (taille max 10 Mo, 20 fichiers par lot), sans validation serveur.
- Aucune **RLS/policies** ou schéma de tables n’est défini dans le repo (hors migration d’expiration), ce qui rend les règles d’accès non auditées ici.
- Les routes API Python (`/api/scan`, `/api/scan-hash`, `/api/events/[eventId]/upload-image`) sont **Node runtime** et s’appuient sur **stockage local** (`/ia_local`), ce qui est fragile en serverless.

---

## Étape 0 — Inventaire automatique (preuves)

### Framework & runtime
- **Next.js 16.0.9** (package.json) :
  ```json
  "next": "^16.0.9"
  ```
  _Source: `package.json`_

- **App Router** (présence dossier `app/`) + **Pages Router** résiduel (`pages/api/scan-hash.ts`).
  - `app/api/**` : routes App Router.
  - `pages/api/scan-hash.ts` : route Pages Router.

- **Node runtime** explicitement déclaré pour l’upload IA :
  ```ts
  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";
  ```
  _Source: `app/api/events/[eventId]/upload-image/route.ts`_

### Supabase usage
- **Version supabase-js** :
  ```json
  "@supabase/supabase-js": "^2.85.0"
  ```
  _Source: `package.json`_

- **Client Supabase** (env publics attendus) :
  ```ts
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
  ```
  _Source: `lib/supabaseClient.ts`_

- **Auth** : OTP par email
  ```ts
  await supabase.auth.signInWithOtp({ email });
  ```
  _Source: `app/login/page.tsx`_

- **Tables utilisées** :
  - `events` (insert/select)
  - `leads_landing` (insert/select)

- **Storage** : bucket `event-photos`
  ```ts
  const BUCKET_NAME = "event-photos";
  ```
  _Source: `app/events/[pin]/page.tsx`_

- **Migrations repo** : uniquement expiration events
  ```sql
  alter table if exists public.events
    add column if not exists expires_at timestamptz;
  alter table if exists public.events
    add column if not exists lifetime_days integer;
  ```
  _Source: `supabase/migrations/20250211120000_add_event_expiration.sql`_

### Déploiement
- **Pas de `vercel.json`** ou middleware dans le repo.
- `next.config.ts` minimal :
  ```ts
  const nextConfig: NextConfig = { reactStrictMode: true };
  ```
  _Source: `next.config.ts`_

### Commandes exécutées
- `npm ci`
- `npm run build` (échec réseau : fetch Google Fonts)
- `npm run lint`

---

## Étape 1 — Constats (appels Supabase & parcours)

### Où sont les appels Supabase (fichiers + fonctions)
| Fichier | Usage | Extrait clé |
| --- | --- | --- |
| `lib/supabaseClient.ts` | Client Supabase | `createClient(...)` |
| `app/page.tsx` | Auth + insert `events` | `supabase.auth.getUser()` + `supabase.from("events").insert(...)` |
| `app/join/page.tsx` | Lookup event | `supabase.from("events").select("id").eq("pin", trimmed)` |
| `app/events/[pin]/page.tsx` | Read event + Storage list/upload/delete | `supabase.from("events").select("*")` + `supabase.storage.from(BUCKET_NAME).list(...)` + `upload/remove` |
| `app/event/[eventId]/edit/page.tsx` | Read event by id | `supabase.from("events").select(...).eq("id", eventId)` |
| `app/admin/page.tsx` | Read leads | `supabase.from("leads_landing").select("*").order(...).limit(50)` |
| `app/api/lead/route.ts` | Insert lead | `supabase.from("leads_landing").insert([...])` |

### Parcours & volumes d’appels (DB/Storage/externes)

> Hypothèse : les appels `getPublicUrl` ne font **pas** d’appel réseau (fonction locale de génération d’URL).

| Parcours | DB (Supabase) | Storage | Externes | Preuves |
| --- | --- | --- | --- | --- |
| A) Landing / accueil | 0 à l’affichage; **1 DB insert** à la création (`events`) + **1 auth** (getUser) | 0 | 0 | `app/page.tsx` (`supabase.auth.getUser`, `supabase.from("events").insert`) |
| B) Login / signup | 0 DB, **1 auth** (OTP) | 0 | 0 | `app/login/page.tsx` (`signInWithOtp`) |
| C) Créer événement/coffre | **1 DB insert** + **1 auth** | 0 | 0 | `app/page.tsx` |
| D) Page publique de partage (événement) | **1 DB select** (event par PIN) | **1 Storage list** au chargement + **1 list/8s** (auto refresh) | Téléchargement d’images via URLs publiques | `app/events/[pin]/page.tsx` (`select`, `storage.list`, `setInterval` toutes 8s) |
| E) Upload photo(s) | 0 DB | **1 upload / photo** + **1 list** après batch | 0 | `app/events/[pin]/page.tsx` (`storage.upload`, `refreshPhotos`) |
| F) Listing / galerie | 0 DB (après event chargé) | **1 Storage list** (limit 200) + refresh 8s | Téléchargement d’images via URLs publiques | `app/events/[pin]/page.tsx` (`list`, `limit: 200`) |

---

## Étape 2 — Goulots (DB / Storage / API)

### Risques liés aux requêtes
1. **Rafraîchissement Storage toutes les 8s** sur la page événement → charge Storage linéaire avec le nombre d’utilisateurs simultanés.  
   _Preuve : `setInterval(..., 8000)` dans `app/events/[pin]/page.tsx`._
2. **Pas de pagination réelle côté Storage** (list `limit: 200` mais pas de `offset`/`cursor`). Si un event dépasse 200 photos, les anciennes ne sont plus visibles.  
   _Preuve : `list(..., { limit: 200 })` dans `app/events/[pin]/page.tsx`._
3. **Upload validé uniquement côté client** (taille max 10 Mo, 20 fichiers) → contournable.  
   _Preuve : `MAX_FILES = 20`, `MAX_FILE_SIZE_MB = 10` dans `app/events/[pin]/page.tsx`._
4. **Routes API sensibles sans rate limiting** (`/api/lead`, `/api/scan`, `/api/scan-hash`, `/api/events/[eventId]/upload-image`).
5. **Scripts Python + stockage local** (`/ia_local`) dans routes API → fragile/éphémère en serverless Vercel (perte de state, cold starts).  
   _Preuve : `spawn("python", ...)` + accès `/ia_local` dans `app/api/scan/route.ts` et `app/api/events/[eventId]/upload-image/route.ts`._

### Index DB probables manquants
- Requêtes principales filtrent sur `events.pin` et `events.id` → index sur `pin` recommandé.
- Admin liste `leads_landing` par `created_at` → index recommandé.

### RLS / sécurité
- Le repo **ne contient aucune politique RLS** ni schéma des tables (hors expiration). Rien ne prouve l’activation de RLS.
- Les appels Supabase utilisent la **clé anonyme publique** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) côté client et côté serveur (admin). Cela exige une RLS stricte côté DB.

### Cache / ISR
- Aucune page n’utilise ISR/SSR cache explicitement.
- La page d’événement étant un **client component**, elle ne bénéficie pas du caching côté Next.js.

---

## Étape 3 — Estimation de capacité (hypothèses explicites)

> Hypothèses communes :
> - **1 visite d’événement** = 1 `select` DB + 1 `storage.list` au chargement.
> - **Auto-refresh** : 1 `storage.list` toutes les 8s par utilisateur actif sur la page.
> - **Upload** : 1 `storage.upload` par photo + 1 `storage.list` à la fin du batch.
> - **Photo moyenne** : 2 Mo (hypothèse conservatrice).

### 1) MVP petit lancement
- **Utilisateurs actifs/jour** : ~100
- **Concurrents** : ~10
- **DB req/s (pic)** : ~0.05–0.2 (chargements + créations)
- **Storage list req/s** : ~1.25 (10 / 8s)
- **Bande passante photo** : 10 utilisateurs × 20 photos × 2 Mo ≈ **400 Mo** par « session événement »

### 2) Pic de partage (viral)
- **Utilisateurs actifs/jour** : ~10 000
- **Concurrents** : ~500
- **DB req/s (pic)** : ~5–10 (nouveaux chargements)
- **Storage list req/s** : ~62.5 (500 / 8s)
- **Bande passante photo** : 500 × 20 × 2 Mo ≈ **20 Go** par fenêtre de charge

### 3) Croissance modérée
- **Utilisateurs actifs/jour** : ~2 000
- **Concurrents** : ~100
- **DB req/s (pic)** : ~1–2
- **Storage list req/s** : ~12.5
- **Bande passante photo** : 100 × 20 × 2 Mo ≈ **4 Go** par fenêtre de charge

---

## Étape 4 — Actions prioritaires (max 7)

🟢 **Immédiat (1h)**
1. **Ajouter des index DB** pour `events.pin` et `leads_landing.created_at` (voir `/supabase/indexes_recommended.sql`).
2. **Limiter/valider côté serveur** les uploads (taille + MIME) pour l’API `/api/events/[eventId]/upload-image`.

🟡 **Bientôt (1–2 jours)**
3. **Pagination Storage + lazy loading** (cursor + “charger plus”), pour réduire la charge et éviter la limite `200`.
4. **Rate limiting** minimal sur `/api/lead` et `/api/events/[eventId]/upload-image` (ex: IP-based + captcha léger si formulaire public).
5. **RLS explicite** côté Supabase : politiques minimales `SELECT`/`INSERT` sur `events` et `leads_landing`. Exemple (à adapter) :
   ```sql
   alter table public.events enable row level security;
   create policy "events_public_read" on public.events for select using (true);
   create policy "events_public_insert" on public.events for insert with check (true);

   alter table public.leads_landing enable row level security;
   create policy "leads_insert" on public.leads_landing for insert with check (true);
   ```

🔴 **Plus tard (si succès)**
6. **Rafraîchissement intelligent** de la galerie (polling adaptatif ou realtime) pour éviter 1 list/8s constant.
7. **Déporter l’IA image** vers un service persistant (worker) plutôt que `/ia_local` en serverless.

---

## Fichiers livrés
- `REPORT_CAPACITY.md`
- `supabase/indexes_recommended.sql`
