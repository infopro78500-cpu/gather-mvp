-- Chantier « mariage » : galeries par table + mots privés aux mariés.
-- Cadre acté le 07/08/2026 (docs/strategie/idee-galeries-par-table.md §4.1) :
-- le partage vers l'album commun reste le défaut, étiqueté par table ; le
-- privé est une MESSAGERIE (un mot + quelques photos), pas une galerie.
-- L'ensemble est une OPTION PRO de l'événement (pro_enabled_at).

-- L'option Pro et le nombre de tables deviennent des données de l'événement.
alter table events add column if not exists pro_enabled_at timestamptz;
alter table events add column if not exists table_count integer;

-- Étiquette de table des photos PARTAGÉES (album commun). La photo reste un
-- objet storage plat (eventId/fichier) : l'étiquette vit ici, en base — zéro
-- risque pour les consommateurs existants (ZIP, purge, impression).
create table if not exists photo_tables (
  path text primary key,                  -- chemin storage complet (eventId/fichier)
  event_id text not null,
  table_label text not null,
  created_at timestamptz not null default now()
);
create index if not exists photo_tables_event_idx on photo_tables (event_id);

-- Les « petits mots » aux mariés : des MESSAGES, avec 0 à 3 photos jointes.
-- Les photos jointes vivent dans le bucket private-notes (service-role
-- uniquement) : la promesse « seuls les mariés y ont accès » est tenue par
-- le serveur, pas par l'interface (§4.3).
create table if not exists private_notes (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  table_label text,
  author_name text,
  message text not null,
  photo_paths jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists private_notes_event_idx on private_notes (event_id, created_at desc);

-- RLS sans policy = accès service-role uniquement : toute lecture/écriture
-- passe par les routes API, qui vérifient l'hôte (host_device_id).
alter table photo_tables enable row level security;
alter table private_notes enable row level security;

-- Bucket dédié aux photos des mots privés : PRIVÉ et sans aucune policy anon
-- (contrairement à event-photos, accessible aux invités). Chemins : eventId/….
insert into storage.buckets (id, name, public)
values ('private-notes', 'private-notes', false)
on conflict (id) do nothing;
