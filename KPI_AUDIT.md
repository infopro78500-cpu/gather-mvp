# Audit KPI – état des lieux

## Périmètre
Cet audit couvre l’existant dans le code (frontend, API Next.js, Supabase) sans modification fonctionnelle. Les KPI listés ci-dessous sont ceux réellement calculés ou affichés dans l’application.

## 1) Liste des KPI identifiés (fonctionnels)

### KPI « Leads » (dashboard admin)
- **Total leads**
- **Leads intéressés par l’investissement**
- **Leads intéressés par la contribution**
- **Leads intéressés par l’ambassade**
- **Leads intéressés par le beta-test**

### KPI « Concours photo » (page événement)
- **Nombre de votes par photo** (like count)
- **Classement (leaderboard) des photos**

### KPI « Galerie » (page événement)
- **Nombre total de photos** dans le coffre
- **Nombre de contributeurs actifs** (par device_id distinct détecté dans les fichiers)

### Analytics de navigation
- **Vercel Analytics** est chargé au niveau global (tracking de pages/événements, sans KPI explicitement exposés dans l’UI).

## 2) Détail par KPI (calcul, sources, timing)

### A. Dashboard leads (Admin)
- **Où c’est calculé** : backend (Server Component Next.js, page `/admin`).
- **Sources de données** : table Supabase `leads_landing` (colonnes `interest_*`, `created_at`, etc.).
- **Quand c’est calculé** : à chaque chargement de la page admin (requête directe Supabase).
- **Temps réel ou stocké** : calcul en temps réel à partir des enregistrements existants ; pas de stockage d’agrégats.

### B. Concours photo (votes + leaderboard)
- **Où c’est calculé** : backend (API route Next.js) + frontend (tri/affichage).
- **Sources de données** : table Supabase `photo_likes` (likes), table `events` (activation du concours + date de fin).
- **Quand c’est calculé** :
  - À l’ouverture de la page événement, via `GET /api/events/[eventId]/contest/state`.
  - Lors d’un vote, via `POST /api/events/[eventId]/contest/photos/[photoId]/toggle-like`, puis mise à jour locale de l’état (likes + leaderboard).
- **Temps réel ou stocké** : calcul en temps réel à partir des likes stockés ; pas d’agrégats persistés.

### C. Galerie (photo count + contributeurs actifs)
- **Où c’est calculé** : frontend (page événement `/events/[pin]`).
- **Sources de données** : bucket Supabase Storage `event-photos` (liste des fichiers) et métadonnées dérivées des noms de fichiers.
- **Quand c’est calculé** :
  - Au chargement de la page.
  - Puis via un auto-refresh (toutes les 8 secondes) qui reliste les fichiers.
- **Temps réel ou stocké** : calcul en temps réel à partir de la liste de fichiers ; pas d’agrégats persistés.

### D. Analytics (navigation)
- **Où c’est calculé** : service externe (Vercel Analytics).
- **Sources de données** : événements de navigation/usage collectés par Vercel.
- **Quand c’est calculé** : en continu côté Vercel, pas d’usage direct dans l’UI.
- **Temps réel ou stocké** : calcul externe, stockage Vercel.

## 3) Points techniques clés (API, hooks, services)

### Endpoints API liés aux KPI
- `POST /api/lead` → création de leads dans `leads_landing` (source du dashboard admin).
- `GET /api/events/[eventId]/contest/state` → agrège les likes (par photo) + leaderboard + état du concours.
- `POST /api/events/[eventId]/contest/photos/[photoId]/toggle-like` → toggle du like et recomptage du nombre de votes.

### Consommation côté frontend
- **Admin dashboard** : requête Supabase directe dans `/admin` (Server Component) pour charger les leads et calculer les stats.
- **Page événement** : hooks React (`useEffect`, `useMemo`) pour :
  - charger l’état du concours,
  - compter les photos,
  - calculer les contributeurs actifs.

### Services/middlewares
- **Supabase client** : utilisé pour toutes les queries (DB + Storage).
- **Vercel Analytics** : injecté dans `app/layout.tsx`.

## 4) Pages et composants UI utilisant des KPI

| Page / composant | KPI affichés | État d’avancement |
| --- | --- | --- |
| `/admin` | total leads + leads par type d’intérêt | **Affiché** (dashboard opérationnel) |
| `/admin/stats` | stats admin (non définies) | **Non branché** (placeholder) |
| `/events/[pin]` | nb de photos, contributeurs actifs, votes par photo, leaderboard | **Affiché** (fonctionnel) |
| `app/layout.tsx` | analytics (tracking) | **Actif** (pas d’UI associée) |

## 5) Manques / incohérences détectés

- **Page `/admin/stats`** : affichage vide (placeholder), aucune KPI concrète branchée.
- **Analytics Vercel** : présent mais pas de KPI exposé ou consolidé côté produit.
- **KPI “participants / vues / événements créés”** : aucune métrique de ce type n’existe dans le code actuel.
- **Agrégats stockés** : aucun KPI n’est persisté en base, tout est calculé à la volée.

## 6) Schéma de fonctionnement (texte)

1. **Leads** : un utilisateur remplit le formulaire “coming soon” → `POST /api/lead` → insertion dans `leads_landing` → `/admin` calcule et affiche les KPI lors du chargement.
2. **Concours photo** : la page événement récupère l’état du concours via `GET /contest/state` → les likes sont agrégés à la volée → leaderboard affiché ; lors d’un vote, `POST /toggle-like` met à jour la table `photo_likes` et renvoie le nouveau count.
3. **Galerie** : la page événement liste les fichiers du bucket `event-photos` → calcule le nombre de photos et le nombre de contributeurs actifs (device_id distinct) → affichage en UI.

## 7) Ce qui fonctionne aujourd’hui
- Dashboard leads (KPI par type d’intérêt) opérationnel.
- Votes/leaderboard du concours photo opérationnels.
- Comptage des photos et contributeurs actifs dans la galerie.

## 8) Ce qui est incomplet
- Page `/admin/stats` non implémentée.
- Absence de KPI de haut niveau (ex: nombre d’événements, participants, vues, rétention).
- Pas de rafraîchissement automatique côté leaderboard (hors actions de vote ou rechargement de page).

## 9) Ce qui est absent
- Tables d’agrégation / reporting.
- API dédiées “stats” (ex: `/api/admin/stats`).
- Visualisations avancées (charts, évolution temporelle, comparaisons).

## 10) Prochaines étapes possibles (non implémentées)

> À planifier si une roadmap KPI est souhaitée.

- Définir une **taxonomie KPI** produit (ex: événements créés, participants uniques, photos par événement, taux d’activation, rétention, etc.).
- Ajouter des **tables d’agrégats** (ex: `kpi_daily`) et/ou **vues matérialisées** pour éviter le recalcul à la volée.
- Créer une API `/api/admin/stats` (backend) pour centraliser la collecte et la diffusion des KPI.
- Ajouter des **politiques RLS** Supabase et rôles dédiés pour sécuriser l’accès aux stats.
- Créer une page `/admin/stats` fonctionnelle avec des graphiques de tendances.
