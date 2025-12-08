-- Ajout des champs d'expiration pour les évènements
alter table if exists public.events
  add column if not exists expires_at timestamptz;

alter table if exists public.events
  add column if not exists lifetime_days integer;
