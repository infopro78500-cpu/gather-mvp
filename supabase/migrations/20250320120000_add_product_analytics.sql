-- Product analytics event log + KPIs

create table if not exists public.analytics_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  event_name text not null,
  event_id uuid null,
  actor_member_id uuid null,
  actor_user_id uuid null,
  source text null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at);
create index if not exists analytics_events_name_created_at_idx
  on public.analytics_events (event_name, created_at);
create index if not exists analytics_events_event_id_idx
  on public.analytics_events (event_id);
create index if not exists analytics_events_actor_member_id_idx
  on public.analytics_events (actor_member_id);

alter table public.analytics_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analytics_events'
      and policyname = 'Analytics events are readable by authenticated users'
  ) then
    create policy "Analytics events are readable by authenticated users"
      on public.analytics_events
      for select
      using (auth.role() = 'authenticated');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analytics_events'
      and policyname = 'Analytics events are insertable by service role'
  ) then
    create policy "Analytics events are insertable by service role"
      on public.analytics_events
      for insert
      with check (auth.role() = 'service_role');
  end if;
end $$;

create or replace function public.analytics_log_event_created()
returns trigger
language plpgsql
as $$
begin
  insert into public.analytics_events (
    event_name,
    event_id,
    meta
  )
  values (
    'event_created',
    new.id,
    jsonb_build_object(
      'lifetime_days', new.lifetime_days,
      'expires_at', new.expires_at,
      'contest_enabled', new.contest_enabled
    )
  );
  return new;
end;
$$;

create or replace function public.analytics_log_member_joined()
returns trigger
language plpgsql
as $$
begin
  insert into public.analytics_events (
    event_name,
    event_id,
    actor_member_id,
    meta
  )
  values (
    'event_joined',
    new.event_id,
    new.id,
    jsonb_build_object('nickname', new.nickname)
  );
  return new;
end;
$$;

create or replace function public.analytics_log_photo_uploaded()
returns trigger
language plpgsql
as $$
begin
  insert into public.analytics_events (
    event_name,
    event_id,
    actor_member_id,
    meta
  )
  values (
    'photo_uploaded',
    new.event_id,
    new.member_id,
    jsonb_build_object(
      'file_path', new.file_path,
      'contributor_fallback', new.member_id is null
    )
  );
  return new;
end;
$$;

create or replace function public.analytics_log_photo_liked()
returns trigger
language plpgsql
as $$
begin
  insert into public.analytics_events (
    event_name,
    event_id,
    meta
  )
  values (
    'photo_liked',
    new.event_id,
    jsonb_build_object(
      'voter_id', new.voter_id,
      'photo_id', new.photo_id
    )
  );
  return new;
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
      event_name,
      event_id,
      meta
    )
    values (
      'contest_enabled',
      new.id,
      jsonb_build_object(
        'contest_enabled_at', new.contest_enabled_at,
        'contest_ends_at', new.contest_ends_at
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists analytics_log_event_created on public.events;
create trigger analytics_log_event_created
  after insert on public.events
  for each row execute function public.analytics_log_event_created();

drop trigger if exists analytics_log_member_joined on public.members;
create trigger analytics_log_member_joined
  after insert on public.members
  for each row execute function public.analytics_log_member_joined();

drop trigger if exists analytics_log_photo_uploaded on public.photos;
create trigger analytics_log_photo_uploaded
  after insert on public.photos
  for each row execute function public.analytics_log_photo_uploaded();

drop trigger if exists analytics_log_photo_liked on public.photo_likes;
create trigger analytics_log_photo_liked
  after insert on public.photo_likes
  for each row execute function public.analytics_log_photo_liked();

drop trigger if exists analytics_log_contest_enabled on public.events;
create trigger analytics_log_contest_enabled
  after update on public.events
  for each row execute function public.analytics_log_contest_enabled();

insert into public.analytics_events (
  created_at,
  event_name,
  event_id,
  meta
)
select
  events.created_at,
  'event_created',
  events.id,
  jsonb_build_object(
    'lifetime_days', events.lifetime_days,
    'expires_at', events.expires_at,
    'contest_enabled', events.contest_enabled
  )
from public.events
where not exists (
  select 1
  from public.analytics_events
  where event_name = 'event_created'
    and event_id = events.id
);

insert into public.analytics_events (
  created_at,
  event_name,
  event_id,
  actor_member_id,
  meta
)
select
  members.created_at,
  'event_joined',
  members.event_id,
  members.id,
  jsonb_build_object('nickname', members.nickname)
from public.members
where not exists (
  select 1
  from public.analytics_events
  where event_name = 'event_joined'
    and actor_member_id = members.id
);

insert into public.analytics_events (
  created_at,
  event_name,
  event_id,
  actor_member_id,
  meta
)
select
  photos.created_at,
  'photo_uploaded',
  photos.event_id,
  photos.member_id,
  jsonb_build_object(
    'file_path', photos.file_path,
    'contributor_fallback', photos.member_id is null
  )
from public.photos;

insert into public.analytics_events (
  created_at,
  event_name,
  event_id,
  meta
)
select
  photo_likes.created_at,
  'photo_liked',
  photo_likes.event_id,
  jsonb_build_object(
    'voter_id', photo_likes.voter_id,
    'photo_id', photo_likes.photo_id
  )
from public.photo_likes;

insert into public.analytics_events (
  created_at,
  event_name,
  event_id,
  meta
)
select
  coalesce(events.contest_enabled_at, events.created_at),
  'contest_enabled',
  events.id,
  jsonb_build_object(
    'contest_enabled_at', events.contest_enabled_at,
    'contest_ends_at', events.contest_ends_at
  )
from public.events
where coalesce(events.contest_enabled, false) = true
   or events.contest_enabled_at is not null;

create or replace view public.kpi_product_global as
with contest_events as (
  select distinct event_id
  from public.analytics_events
  where event_id is not null
    and (
      event_name = 'contest_enabled'
      or (event_name = 'event_created' and coalesce((meta ->> 'contest_enabled')::boolean, false) = true)
    )
),
last_30d as (
  select *
  from public.analytics_events
  where created_at >= (now() - interval '30 days')
)
select
  (select count(*) from public.analytics_events where event_name = 'event_created') as total_events_all_time,
  (select count(*) from public.analytics_events where event_name = 'photo_uploaded') as total_photos_all_time,
  (select count(*) from public.analytics_events where event_name = 'event_joined') as total_members_all_time,
  (select count(*) from public.analytics_events where event_name = 'photo_liked') as total_votes_all_time,
  (select count(*) from contest_events) as total_contest_events_all_time,
  (select count(*) from last_30d where event_name = 'photo_uploaded') as photos_last_30d,
  (select count(*) from last_30d where event_name = 'event_created') as events_last_30d,
  (select count(*) from last_30d where event_name = 'event_joined') as members_last_30d,
  (select count(*) from last_30d where event_name = 'photo_liked') as votes_last_30d,
  (select count(*) from last_30d where event_name = 'event_created' and event_id in (select event_id from contest_events))
    as contest_events_last_30d,
  (select count(*) from last_30d where event_name = 'photo_liked' and event_id in (select event_id from contest_events))
    as contest_votes_last_30d,
  (select count(*) from last_30d
    where event_name = 'event_created'
      and (event_id is null or event_id not in (select event_id from contest_events)))
    as non_contest_events_last_30d,
  (select count(*) from last_30d
    where event_name = 'photo_liked'
      and (event_id is null or event_id not in (select event_id from contest_events)))
    as non_contest_votes_last_30d;

create or replace view public.kpi_product_timeseries_daily as
select
  date_trunc('day', created_at)::date as day,
  count(*) filter (where event_name = 'event_created') as events_created,
  count(*) filter (where event_name = 'event_joined') as members_joined,
  count(*) filter (where event_name = 'photo_uploaded') as photos_uploaded,
  count(*) filter (where event_name = 'photo_liked') as votes_cast,
  count(*) filter (
    where event_name = 'contest_enabled'
      or (event_name = 'event_created' and coalesce((meta ->> 'contest_enabled')::boolean, false) = true)
  ) as contest_enabled_events
from public.analytics_events
group by day
order by day;

create or replace view public.kpi_product_events as
with member_stats as (
  select
    members.event_id,
    count(members.id) as members_count
  from public.members
  group by members.event_id
),
photo_stats as (
  select
    photos.event_id,
    count(photos.id) as photos_count,
    max(photos.created_at) as last_photo_at
  from public.photos
  group by photos.event_id
),
vote_stats as (
  select
    photo_likes.event_id,
    count(photo_likes.id) as votes_count
  from public.photo_likes
  group by photo_likes.event_id
)
select
  events.id as event_id,
  events.name as event_name,
  events.created_at,
  events.is_closed,
  coalesce(events.contest_enabled, false) as contest_enabled,
  events.contest_enabled_at,
  coalesce(member_stats.members_count, 0) as members_count,
  coalesce(photo_stats.photos_count, 0) as photos_count,
  coalesce(vote_stats.votes_count, 0) as votes_count,
  photo_stats.last_photo_at,
  case
    when coalesce(member_stats.members_count, 0) > 0 then
      coalesce(photo_stats.photos_count, 0)::numeric / member_stats.members_count
    else null
  end as photos_per_member,
  engagement.engagement_status
from public.events
left join member_stats on member_stats.event_id = events.id
left join photo_stats on photo_stats.event_id = events.id
left join vote_stats on vote_stats.event_id = events.id
left join public.event_kpi_engagement as engagement on engagement.event_id = events.id;

revoke all on public.kpi_product_global from anon, authenticated;
revoke all on public.kpi_product_timeseries_daily from anon, authenticated;
revoke all on public.kpi_product_events from anon, authenticated;

grant select on public.kpi_product_global to authenticated;
grant select on public.kpi_product_timeseries_daily to authenticated;
grant select on public.kpi_product_events to authenticated;

create table if not exists public.vercel_web_metrics_daily (
  day date primary key,
  visitors integer,
  pageviews integer,
  bounce_rate numeric,
  updated_at timestamptz not null default now()
);

alter table public.vercel_web_metrics_daily enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vercel_web_metrics_daily'
      and policyname = 'Vercel metrics are readable by authenticated users'
  ) then
    create policy "Vercel metrics are readable by authenticated users"
      on public.vercel_web_metrics_daily
      for select
      using (auth.role() = 'authenticated');
  end if;
end $$;

create or replace function public.upsert_vercel_metrics(
  day date,
  visitors integer,
  pageviews integer,
  bounce_rate numeric
)
returns void
language plpgsql
security definer
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'not allowed';
  end if;

  insert into public.vercel_web_metrics_daily (day, visitors, pageviews, bounce_rate, updated_at)
  values (day, visitors, pageviews, bounce_rate, now())
  on conflict (day)
  do update set
    visitors = excluded.visitors,
    pageviews = excluded.pageviews,
    bounce_rate = excluded.bounce_rate,
    updated_at = now();
end;
$$;

revoke all on function public.upsert_vercel_metrics(date, integer, integer, numeric) from anon, authenticated;

-- Tests rapides (à exécuter manuellement)
-- select * from public.kpi_product_global;
-- select * from public.kpi_product_timeseries_daily order by day desc limit 10;
-- select * from public.kpi_product_events order by created_at desc limit 10;
