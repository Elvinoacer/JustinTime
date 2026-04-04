Based on a comprehensive architectural and code-path audit of the provided documentation, here is the detailed breakdown of broken UI, UX, and data flows within the **Marketplace Core (Section 5)**.

### 5.1 Services Marketplace

_This layer suffers from a fundamental mismatch: services are modeled as static listings rather than dynamic workflows, leading to operational and UX gaps downstream._

- **5.1.1 & 5.1.2 (Service CRUD Gaps):** \* **Incomplete Configuration:** The provider service creation UI collects basic info (name, price, media) but fails to enforce critical operational fields like `locationType`, `requiresAvailability`, and `defaultDuration`. Because these are omitted, the downstream booking flow (`/api/bookings`) often fails or behaves unpredictably when trying to compute slots and end times.
  - **The PRO Tier Bug:** The frontend UI advertises infinite services for PRO/BUSINESS tiers (`src/app/dashboard/services/page.tsx`), but the backend API (`/api/provider/services/route.ts`) hard-limits **all** users to a maximum of 5 services.
  - **Edit Category Bug (Job/Service overlap):** When editing a listing, the `PUT` endpoint performs a lookup using the category **SLUG**, but the frontend `CategorySelector` passes the category **ID**. This causes edits to silently fail or return a 400 error.
- **5.1.4 (Discovery & Surge Pricing):** \* **Surge Bait-and-Switch:** The database schema supports surge pricing (`20260203183100_add_surge_pricing`), but the public catalog (`ServicesClient.tsx`) only shows static `minPrice`/`maxPrice`. If a guest clicks a service and logs in during high demand, the price spikes dynamically in the booking flow with no prior visual warning or badge on the catalog.
- **5.1.6 (Interaction Analytics):**
  - **Silent Failures:** The `/api/services/[id]/interactions` endpoint strictly requires `x-forwarded-for` or `x-real-ip` headers. If these are missing (common in certain edge proxies or local environments), the API returns a `400` error, and the UI drops the view/favorite tracking silently.

### 5.2 Professionals Marketplace

_The professional discovery layer struggles with state management and flattens your trust mechanics._

- **5.2.1 & 5.2.4 (Profile Management & Verification):**
  - **Trust Tier Flattening:** The backend contains a robust "Trust as a Service" (TaaS) verification system (background checks, licenses). However, the public `ProfessionalsClient.tsx` UI reduces this to a single binary toggle (`verifiedOnly`). Clients cannot filter by specific trust tiers (e.g., "Background Checked"), rendering your highest-value safety features invisible.
- **5.2.3 (Skill Tags & Discovery):**
  - **State Desync:** The `/professionals` directory does not initialize from URL search parameters. If a user clicks back/forward, or shares a link to a filtered professional search, the state is destroyed and resets to default.

### 5.3 Jobs & Proposals

_This is the most critical area. It suffers from severe multi-role authorization bugs, PII leaks, and missing navigational pages._

- **5.3.1 & 5.3.2 (Client Job Posting & Lifecycle):**
  - **Missing `deadline` Data:** In the `/client/post-job` wizard, the "Preferred Date" (deadline) is collected in the UI but is completely dropped inside the `handleSubmit` payload. Jobs are always saved with `deadline: null`.
  - **Missing Client Index:** There is no `/client/jobs/page.tsx` index. A client has no dedicated page to view a list of all their posted jobs; they are forced to rely on a dashboard widget.
  - **Missing Admin Management:** There is no `/admin/jobs` page. Admins have no UI to moderate, delete, or audit public jobs.
  - **PII Leak (CRITICAL):** The public endpoint `GET /api/jobs/[id]` exposes `client.email` and `client.phone` to unauthenticated anonymous web traffic.
- **5.3.6 & 5.3.7 (Proposal Submission & Management):**
  - **Self-Application Loophole (CRITICAL):** The `submitProposal.ts` service does not verify `job.clientId !== providerId`. A user with dual roles can submit a proposal to their own job via the API, which breaks downstream escrow logic.
  - **The Multi-Role Lockout (CRITICAL):** In `src/app/jobs/[id]/page.tsx`, the UI uses a legacy check: `session?.user?.role === "PROVIDER"`. If a user has a `roles` array (e.g., `["CLIENT", "PROVIDER"]`) but their legacy string is `"CLIENT"`, the UI explicitly blocks them from applying. Furthermore, middleware blocks these users from reaching the `/dashboard/jobs` path entirely.
  - **Race Conditions:** `maxApplicants` is checked outside of the database transaction, allowing concurrent API requests to exceed the applicant limit. There is also no database-level unique constraint preventing duplicate `[jobId, providerId]` proposals.
- **5.3.10 (Pipeline & Notifications):**
  - **Broken Email Links:** The system emails providers when a new job matches their skills, but the CTA link points to `/dashboard/jobs/[id]` (which is a 404 since the dashboard uses tabs, not subfolders). Furthermore, the "Share Job" button copies an auth-gated URL (`/client/jobs/[id]`) instead of the public `/jobs/[id]`.

### 5.4 Booking Negotiation & Execution

_The negotiation and fulfillment flow lacks proper state hydration and contains a major escrow security flaw._

- **5.4.1 & 5.4.4 (Negotiation Object & Form Flow):**
  - **Lost Negotiation State:** If a guest configures a negotiation (price, promo codes) and is forced to log in, the `localStorage` bridge (`jit_booking_draft`) fails to serialize `promoCode`, `promoDiscount`, and `negotiationData`. The client loses their negotiation context post-login.
  - **Conflict Crashing:** When a booking slot is taken, the API correctly throws a `409 BOOKING_SLOT_CONFLICT`. However, the frontend does not gracefully catch this to highlight the calendar step, leaving the user stuck on the final step with a generic error.
- **5.4.2 & 5.4.3 (Lifecycle & Dispute Hooks):**
  - **Provider Escrow Theft (CRITICAL):** In the provider dashboard, the provider can manually edit a booking status to `COMPLETED` via a dropdown. Because the API listens for this status to release escrow funds, a provider can unilaterally declare a job finished and take the client's money without client confirmation.
  - **Blind Wallet Payments:** When setting up milestones (`POST /api/bookings/[id]/escrow/milestones`), the system blindly generates a `WALLET` payment. If the client actually paid via IntaSend (M-Pesa/Card), this breaks financial reconciliation entirely.
  - **Missing Dispute UI:** An API exists to file a dispute (`POST /api/bookings/[id]/dispute`) and freeze escrow, but there is no actual "File Dispute" button or modal in either the Client or Provider dashboards.

Based on the deeper architectural audits across the codebase, here are the remaining critical UI, UX, data flow, and security breaks, categorized by system domain:

### 1. Authentication, Roles, & Security Breaks (Critical)

_The multi-role system integration is fundamentally broken due to legacy checks, creating massive lockouts and security vulnerabilities._

- **PII Leak to Anonymous Traffic:** The public endpoint `GET /api/jobs/[id]` explicitly returns the client's `email` and `phone` to anyone who queries the API, with zero authentication required.
- **The Multi-Role Dashboard Lockout:** The middleware in `src/proxy.ts` attempts to protect the provider dashboard using the legacy single-role field (`userRole === "CLIENT"`). Because it does not check the new `roles` array, multi-role users (who are both Client and Provider) are completely blocked from accessing `/dashboard/jobs`.
- **The Public Apply Lockout:** On the public job detail page (`src/app/jobs/[id]/page.tsx`), the "Apply" UI uses `session?.user?.role === "PROVIDER"` instead of the centralized `hasRole()` helper. Dual-role users are incorrectly told "Only provider accounts can submit proposals" and are blocked from applying.
- **Self-Application / Escrow Loophole:** The backend `submitProposal.ts` service never validates that `job.clientId !== providerId`. A dual-role user can hit the API directly to submit a proposal on their own job, bypassing front-end checks and breaking the escrow state machine.

### 2. Financials, Invoicing, & Cancellation Breaks

_These flows suffer from severe Next.js server component errors and bypassed financial logic._

- **Invoice Page Runtime Crash:** In `src/app/bookings/[id]/invoice/page.tsx`, the page is strictly exported as a Next.js Server Component. However, it contains an inline `onClick={() => window.print()}` handler directly on a button. Server components cannot contain client-side event handlers, resulting in a direct runtime crash in production.
- **Bypassed Cancellation Engine:** In `client/bookings/page.tsx`, when a client clicks "Cancel", the UI makes a direct `PATCH` call updating the status to `"CANCELLED"`. This bypasses the robust `cancelBooking` server action, meaning cancellation policies (Flexible/Strict), penalty calculations, and IntaSend wallet refund logic are completely ignored.
- **Missing Cancellation Reason Input:** The API requires a `cancellationReason` to log in the timeline, but the confirmation modals on both the client and provider dashboards lack a text area to actually collect this reason from the user.

### 3. Architecture & Performance Bottlenecks

_Query inefficiencies and state desyncs are putting the database and API at risk at scale._

- **The Distance Sort Memory Bomb:** In `/api/jobs/route.ts`, when a user searches with `sortBy=distance`, the API passes `take: undefined` to Prisma. This fetches the _entire_ jobs table into the server's memory to calculate the Haversine distance before slicing the array for pagination. At scale, this will cause severe memory bloat and latency.
- **The Double-Fetch Hydration Bug:** Across all listing pages (`JobsClient.tsx`, `ServicesClient.tsx`), a debounce effect is tied to an empty initial state (`""`). When Next.js hydration kicks in, it fires the initial data fetch. 400ms later, the debounce resolves and triggers a _second identical database query_ for every single guest visiting the site.
- **Volatile Geocode Cache:** The Nominatim geocoding fallback relies on an in-memory `Map`. Because JustInTime appears to be deployed on a serverless environment (like Vercel), this cache is destroyed on every cold start, resulting in slow external API calls on every new instance.

### 4. Growth & Conversion Funnel Leaks

_Critical breaks in the user journey that result in lost acquisitions._

- **The "Lost Context" Leak:** When an unauthenticated guest clicks "Apply" on a specific job or service, they are redirected to `/auth/signup`. Because there is no `?returnTo=` query parameter appended to the URL, the user completes a 5-minute onboarding flow only to be dumped into a generic dashboard, completely losing the job they intended to apply for.
- **Job Alert Routing Failure:** When the system automatically matches a provider to a new job, the email alert contains a link pointing to `/dashboard/jobs/[id]`. Because the provider dashboard relies on a tabbed flat-list rather than dynamic subfolders, this link throws a 404 error instead of opening the job.

I audited the marketplace core in the uploaded codebase and there are several real breakpoints in the UI/data flow for this feature.

What is broken right now

1. Client job edit/cancel flow is calling a route that does not exist

- `src/app/client/post-job/page.tsx:186-210` updates jobs with `PUT /client/jobs/${editJobId}`
- `src/app/client/jobs/[id]/page.tsx:325-329` cancels jobs with `PUT /client/jobs/${jobId}`
- But `src/app/api/client/jobs/[id]/route.ts:6-81` only implements `GET`

Impact:

- Edit mode from `/client/post-job?edit=...` will fail on save.
- Cancel/close job from `/client/jobs/[id]` will fail.
- Job lifecycle state changes for the client workspace are partially dead.

Fix:

- Either add `PUT` to `src/app/api/client/jobs/[id]/route.ts`, or change those UI calls to `PUT /api/jobs/[id]`, which already exists in `src/app/api/jobs/[id]/route.ts:87+`.

2. Pre-booking negotiation is not actually implemented end to end

- Booking page builds and sends negotiation payload: `src/app/booking/page.tsx:404-423`
- Booking create API ignores it entirely: `src/app/api/bookings/route.ts:211-221`
- Negotiation model requires an existing booking: `prisma/schema.prisma:1056-1077`
- Negotiation API also requires `bookingId`: `src/app/api/negotiations/route.ts:15-20`

Impact:

- The booking form presents a “negotiate” path, but nothing persists from that nested `negotiation` object during booking creation.
- So 5.4 “pre-booking negotiation” is functionally broken. Current implementation is post-booking negotiation only.

Fix:

- Decide one model and make it consistent:
  - either true pre-booking negotiation: add `serviceId`/`providerId`/`clientId`-based negotiation support and make `bookingId` optional until accepted,
  - or keep booking-bound negotiation and remove the “pre-booking negotiation” UX from `/booking` until a booking exists.

- If keeping current booking form UX, the booking POST route must either create a linked negotiation record after booking creation or reject the nested negotiation payload explicitly.

3. Services category filter uses slug in the UI but exact category name in the API

- UI writes slug into query string: `src/app/services/ServicesClient.tsx:146-149`
- API filters by exact category name: `src/app/api/services/route.ts:68-72`

Impact:

- Category filtering can silently fail on refresh, deep links, or shared URLs like `/services?category=plumbing`.
- The page may appear filterable in-session but break once the URL is reloaded or opened elsewhere.

Fix:

- Make the API accept `id`, `slug`, or `name`, same way the jobs update route already handles compatibility.
- Best approach: filter with `where.category = { OR: [{ id }, { slug }, { name }] }` after resolving the incoming value.

4. Public service detail can expose inactive services

- Public service detail fetches by id only: `src/lib/api/server/service-detail.ts:7-10`
- No `isActive: true` guard is applied there.

Impact:

- An inactive/deactivated service can still be viewed if its id is known or linked somewhere.
- Users can land on a non-bookable or intentionally hidden listing.

Fix:

- Gate public detail with `where: { id, isActive: true }` or fetch by `findFirst`.
- Also return 404 for inactive services.

5. Public professional detail route has a likely Prisma query bug and leaks inactive services

- Route uses `findUnique` with `where: { id, role: "PROVIDER" }`: `src/app/api/professionals/[id]/route.ts:13-17`
- It includes all services unfiltered: `src/app/api/professionals/[id]/route.ts:18-20` and maps them all at `139-150`

Impact:

- The `findUnique` shape is wrong for standard Prisma usage and is a likely runtime/type failure.
- Even if it runs after local type drift, the route exposes inactive services publicly.
- That can route users from professional pages into disabled/unready services.

Fix:

- Change to `findFirst({ where: { id, role: "PROVIDER" } })` or `findUnique({ where: { id } })` then role-check.
- Filter public services with `services: { where: { isActive: true } }`.

6. The services page has a dead “minimum rating” filter

- UI reads and stores `minRating`: `src/app/services/ServicesClient.tsx:39,70,167-168`
- Filters component also drives it
- But service fetch hook never sends `minRating`: `src/lib/api/hooks/useServices.ts:168-182`
- And `/api/services` does not handle `minRating` either

Impact:

- Users can toggle a rating filter in the UI and see URL changes, but results do not change.
- That is a broken marketplace discovery flow.

Fix:

- Send `minRating` from `useServices`
- Apply it server-side after rating calculation, before pagination

7. Service delete flow can destroy media before the DB delete succeeds

- Delete route removes images/video first: `src/app/api/provider/services/route.ts:344-351`
- Then deletes the service row: `353-355`
- Booking relation from `Booking.service` does not use cascade delete: `prisma/schema.prisma:484-524`

Impact:

- If the service still has linked bookings, Prisma delete may fail.
- In that failure case, the DB row remains but the media is already deleted.
- Result: broken provider dashboard cards, broken public cards, broken detail pages with missing media.

Fix:

- First block deletion when there are active or historical linked bookings, or soft-delete with `isActive = false`.
- If hard delete is ever allowed, delete DB first inside a transaction-safe flow, then queue media cleanup after success.

8. Query cache keys for public job detail and client job detail collide

- Public hook uses `["job", id]`: `src/lib/api/hooks/useJobs.ts:143-149`
- Client job detail page also uses `["job", jobId]`: `src/app/client/jobs/[id]/page.tsx:256-260`

Impact:

- React Query can reuse the wrong payload shape between public `/jobs/[id]` and client `/client/jobs/[id]`.
- That can produce stale state, wrong fields, or inconsistent proposal/job UI after navigation.

Fix:

- Namespace them separately, for example:
  - `["public-job", id]`
  - `["client-job", id]`

What I would treat as highest priority

First fix these in order:

1. Missing client job `PUT` flow
2. Booking negotiation mismatch
3. Category filter slug/name mismatch
4. Public professional detail route bug
5. Public inactive service exposure

These five are the ones most likely to create visible user-facing breakage.

Recommended implementation direction

For stability, I would normalize this feature around three rules:

- Public marketplace endpoints only return publicly bookable records (`isActive`, provider role, safe fields only)
- Client workspace uses dedicated client APIs or shared APIs consistently, but not both interchangeably
- Negotiation belongs to one clear lifecycle stage only, not half in booking creation and half in post-booking APIs

There are more smaller issues I can still extract from this marketplace slice, but the ones above are already enough to cause broken flows in production.

Yes — there are more. Here are additional broken or weak marketplace flows I found beyond the first batch.

1. `/api/client/jobs` does not implement the POST path from the spec

- `src/app/api/client/jobs/route.ts:8-81` only has `GET`
- Job creation is actually going through `useCreateJob()` → `POST /jobs` in `src/lib/api/hooks/useJobs.ts:91-100`

Impact:

- Your documented client marketplace contract is not what the app actually uses.
- Anything expecting `POST /api/client/jobs` will fail.
- You now have split job creation/update behavior: create uses `/api/jobs`, edit tries `/api/client/jobs/[id]`.

Fix:

- Either add `POST` to `src/app/api/client/jobs/route.ts` and standardize client flows there, or change the spec and all client job operations to the shared `/api/jobs` family.

2. Client job detail edit prefill loses the category id

- Client job detail API returns `category`, but not `categoryId`: `src/app/api/client/jobs/[id]/route.ts:45-65`
- Edit form tries `existingJob.categoryId || existingJob.category?.id`: `src/app/client/post-job/page.tsx:202-204`

Impact:

- Edit mode depends on a fallback because the API payload is inconsistent.
- That is survivable now, but brittle. Any UI that expects flat `categoryId` will break.

Fix:

- Return both `categoryId` and `category`, or normalize all job payloads to one consistent shape.

3. Service promotion ranking is applied after loading the full dataset into memory

- `/api/services` fetches all matching services first, then computes ratings/promotions/rebooked counts and sorts in memory before slicing pagination: `src/app/api/services/route.ts:121-214, 365-420`

Impact:

- With enough services, the marketplace list becomes expensive and unstable under load.
- Promotion, rating, and rebooked ordering will degrade response time badly.
- This becomes a real production flow issue once listings grow.

Fix:

- Push more ranking into the database, or precompute service aggregates.
- At minimum, do a two-stage approach: fetch candidate ids first, then hydrate only the current page.

4. Distance sorting hides all listings without provider coordinates

- Distance mode filters out services with no computed distance: `src/app/api/services/route.ts:412-415`

Impact:

- Providers without saved lat/lng disappear entirely from `/services?sort=distance`.
- The user sees a narrower marketplace, not “nearest first.”
- This is especially bad if onboarding/profile location coverage is incomplete.

Fix:

- Keep non-geocoded services at the end instead of removing them.
- Only exclude when the product explicitly says “show only nearby.”

5. Service page interaction analytics are not trustworthy

- Service interactions increment `views` or `favorites` counters directly: `src/app/api/services/[id]/interactions/route.ts`
- Client-side favorite state is local-only and cannot be undone server-side: `src/components/InteractionBar.tsx:67-107`
- Dedupe appears to rely on anonymous/local state plus in-memory cooldown, not durable persistence.

Impact:

- Repeated favorites/views can be inflated across devices, sessions, deployments, or server restarts.
- “Favorites” are not actual favorites; they are anonymous counter bumps.
- Provider-facing demand signals become noisy.

Fix:

- Separate analytics events from durable favorites.
- Add authenticated favorites as real records if you want “favorite” as a product feature.
- Move dedupe to persistent storage if the count matters.

6. Service promotion flow updates public pages but not the provider services data contract directly

- Promotion uses server action `promoteService(...)`: `src/app/actions/revenue.ts:270-352`
- It revalidates `/services` and `/services/[id]`, but not `/dashboard/services`

Impact:

- Public ranking updates, but provider dashboard state can stay stale until refresh/navigation depending on cache behavior.
- That causes “I paid to boost, but dashboard card did not change” confusion.

Fix:

- Also revalidate `/dashboard/services`, or invalidate provider services query client-side after success.

7. Provider “recommended jobs” matching is weak and can miss valid marketplace matches

- Provider recommendation uses service category ids and exact lowercase location string equality: `src/app/api/provider/jobs/route.ts:142-204`

Impact:

- A provider in “Nairobi, Kenya” and a job in “Nairobi” are treated as different.
- Recommended tab can look empty or poor even when relevant jobs exist nearby.
- This is a broken relevance flow, not just suboptimal ranking.

Fix:

- Prefer coordinate-based proximity when available.
- Fall back to normalized fuzzy location matching, not exact string equality.

8. Public professional detail can expose inactive services from the provider page

- In professional detail route, service mapping includes provider services without an active-only guard in the returned payload path you already surfaced earlier: `src/app/api/professionals/[id]/route.ts:139-150`

Impact:

- A client can browse to a professional and see services that should no longer be bookable.
- That creates broken transitions from professional profile → unavailable service.

Fix:

- Ensure every public provider/service join filters `isActive: true`.

9. Provider service deletion is still hard-delete only

- `DELETE /api/provider/services?id=...` fully deletes the row: `src/app/api/provider/services/route.ts:336-360`

Impact:

- Even aside from booking-linked delete failures, this is the wrong lifecycle for a marketplace listing.
- Historical analytics, links, promotions, and references break.
- Marketplace usually wants archive/deactivate, not destroy.

Fix:

- Convert delete into soft-delete by default: `isActive = false`, optionally `deletedAt`.
- Reserve hard delete for admin cleanup or orphaned drafts.

10. Provider services API uses query-param id for update/delete, not resource paths

- Update/delete are `PUT /api/provider/services?id=...` and `DELETE /api/provider/services?id=...`: `src/app/api/provider/services/route.ts:186-360`

Impact:

- It works, but it is inconsistent with the rest of the codebase, which mostly uses `/[id]`.
- This increases the chance of UI bugs, wrong invalidation keys, and accidental misuse by future code.

Fix:

- Add `src/app/api/provider/services/[id]/route.ts` and migrate UI calls there.
- Keep the query-param version only as a temporary compatibility layer.

11. Public services filter contract is internally inconsistent beyond category

- Hook supports `minRating` in its type: `src/lib/api/hooks/useServices.ts:107`
- UI persists it in state/query
- Hook never sends it, and API never applies it

Impact:

- The filter UI can claim more control than the backend supports.
- This is a classic marketplace trust-breaker: “I filtered, but results did not change.”

Fix:

- Either wire it fully or remove it from UI until supported.

12. Client and public job payload/query keys are still too close together

- Public and client job detail both use `["job", id]` patterns in multiple places:
  - public hook: `src/lib/api/hooks/useJobs.ts:122-129`
  - client detail/edit pages: `src/app/client/post-job/page.tsx:178-183`, `src/app/client/jobs/[id]/page.tsx:254-260`

Impact:

- Cached shapes can bleed between public and client pages.
- This can create stale data, missing fields, or odd UI hydration issues after navigation.

Fix:

- Use separate namespaces:
  - `["public-job", id]`
  - `["client-job", id]`
  - `["client-job-proposals", id]`

The most important additional ones from this batch are:

- missing `POST /api/client/jobs`
- in-memory full-dataset sorting in `/api/services`
- unreliable service interaction analytics
- weak recommended-jobs relevance
- hard-delete service lifecycle

## EVERYTHING IN THIS DOC MUST BE ADDRESSED
