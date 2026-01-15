-- Ajout du mode concours sur les évènements + votes
alter table if exists public.events
  add column if not exists contest_enabled boolean not null default false,
  add column if not exists contest_ends_at timestamptz;

create table if not exists public.photo_likes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  photo_id uuid not null,
  voter_id text not null,
  created_at timestamptz not null default now(),
  unique (photo_id, voter_id)
);

create index if not exists photo_likes_event_id_idx on public.photo_likes (event_id);
create index if not exists photo_likes_photo_id_idx on public.photo_likes (photo_id);

alter table public.photo_likes enable row level security;

create policy "Photo likes are readable"
  on public.photo_likes
  for select
  using (true);

create policy "Voters can like photos when contest is open"
  on public.photo_likes
  for insert
  with check (
    trim(coalesce(voter_id, '')) <> ''
    and exists (
      select 1
      from public.events
      where events.id = event_id
        and events.contest_enabled = true
        and (events.contest_ends_at is null or now() <= events.contest_ends_at)
    )
  );

create policy "Voters can remove likes when contest is open"
  on public.photo_likes
  for delete
  using (
    trim(coalesce(voter_id, '')) <> ''
    and exists (
      select 1
      from public.events
      where events.id = event_id
        and events.contest_enabled = true
        and (events.contest_ends_at is null or now() <= events.contest_ends_at)
    )
  );
