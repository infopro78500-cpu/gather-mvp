-- Nettoyage post-Security-Advisor (30/08/2026) : 0 erreur déjà atteint, on réduit les warnings.
-- Ne touche PAS au comportement applicatif : orphelins v1, search_path, droits EXECUTE.

-- A) Orphelins de la v1 analytics (20250320), remplacés par analytics_log_vote_cast en v2 (20250325)
--    mais jamais supprimés. L'ancienne fonction écrit dans des colonnes disparues (event_name/meta) :
--    si son trigger subsiste, tout vote échoue. Le "if exists" est sûr dans tous les cas.
drop trigger if exists analytics_log_photo_liked on public.photo_likes;
drop function if exists public.analytics_log_photo_liked();

-- B) upsert_vercel_metrics (SECURITY DEFINER) : figer le search_path ("Function Search Path Mutable")
alter function public.upsert_vercel_metrics(date, integer, integer, numeric)
  set search_path = '';

-- C) "Public Can Execute SECURITY DEFINER" : retirer EXECUTE à public/anon/authenticated.
--    Les analytics_log_* sont des fonctions de TRIGGER (exécutées sous le propriétaire de la table,
--    indépendamment de tout droit EXECUTE) -> les révoquer ne casse aucun trigger.
revoke execute on function public.analytics_log_event_created()   from public, anon, authenticated;
revoke execute on function public.analytics_log_event_deleted()   from public, anon, authenticated;
revoke execute on function public.analytics_log_contest_enabled() from public, anon, authenticated;
revoke execute on function public.analytics_log_member_joined()   from public, anon, authenticated;
revoke execute on function public.analytics_log_photo_uploaded()  from public, anon, authenticated;
revoke execute on function public.analytics_log_vote_cast()       from public, anon, authenticated;

--    upsert_vercel_metrics est appelée côté serveur (service role) : on retire public, on garde service_role.
revoke execute on function public.upsert_vercel_metrics(date, integer, integer, numeric) from public, anon, authenticated;
grant  execute on function public.upsert_vercel_metrics(date, integer, integer, numeric) to service_role;
