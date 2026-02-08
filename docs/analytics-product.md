# Product analytics (Supabase)

## What is tracked
Gather logs product activity in `public.analytics_events`, a durable event log that remains even if an event is deleted. The following actions are captured:

- `event_created`
- `member_joined`
- `photo_uploaded`
- `vote_cast`
- `contest_enabled`
- `event_deleted`

Each row snapshots whether the event was in contest mode at the time of the action (`is_contest`). KPI views are built from this table so global metrics stay accurate even if events or photos are removed later.

## Why Vercel Analytics is complementary
Vercel Analytics is great for traffic (visitors, pageviews, performance). It does **not** track core product actions like uploads, event creation, or votes. Supabase remains the source of truth for product KPIs; Vercel is a complementary panel only.

## Applying migrations

Local (from the repo root):

```bash
supabase db push
```

Production (example):

```bash
supabase db push --project-ref <your-project-ref>
```

After applying migrations, you can validate in the Supabase SQL editor:

```sql
select * from public.product_kpi_global;
select * from public.product_kpi_events order by photos desc nulls last limit 20;
select * from public.product_kpi_timeseries_daily order by day desc limit 10;
```
