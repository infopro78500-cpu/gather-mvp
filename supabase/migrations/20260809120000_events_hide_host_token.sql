-- Audit 09/08/2026 — le jeton d'organisateur ne doit plus être lisible par la
-- clé anonyme. Jusqu'ici, l'API REST anon renvoyait host_device_id (et
-- host_user_id) de n'importe quel coffre : ce jeton étant la SEULE preuve
-- d'identité vérifiée par les routes serveur (suppression de photos, mots
-- privés aux mariés, activation Pro, commande de présentoirs), le lire
-- suffisait à usurper l'organisateur. Les écritures étaient déjà protégées
-- par RLS ; c'est la lecture des colonnes-jetons qu'on ferme ici.
--
-- Méthode : privilèges au niveau COLONNE. On révoque le SELECT de table
-- (qui donne accès à toutes les colonnes) puis on ne re-grante que les
-- colonnes publiques — host_device_id, host_user_id et contest_enabled_by
-- (identifiants d'appareil) en sont désormais exclus.
--
-- ⚠️ À appliquer APRÈS le déploiement du code qui ne lit plus ces colonnes
-- côté client (routes /api/events/[id]/host + selects explicites). Sinon un
-- `select("*")` anon encore en cache échouerait.

revoke select on public.events from anon, authenticated;

grant select (
  id,
  name,
  pin,
  created_at,
  is_closed,
  expires_at,
  lifetime_days,
  contest_enabled,
  contest_enabled_at,
  contest_ends_at,
  photos_purged_at,
  preserve_photos,
  pro_enabled_at,
  table_count
) on public.events to anon, authenticated;

-- L'INSERT de création (coffre sans compte) et les UPDATE des routes serveur
-- (service-role) ne sont pas concernés : seuls les privilèges de LECTURE
-- changent ici.
