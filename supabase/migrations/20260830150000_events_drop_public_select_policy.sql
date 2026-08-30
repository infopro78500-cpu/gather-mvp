-- Audit 30/08/2026 — ferme l'énumération des coffres (PHASE 2/2 : verrouillage).
--
-- ⚠️ À APPLIQUER APRÈS le déploiement du code qui lit les coffres via
-- public.get_public_event() (migration 20260830140000 + bascule client join /
-- events/[pin] / edit). Tant que l'ancien client `.from("events").select()` est en
-- ligne, cette suppression lui renverrait 0 ligne (rejoindre / galerie / gestion cassés).
--
-- Effet : la table `events` n'est plus lisible en direct par anon/authenticated.
-- Seul le service role (bypass RLS) et la fonction SECURITY DEFINER get_public_event
-- y accèdent. Fin de l'énumération en masse. Lève aussi le warning Security Advisor
-- « RLS Policy Always True » sur public.events.
--
-- La policy INSERT « Allow authenticated users to insert events » (création de coffre
-- sans compte) n'est pas concernée.

drop policy if exists "Allow public to select events" on public.events;
