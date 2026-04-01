# Feature Documentation: JOBS FEATURE — JustInTime

> **Generated:** 2026-04-01  
> **Codebase:** JustinTime-main  
> **Scope:** Full-stack — frontend, backend, schema, auth, multirole system, proposals, and lifecycle

---

## 1. Executive Summary

The **Jobs feature** is JustInTime's demand-side marketplace: clients post work they need done, and providers submit proposals (bids) to win that work. It is the primary alternative to the service-booking flow, letting clients specify bespoke requirements rather than booking a fixed service.

**Who uses it:**

- **Clients** — post jobs and review/accept proposals
- **Providers** — browse available jobs and submit proposals
- **Multirole users** — a single account that holds both CLIENT and PROVIDER roles, introduced through the `FF_MULTI_ROLE_*` feature flags. They can post jobs _and_ apply to jobs posted by other clients

**Why it exists:** Many service needs don't fit a fixed-price catalogue. The Jobs board allows open-ended scoping, competitive pricing, and client-driven hiring decisions.

**System impact:**  
Creates `Job`, `Proposal`, `Booking`, and `Payment` records. Triggers email/push notifications. Involves Cloudinary for image uploads, Nominatim for geocoding, and the wallet/credits system for provider lead credits.

---

## 2. User Roles and Permissions

### Role Definitions

| Role       | Defined in              | Stored in DB                                      |
| ---------- | ----------------------- | ------------------------------------------------- |
| `CLIENT`   | `src/lib/auth/roles.ts` | `User.role` (legacy) + `User.roles[]` (multirole) |
| `PROVIDER` | `src/lib/auth/roles.ts` | Same                                              |
| `ADMIN`    | `src/lib/auth/roles.ts` | Same                                              |

### What Each Role Can Do

**CLIENT:**

- POST `/api/jobs` — create a full or quick job
- PUT `/api/jobs/[id]` — edit own job (or ADMIN)
- DELETE `/api/jobs/[id]` — delete own job (or ADMIN)
- GET `/api/jobs/[id]/proposals` — view all proposals on own job
- PATCH `/api/jobs/[id]/proposals/[proposalId]` — accept a proposal
- GET `/api/client/jobs` — list own posted jobs for dashboard
- Access `/client/post-job`, `/client/jobs/[id]`

**PROVIDER:**

- GET `/api/provider/jobs` — browse available/applied/active/completed jobs
- POST `/api/jobs/[id]/proposals` — submit a proposal
- DELETE `/api/proposals/[id]` — withdraw a pending proposal
- GET `/api/jobs/[id]/proposals` — view own proposals on any job
- Access `/dashboard/jobs` (provider job dashboard), `/jobs/[id]`

**ADMIN:**

- PUT/DELETE any job regardless of ownership

**Multirole (CLIENT + PROVIDER):**

- Can do everything a CLIENT can, plus everything a PROVIDER can
- **Intended** to be blocked from applying to their own jobs (frontend check exists, backend check is MISSING — see §11)

### Where Role Checks Happen in Code

| Check                                       | File                                       | Method                                                                        | Notes                                                   |
| ------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| POST job requires CLIENT                    | `src/app/api/jobs/route.ts:343`            | `hasRole(session.user, "CLIENT")`                                             | Correct                                                 |
| POST proposal requires PROVIDER             | `src/app/api/jobs/[id]/proposals/route.ts` | `hasRole(session.user, "PROVIDER")`                                           | Correct                                                 |
| GET provider jobs requires PROVIDER         | `src/app/api/provider/jobs/route.ts`       | `hasRole(session.user, "PROVIDER")`                                           | Correct                                                 |
| PUT/DELETE job — ownership or ADMIN         | `src/app/api/jobs/[id]/route.ts`           | `existingJob.clientId !== session.user.id && !hasRole(session.user, "ADMIN")` | Correct                                                 |
| `isProvider` in UI (public job detail page) | `src/app/jobs/[id]/page.tsx:155`           | `session?.user?.role === "PROVIDER"`                                          | **BUG** — uses legacy `.role` directly, not `hasRole()` |
| Middleware provider dashboard access        | `src/proxy.ts:450`                         | `userRole === "CLIENT"` (legacy `.role`)                                      | **BUG** — blocks multirole users from `/dashboard`      |

### `hasRole()` and Multirole Feature Flags

The function `hasRole()` in `src/lib/auth/roles.ts` respects three environment flags:

```
FF_MULTI_ROLE_READ_ENABLED   — enables reading .roles[] array
FF_MULTI_ROLE_WRITE_ENABLED  — enables writing roles on signup
FF_MULTI_ROLE_ENFORCE_ENABLED — makes hasRole() check .roles[] instead of .role
```

**If `FF_MULTI_ROLE_ENFORCE_ENABLED` is false (default):** `hasRole()` checks only `user.role` (the single legacy field). A user with `role: "CLIENT"` and `roles: ["CLIENT","PROVIDER"]` will **fail** `hasRole(user, "PROVIDER")`.

This means multirole is functionally broken by default unless all three flags are enabled.

---

## 3. Entry Points

### 3.1 Client — Create Job

| Entry Point                 | File                               | Trigger                                                  |
| --------------------------- | ---------------------------------- | -------------------------------------------------------- |
| `/client/post-job` page     | `src/app/client/post-job/page.tsx` | Navigate directly or from dashboard CTA                  |
| `?mode=quick` query param   | same                               | Sets quick-post mode if `NEXT_PUBLIC_FF_QUICK_POST=true` |
| `?edit=[jobId]` query param | same                               | Loads existing job data for editing                      |
| POST `/api/jobs`            | `src/app/api/jobs/route.ts`        | Called by `useCreateJob` hook                            |
| PUT `/api/jobs/[id]`        | `src/app/api/jobs/[id]/route.ts`   | Called by `updateJobMutation` in edit mode               |

### 3.2 Provider — Browse & Apply

| Entry Point                     | File                                       | Trigger                        |
| ------------------------------- | ------------------------------------------ | ------------------------------ |
| `/jobs` public marketplace      | `src/app/jobs/page.tsx` → `JobsClient.tsx` | Public, no auth needed         |
| `/jobs/[id]` public job detail  | `src/app/jobs/[id]/page.tsx`               | Direct URL or from marketplace |
| `/dashboard/jobs`               | `src/app/dashboard/jobs/page.tsx`          | Provider dashboard tab         |
| GET `/api/jobs`                 | `src/app/api/jobs/route.ts`                | Public job listing             |
| GET `/api/provider/jobs`        | `src/app/api/provider/jobs/route.ts`       | Provider-specific tabs         |
| POST `/api/jobs/[id]/proposals` | `src/app/api/jobs/[id]/proposals/route.ts` | Submit proposal                |

### 3.3 Client — Review Proposals & Hire

| Entry Point                                         | File                                                    | Trigger                             |
| --------------------------------------------------- | ------------------------------------------------------- | ----------------------------------- |
| `/client/jobs/[id]`                                 | `src/app/client/jobs/[id]/page.tsx`                     | Client views own job with proposals |
| GET `/api/jobs/[id]/proposals`                      | `src/app/api/jobs/[id]/proposals/route.ts`              | Load proposals for a job            |
| PATCH `/api/jobs/[id]/proposals/[proposalId]`       | `src/app/api/jobs/[id]/proposals/[proposalId]/route.ts` | Accept a proposal                   |
| PUT `/api/jobs/[id]` with `{ status: "CANCELLED" }` | `src/app/api/jobs/[id]/route.ts`                        | Close/cancel a job                  |

### 3.4 Background / System

| Entry Point                     | File                                                     | Trigger                         |
| ------------------------------- | -------------------------------------------------------- | ------------------------------- |
| Job alert notifications         | `src/app/api/jobs/route.ts` (POST, background async)     | After every job creation        |
| Proposal notification to client | `src/lib/proposals/submitProposal.ts` (background async) | After every proposal submission |
| Analytics event ingestion       | `src/app/api/analytics/jobs-events/route.ts`             | Frontend `useJobsEvents` hook   |

---

## 4. Frontend Flow

### 4.1 Job Creation Flow (`/client/post-job`)

**Component:** `src/app/client/post-job/page.tsx` → `PostJobPageContent()`

**Modes:**

- **Full post** (default): 4-step wizard
  - Step 1: Title + Category (uses `CategorySelector` component)
  - Step 2: Description + Image upload (Cloudinary via `/api/upload`)
  - Step 3: Budget + Location + Max Applicants + (Preferred Date — see §11)
  - Step 4: Review summary
- **Quick post** (feature-flagged via `NEXT_PUBLIC_FF_QUICK_POST`): single form with title, budget, location only

**State management:** Local `useState` — no Zustand or Context. TanStack Query for the `useCreateJob` mutation.

**Validation:**

- Per-step: `validateStep(n)` calls `createJobSchema.pick({...}).parse(...)` for each step
- Final: `validateForm()` iterates all steps before submit
- Quick mode: inline validation in `handleSubmit`

**Edit mode:** When `?edit=[jobId]` is present, `useQuery` fetches the job, `useEffect` prefills form, and the submit button calls `updateJobMutation` instead of `createJobMutation`. On success, redirects to `/client/dashboard` (not back to the job — minor UX gap).

**Loading/error/success states:**

- Loading categories: spinner via `isLoadingCategories`
- Loading job in edit mode: `isLoadingJob` but no explicit loading UI shown (form silently empty until data arrives)
- Submit pending: button disabled with spinner
- Success: green toast, then `setTimeout(() => router.push(...), 2000)`
- Error: no error UI rendered — `console.error` only, user sees nothing

**Analytics:** `useJobsEvents` fires `job_post_started`, `job_post_minimal_submitted`, `job_post_published` events.

### 4.2 Public Job Marketplace (`/jobs`)

**Component:** `src/app/jobs/JobsClient.tsx`  
Uses `usePublicJobs` hook → `GET /api/jobs` with filters (search, category, location, budget range, sort, pagination). Fully public. Renders `JobCard` components.

### 4.3 Public Job Detail (`/jobs/[id]`)

**Component:** `src/app/jobs/[id]/page.tsx`  
This is the **provider apply page**. Most complex page in the feature.

**Key state:**

- `showForm` — toggles proposal form visibility
- `coverLetter`, `proposedPrice`, `estimatedDays`, `attachments` — proposal fields
- `fulfillmentMode` — "INDIVIDUAL" or "TEAM"
- `selectedTeamId` — team ID for team fulfillment
- `coverLetterMode` — "write" / "preview" / "split"
- `bookingTimeline` — fetched from escrow milestones endpoint after acceptance
- `selectedTemplate` / `selectedSavedTemplateId` — template selection state

**Role-gated rendering:**

```
isGuest         → "Log in to apply" button
!isProvider     → "Only provider accounts can submit proposals" message
isJobOwner      → "This is your own job posting" message
existingProposal→ Shows existing proposal status
isJobClosed     → Shows "not accepting proposals" message
isMaxApplicants → Shows applicant limit reached message
```

**⚠️ BUG — `isProvider` check** (line 155):

```ts
const isProvider = session?.user?.role === "PROVIDER";
```

This directly reads `session.user.role` (legacy single role), NOT `hasRole()`. A multirole user with `role: "CLIENT"` and `roles: ["CLIENT","PROVIDER"]` will see "Only provider accounts can submit proposals" and cannot apply — even though they are a valid provider.

**Quick Apply:** Auto-generates a proposal from `buildProposalTemplate("budget", ...)` and submits without opening the form. Gated by `isProvider && !isJobOwner && !existingProposal && !isJobClosed`.

**Proposal templates:** `buildProposalTemplate()` generates cover letter, price, and estimated days from predefined templates. Users can also save/load templates via `useProposalTemplates`.

**Markdown editor:** Cover letter supports Write/Preview/Split modes with inline formatting buttons.

**Attachments:** File upload → `/api/upload` (Cloudinary). Portfolio links validated as `http(s)://` URLs. Stored in `proposal.attachments[]` alongside fulfillment metadata.

**Fulfillment metadata:** `withFulfillmentPreference(attachments, { mode, teamId, teamName })` serializes a JSON blob into the `attachments` array. `parseFulfillmentPreference` extracts it on read.

### 4.4 Client Job Detail (`/client/jobs/[id]`)

**Component:** `src/app/client/jobs/[id]/page.tsx`  
Shows the client's own job with all proposals, recommendation scores, trust metrics, and hiring actions.

**Proposal evaluation:** Client-side `evaluateProposal()` computes `fit`, `budgetMatch`, `completeness`, and `overall` scores (0–100). The "recommended" provider is the highest overall scorer. Labels assigned: BEST_VALUE, FASTEST_DELIVERY, MOST_RELIABLE, LOWEST_COST.

**Confidence thresholds:** Configurable via `NEXT_PUBLIC_RECOMMENDATION_CONFIDENCE_HIGH` (default 80) and `NEXT_PUBLIC_RECOMMENDATION_CONFIDENCE_MEDIUM` (default 60).

**Actions:**

- Accept Proposal → `PATCH /api/jobs/[id]/proposals/[proposalId]`
- Message provider → navigate to `/client/messages?partnerId=...`
- Report Issue (dispute) → `POST /api/bookings/[bookingId]/dispute`
- Edit Job → navigate to `/client/post-job?edit=[jobId]`
- Close Job → `PUT /api/jobs/[id]` with `{ status: "CANCELLED" }`

**Payment timeline:** After acceptance, fetches `/api/bookings/[bookingId]/escrow/milestones` and renders `PaymentTimelineCard`.

**⚠️ No auth check in layout:** `src/app/client/layout.tsx` has no session check — it relies entirely on middleware in `src/proxy.ts`.

### 4.5 Provider Dashboard Jobs (`/dashboard/jobs`)

**Component:** `src/app/dashboard/jobs/page.tsx`  
Tabs: **Recommended**, **Available**, **Applied**, **Active**, **Completed**

- **Recommended tab**: Shows jobs scored by category match, location, competition, budget, urgency — fetched via `GET /api/provider/jobs?tab=recommended`
- **Available tab**: Open jobs without existing provider proposal
- **Applied tab**: Jobs where provider has submitted proposals
- **Active tab**: Jobs with accepted proposals
- **Completed tab**: Jobs in COMPLETED status with accepted proposals

Each job card supports inline proposal submission (modal). Uses same template system as public apply page.

---

## 5. Backend Flow

### 5.1 GET `/api/jobs` — Public Job Listing

**File:** `src/app/api/jobs/route.ts`  
**Auth:** None required  
**Input:** Query params — page, pageSize, status, category, location, budgetMin, budgetMax, search, verifiedOnly, sortBy, sortOrder, userLat/userLon

**Processing:**

1. Parses filters into a Prisma `where` clause
2. For `sortBy=distance`: fetches ALL matching jobs (`take: undefined`), calculates Haversine distance for each, sorts, then slices for pagination — **performance risk at scale**
3. For jobs without coordinates: calls Nominatim geocode API as fallback (slow, external dependency)
4. Geocode results cached in-memory `Map` — lost on restart

**Response:** `{ items: JobListClient[], pagination: { page, pageSize, total, totalPages, hasMore } }`

**⚠️ Issues:**

- No auth = no user-specific data filtering
- `take: undefined` on distance sort loads entire table into memory
- In-memory geocode cache is per-process, lost on cold starts
- `where.categoryId = searchParams.get("category")` — raw query param, no existence validation

### 5.2 POST `/api/jobs` — Create Job

**File:** `src/app/api/jobs/route.ts`  
**Auth:** Required, `hasRole(session.user, "CLIENT")`

**Processing:**

1. Validates body with `createJobSchema` (full) or `quickCreateJobSchema` (quick, if feature-flagged)
2. For full mode: looks up category by **ID** (`prisma.category.findUnique({ where: { id: validatedData.category } })`)
3. For quick mode: falls back to `slug: "general"` category, then first alphabetically
4. Geocodes location via Nominatim (stores lat/lon on job)
5. Creates `Job` record
6. **Background async**: finds providers with matching skills (using `profile.skills has category.id`) and sends `sendComprehensiveNotification` to each

**⚠️ Issues:**

- Background notification loop is fire-and-forget with no retry on failure
- Notification query filters on `role: "PROVIDER"` (legacy), not `roles` array — multirole providers miss alerts
- No rate limiting on job creation beyond global API rate limit

### 5.3 PUT `/api/jobs/[id]` — Update Job

**File:** `src/app/api/jobs/[id]/route.ts`  
**Auth:** Required, owner or ADMIN

**Processing:**

1. Validates with `updateJobSchema`
2. Looks up category by **SLUG** (`prisma.category.findUnique({ where: { slug: body.category } })`)
3. Updates job

**⚠️ BUG — category ID vs. slug mismatch:**

- POST creates using category **ID**
- PUT updates using category **SLUG**
- The frontend form stores and sends the category **ID** (from `CategorySelector`)
- So when editing a job and changing the category, the PUT will fail with "Invalid category" because it's looking up by slug but receiving an ID
- This silently fails or 400s, and the category field does not update on edit

### 5.4 GET `/api/jobs/[id]` — Job Detail

**File:** `src/app/api/jobs/[id]/route.ts`  
**Auth:** None required

**⚠️ SECURITY BUG — PII exposure:**

```ts
client: {
  select: {
    id: true,
    name: true,
    email: true,     // ← exposed to unauthenticated users
    phone: true,     // ← exposed to unauthenticated users
    image: true,
  },
},
```

Client email and phone number are returned to anyone who fetches a job detail, with no authentication required.

### 5.5 POST `/api/jobs/[id]/proposals` — Submit Proposal

**File:** `src/app/api/jobs/[id]/proposals/route.ts`  
**Auth:** Required, `hasRole(session.user, "PROVIDER")`  
**Delegates to:** `src/lib/proposals/submitProposal.ts`

**Processing in `submitProposal`:**

1. Validates input schema
2. Checks job exists → throws `JOB_NOT_FOUND`
3. Checks job is OPEN → throws `JOB_NOT_OPEN`
4. Checks maxApplicants → throws `MAX_APPLICANTS_REACHED`
5. Checks no existing proposal from this provider → throws `PROPOSAL_ALREADY_EXISTS`
6. If `enforceCreditLimit=true`: checks subscription plan; if FREE/inactive and >14 proposals in last 7 days, deducts 2 lead credits from wallet or throws `INSUFFICIENT_CREDITS`
7. Creates `Proposal` in a transaction (includes credit deduction)
8. **Background async**: sends notification to client

**⚠️ CRITICAL BUG — No self-application check:**  
`submitProposal` fetches `job.clientId` but **never compares it to `providerId`**. A multirole user can submit a proposal on their own job via direct API call, bypassing the frontend `isJobOwner` check.

### 5.6 GET `/api/jobs/[id]/proposals` — List Proposals

**File:** `src/app/api/jobs/[id]/proposals/route.ts`  
**Auth:** Required

**Authorization:**

- ADMIN or job owner → sees all proposals
- PROVIDER → sees only their own proposal on that job

**Processing:**

1. Fetches proposals with provider details
2. Computes rich trust metrics: `avgRating`, `reviewCount`, `completionRatePct`, `responseRatePct`, `repeatClientsCount`, `responseTimeHours`, `completionConfidenceBand`
3. Fetches client's accepted proposal history (last 80) for `clientFitHints`
4. Computes personalised `clientFitHints` per proposal (price/ETA/verification preference match)
5. Fetches existing bookings for `bookingId` mapping

**Response:** Array of enriched proposal objects including trust metrics and `clientFitHints`.

### 5.7 PATCH `/api/jobs/[id]/proposals/[proposalId]` — Accept Proposal

**File:** `src/app/api/jobs/[id]/proposals/[proposalId]/route.ts`  
**Auth:** Required, job must belong to current user

**Processing (within `$transaction`):**

1. Updates proposal status → `ACCEPTED`
2. Bulk-updates all other PENDING proposals → `REJECTED`
3. Updates job status → `IN_PROGRESS`
4. If no existing booking for this job+provider: creates `Booking` (status: `CONFIRMED`, date: job deadline or +3 days)
5. Creates `Payment` record (status: `PENDING`, method: `WALLET`, transactionId: `escrow_hold_[bookingId]`)

**No side effects** beyond the transaction (no notification to provider or client on acceptance).

### 5.8 GET `/api/provider/jobs` — Provider Job Dashboard

**File:** `src/app/api/provider/jobs/route.ts`  
**Auth:** Required, `hasRole(session.user, "PROVIDER")`  
**Tabs:** available, recommended, applied, active, completed

**Win probability:** Computed from `proposalWinRate` and `completionRate` per provider, returned with each job.

**Recommendation scoring:** For `recommended` tab, jobs scored by category match (+3), location match (+2), low competition (+2), good budget ≥ 5000 (+1), urgency within 48h (+1), this week (+1), high win-rate (+1), reliable history (+1).

---

## 6. Data Model and Persistence

### 6.1 `Job` Model

```prisma
model Job {
  id            String    @id @default(cuid())
  clientId      String                        // FK to User
  categoryId    String                        // FK to Category
  title         String
  description   String    @db.Text
  budget        Decimal?  @db.Decimal(10, 2)
  location      String?
  latitude      Float?                        // Geocoded
  longitude     Float?                        // Geocoded
  deadline      DateTime?                     // ← never set by the form (BUG)
  maxApplicants Int?
  status        JobStatus @default(OPEN)
  images        String[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  // Relations:
  client        User
  category      Category
  proposals     Proposal[]
  bookings      Booking[]
  expenses      Expense[]
}

enum JobStatus { OPEN | IN_PROGRESS | COMPLETED | CANCELLED }
```

**No soft delete** — DELETE is permanent and cascades to proposals, bookings, expenses.

### 6.2 `Proposal` Model

```prisma
model Proposal {
  id            String         @id @default(cuid())
  jobId         String
  providerId    String
  coverLetter   String         @db.Text
  price         Decimal        @db.Decimal(10, 2)
  status        ProposalStatus @default(PENDING)
  estimatedDays Int?
  attachments   String[]       // Contains file URLs + fulfillment metadata JSON blob
  createdAt     DateTime
  updatedAt     DateTime
}

enum ProposalStatus { PENDING | ACCEPTED | REJECTED }
```

**No unique constraint** on `(jobId, providerId)` in the schema — the duplicate check is enforced only in application code (`submitProposal`). A DB-level unique index is missing.

**`attachments` dual-purpose abuse:** The `attachments[]` array stores both real file URLs and a special JSON metadata blob for fulfillment preference. This is fragile — any query that counts or iterates attachments must account for this.

### 6.3 `Booking` (created on proposal acceptance)

Auto-created by the accept flow at `src/app/api/jobs/[id]/proposals/[proposalId]/route.ts`:

- `date` = `job.deadline` or `now() + 3 days` (fallback)
- `totalAmount` = `proposal.price`
- `status` = `CONFIRMED`
- `serviceId` = null (job-based booking has no service)
- An associated `Payment` with `status: PENDING` (escrow hold) is also created

### 6.4 Status Transitions

```
Job:      OPEN → IN_PROGRESS (on proposal accept) → COMPLETED | CANCELLED
                                                   ↗ (via direct status update)
          OPEN → CANCELLED (via close job action)

Proposal: PENDING → ACCEPTED (one per job)
          PENDING → REJECTED (bulk on accept of another)
```

**⚠️ No state machine enforcement on the PUT endpoint.** The `updateJobSchema` accepts any valid `JobStatus` value. A client can set a job to `COMPLETED` via PUT without any proposals or bookings existing.

---

## 7. End-to-End Data Flow

### 7.1 Job Creation Flow

```
Client clicks "Post Job"
→ /client/post-job page loads (PostJobPageContent)
→ User fills 4-step wizard
→ Image uploads to /api/upload → Cloudinary → URL stored in state
→ handleSubmit() builds jobData object (⚠ date field dropped here)
→ createJobMutation → POST /api/jobs
  → hasRole check (CLIENT)
  → createJobSchema.parse(body)
  → prisma.category.findUnique({ id: category }) ← uses ID
  → geocodeLocation(location) → Nominatim
  → prisma.job.create(...)
  → Background: find matching providers → sendComprehensiveNotification (fire & forget)
→ 201 response with job object
→ Frontend: toast + redirect to /client/dashboard
```

### 7.2 Proposal Submission Flow

```
Provider views /jobs/[id]
→ useJob(jobId) → GET /api/jobs/[id] (public)
→ useJobProposals(jobId) → GET /api/jobs/[id]/proposals (auth required)
→ isProvider check (⚠ uses legacy .role field)
→ Provider fills form, clicks "Submit proposal"
→ submitProposal.mutate({ jobId, coverLetter, price, estimatedDays, attachments })
→ POST /api/jobs/[id]/proposals
  → hasRole(user, "PROVIDER") check
  → createJobProposalSchema.parse(body)
  → submitProposal({ providerId, input, enforceCreditLimit: true, notifyClient: true })
    → job exists & OPEN check
    → maxApplicants check
    → duplicate proposal check (no DB constraint — app-level only)
    → credit check (if FREE plan and >14 weekly proposals)
    → $transaction: create Proposal + optional wallet debit
    → Background: sendComprehensiveNotification to client
→ 201 response
→ Frontend: toast success, form closes
```

### 7.3 Proposal Acceptance Flow

```
Client views /client/jobs/[id]
→ useQuery([job, jobId]) → GET /api/jobs/[id]
→ useQuery([job, jobId, proposals]) → GET /api/jobs/[id]/proposals
→ Client clicks "Accept Proposal"
→ acceptProposalMutation.mutate(proposalId)
→ PATCH /api/jobs/[id]/proposals/[proposalId]
  → auth check: job.clientId === session.user.id
  → $transaction:
    → proposal.status = ACCEPTED
    → other proposals → REJECTED
    → job.status = IN_PROGRESS
    → booking.create (CONFIRMED) if not exists
    → payment.create (PENDING escrow hold)
→ 200 response
→ Frontend: invalidate queries, toast
→ On next render: bookingTimeline fetched from /api/bookings/[id]/escrow/milestones
→ PaymentTimelineCard rendered
```

---

## 8. Business Rules

| Rule                                            | Enforced Where                      | Frontend?                               | Backend?                          | Gaps                                               |
| ----------------------------------------------- | ----------------------------------- | --------------------------------------- | --------------------------------- | -------------------------------------------------- |
| Only CLIENTs can post jobs                      | POST /api/jobs                      | ✗ (no UI-level role gate before submit) | ✓                                 | —                                                  |
| Only PROVIDERs can submit proposals             | POST proposals endpoint             | Partial (buggy `isProvider` check)      | ✓                                 | Frontend check uses wrong method                   |
| One proposal per provider per job               | submitProposal.ts (app code)        | ✗                                       | ✓ (no DB constraint)              | Race condition possible; no DB unique index        |
| maxApplicants enforced                          | submitProposal.ts                   | Shown as info message                   | ✓                                 | Race condition (count checked outside transaction) |
| Provider cannot apply to own job                | jobs/[id]/page.tsx only             | Partial (buggy)                         | **✗ MISSING**                     | Critical gap for multirole users                   |
| Job must be OPEN to accept proposals            | submitProposal.ts                   | ✓ (UI hides form)                       | ✓                                 | —                                                  |
| Weekly proposal limit (FREE plan: 14/week)      | submitProposal.ts transaction       | ✗                                       | ✓                                 | Lead credit deduction is in-transaction — correct  |
| Budget must be positive                         | createJobSchema                     | ✓ (form validation)                     | ✓                                 | —                                                  |
| Cover letter min 50 chars                       | submitProposal.ts                   | ✓ (UI counter + toast)                  | ✓ (50 chars in service)           | Route-level schema says min(10) — inconsistency    |
| Job deadline saved                              | createJobSchema / API               | Collected in form                       | **✗ DROPPED**                     | `date` field never included in jobData             |
| Category must exist                             | POST (ID lookup), PUT (slug lookup) | ✓ (CategorySelector)                    | ✓ (but different lookup strategy) | PUT uses slug, POST uses ID — edit breaks          |
| Status transitions gated                        | N/A                                 | N/A                                     | **Partial**                       | PUT accepts any status — no state machine          |
| Only job owner or ADMIN can edit/delete         | PUT/DELETE /api/jobs/[id]           | ✗ (no UI gate)                          | ✓                                 | —                                                  |
| Only job owner can accept proposals             | PATCH proposals/[id]                | ✓ (UI not shown to others)              | ✓                                 | —                                                  |
| Provider can only withdraw own pending proposal | DELETE /api/proposals/[id]          | ✓                                       | ✓                                 | —                                                  |

---

## 9. Role Interaction Matrix

| Action                          | Guest                  | Client        | Provider              | Client+Provider (multirole)   | Admin    |
| ------------------------------- | ---------------------- | ------------- | --------------------- | ----------------------------- | -------- |
| Browse /jobs marketplace        | ✅                     | ✅            | ✅                    | ✅                            | ✅       |
| View job detail (/jobs/[id])    | ✅                     | ✅            | ✅                    | ✅                            | ✅       |
| Post a job                      | ❌                     | ✅            | ❌                    | ✅ (CLIENT role)              | ❌\*     |
| Edit own job                    | ❌                     | ✅            | ❌                    | ✅ (own)                      | ✅ (any) |
| Delete own job                  | ❌                     | ✅            | ❌                    | ✅ (own)                      | ✅ (any) |
| Submit a proposal               | ❌ (redirect to login) | ❌            | ✅                    | ⚠️ Broken (legacy role check) | ❌       |
| Apply to own job                | ❌                     | N/A           | N/A                   | ⚠️ Blocked frontend-only      | ❌       |
| View all proposals on own job   | ❌                     | ✅ (own jobs) | ❌ (own only)         | ✅ (own jobs)                 | ✅       |
| Accept a proposal               | ❌                     | ✅ (own job)  | ❌                    | ✅ (own job, CLIENT hat)      | ❌\*     |
| Close/cancel a job              | ❌                     | ✅ (own)      | ❌                    | ✅ (own)                      | ✅       |
| Withdraw a proposal             | ❌                     | ❌            | ✅ (own)              | ✅ (PROVIDER hat)             | ❌       |
| Receive job alert notifications | N/A                    | N/A           | ✅ (legacy role only) | ⚠️ Miss if role=CLIENT        | N/A      |
| View /dashboard/jobs            | ❌                     | ❌            | ✅                    | ⚠️ Blocked by middleware      | ❌       |
| View /client/jobs/[id]          | ❌                     | ✅            | ❌                    | ✅                            | ❌       |

\*Admin role is not intended to post jobs or accept proposals in current design.

---

## 10. Dependencies and Integrations

| Dependency                          | How it's Used                                                                         | File                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **NextAuth / `src/auth.ts`**        | Session auth for all protected endpoints; `roles` and `role` both stored in JWT       | All API routes                                                             |
| **Prisma ORM**                      | All DB reads/writes; `prisma.$transaction` for atomic accept/credit flows             | All API routes                                                             |
| **TanStack Query**                  | Client-side data fetching, mutation state, cache invalidation                         | All frontend pages                                                         |
| **Cloudinary**                      | Job image uploads via `/api/upload`, attachment uploads from proposal form            | post-job page, jobs/[id] page                                              |
| **Nominatim (OpenStreetMap)**       | Geocoding job locations for distance calculation                                      | `src/app/api/jobs/route.ts`                                                |
| **`sendComprehensiveNotification`** | Sends email + push for job alerts and proposal notifications                          | `src/lib/notifications/adminNotifications.ts`                              |
| **Wallet/Credits system**           | Deducts lead credits for FREE providers exceeding weekly limit                        | `src/lib/proposals/submitProposal.ts`                                      |
| **Booking system**                  | Auto-created booking on proposal acceptance; dispute, completion, payment lifecycle   | `src/app/api/jobs/[id]/proposals/[proposalId]/route.ts`                    |
| **Escrow/Milestones**               | Payment timeline shown post-acceptance                                                | `/api/bookings/[id]/escrow/milestones`                                     |
| **Messaging/Chat**                  | "Message client" and "Message provider" deep-links to existing chat                   | `/dashboard/messages`, `/client/messages`                                  |
| **`useJobsEvents` / Analytics**     | Event tracking for funnel analysis                                                    | `src/hooks/useJobsEvents.ts`, `src/app/api/analytics/jobs-events/route.ts` |
| **`growthFeatureFlags`**            | `quickPost` flag gates quick-post feature                                             | `src/lib/growth/featureFlags.ts`                                           |
| **Team system (`TeamJob`)**         | Separate parallel feature at `/dashboard/team/jobs` — uses `TeamJob` model, not `Job` | `src/app/dashboard/team/jobs/page.tsx`                                     |

---

## 11. Edge Cases and Failure Scenarios

### 🔴 Critical

**#1 — Self-application (multirole bypass):**  
`submitProposal.ts` does NOT check `job.clientId !== providerId`. Any authenticated user with the PROVIDER role can call `POST /api/jobs/[id]/proposals` with a jobId they own as a CLIENT. There is no backend guard. The frontend check `isJobOwner` only fires if `session?.user?.role === "PROVIDER"` (also broken — see #2), so this is a double failure.

**#2 — `isProvider` check uses legacy role field:**  
`src/app/jobs/[id]/page.tsx:155`:

```ts
const isProvider = session?.user?.role === "PROVIDER";
```

Should be:

```ts
const isProvider = hasRole(session?.user, "PROVIDER");
```

Result: Any multirole user with `role: "CLIENT"` in their JWT (even if they have `roles: ["CLIENT","PROVIDER"]`) cannot submit proposals from the public job detail page.

**#3 — Middleware blocks multirole users from `/dashboard`:**  
`src/proxy.ts:450`:

```ts
if (isOnProviderDashboard && userRole === "CLIENT") {
  return NextResponse.redirect(new URL("/onboarding", nextUrl));
}
```

`userRole` reads `req.auth?.user?.role` (legacy field). A multirole user with `role: "CLIENT"` is redirected away from `/dashboard` (the provider dashboard). They have no working way to access provider-side jobs.

### 🟠 High Severity

**#4 — Client email/phone exposed without auth:**  
`GET /api/jobs/[id]` returns `client.email` and `client.phone` to unauthenticated callers. Should be removed or gated behind auth.

**#5 — PUT `/api/jobs/[id]` category lookup uses slug, but frontend sends ID:**  
POST looks up category by ID; PUT looks up by slug. The `CategorySelector` component stores and passes the category's database ID. When a user edits a job and tries to change the category, PUT will 400 with "Invalid category" because the ID doesn't match any slug. Category updates are silently broken in edit mode.

**#6 — `deadline` field collected in UI but never submitted:**  
`formData.date` is collected in Step 3 of the post-job wizard and shown on the Review step, but the `jobData` object in `handleSubmit` does not include it. The `createJobSchema` also doesn't have a `deadline` field. The job is always created with `deadline: null`, and the date input is cosmetic only.

### 🟡 Medium Severity

**#7 — No DB unique constraint on `(jobId, providerId)` in Proposal:**  
Duplicate proposal prevention is application-level only in `submitProposal.ts`. Under concurrent requests, two identical proposals could be created before either check completes.

**#8 — `maxApplicants` race condition:**  
The count check is outside the transaction:

```ts
const proposalCount = await prisma.proposal.count({ where: { jobId } });
if (proposalCount >= job.maxApplicants)
  throw new Error("MAX_APPLICANTS_REACHED");
```

Multiple concurrent submissions can all pass this check before any of them commits.

**#9 — No state machine on job status updates:**  
`PUT /api/jobs/[id]` accepts any `JobStatus` value in `updateJobSchema`. A client can set a job directly to `COMPLETED` without any accepted proposal or booking existing.

**#10 — Notification query uses legacy role filter:**  
Job alert notifications query:

```ts
where: { role: "PROVIDER", ... }
```

This uses the `role` column. Multirole users who have `role: "CLIENT"` but `roles: ["CLIENT","PROVIDER"]` do not receive job alerts.

**#11 — Distance sort fetches all jobs:**  
When `sortBy=distance` and user coords are provided, `take: undefined` is passed to Prisma — loading all matching jobs into memory before sorting. With thousands of jobs this is a memory/latency issue.

**#12 — In-memory geocode cache:**  
`const geocodeCache = new Map<...>()` is in module scope. In serverless (Vercel), each cold start loses the cache, causing unnecessary Nominatim calls on every deployment.

**#13 — Notification type `JOB_ALERT` used for both new jobs AND new proposals:**

```ts
type: "JOB_ALERT",  // in job creation notification
type: "JOB_ALERT",  // in proposal submission notification
```

The proposal notification should use `"NEW_PROPOSAL"` or similar to allow correct filtering/labelling in the notification centre.

**#14 — `updateJobMutation` redirects to `/client/dashboard` after edit:**  
After updating a job, the user is redirected to the dashboard, not back to the job detail page (`/client/jobs/[jobId]`). This breaks the edit → review workflow.

### 🟢 Low Severity

**#15 — Post-job form: no error displayed on submit failure:**  
`handleSubmit` catches errors with `console.error` only. The user sees no error message if the job creation API returns an error.

**#16 — `coverLetter` min length inconsistency:**  
The route-level schema (`createJobProposalSchema`) requires `message: z.string().min(10)`, but `submitProposal.ts` enforces 50 characters. The error message a user sees from the route level says "min 10" before the service-level rejection says "min 50".

**#17 — Edit mode: form is silently empty while fetching:**  
No loading skeleton or disabled state is shown while `existingJob` is fetching in edit mode. The form appears blank until data arrives, which could lead to accidental empty submissions if user types quickly.

**#18 — `GET /api/jobs` category filter uses raw query param:**

```ts
where.categoryId = searchParams.get("category");
```

No validation that the value is a real category ID. An invalid UUID passes silently (Prisma returns 0 results).

---

## 12. Security and Access Control Review

| Vector                                  | Status               | Detail                                              |
| --------------------------------------- | -------------------- | --------------------------------------------------- |
| **Auth on mutating endpoints**          | ✅                   | All POST/PUT/DELETE/PATCH check session             |
| **Auth on GET /api/jobs/[id]**          | ⚠️                   | No auth — exposes client PII (email, phone)         |
| **Auth on GET /api/jobs**               | ✅ (intended public) | OK for marketplace listing                          |
| **Ownership check on PUT/DELETE**       | ✅                   | `clientId === session.user.id` check present        |
| **Ownership check on proposal accept**  | ✅                   | `job.clientId === session.user.id`                  |
| **Self-application guard**              | ❌                   | Missing in `submitProposal.ts` backend              |
| **Input validation on POST job**        | ✅                   | Zod schema validates all fields                     |
| **Input validation on PUT job**         | ✅                   | `updateJobSchema` validates                         |
| **Input validation on proposal submit** | ✅                   | Double-validated: route + service                   |
| **Mass assignment protection**          | ✅                   | Explicit field selection on all Prisma writes       |
| **IDOR on proposals**                   | ✅                   | Providers only see own proposals; owners see all    |
| **IDOR on job detail**                  | ⚠️                   | PII returned without ownership check                |
| **Rate limiting on POST job**           | Partial              | Only global API rate limit (300 req/5min per IP)    |
| **Rate limiting on proposal submit**    | ✅                   | Weekly limit (14/week) enforced in service          |
| **SQL injection**                       | ✅                   | Prisma parameterised queries throughout             |
| **Multirole feature flag enforcement**  | ⚠️                   | Several places bypass `hasRole()` using raw `.role` |

---

## 13. Observability and Debugging

### Existing Logs

- `console.error("[JOBS_GET]", error)` — GET /api/jobs failures
- `console.error("[JOBS_POST]", error)` — POST /api/jobs failures
- `console.error("[PROPOSALS_GET]", error)` — proposal list failures
- `console.error("[PROPOSALS_POST]", error)` — proposal submit failures
- `console.error("[PROPOSAL_ACCEPT]", error)` — accept proposal failures
- `console.log("[JobAlert] Found N matching providers...")` — notification path
- `console.error("Geocoding error:", error)` — geocode failures
- `console.error("Failed to send job alerts:", error)` — notification failures

### Analytics Events (via `useJobsEvents` → `/api/analytics/jobs-events`)

Captured events: `job_post_started`, `job_post_minimal_submitted`, `job_post_published`, `provider_apply_started`, `provider_apply_submitted`, `pricing_hint_applied`, `proposal_recommendation_impression`, `proposal_recommendation_clicked`

### Missing Observability

- No log when a provider is blocked by `MAX_APPLICANTS_REACHED` or `INSUFFICIENT_CREDITS`
- No log for self-application attempt
- No metric for proposal acceptance rate or time-to-first-proposal
- No structured logging — all `console.error` only, no log levels or trace IDs
- No alert on geocoding failure rate
- No monitoring on background notification failures

### Debugging Guide

- **Proposal not submitting:** Check `[PROPOSALS_POST]` in server logs. Check `FF_MULTI_ROLE_ENFORCE_ENABLED` and user's `role` vs `roles` fields in DB.
- **Provider can't see proposal form:** Check `session.user.role` — must equal `"PROVIDER"` exactly for the buggy `isProvider` check to pass.
- **Category not updating on edit:** Known bug — PUT uses slug lookup. Check `body.category` value vs. category slugs in DB.
- **Job alerts not arriving:** Check provider's `role` column in `User` table — must be `"PROVIDER"` (not CLIENT with roles array).
- **Distance sort slow:** Check if `sortBy=distance` and whether `take: undefined` is being hit.

---

## 14. Testing Coverage

### Existing Tests

No test files found for the Jobs feature in the scanned codebase. The `prisma/seed.ts` creates minimal seed data.

### Missing Unit Tests

- `submitProposal.ts` — the most critical service function has no tests
- `calculateDistance()` in `/api/jobs/route.ts`
- `getWinProbability()` in `/api/provider/jobs/route.ts`
- `evaluateProposal()` in `/client/jobs/[id]/page.tsx`
- `validateStep()` in post-job form
- `hasRole()` and `normalizeRoles()` in `src/lib/auth/roles.ts`

### Missing Integration Tests

- POST /api/jobs — requires CLIENT role
- POST /api/jobs — multirole user (CLIENT+PROVIDER) can post
- POST /api/jobs/[id]/proposals — provider cannot apply to own job
- PATCH /api/jobs/[id]/proposals/[id] — accept creates booking + payment
- GET /api/jobs/[id] — does not expose PII without auth (currently fails)
- PUT /api/jobs/[id] — category update with ID (currently fails due to slug bug)

### E2E Scenarios Needed

1. **Client posts job → receives proposal → accepts → booking created**
2. **Multirole user posts job, then attempts to apply to it** (should be blocked)
3. **Provider submits 15th proposal → credit deducted**
4. **maxApplicants reached → late proposal rejected with 409**
5. **Quick post → edit to add details flow**
6. **Provider applies from public page → proposal visible in dashboard applied tab**

---

## 15. Known Gaps / Tech Debt / Risks

| Category            | Issue                                                          | Severity |
| ------------------- | -------------------------------------------------------------- | -------- |
| **Security**        | Client PII exposed in unauthenticated job detail               | 🔴       |
| **Security**        | Self-application not prevented on backend                      | 🔴       |
| **Correctness**     | `isProvider` uses `.role` instead of `hasRole()`               | 🔴       |
| **Correctness**     | Middleware blocks multirole users from provider dashboard      | 🔴       |
| **Correctness**     | Category update broken in edit (ID vs slug mismatch)           | 🟠       |
| **Correctness**     | Deadline/date field silently dropped on job creation           | 🟠       |
| **Data integrity**  | No DB unique constraint on `(jobId, providerId)`               | 🟠       |
| **Data integrity**  | maxApplicants race condition                                   | 🟠       |
| **Performance**     | Distance sort loads entire table                               | 🟡       |
| **Performance**     | In-memory geocode cache lost on restart                        | 🟡       |
| **UX**              | No error displayed when job creation fails                     | 🟡       |
| **UX**              | Edit mode redirects to dashboard, not back to job              | 🟡       |
| **UX**              | Form silently empty during edit data fetch                     | 🟡       |
| **Architecture**    | `attachments[]` dual-used for files and fulfillment metadata   | 🟡       |
| **Notifications**   | Wrong notification type for proposals (`JOB_ALERT`)            | 🟡       |
| **Notifications**   | Job alerts miss multirole providers                            | 🟡       |
| **Maintainability** | No tests for any Jobs logic                                    | 🟡       |
| **Scalability**     | No pagination/cursor for accepted proposal history (takes 80)  | 🟢       |
| **Scalability**     | Background notification loop is sequential for-loop, not batch | 🟢       |

---

## 16. Recommended Improvements

### Quick Wins (1–3 days each)

**QW-1 — Fix `isProvider` check in public job detail page**  
File: `src/app/jobs/[id]/page.tsx:155`

```ts
// Change:
const isProvider = session?.user?.role === "PROVIDER";
// To:
import { hasRole } from "@/lib/auth/roles";
const isProvider = hasRole(session?.user, "PROVIDER");
```

Why: Immediately unblocks multirole providers from applying. Zero risk.

**QW-2 — Add self-application check in `submitProposal.ts`**  
File: `src/lib/proposals/submitProposal.ts`

```ts
// After fetching the job, add:
if (job.clientId === providerId) {
  throw new Error("CANNOT_APPLY_TO_OWN_JOB");
}
```

And handle the new error code in the route handler. Impacted areas: `submitProposal.ts`, `src/app/api/jobs/[id]/proposals/route.ts`. Risk: Low.

**QW-3 — Remove email/phone from unauthenticated job detail GET**  
File: `src/app/api/jobs/[id]/route.ts`

```ts
// Remove from the unauthenticated GET:
// email: true,
// phone: true,
```

If these are needed, add auth check and return only when the requester is the provider with an accepted proposal or ADMIN. Risk: Low.

**QW-4 — Fix category lookup in PUT endpoint**  
File: `src/app/api/jobs/[id]/route.ts`

```ts
// Change slug lookup to ID lookup (matching POST):
const category = await prisma.category.findUnique({
  where: { id: body.category }, // was: { slug: body.category }
});
```

Risk: Low — only affects edit flow, change is simple.

**QW-5 — Include `deadline` in `jobData` submitted from post-job form**  
File: `src/app/client/post-job/page.tsx`  
Add to `createJobSchema`: `deadline: z.string().optional()`  
Add to `jobData` in `handleSubmit`:

```ts
deadline: formData.date ? formData.date : undefined,
```

Also handle in API. Risk: Low.

**QW-6 — Fix edit redirect to go back to job, not dashboard**  
File: `src/app/client/post-job/page.tsx`

```ts
// In updateJobMutation.onSuccess:
setTimeout(() => router.push(`/client/jobs/${editJobId}`), 2000);
```

Risk: Zero.

### Medium-Sized Improvements (3–7 days)

**MI-1 — Fix middleware role check for multirole users accessing `/dashboard`**  
File: `src/proxy.ts:450`

```ts
// Change:
if (isOnProviderDashboard && userRole === "CLIENT") {
// To (import hasRole-equivalent for middleware context):
const userRoles = req.auth?.user?.roles as string[] | undefined;
const effectivelyClientOnly = userRole === "CLIENT" && !userRoles?.includes("PROVIDER");
if (isOnProviderDashboard && effectivelyClientOnly) {
```

Impacted areas: proxy.ts, possibly session shape in auth.ts. Risk: Medium (routing logic).

**MI-2 — Add DB unique constraint on Proposal `(jobId, providerId)`**  
File: `prisma/schema.prisma`

```prisma
model Proposal {
  ...
  @@unique([jobId, providerId])
}
```

Create migration. This makes the application-level race condition a hard DB constraint instead. Risk: Low (additive constraint, no existing duplicates expected).

**MI-3 — Fix proposal notification type**  
File: `src/lib/proposals/submitProposal.ts`  
Change `type: "JOB_ALERT"` to `type: "NEW_PROPOSAL"` (ensure this type exists in the notification system). Risk: Low.

**MI-4 — Show error in post-job form on submit failure**  
File: `src/app/client/post-job/page.tsx`  
Add error state to `handleSubmit` catch block and render an inline error message. Risk: Zero.

**MI-5 — Separate fulfillment preference from attachments**  
Create a dedicated `ProposalFulfillment` JSON column or separate table rather than mixing metadata into the `attachments[]` array. Risk: Medium (schema migration + read/write changes).

### Large Refactors (1–3 weeks)

**LR-1 — Make multirole feature flags runtime-enforced by default**  
Enable `FF_MULTI_ROLE_ENFORCE_ENABLED=true` once all `hasRole()` call sites are confirmed correct. Audit all `session?.user?.role ===` direct comparisons across the entire codebase and migrate to `hasRole()`. This is the root cause of most multirole bugs.

**LR-2 — Implement job status state machine**  
Add a service-layer `transitionJobStatus(jobId, fromStatus, toStatus)` that validates allowed transitions (e.g. OPEN → IN_PROGRESS → COMPLETED). Replace raw `status` field in `updateJobSchema` with a dedicated action-based API (e.g. `POST /api/jobs/[id]/complete`).

**LR-3 — Replace in-memory geocode cache with Redis/DB-backed caching**  
Store geocoded coordinates in the `Job` record (already has `latitude`/`longitude` fields). For the listing endpoint, skip geocoding for jobs with stored coordinates. For new jobs, geocode at creation time (already done) and persist.

**LR-4 — Add job creation rate limiting**  
Add a per-user rate limit on `POST /api/jobs` (e.g. 10 jobs per hour for CLIENT, configurable) to prevent spam. Use the existing proxy rate limit infrastructure.

---

## 17. File Map

### Frontend

```
src/app/jobs/page.tsx                          Public marketplace page
src/app/jobs/JobsClient.tsx                    Marketplace client component
src/app/jobs/JobCard.tsx                       Job card for marketplace
src/app/jobs/[id]/page.tsx                     Public job detail + provider apply page
src/app/jobs/[id]/layout.tsx                   Job detail layout wrapper
src/app/client/post-job/page.tsx               Job creation/edit wizard
src/app/client/jobs/[id]/page.tsx              Client job detail + proposal management
src/app/dashboard/jobs/page.tsx                Provider job dashboard (5 tabs)
src/app/dashboard/team/jobs/page.tsx           Team job management (separate feature)
src/components/dashboard/ActiveJobs.tsx        Active jobs widget for dashboard
src/components/dashboard/JobCard.tsx           Job card for dashboard
src/components/dashboard/JobFilters.tsx        Filter controls for job listings
src/components/dashboard/JobSort.tsx           Sort controls for job listings
src/components/jobs/PaymentTimelineCard.tsx    Payment/escrow status display
```

### Backend (API Routes)

```
src/app/api/jobs/route.ts                      GET (public list) + POST (create job)
src/app/api/jobs/[id]/route.ts                 GET (detail) + PUT (update) + DELETE
src/app/api/jobs/[id]/proposals/route.ts       GET (list proposals) + POST (submit)
src/app/api/jobs/[id]/proposals/[proposalId]/route.ts  PATCH (accept proposal)
src/app/api/client/jobs/route.ts               GET (client's own jobs for dashboard)
src/app/api/provider/jobs/route.ts             GET (provider job tabs)
src/app/api/analytics/jobs-events/route.ts     POST (analytics event ingestion)
src/app/api/proposals/[id]/route.ts            DELETE (withdraw proposal)
```

### Services / Business Logic

```
src/lib/proposals/submitProposal.ts            Core proposal submission service
src/lib/proposals/templates.ts                 Quick proposal template generators
src/lib/proposals/fulfillmentMode.ts           Fulfillment metadata encode/decode
src/lib/teams/job-dispatcher.ts                Team job routing (team feature)
```

### Database / Schema

```
prisma/schema.prisma                           Job, Proposal, ProposalTemplate models
prisma/migrations/                             Migration history
```

### Auth / Permissions

```
src/lib/auth/roles.ts                          hasRole, hasAnyRole, normalizeRoles, feature flags
src/auth.ts                                    NextAuth config — role/roles stored in JWT
src/proxy.ts                                   Middleware — route protection and role-based redirects
```

### Shared Utilities / Hooks

```
src/lib/api/hooks/useJobs.ts                   TanStack Query hooks (useJob, useSubmitProposal, etc.)
src/lib/api/hooks/usePublicJobs.ts             Public job listing hook
src/hooks/mutations/useJobMutations.ts         Mutation hooks
src/hooks/queries/useJobs.ts                   Query hooks
src/hooks/useJobsEvents.ts                     Analytics event tracking hook
src/lib/hooks/useDashboardJobs.ts              Dashboard-specific jobs hook
src/lib/api/client.ts                          Axios API client wrapper
src/lib/validations/schemas.ts                 createJobSchema, updateJobSchema, quickCreateJobSchema
src/lib/growth/featureFlags.ts                 growthFeatureFlags (quickPost)
```

### Integrations

```
src/lib/notifications/adminNotifications.ts   sendComprehensiveNotification (email + push)
```

---

## 18. Open Questions

1. **Multirole feature flag production status:** Are `FF_MULTI_ROLE_READ_ENABLED`, `FF_MULTI_ROLE_WRITE_ENABLED`, `FF_MULTI_ROLE_ENFORCE_ENABLED` currently enabled in production? If yes, the `isProvider` check bug and middleware bug are actively breaking the multirole experience. If no, the multirole feature is entirely non-functional in production today.

2. **Can PROVIDERs (single-role) post jobs?** The current system requires CLIENT role to post. Is the intent that all providers must upgrade to multirole to post jobs? Or should providers be able to post jobs without being a CLIENT?

3. **Job deadline UX intent:** Was the "Preferred Date" field in the post-job form meant to be the deadline, the preferred start date, or something else? It's currently not saved at all.

4. **Proposal withdrawal from dashboard:** `useWithdrawProposal` exists and routes to `DELETE /api/proposals/[id]`. It's used in the dashboard. Is there an equivalent action on the public `/jobs/[id]` page? It appears not.

5. **Status `COMPLETED` transition:** Who marks a job as COMPLETED? There's no explicit "Mark Complete" action found in the client UI beyond the admin/booking completion flow. Is this triggered via the booking completion path, or manually?

6. **Job re-opening:** Once a job is `CANCELLED` or `IN_PROGRESS`, can it be re-opened? The PUT endpoint allows any status value — but there's no UI for this and no product clarification.

7. **Team fulfillment metadata:** The fulfillment preference is embedded in `proposal.attachments[]` as a serialised JSON blob. Is this structure documented anywhere, and is the team routing integration with the core booking/job lifecycle planned for implementation?

8. **Job alerts for multirole providers:** After fixing the `role` vs `roles` issue, will the alert volume increase significantly? Any throttling plan?

---

## 19. Final Verdict

| Dimension                | Assessment                                                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature completeness** | ~65%. Core posting/browsing/proposing/accepting works. Deadline saving is broken. Multirole provider experience is broken. Category edit is broken.                                                  |
| **Security confidence**  | Low–Medium. PII leak in unauthenticated endpoint. Self-application guard missing on backend. Several role checks bypass the proper `hasRole()` function.                                             |
| **Maintainability**      | Medium. Business logic is well-separated (submitProposal service, schemas). However, dual-purpose `attachments[]`, inconsistent category lookup strategy, and no tests make changes risky.           |
| **Architecture clarity** | Good overall. Clear separation of public marketplace vs. client dashboard vs. provider dashboard. Multirole design is sound in theory but implementation is incomplete.                              |
| **Main risks**           | (1) Multirole is broken in multiple ways — a provider who is also a client cannot effectively use the provider job features. (2) PII exposure. (3) No test coverage means every change is high-risk. |

---

## Top 10 Issues (Prioritised)

| #   | Issue                                                                                                         | Severity | Files                                      |
| --- | ------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------ |
| 1   | **`isProvider` uses `.role` directly instead of `hasRole()`** — multirole providers cannot apply              | 🔴       | `src/app/jobs/[id]/page.tsx:155`           |
| 2   | **Middleware uses legacy `.role` to gate `/dashboard`** — multirole providers cannot reach provider dashboard | 🔴       | `src/proxy.ts:450`                         |
| 3   | **`submitProposal` has no self-application check** — multirole users can apply to own jobs via API            | 🔴       | `src/lib/proposals/submitProposal.ts`      |
| 4   | **Client email/phone exposed to unauthenticated GET**                                                         | 🔴       | `src/app/api/jobs/[id]/route.ts:20–22`     |
| 5   | **PUT category lookup uses slug; frontend sends ID** — category edits always fail                             | 🟠       | `src/app/api/jobs/[id]/route.ts:69–75`     |
| 6   | **`deadline` field collected in form but never submitted** — date input is cosmetic                           | 🟠       | `src/app/client/post-job/page.tsx:404–413` |
| 7   | **No DB unique constraint on `(jobId, providerId)`** — concurrent submissions can duplicate                   | 🟠       | `prisma/schema.prisma`                     |
| 8   | **Job alert notifications miss multirole providers** — `role: "PROVIDER"` filter uses legacy column           | 🟡       | `src/app/api/jobs/route.ts:461`            |
| 9   | **Distance sort fetches ALL jobs** — `take: undefined` causes full table scan                                 | 🟡       | `src/app/api/jobs/route.ts:230–232`        |
| 10  | **Zero test coverage on Jobs business logic** — every change is unverified                                    | 🟡       | Entire feature                             |

---

## Plain-English Summary (Non-Technical)

The Jobs feature lets clients post work and providers bid on it. The core flow — posting a job, browsing available jobs, submitting a proposal, and accepting one — works for single-role users. However, the **multi-role system** (where one account is both a client and a provider) has several critical bugs:

- A provider who is also a client **cannot access the provider job dashboard** and **cannot see the proposal form** on job pages — the system mistakenly treats them as clients-only.
- There is **no protection preventing a user from applying to their own job** on the server side — a sophisticated user could do this via direct API calls.

Additionally, **anyone on the internet can see a client's email address and phone number** just by looking at a job's detail page — this data should be private.

There's also a hidden bug where the "Preferred Date" field shown during job creation is never actually saved — so users filling it in are wasting their time.

The recommendation engine (for both providers browsing jobs and clients reviewing proposals) is well-built. The proposal system is solid once you get past the role issues.

**Immediate priority:** Fix the three multirole bugs and the email/phone data exposure. These are breaking user experience and creating a security risk. Then fix the category edit bug and the date field. All six fixes are small code changes (1–2 hours each).

---

## Developer Summary (Most Important Implementation Details)

1. **Two role systems coexist:** Legacy `User.role` (single string) and new `User.roles` (array). `hasRole()` switches between them based on `FF_MULTI_ROLE_ENFORCE_ENABLED`. Multiple components bypass `hasRole()` and read `.role` directly — this is the root cause of most multirole bugs.

2. **`submitProposal.ts` is the source of truth** for proposal validation and credit enforcement. The route-level schema (`createJobProposalSchema`) has different minimums than the service — the service wins, but error messages from the route level can mislead callers.

3. **POST job uses category ID; PUT uses category SLUG** — this inconsistency breaks category editing completely.

4. **The `attachments[]` field on Proposal is dual-purpose:** it stores both real file URLs and a JSON metadata blob for fulfillment preference (team vs. individual). Any code iterating attachments must call `parseFulfillmentPreference()` to filter out the metadata blob.

5. **Accepting a proposal auto-creates a `Booking` and a `Payment`** in a single `$transaction`. This is the entry point into the full booking lifecycle (escrow, disputes, reviews). The booking date falls back to `now() + 3 days` if the job has no deadline — which is always since the deadline is never saved.

6. **Job alerts are fire-and-forget** — they run in a background async IIFE after the job creation response is sent. Failures are logged but not retried and don't affect the creation response.
