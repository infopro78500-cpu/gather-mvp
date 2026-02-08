create or replace view event_kpi_engagement as
with photo_stats as (
  select
    photos.event_id,
    count(photos.id) as total_photos,
    max(photos.created_at) as last_upload_at,
    count(distinct photos.member_id) as member_contributors,
    count(photos.id) filter (where photos.member_id is null) as null_member_photos
  from photos
  group by photos.event_id
),
contributor_stats as (
  select
    photo_stats.event_id,
    photo_stats.total_photos,
    photo_stats.last_upload_at,
    photo_stats.member_contributors
      + case when photo_stats.null_member_photos > 0 then 1 else 0 end
      as contributor_count
  from photo_stats
)
select
  events.id as event_id,
  events.name as event_name,
  events.created_at,
  events.is_closed,
  coalesce(events.contest_enabled, false) as contest_enabled,
  coalesce(contributor_stats.total_photos, 0) as total_photos,
  coalesce(contributor_stats.contributor_count, 0) as contributor_count,
  case
    when coalesce(contributor_stats.contributor_count, 0) > 0
      then coalesce(contributor_stats.total_photos, 0)::numeric
        / contributor_stats.contributor_count
    else 0
  end as photos_per_contributor,
  contributor_stats.last_upload_at,
  case
    when coalesce(contributor_stats.total_photos, 0) = 0 then 'LOW'
    when (
      coalesce(contributor_stats.total_photos, 0)::numeric
        / nullif(contributor_stats.contributor_count, 0)
    ) >= 3 then 'HIGH'
    when (
      coalesce(contributor_stats.total_photos, 0)::numeric
        / nullif(contributor_stats.contributor_count, 0)
    ) >= 1 then 'MEDIUM'
    else 'LOW'
  end as engagement_status
from events
left join contributor_stats on contributor_stats.event_id = events.id;
