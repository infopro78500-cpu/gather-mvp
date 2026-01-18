# Gather — MVP State of Play

## Executive summary
- Next.js 16 App Router app with a Supabase-backed photo event MVP (create event, join via PIN, upload/download photos, contest voting). Evidence spans `app/`, `lib/`, and Supabase migrations. 
- Event creation relies on anonymous device IDs plus optional Supabase auth user IDs; expiration is computed client-side. 
- Event gallery uses Supabase Storage bucket `event-photos` with client-side listing/uploading and periodic refresh. 
- Contest mode is backed by `photo_likes` table and API routes for state and toggle-like. 
- Lead capture funnel (Coming Soon) writes to `leads_landing` and an admin dashboard surfaces the last 50 leads. 
- An admin edit page exists for contest settings and local AI duplicate checks (Python scripts in `ia_local`). 
- Admin/authentication gating is minimal; pages appear accessible without auth checks. 
- Several info pages are referenced but missing (e.g., `/infos/contributeur`, `/infos/ambassadeur`, `/infos/beta-testeur`). 
- Data model definitions for `events` and `leads_landing` are not present in migrations, making schema/constraints unclear. 
- Observability is limited to Vercel Analytics and console logging; CI not defined in repo.

## How to run locally
- Install dependencies: `npm install`
- Run dev server: `npm run dev` (Next.js App Router). 
- Build & start: `npm run build` then `npm run start`. 
- Lint/type checks: `npm run lint`, `npm run typecheck`. 
- Smoke/health checks: `npm run smoke`, `npm run test:health`. 

**Required environment variables (for Supabase client):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Feature inventory
| Feature | Description | Evidence (files/functions/routes) | Status | Dependencies | User value & main flow steps |
| --- | --- | --- | --- | --- | --- |
| Event creation | Create a new photo event with name, PIN, lifetime; writes to `events` table. | `app/page.tsx` (`CreateEventPage`, `handleSubmit`), `lib/eventLifetimes.ts` (`calculateExpiresAt`), `lib/deviceId.ts` (`getDeviceId`). | ✅ Done | Supabase `events` table with `name`, `pin`, `host_device_id`, `host_user_id`, `expires_at`, `lifetime_days`. | User enters name + lifetime → PIN generated → event stored → redirect to `/events/[pin]`. |
| Join event via PIN | Join event by entering 6-digit PIN. | `app/join/page.tsx` (`JoinPageInner`, `.from("events").eq("pin")`). | ✅ Done | `events.pin` index/uniqueness implied. | User enters PIN → lookup event → redirect to event page. |
| Event view & expiration banner | Load event by PIN and show expiration status. | `app/events/[pin]/page.tsx` (`fetchEvent`), `app/components/events/EventHeader.tsx` (`EventHeader`), `lib/eventLifetimes.ts` (`getExpirationInfo`). | ✅ Done | `events` table; expiration fields. | User opens event → sees name/PIN/expiry. |
| Share link + QR code | Generate share URL and QR code for event. | `app/events/[pin]/page.tsx` (`shareUrl`, `QRCode`). | ✅ Done | Browser origin + event PIN. | User opens event → copies link or scans QR. |
| Photo upload (client) | Upload photos directly to Supabase Storage with size/count limits. | `app/events/[pin]/page.tsx` (`handleUpload`, `supabase.storage.from(BUCKET_NAME).upload`). | ✅ Done | Supabase Storage bucket `event-photos`; client-side access. | User selects images → uploads → gallery refresh. |
| Gallery listing & auto-refresh | List and periodically refresh photos from storage. | `app/events/[pin]/page.tsx` (`refreshPhotos`, `.storage.list`, interval). | ✅ Done | Supabase Storage list access; limit 200. | User views gallery → auto refresh every 8s. |
| Photo deletion | Allow host or uploader device to delete photos (single or batch). | `app/events/[pin]/page.tsx` (`canDeletePhoto`, `handleDelete`, `handleDeleteSelected`). | ✅ Done | Storage delete permissions; device ID. | User selects photo(s) → delete if allowed. |
| Download ZIP (all/selected) | Download all or selected photos as ZIP. | `app/events/[pin]/page.tsx` (`downloadPhotos`, `JSZip`, `file-saver`). | ✅ Done | Public URLs from storage. | User chooses download → ZIP built client-side. |
| Contest voting | Like/unlike photos; show leaderboard and countdown. | `app/events/[pin]/page.tsx` (`handleToggleLike`, `ContestCountdown`), API: `app/api/events/[eventId]/contest/state/route.ts`, `app/api/events/[eventId]/contest/photos/[photoId]/toggle-like/route.ts`, migration `supabase/migrations/20250305120000_add_event_contest_mode.sql`. | ✅ Done | `events.contest_enabled`, `events.contest_ends_at`, `photo_likes` table + RLS. | User enters contest event → likes photo → leaderboard updates. |
| Event contest admin | Toggle contest mode and end date for an event. | `app/event/[eventId]/edit/page.tsx` (`handleContestSave`). | 🟡 Partial | `events` table update; no auth gating. | Admin visits edit page → toggles contest settings. |
| Local AI duplicate check (upload) | Upload image to local Python pipeline to detect duplicates. | `app/components/ImageUploader.tsx`, API `app/api/events/[eventId]/upload-image/route.ts`, local scripts in `ia_local/`. | 🟡 Partial | Local Python runtime + `ia_local` data dirs; event ID. | Admin uploads image → Python scans → duplicate status. |
| Local AI duplicate scan (admin) | Trigger local duplicate scans for all images. | `app/components/LocalScanIA.tsx`, `app/api/scan/route.ts`, `pages/api/scan-hash.ts`. | 🟡 Partial | Local Python runtime; CSV outputs in `ia_local/data`. | Admin triggers scan → sees duplicate counts. |
| Lead capture (Coming Soon) | Collect emails/interests and write to Supabase. | `app/coming-soon/page.tsx`, `app/components/LandingForm.tsx`, `app/api/lead/route.ts`. | ✅ Done | `leads_landing` table. | User submits form → lead stored → redirect to info page(s). |
| Admin lead dashboard | View recent leads and summary counts. | `app/admin/page.tsx` (`AdminPage`). | 🟡 Partial | `leads_landing` table; no auth gating. | Admin opens dashboard → sees latest leads. |
| OTP login | Send magic link via Supabase auth. | `app/login/page.tsx` (`supabase.auth.signInWithOtp`). | 🟡 Partial | Supabase Auth; no protected routes. | User enters email → receives login link. |
| Admin stats placeholder | Placeholder page for future stats. | `app/admin/stats/page.tsx`. | 🟡 Partial | None. | Admin opens stats page → sees “in construction.” |
| Health check | Simple JSON health endpoint. | `app/api/health/route.ts`. | ✅ Done | None. | Used by smoke/health scripts. |

## User journeys
1. **Create a photo event**
   - Screens: `/` (create form). 
   - Backend calls: Supabase `events` insert via client SDK. 
   - Steps: enter name + lifetime → event created → redirect to `/events/[pin]`. 

2. **Join an existing event**
   - Screens: `/join`, `/events/[pin]`. 
   - Backend calls: Supabase `events` lookup by PIN. 
   - Steps: enter PIN → validate → redirect to gallery. 

3. **Share event + invite others**
   - Screens: `/events/[pin]`. 
   - Backend calls: none (client-side). 
   - Steps: copy link or scan QR → guests join via PIN. 

4. **Upload photos to event**
   - Screens: `/events/[pin]`. 
   - Backend calls: Supabase Storage `upload`; list to refresh. 
   - Steps: select photos → upload → gallery updates. 

5. **Download event photos**
   - Screens: `/events/[pin]`. 
   - Backend calls: direct fetch to storage public URLs. 
   - Steps: choose all/selected → ZIP generation → download. 

6. **Vote in contest (if enabled)**
   - Screens: `/events/[pin]`. 
   - Backend calls: `GET /api/events/[eventId]/contest/state`, `POST /api/events/[eventId]/contest/photos/[photoId]/toggle-like`. 
   - Steps: view leaderboard → like/unlike → leaderboard refresh. 

7. **Admin: manage contest settings + AI upload**
   - Screens: `/event/[eventId]/edit`. 
   - Backend calls: Supabase `events` update; `POST /api/events/[eventId]/upload-image`. 
   - Steps: toggle contest + end date → upload image → see duplicate status. 

8. **Coming soon lead capture**
   - Screens: `/coming-soon`, `/infos/investisseur-v2`, `/infos/investissement-fonctionnement`. 
   - Backend calls: `POST /api/lead`. 
   - Steps: submit form → lead stored → redirect based on interest checkboxes. 

9. **Admin: view leads + AI scan**
   - Screens: `/admin`. 
   - Backend calls: Supabase `leads_landing` select; `POST /api/scan` and `POST /api/scan-hash`. 
   - Steps: open dashboard → see counts → trigger scans. 

## API inventory
| Method | Route | Purpose | Auth | Request/Response shape (if known) |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | Health/version metadata. | None | Response `{ ok, ts, env, version }`. |
| POST | `/api/lead` | Insert lead from landing form. | None (public). | Request JSON: `email`, `full_name`, `interest_*`, `message`, `source`; Response `{ success: boolean }`. |
| POST | `/api/scan` | Run local Python duplicate scan. | None (server-only). | Response `{ success, doublons }`. |
| POST | `/api/scan-hash` (pages API) | Run strict hash duplicate scan. | None (server-only). | Response `{ success, doublons }`. |
| POST | `/api/events/[eventId]/upload-image` | Upload image to local AI pipeline and check duplicates. | None (server-only). | Multipart form with `image`; response includes `{ success, strictMatch, fuzzyMatch, message }`. |
| GET | `/api/events/[eventId]/contest/state` | Get contest status and likes. | None. | Query `voterId`; response `{ contestEnabled, contestEndsAt, isVotingClosed, likesByPhoto, leaderboard }`. |
| POST | `/api/events/[eventId]/contest/photos/[photoId]/toggle-like` | Toggle like for a photo. | None. | Body `{ voterId }`; response `{ liked, likesCount }`. |

## Data models
**Supabase tables**
- `events` (schema not fully defined in repo; inferred fields used: `id`, `name`, `pin`, `host_device_id`, `host_user_id`, `expires_at`, `lifetime_days`, `contest_enabled`, `contest_ends_at`). 
- `photo_likes` table with RLS policies (`id`, `event_id`, `photo_id`, `voter_id`, `created_at`). 
- `leads_landing` (inferred columns from `/api/lead` insert: `email`, `full_name`, `interest_investing`, `interest_contributing`, `interest_ambassador`, `interest_beta_tester`, `message`, `source`). 

**Storage**
- Supabase Storage bucket `event-photos` (used directly from client). 

**Local AI data**
- Local filesystem under `ia_local/data/` for images, embeddings, and CSV outputs used by Python scripts. 

## Risks & unknowns
- **Schema gaps:** no migrations defining base `events` or `leads_landing` tables (only incremental columns and `photo_likes`). 
- **Auth/permissions:** admin pages (`/admin`, `/event/[eventId]/edit`) have no auth gating; storage access is client-side with public URLs. 
- **RLS policies for core tables/storage** not visible in repo (only `photo_likes` policies defined). 
- **Missing pages:** routes referenced by LandingForm (`/infos/contributeur`, `/infos/ambassadeur`, `/infos/beta-testeur`, `/infos/investissement-fonctionnement-resume`) are not present. 
- **Python dependencies:** local AI routes require Python environment and `ia_local` assets; production readiness unclear. 
- **Scalability:** gallery list limited to 200 but no pagination; ZIP download is client-side and may be heavy for large galleries. 

## Gaps & prioritized next actions
1. **Define Supabase schema migrations for `events` and `leads_landing`** (Dev, 0.5–1d). Add full table definitions, indexes on `pin`, and not-null constraints. 
2. **Add RLS policies for `events` and storage bucket** (Dev, 0.5–1d). Ensure hosts can edit/delete and participants can read/write uploads. 
3. **Gate admin pages with Supabase auth** (Dev, 1–2d). Require authenticated admin role or allowlist; block public access to `/admin` and `/event/[eventId]/edit`. 
4. **Create missing info pages or adjust redirects** (Product/UX, 0.5–1d). Build `/infos/contributeur`, `/infos/ambassadeur`, `/infos/beta-testeur`, and `/infos/investissement-fonctionnement-resume` or remove redirects. 
5. **Add Supabase Storage signed URLs or row-level access** (Dev, 1–2d). Move away from public URLs if privacy is required. 
6. **Add event cleanup/expiration job** (Ops/Dev, 1–2d). Enforce `expires_at` by removing uploads and/or archiving. 
7. **Implement event deletion/host management** (Product/UX + Dev, 1–2d). Allow host to close event, regenerate PIN, or transfer ownership. 
8. **Add server-side validation for uploads** (Dev, 1–2d). Enforce file size/type limits and scan before storage. 
9. **Pagination/infinite scroll in gallery** (Product/UX + Dev, 1–2d). Reduce load for large events. 
10. **Document local AI requirements** (Ops/Dev, 0.5d). Provide setup steps for Python environment and data directories. 
11. **Add basic analytics/monitoring for API errors** (Ops, 0.5–1d). Integrate error tracking and logs beyond console. 
12. **Add tests for API routes** (Dev, 1–2d). Cover contest endpoints, lead insert, and upload pipeline. 
13. **Formalize CI pipeline** (Ops, 0.5–1d). Run lint/typecheck/build + smoke tests. 
14. **Define privacy/legal content** (Admin/Legal, 1–2d). Terms of use, privacy policy, consent for photo uploads. 
15. **Add onboarding/help text** (Product/UX, 0.5–1d). Clarify PIN/QR usage and deletion rights. 
