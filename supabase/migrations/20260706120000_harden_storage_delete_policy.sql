-- Photo deletion now goes exclusively through the server-side
-- /api/events/[eventId]/photos/delete route (service_role, validates
-- ownership before deleting). The anon/public role no longer needs
-- DELETE on storage.objects for the event-photos bucket.

drop policy if exists "Public delete event-photos 1rdror8_0" on storage.objects;
