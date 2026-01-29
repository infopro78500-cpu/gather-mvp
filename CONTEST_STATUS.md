# CONTEST_STATUS

## A) Git / PR / branches
- Branch actuelle: `work`.
- Changements locaux non commit: aucun.
- Branche/PR concours: aucune branche dédiée trouvée localement. Historique git indique un merge PR "add-contest-mode".
- Commits récents pertinents:
  - `7cc37cc` — Add event contest mode
  - `9b82d36` — Merge pull request #78 from infopro78500-cpu/codex/add-contest-mode-for-event-photos
  - `9488986` — Merge branch 'codex-fix' into codex-contest

## B) Database / Supabase
- `events` contient `contest_enabled` (boolean default false) + `contest_ends_at` (timestamptz) dans la migration.
- Table `photo_likes` créée (id uuid, event_id, photo_id, voter_id, created_at) avec contraintes d’unicité sur (photo_id, voter_id).
- Migrations SQL: `supabase/migrations/20250305120000_add_event_contest_mode.sql`.
- RLS activé sur `photo_likes` avec policies:
  - `Photo likes are readable`: lecture ouverte.
  - `Voters can like photos when contest is open`: insert autorisé si voter_id non vide + event contest_enabled + ends_at non dépassé.
  - `Voters can remove likes when contest is open`: delete autorisé mêmes conditions.

> Note: aucune vérification DB distante effectuée. Les conclusions proviennent des migrations + du code.

## C) API
- Routes concours présentes:
  - `GET /api/events/[eventId]/contest/state`
  - `POST /api/events/[eventId]/contest/photos/[photoId]/toggle-like`
- Blocage si concours OFF / vote clos:
  - `state`: renvoie contestEnabled=false sans likes/leaderboard.
  - `toggle-like`: 403 si contest_enabled=false, 403 si ends_at dépassé.
- `voterId`:
  - `state`: lu en query string `?voterId=...` et compare à `photo_likes.voter_id`.
  - `toggle-like`: requis dans le body JSON `{ voterId }`, validé non vide.

## D) Frontend
- Admin event (page édition): section "Concours" avec toggle + fin optionnelle + bouton sauvegarde.
- Page event/photos:
  - Likes + compteur + état aimé (bouton).
  - Classement (leaderboard) si concours actif.
  - Countdown affiché si ends_at.
- Helper `getVoterId()` existe (localStorage + cookie + uuid).

## E) Tests / release
- `RELEASE_REPORT.md` mentionne le mode concours + checklist dédiée.
- Scripts check/smoke/release:verify présents dans `package.json` (non exécutés dans cet audit).
- Points à surveiller connus (depuis RELEASE_REPORT): smoke test sur données dynamiques, instructions Windows pour `SMOKE_BASE_URL`, contraintes runtimes Node pour routes qui spawn Python.

---

## Statut global
🟡 **partiel** (fonctionnalités principales présentes dans migrations + API + UI, mais pas validées en prod/DB distante).

## Ce qui manque EXACTEMENT (max 7)
1) Vérifier en base distante que la migration a été appliquée (colonnes + table + RLS).
2) Exécuter `release:verify` / smoke pour valider le comportement réel.
3) Vérifier en situation réelle: votes bloqués après ends_at.
4) Vérifier en situation réelle: leaderboard reflète bien les likes.
5) Vérifier que les endpoints renvoient les erreurs attendues côté UI.

## Chemin le plus court pour terminer (max 5 étapes)
1) Appliquer la migration contest si non déjà appliquée (Supabase SQL editor ou CLI).
2) Déployer et exécuter `npm run release:verify` (ou `check:release` + `smoke`).
3) Tester un event avec contest_enabled=false (aucun like/leaderboard, endpoints refusent).
4) Tester un event avec contest_enabled=true + ends_at dans le futur (likes/leaderboard/compte à rebours ok).
5) Tester ends_at dépassé (API 403 + UI "Vote terminé").
