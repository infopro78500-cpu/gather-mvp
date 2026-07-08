-- Suivi de la purge des photos d'un événement expiré. Renseigné par le job
-- de nettoyage (/api/cron/cleanup-expired) une fois les fichiers du bucket
-- supprimés, pour ne pas retraiter le même événement chaque jour.
alter table if exists public.events
  add column if not exists photos_purged_at timestamptz;
