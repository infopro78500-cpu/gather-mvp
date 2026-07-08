-- Sécurisation et durcissement de la collecte de leads.

-- 1) FUITE : la table leads_landing avait une policy SELECT ouverte au rôle
-- public, donc n'importe qui avec la clé anon (intégrée au bundle) pouvait
-- lire tous les emails/noms/messages. On la supprime : la lecture des leads
-- se fait désormais uniquement côté serveur via la clé service role
-- (dashboard admin protégé par Basic Auth).
drop policy if exists "insert" on public.leads_landing;

-- On retire aussi l'insertion publique anon : toutes les écritures passent
-- désormais par la route serveur /api/lead (service role), qui valide,
-- déduplique et filtre le spam. Impossible d'insérer directement dans la
-- table avec la clé anon en contournant ces contrôles.
drop policy if exists "allow_insert_public" on public.leads_landing;

-- 2) Anti-doublon : un email = un lead. Permet l'upsert côté API (une
-- nouvelle soumission met à jour la ligne au lieu de créer un doublon).
-- Index unique simple (non partiel) pour servir de cible à l'upsert
-- ON CONFLICT (email). L'email est requis/validé côté API.
create unique index if not exists leads_landing_email_key
  on public.leads_landing (email);

-- 3) Traçage de la source d'acquisition (canal).
alter table public.leads_landing add column if not exists utm_source text;
alter table public.leads_landing add column if not exists utm_medium text;
alter table public.leads_landing add column if not exists utm_campaign text;
alter table public.leads_landing add column if not exists referrer text;
