-- Corrige les 2 erreurs du Security Advisor Supabase (30/08/2026).
--
-- Origine : la migration 20250325120000 a recréé la table public.analytics_events
-- sans réactiver la RLS ni recréer les policies, et la vue public.event_kpi_engagement
-- (20250312120000) n'a jamais été passée en security_invoker ni révoquée des rôles publics.
--
-- Contrainte : les coffres/photos/membres sont écrits avec la clé ANON (client),
-- donc les triggers analytics s'exécutent sous le rôle `anon`. On les passe en
-- SECURITY DEFINER (search_path verrouillé) pour qu'ils puissent alimenter la table
-- analytics_events désormais protégée par RLS. Les lectures analytics se font toutes
-- côté serveur via le service role, qui bypasse la RLS.

-- 1) Triggers analytics -> SECURITY DEFINER + search_path figé (bypass RLS à l'écriture)
alter function public.analytics_log_event_created()   security definer set search_path = '';
alter function public.analytics_log_event_deleted()   security definer set search_path = '';
alter function public.analytics_log_contest_enabled() security definer set search_path = '';
alter function public.analytics_log_member_joined()   security definer set search_path = '';
alter function public.analytics_log_photo_uploaded()  security definer set search_path = '';
alter function public.analytics_log_vote_cast()       security definer set search_path = '';

-- 2) analytics_events -> RLS activée (deny-all pour anon/authenticated ; service role bypasse)
--    Écriture uniquement via les triggers SECURITY DEFINER ci-dessus ;
--    lecture uniquement côté serveur via le service role. Aucune policy anon/authenticated = volontaire.
alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;

-- 3) event_kpi_engagement -> ne s'exécute plus avec les droits du propriétaire, et cachée des rôles publics
alter view public.event_kpi_engagement set (security_invoker = on);
revoke all on public.event_kpi_engagement from anon, authenticated;
