-- Product analytics event log (durable) + KPIs

create extension if not exists pgcrypto;

-- Preserve any existing analytics events table (from earlier migrations)
alter table if exists public.analytics_events rename to analytics_events_old;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  event_id uuid null,
  is_contest boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  actor_id text null,
  device_id text null
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at);
create index if not exists analytics_events_type_created_at_idx
  on public.analytics_events (event_type, created_at);
create index if not exists analytics_events_event_id_created_at_idx
  on public.analytics_events (event_id, created_at);
create index if not exists analytics_events_is_contest_created_at_idx
  on public.analytics_events (is_contest, created_at);

-- Migrate legacy analytics_events data if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'analytics_events_old'
  ) THEN
    INSERT INTO public.analytics_events (
      created_at,
      event_type,
      event_id,
      is_contest,
      metadata,
      actor_id,
      device_id
    )
    SELECT
      legacy.created_at,
      CASE legacy.event_name
        WHEN 'event_created' THEN 'event_created'
        WHEN 'event_joined' THEN 'member_joined'
        WHEN 'photo_uploaded' THEN 'photo_uploaded'
        WHEN 'photo_liked' THEN 'vote_cast'
        WHEN 'contest_enabled' THEN 'contest_enabled'
        ELSE legacy.event_name
      END AS event_type,
      legacy.event_id,
      CASE
        WHEN legacy.event_name = 'event_created' THEN
          COALESCE((legacy.meta ->> 'contest_enabled')::boolean, false)
        WHEN legacy.event_name = 'contest_enabled' THEN true
        ELSE COALESCE(events.contest_enabled, false)
      END AS is_contest,
      COALESCE(legacy.meta, '{}'::jsonb) || jsonb_build_object(
        'migrated_from', 'analytics_events_v1',
        'actor_member_id', legacy.actor_member_id,
        'actor_user_id', legacy.actor_user_id
      ) AS metadata,
      COALESCE(legacy.actor_user_id::text, legacy.actor_member_id::text) AS actor_id,
      NULL::text AS device_id
    FROM public.analytics_events_old AS legacy
    LEFT JOIN public.events ON events.id = legacy.event_id;
  END IF;
END $$;

DROP TABLE IF EXISTS public.analytics_events_old;

create or replace function public.analytics_log_event_created()
returns trigger
language plpgsql
as $$
begin
  insert into public.analytics_events (
    event_type,
    event_id,
    is_contest,
    metadata
  )
  values (
    'event_created',
    new.id,
    coalesce(new.contest_enabled, false),
    jsonb_build_object(
      'name', new.name,
      'pin', new.pin
    )
  );
  return new;
end;
$$;

create or replace function public.analytics_log_event_deleted()
returns trigger
language plpgsql
as $$
begin
  insert into public.analytics_events (
    event_type,
    event_id,
    is_contest,
    metadata
  )
  values (
    'event_deleted',
    old.id,
    coalesce(old.contest_enabled, false),
    jsonb_build_object(
      'name', old.name,
      'pin', old.pin
    )
  );
  return old;
end;
$$;

create or replace function public.analytics_log_contest_enabled()
returns trigger
language plpgsql
as $$
begin
  if (
    (coalesce(old.contest_enabled, false) = false and coalesce(new.contest_enabled, false) = true)
    or (old.contest_enabled_at is null and new.contest_enabled_at is not null)
  ) then
    insert into public.analytics_events (
      event_type,
      event_id,
      is_contest,
      metadata
    )
    values (
      'contest_enabled',
      new.id,
      true,
      jsonb_build_object(
        'contest_enabled_at', new.contest_enabled_at,
        'contest_ends_at', new.contest_ends_at
      )
    );
  end if;
  return new;
end;
$$;

create or replace function public.analytics_log_member_joined()
returns trigger
language plpgsql
as $$
declare
  event_is_contest boolean;
  event_missing boolean := false;
  event_metadata jsonb;
begin
  select events.contest_enabled
    into event_is_contest
  from public.events
  where events.id = new.event_id;

  if not found then
    event_is_contest := false;
    event_missing := true;
  end if;

  event_metadata := jsonb_build_object(
    'member_id', new.id,
    'nickname', new.nickname
  );

  if event_missing then
    event_metadata := event_metadata || jsonb_build_object('event_missing', true);
  end if;

  insert into public.analytics_events (
    event_type,
    event_id,
    is_contest,
    metadata,
    actor_id
  )
  values (
    'member_joined',
    new.event_id,
    coalesce(event_is_contest, false),
    event_metadata,
    new.id::text
  );
  return new;
end;
$$;

create or replace function public.analytics_log_photo_uploaded()
returns trigger
language plpgsql
as $$
declare
  event_is_contest boolean;
  event_missing boolean := false;
  event_metadata jsonb;
begin
  select events.contest_enabled
    into event_is_contest
  from public.events
  where events.id = new.event_id;

  if not found then
    event_is_contest := false;
    event_missing := true;
  end if;

  event_metadata := jsonb_build_object(
    'photo_id', new.id,
    'member_id', new.member_id,
    'file_path', new.file_path
  );

  if event_missing then
    event_metadata := event_metadata || jsonb_build_object('event_missing', true);
  end if;

  insert into public.analytics_events (
    event_type,
    event_id,
    is_contest,
    metadata,
    actor_id
  )
  values (
    'photo_uploaded',
    new.event_id,
    coalesce(event_is_contest, false),
    event_metadata,
    new.member_id::text
  );
  return new;
end;
$$;

create or replace function public.analytics_log_vote_cast()
returns trigger
language plpgsql
as $$
declare
  event_is_contest boolean;
  event_missing boolean := false;
  event_metadata jsonb;
begin
  select events.contest_enabled
    into event_is_contest
  from public.events
  where events.id = new.event_id;

  if not found then
    event_is_contest := false;
    event_missing := true;
  end if;

  event_metadata := jsonb_build_object(
    'like_id', new.id,
    'photo_id', new.photo_id,
    'voter_id', new.voter_id
  );

  if event_missing then
    event_metadata := event_metadata || jsonb_build_object('event_missing', true);
  end if;

  insert into public.analytics_events (
    event_type,
    event_id,
    is_contest,
    metadata,
    actor_id
  )
  values (
    'vote_cast',
    new.event_id,
    coalesce(event_is_contest, false),
    event_metadata,
    new.voter_id
  );
  return new;
end;
$$;

drop trigger if exists analytics_log_event_created on public.events;
create trigger analytics_log_event_created
  after insert on public.events
  for each row execute function public.analytics_log_event_created();

drop trigger if exists analytics_log_event_deleted on public.events;
create trigger analytics_log_event_deleted
  after delete on public.events
  for each row execute function public.analytics_log_event_deleted();

drop trigger if exists analytics_log_contest_enabled on public.events;
create trigger analytics_log_contest_enabled
  after update on public.events
  for each row execute function public.analytics_log_contest_enabled();

drop trigger if exists analytics_log_member_joined on public.members;
create trigger analytics_log_member_joined
  after insert on public.members
  for each row execute function public.analytics_log_member_joined();

drop trigger if exists analytics_log_photo_uploaded on public.photos;
create trigger analytics_log_photo_uploaded
  after insert on public.photos
  for each row execute function public.analytics_log_photo_uploaded();

drop trigger if exists analytics_log_vote_cast on public.photo_likes;
create trigger analytics_log_vote_cast
  after insert on public.photo_likes
  for each row execute function public.analytics_log_vote_cast();

-- Backfill missing analytics events without duplicating existing ones
insert into public.analytics_events (
  created_at,
  event_type,
  event_id,
  is_contest,
  metadata
)
select
  events.created_at,
  'event_created',
  events.id,
  coalesce(events.contest_enabled, false),
  jsonb_build_object(
    'name', events.name,
    'pin', events.pin
  )
from public.events
where not exists (
  select 1
  from public.analytics_events
  where event_type = 'event_created'
    and event_id = events.id
);

insert into public.analytics_events (
  created_at,
  event_type,
  event_id,
  is_contest,
  metadata,
  actor_id
)
select
  members.created_at,
  'member_joined',
  members.event_id,
  coalesce(events.contest_enabled, false),
  jsonb_build_object(
    'member_id', members.id,
    'nickname', members.nickname
  ) || case when events.id is null then jsonb_build_object('event_missing', true) else '{}'::jsonb end,
  members.id::text
from public.members
left join public.events on events.id = members.event_id
where not exists (
  select 1
  from public.analytics_events
  where event_type = 'member_joined'
    and metadata ->> 'member_id' = members.id::text
);

insert into public.analytics_events (
  created_at,
  event_type,
  event_id,
  is_contest,
  metadata,
  actor_id
)
select
  photos.created_at,
  'photo_uploaded',
  photos.event_id,
  coalesce(events.contest_enabled, false),
  jsonb_build_object(
    'photo_id', photos.id,
    'member_id', photos.member_id,
    'file_path', photos.file_path
  ) || case when events.id is null then jsonb_build_object('event_missing', true) else '{}'::jsonb end,
  photos.member_id::text
from public.photos
left join public.events on events.id = photos.event_id
where not exists (
  select 1
  from public.analytics_events
  where event_type = 'photo_uploaded'
    and metadata ->> 'photo_id' = photos.id::text
);

insert into public.analytics_events (
  created_at,
  event_type,
  event_id,
  is_contest,
  metadata,
  actor_id
)
select
  photo_likes.created_at,
  'vote_cast',
  photo_likes.event_id,
  coalesce(events.contest_enabled, false),
  jsonb_build_object(
    'like_id', photo_likes.id,
    'photo_id', photo_likes.photo_id,
    'voter_id', photo_likes.voter_id
  ) || case when events.id is null then jsonb_build_object('event_missing', true) else '{}'::jsonb end,
  photo_likes.voter_id
from public.photo_likes
left join public.events on events.id = photo_likes.event_id
where not exists (
  select 1
  from public.analytics_events
  where event_type = 'vote_cast'
    and metadata ->> 'like_id' = photo_likes.id::text
);

insert into public.analytics_events (
  created_at,
  event_type,
  event_id,
  is_contest,
  metadata
)
select
  coalesce(events.contest_enabled_at, events.created_at),
  'contest_enabled',
  events.id,
  true,
  jsonb_build_object(
    'contest_enabled_at', events.contest_enabled_at,
    'contest_ends_at', events.contest_ends_at
  )
from public.events
where (coalesce(events.contest_enabled, false) = true or events.contest_enabled_at is not null)
  and not exists (
    select 1
    from public.analytics_events
    where event_type = 'contest_enabled'
      and event_id = events.id
  );

create or replace view public.product_kpi_global as
with windows as (
  select '30d'::text as window, now() - interval '30 days' as start_at
  union all
  select '90d'::text as window, now() - interval '90 days' as start_at
)
select
  windows.window,
  count(*) filter (where analytics_events.event_type = 'event_created'
    and analytics_events.created_at >= windows.start_at) as events,
  count(*) filter (where analytics_events.event_type = 'photo_uploaded'
    and analytics_events.created_at >= windows.start_at) as photos,
  count(*) filter (where analytics_events.event_type = 'member_joined'
    and analytics_events.created_at >= windows.start_at) as members,
  count(*) filter (where analytics_events.event_type = 'vote_cast'
    and analytics_events.created_at >= windows.start_at) as votes,
  count(*) filter (where analytics_events.event_type = 'event_created'
    and analytics_events.is_contest = true
    and analytics_events.created_at >= windows.start_at) as contest_events,
  count(*) filter (where analytics_events.event_type = 'photo_uploaded'
    and analytics_events.is_contest = true
    and analytics_events.created_at >= windows.start_at) as contest_photos,
  count(*) filter (where analytics_events.event_type = 'member_joined'
    and analytics_events.is_contest = true
    and analytics_events.created_at >= windows.start_at) as contest_members,
  count(*) filter (where analytics_events.event_type = 'vote_cast'
    and analytics_events.is_contest = true
    and analytics_events.created_at >= windows.start_at) as contest_votes,
  count(*) filter (where analytics_events.event_type = 'event_created'
    and analytics_events.is_contest = false
    and analytics_events.created_at >= windows.start_at) as non_contest_events,
  count(*) filter (where analytics_events.event_type = 'photo_uploaded'
    and analytics_events.is_contest = false
    and analytics_events.created_at >= windows.start_at) as non_contest_photos,
  count(*) filter (where analytics_events.event_type = 'member_joined'
    and analytics_events.is_contest = false
    and analytics_events.created_at >= windows.start_at) as non_contest_members,
  count(*) filter (where analytics_events.event_type = 'vote_cast'
    and analytics_events.is_contest = false
    and analytics_events.created_at >= windows.start_at) as non_contest_votes,
  count(*) filter (where analytics_events.event_type = 'contest_enabled'
    and analytics_events.created_at >= windows.start_at) as contests_enabled
from windows
left join public.analytics_events on analytics_events.created_at >= windows.start_at
group by windows.window;

create or replace view public.product_kpi_events as
with recent_activity as (
  select distinct analytics_events.event_id
  from public.analytics_events
  where analytics_events.event_id is not null
    and analytics_events.created_at >= (now() - interval '90 days')
),
base_events as (
  select
    recent_activity.event_id,
    min(analytics_events.created_at) filter (where analytics_events.event_type = 'event_created')
      as first_created_at,
    min(analytics_events.created_at) as first_seen_at
  from recent_activity
  join public.analytics_events on analytics_events.event_id = recent_activity.event_id
  group by recent_activity.event_id
),
photo_stats as (
  select
    analytics_events.event_id,
    count(*) filter (where analytics_events.event_type = 'photo_uploaded') as photos,
    max(analytics_events.created_at) filter (where analytics_events.event_type = 'photo_uploaded')
      as last_photo_at
  from public.analytics_events
  where analytics_events.event_id is not null
  group by analytics_events.event_id
),
member_stats as (
  select
    analytics_events.event_id,
    count(*) filter (where analytics_events.event_type = 'member_joined') as members
  from public.analytics_events
  where analytics_events.event_id is not null
  group by analytics_events.event_id
),
vote_stats as (
  select
    analytics_events.event_id,
    count(*) filter (where analytics_events.event_type = 'vote_cast') as votes
  from public.analytics_events
  where analytics_events.event_id is not null
  group by analytics_events.event_id
)
select
  base_events.event_id,
  coalesce(events.name, '[deleted]') as event_name,
  coalesce(events.created_at, base_events.first_created_at, base_events.first_seen_at) as created_at,
  events.contest_enabled,
  coalesce(photo_stats.photos, 0) as photos,
  coalesce(member_stats.members, 0) as members,
  coalesce(vote_stats.votes, 0) as votes,
  photo_stats.last_photo_at,
  case
    when coalesce(member_stats.members, 0) > 0 then
      coalesce(photo_stats.photos, 0)::numeric / member_stats.members
    else null
  end as photos_per_member
from base_events
left join public.events on events.id = base_events.event_id
left join photo_stats on photo_stats.event_id = base_events.event_id
left join member_stats on member_stats.event_id = base_events.event_id
left join vote_stats on vote_stats.event_id = base_events.event_id;

create or replace view public.product_kpi_timeseries_daily as
with days as (
  select generate_series(
    current_date - interval '89 days',
    current_date,
    interval '1 day'
  )::date as day
),
entries as (
  select
    date_trunc('day', created_at)::date as day,
    count(*) filter (where event_type = 'event_created') as events,
    count(*) filter (where event_type = 'photo_uploaded') as photos,
    count(*) filter (where event_type = 'member_joined') as members,
    count(*) filter (where event_type = 'vote_cast') as votes,
    count(*) filter (where event_type = 'contest_enabled') as contests_enabled,
    count(*) filter (where event_type = 'event_created' and is_contest = true) as contest_events,
    count(*) filter (where event_type = 'photo_uploaded' and is_contest = true) as contest_photos,
    count(*) filter (where event_type = 'member_joined' and is_contest = true) as contest_members,
    count(*) filter (where event_type = 'vote_cast' and is_contest = true) as contest_votes,
    count(*) filter (where event_type = 'event_created' and is_contest = false) as non_contest_events,
    count(*) filter (where event_type = 'photo_uploaded' and is_contest = false) as non_contest_photos,
    count(*) filter (where event_type = 'member_joined' and is_contest = false) as non_contest_members,
    count(*) filter (where event_type = 'vote_cast' and is_contest = false) as non_contest_votes
  from public.analytics_events
  group by date_trunc('day', created_at)::date
)
select
  days.day,
  coalesce(entries.events, 0) as events,
  coalesce(entries.photos, 0) as photos,
  coalesce(entries.members, 0) as members,
  coalesce(entries.votes, 0) as votes,
  coalesce(entries.contests_enabled, 0) as contests_enabled,
  coalesce(entries.contest_events, 0) as contest_events,
  coalesce(entries.contest_photos, 0) as contest_photos,
  coalesce(entries.contest_members, 0) as contest_members,
  coalesce(entries.contest_votes, 0) as contest_votes,
  coalesce(entries.non_contest_events, 0) as non_contest_events,
  coalesce(entries.non_contest_photos, 0) as non_contest_photos,
  coalesce(entries.non_contest_members, 0) as non_contest_members,
  coalesce(entries.non_contest_votes, 0) as non_contest_votes
from days
left join entries on entries.day = days.day
order by days.day;

revoke all on public.product_kpi_global from anon, authenticated;
revoke all on public.product_kpi_events from anon, authenticated;
revoke all on public.product_kpi_timeseries_daily from anon, authenticated;
