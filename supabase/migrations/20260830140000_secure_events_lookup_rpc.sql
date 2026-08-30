-- Audit 30/08/2026 — ferme l'énumération des coffres (PHASE 1/2 : additif, sans risque).
--
-- Constat : la policy RLS « Allow public to select events » est en `using (true)` pour
-- anon/authenticated. La clé anon étant publique (embarquée dans le JS du site),
-- n'importe qui peut interroger l'API REST SANS filtre —
--   GET /rest/v1/events?select=id,name,pin
-- — et récupérer le nom + le PIN de TOUS les coffres, donc ouvrir /events/<pin> et voir
-- les photos de n'importe quel mariage. Le `.eq("pin", …)` du client n'est qu'un filtre
-- applicatif, pas une contrainte RLS. Le PIN comme secret est contourné.
--
-- Correctif : exposer la résolution d'un coffre (par pin OU par id) via une fonction
-- SECURITY DEFINER qui ne renvoie qu'UNE ligne et seulement les colonnes publiques
-- (jamais host_device_id / host_user_id). La suppression de la lecture directe se fait en
-- PHASE 2 (`20260830150000`), À APPLIQUER APRÈS LE DÉPLOIEMENT du code qui utilise cette
-- fonction — sinon l'ancien client (`.from("events")`) lirait 0 ligne.
--
-- Cette phase 1 est purement additive : l'ancien ET le nouveau code fonctionnent.
--
-- Résiduel connu (acceptable MVP) : un pin à 6 chiffres reste théoriquement
-- brute-forçable un appel à la fois (espace 1 M). À couvrir par un rate-limit au bord.

create or replace function public.get_public_event(
  p_pin text default null,
  p_id  uuid default null
)
returns table (
  id                 uuid,
  name               text,
  pin                text,
  is_closed          boolean,
  expires_at         timestamptz,
  lifetime_days      integer,
  contest_enabled    boolean,
  contest_enabled_at timestamptz,
  contest_ends_at    timestamptz,
  pro_enabled_at     timestamptz,
  table_count        integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id::uuid,
    e.name::text,
    e.pin::text,
    e.is_closed::boolean,
    e.expires_at::timestamptz,
    e.lifetime_days::integer,
    e.contest_enabled::boolean,
    e.contest_enabled_at::timestamptz,
    e.contest_ends_at::timestamptz,
    e.pro_enabled_at::timestamptz,
    e.table_count::integer
  from public.events e
  where (p_pin is not null and e.pin = p_pin)
     or (p_id  is not null and e.id  = p_id)
  limit 1;
$$;

-- La fonction est le seul chemin de lecture pour les rôles publics ; le service role
-- lit la table en direct (bypass RLS).
revoke execute on function public.get_public_event(text, uuid) from public;
grant  execute on function public.get_public_event(text, uuid) to anon, authenticated;
