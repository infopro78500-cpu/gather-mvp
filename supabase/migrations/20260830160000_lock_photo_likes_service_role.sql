-- Audit sécurité 31/08/2026 — verrouillage de public.photo_likes (finding #2).
--
-- ⚠️ À APPLIQUER APRÈS le déploiement du code qui fait passer les routes concours
-- en service role (contest/state, toggle-like) + admin/stats. Avant ce déploiement,
-- ces routes lisent/écrivent photo_likes en anon et dépendent des policies ci-dessous.
--
-- Constat : la table avait une policy SELECT « Photo likes are readable » en `using(true)`
-- (migration 20250305120000). Avec la clé anon publique, `GET /rest/v1/photo_likes?select=*`
-- renvoyait `event_id, photo_id, voter_id` de TOUS les coffres → fuite inter-coffres +
-- dé-anonymisation des votes (voter_id = jeton d'appareil). De plus l'INSERT n'était pas
-- lié au voter_id de l'appelant → bourrage d'urnes possible en REST direct (contournant la route).
--
-- Correctif : la table n'est accédée QUE par les routes serveur en service role (bypass RLS).
-- On retire donc toutes les policies exposées aux rôles publics + les grants de table.
-- RLS reste activée : anon/authenticated = deny-all, service role = bypass.

drop policy if exists "Photo likes are readable" on public.photo_likes;
drop policy if exists "Voters can like photos when contest is open" on public.photo_likes;
drop policy if exists "Voters can remove likes when contest is open" on public.photo_likes;

revoke all on public.photo_likes from anon, authenticated;
