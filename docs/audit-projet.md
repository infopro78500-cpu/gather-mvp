# Audit projet Usegather — 09/08/2026

> Périmètre : sécurité et intégrité du modèle d'accès, au-delà de l'impression
> (déjà auditée le 08/08, cf. `audit-impression.md`). Méthode : tests réels
> contre l'API Supabase avec la clé anonyme, lecture du modèle d'identité
> `host_device_id`, revue des accès client à la table `events`.
> Demandé par Nico (« fait un audit et améliore les choses pas encore au point »).

## 1. Faille principale — le jeton d'organisateur était lisible (corrigée)

**Constat.** Tout le contrôle d'accès de l'app repose sur `host_device_id` : un
identifiant d'appareil, généré au premier lancement, stocké en base à la
création du coffre. Les routes serveur le comparent au `deviceId` envoyé par le
client pour autoriser les gestes réservés à l'organisateur — supprimer des
photos, régler le concours, **lire les mots privés aux mariés**, activer
l'option Pro, commander les présentoirs.

Or la clé anonyme pouvait **lire ce jeton** via l'API REST (`GET
/rest/v1/events?select=host_device_id`), et même **énumérer tous les coffres**.
Conséquence : connaître (ou balayer) un coffre suffisait à récupérer son jeton,
puis à le rejouer vers les routes serveur pour **se faire passer pour
l'organisateur**. La confidentialité des mots privés — promise « garantie
serveur » le 08/08 — tombait à la racine.

**Ce qui allait déjà bien.** Les ÉCRITURES étaient protégées : un `PATCH` anon
sur `events` est filtré par RLS (0 ligne modifiée). Il n'y avait donc pas de
prise de contrôle par écriture directe — seulement par lecture du jeton puis
rejeu. La faille était réelle mais bornée à ce vecteur.

**Correctif (ce commit + une migration à appliquer).**
1. Le jeton ne transite plus par le navigateur. Nouvelle route
   `POST /api/events/[id]/host` qui compare côté serveur et ne renvoie qu'un
   booléen `{ isHost }`. Les deux pages qui lisaient `host_device_id`
   (`events/[pin]`, `event/[id]/edit`) l'obtiennent maintenant par là.
2. Les `select` client sur `events` n'incluent plus les colonnes-jetons
   (`select("*")` → liste explicite de colonnes publiques).
3. La page de gestion **n'affiche plus le jeton à l'écran** (il y était en
   clair sous « Hôte ») — remplacé par « Vous êtes l'organisateur ».
4. **Migration `20260809120000`** (à appliquer par Nico) : privilèges au niveau
   colonne — `host_device_id`, `host_user_id`, `contest_enabled_by` deviennent
   illisibles pour `anon`/`authenticated`, même en les demandant explicitement.
   C'est la défense en profondeur qui ferme définitivement le vecteur.

**Ordre de déploiement.** Le code d'abord (il ne lit plus ces colonnes), la
migration ensuite (sinon un `select("*")` encore en cache échouerait). Vérifié
en réel : la route distingue le vrai hôte de tout autre appareil, la galerie et
la page de gestion fonctionnent dans les deux rôles, le jeton n'apparaît plus.

## 2. Points vérifiés et sains

- **Écritures `events` en anon** : bloquées par RLS (testé).
- **Identité cohérente** : création, galerie et gestion utilisent toutes la
  même fonction `getDeviceId()` / clé `gather_device_id` — pas de divergence de
  jeton entre les pages (une hypothèse de bug écartée par le test).
- **Création de coffre** : `insert` sans relecture → insensible à la migration
  column-revoke (l'INSERT reste granté, seule la lecture change).
- **Tables du chantier mariage** (`photo_tables`, `private_notes`) : RLS
  service-role, bucket `private-notes` sans policy anon — le stockage des mots
  privés était déjà correct ; c'était l'AUTORISATION de lecture (le jeton) qui
  fuyait, pas les données elles-mêmes.

## 3. Risques résiduels — documentés, non bloquants

| Sujet | Nature | Note |
|---|---|---|
| **Énumération des PINs** en anon | Modéré | Le PIN est semi-public (imprimé sur QR/présentoirs), mais lister tous les coffres d'un coup facilite le balayage. À traiter avec un rate-limiting (Upstash/Vercel KV) le jour de l'ouverture publique — pas avant. |
| **`host_device_id` = secret partagé** | Structurel | Le modèle « jeton d'appareil » reste un secret rejouable si intercepté (il n'expire pas, ne se révoque pas). Suffisant pour un MVP bêta ; une vraie auth organisateur (compte + session) est le chantier de fond quand le produit s'ouvre. `host_user_id` existe déjà en base pour ça. |
| **Supabase EXCEEDING USAGE** | Infra | Plan gratuit dépassé (dashboard Nico) — upgrade payant urgent, indépendant de la sécurité. |

## 4. Règle de lecture

Photographie de l'état au 09/08/2026. La faille §1 est corrigée côté code ;
elle n'est **pleinement fermée qu'une fois la migration `20260809120000`
appliquée** dans Supabase. Décision de sécurité consignée au
`journal-decisions.md`.
