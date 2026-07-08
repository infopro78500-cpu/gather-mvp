-- Permet de conserver les photos d'un événement même après expiration :
-- le job de purge (/api/cron/cleanup-expired) ignore les événements dont
-- preserve_photos = true. Utile pour garder des coffres de démonstration.
alter table if exists public.events
  add column if not exists preserve_photos boolean not null default false;
