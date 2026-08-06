-- File d'impression Printerkut — transposée du système éprouvé Renka/Lika-NFC.
-- 1 ligne print_queue = 1 pièce à imprimer (une photo × un produit × un format).
-- 1 ligne print_batches = 1 lot envoyé à l'atelier (UN matériau par lot).
-- Les fichiers de production sont FIGÉS à la commande : copiés depuis
-- event-photos vers le bucket dédié print-files (les coffres expirent en
-- 24 h / 7 jours, une commande d'impression doit survivre à la purge).

create table if not exists print_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  event_id text not null,
  order_ref text not null,                -- UG-aammjj-xxxx (regroupement commande)
  customer_name text not null,
  customer_email text not null,
  shipping_address jsonb,                 -- collectée au checkout (leçon Renka : absente là-bas)

  product text not null,                  -- clé catalogue (poster, canvas, forex, dibond, plexi)
  format text not null,                   -- "30x40", "70x100"…
  material text not null,                 -- clé de regroupement machine — un lot = UN matériau
  price_cents integer not null,

  source_path text not null,              -- chemin d'origine dans event-photos (traçabilité)
  file_path text not null,                -- copie figée dans print-files (queue/…)
  px_width integer,                       -- dimensions pixel si connues (badge résolution)
  px_height integer,

  status text not null default 'pending' check (status in ('pending', 'batching', 'batched')),
  batch_id uuid,
  slot_index integer,                     -- position dans le lot → bon de tri
  claimed_at timestamptz,                 -- détection des claims zombies
  paid_at timestamptz,                    -- posé par le webhook Stripe (à venir) ou l'admin
  shipped_at timestamptz,
  notes text
);

create index if not exists print_queue_status_created_idx on print_queue (status, created_at);
create index if not exists print_queue_order_ref_idx on print_queue (order_ref);
create index if not exists print_queue_batch_idx on print_queue (batch_id);

create table if not exists print_batches (
  id uuid primary key,
  created_at timestamptz not null default now(),
  piece_count integer not null,
  material text not null,
  file_paths jsonb not null,              -- chemins print-files des pièces, dans l'ordre des slots
  emailed_at timestamptz,                 -- null = email atelier non parti (le cron retente l'envoi ? non : liens au dashboard)
  printed_at timestamptz                  -- marqué au dashboard atelier
);

-- Service role uniquement : RLS activé sans policy publique (même durcissement
-- que leads — cf. 20260707130000_secure_and_harden_leads.sql).
alter table print_queue enable row level security;
alter table print_batches enable row level security;

-- Bucket privé dédié aux fichiers de production (aucune policy storage :
-- accès service role + URLs signées générées à la demande).
insert into storage.buckets (id, name, public)
values ('print-files', 'print-files', false)
on conflict (id) do nothing;
