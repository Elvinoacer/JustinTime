Based on a comprehensive architectural and code-level audit of the provided Team & Agency Management OS files, I have identified severe vulnerabilities (IDORs), split-brain data models, broken UI lifecycles, and entirely missing features.

Here is the exhaustive breakdown of all broken flows and issues, mapped to your feature specifications, along with required fixes.

## Iteration Progress (2026-04-03)

### Completed in code

- Invitation-first lifecycle is active end-to-end (invite, accept/decline, revoke, pending lists, dashboard acceptance).
- Team member role and permission editing is live on team members page.
- Worker assignment accept/decline flow is live in team jobs page.
- Payroll flow keeps generated batches in `PENDING` with explicit process/cancel actions and status feedback banners.
- Team announcements are implemented in dashboard and action layer.
- Team dashboard now supports multi-team switching and team-scoped operations.
- Team status updates are now team-scoped, preventing cross-team status drift.
- Background location heartbeat is implemented with browser geolocation sync from dashboard.
- Legacy `actions/teams.ts` wrapper now follows invitation-first behavior for backward compatibility.

### Completed in database state

- `TeamInvitation` migration has been created and applied.
- All pending migrations are now applied (`prisma migrate deploy`).
- Prisma migration status is clean (`Database schema is up to date`).

### Remaining global repo blocker (outside Team scope)

- Full-repo TypeScript check still reports many pre-existing errors in non-Team modules.
- `prisma migrate dev` prompts drift-reset due a previously edited historical migration file (`20260403100524_trust_safety_closure`), but this does not block deploy-mode migration application.

---

### **13.1 Team Structure**

**1. Split-Brain Team Creation (Data Flow Failure)**

- **The Issue:** There are two conflicting files for team actions: `src/app/actions/team.ts` and `src/app/actions/teams.ts`. The UI (`dashboard/team/page.tsx`) uses `team.ts`. However, `createTeam` in `team.ts` **does not add the owner as a `TeamMember`**. It only sets `ownerId` on the `Team`.
- **The Impact:** Because the owner is never added to the `TeamMember` table, they do not appear in their own team's member list, they cannot be assigned to jobs, and they cannot earn a worker split of the revenue.
- **The Fix:** Standardize on one file. Update `createTeam` in `team.ts` to automatically create a `TeamMember` record for the creator with the `OWNER` role, matching the logic found in the orphaned `teams.ts` file.

---

### **13.2 Member Management**

**2. Forced Addition vs. Invitation (Data Flow Break)**

- **The Issue:** `inviteTeamMember` does not actually send an invitation. If the email exists in the system, it forcefully adds them to the team immediately. If the user doesn't exist, it throws a generic error.
- **The Impact:** Providers can forcefully add any registered platform user to their team without consent.
- **The Fix:** Create a `TeamInvitation` model. Send an email/notification to the user, and only create the `TeamMember` record when they actively accept.

**3. Orphaned Status & Location Updates (Broken UI Flow)**

- **The Issue:** `updateMemberLocation` and `updateMemberStatus` exist in the backend (`actions/team.ts`), but there is **zero UI** to trigger them.
- **The Impact:** Members will permanently remain in the default `ONLINE` or `OFFLINE` status. The map/location features rely on `lastLocation`, which will never be populated.
- **The Fix:** Add a status toggle toggle (Online/Busy/Offline) in the Team Dashboard header and implement background geolocation syncing for active workers.

**4. Admin Role Hardcoding (Privilege Escalation / Lockout)**

- **The Issue:** `removeTeamMember` checks `if (member.team.ownerId !== session.user.id)`. It completely ignores the `ADMIN` role.
- **The Impact:** Even if a user is invited as an `ADMIN`, they cannot remove members, defeating the purpose of the role.
- **The Fix:** Update authorization checks to validate `member.role === 'ADMIN' || team.ownerId === session.user.id`.

---

### **13.3 Job Dispatch**

**5. Critical IDOR Vulnerability in Job Updates (Security Flow)**

- **The Issue:** `updateJobStatusAction` and `markJobAsCollected` in `team.ts` do **not verify if the user belongs to the team**. They only check if the user is logged in.
- **The Impact:** Any authenticated user on the platform can intercept the network request, pass any `jobId`, and arbitrarily complete, cancel, or mark jobs as collected for **other teams**, destroying their financial records.
- **The Fix:** Fetch the job's `teamId` and assert that the `session.user.id` is the Team Owner, an Admin, or the explicitly assigned Worker.

**6. Broken Assignment Lifecycle (Logic Failure)**

- **The Issue:** When a job is assigned, `assignJobToMembers` sets the assignment status to `PENDING`. However, `updateJobStatus` (when transitioning to `IN_PROGRESS`) executes this query: `where: { jobId, status: 'ACCEPTED' }`.
- **The Impact:** Because there is no UI for a worker to "ACCEPT" a job, the assignment remains `PENDING`. When the owner starts the job, the workers' assignments are ignored and never transition to `IN_PROGRESS` or `COMPLETED`.
- **The Fix:** Either add a Worker UI to "Accept/Decline" jobs (triggering `respondToAssignment`), or have `updateJobStatus` transition both `PENDING` and `ACCEPTED` assignments to `IN_PROGRESS`.

**7. Disconnected Shadow Jobs (Data Architecture)**

- **The Issue:** `createJob` creates a `TeamJob` entirely disconnected from the platform's core `Job` or `Booking` tables.
- **The Impact:** If a client books a team via the platform, the team owner has to manually duplicate the data into the Team Dispatcher.
- **The Fix:** Surface the `bookingId` dropdown in the `TeamJobsPage` UI so owners can link external platform bookings to internal team dispatch records.

---

### **13.4 Team Earnings & Payroll**

**8. Critical IDOR in Payroll Processing (Security Flow)**

- **The Issue:** `processPayrollAction(payrollId)` only checks if `session.user.id` exists. It does not check if the user is the Team Owner.
- **The Impact:** Any user can trigger the processing of any team's payroll via API injection.
- **The Fix:** Add a strict authorization check verifying the `session.user.id` matches the `ownerId` of the team tied to the `payrollId`.

**9. Payroll Generation Data Corruption (Data Flow Break)**

- **The Issue:** `generatePayroll` in `payroll-processor.ts` queries earnings `where: { teamId, isPaid: false }`. It **forgets to check `payrollId: null`**.
- **The Impact:** If an owner clicks "Generate Payroll", then clicks it again for a different date range, the second action will steal the earnings from the first pending payroll, corrupting the database relations and duplicating financial totals.
- **The Fix:** Add `payrollId: null` to the Prisma query in `generatePayroll`.

**10. UI Auto-Bypassing the Payroll Lifecycle (Broken UI Flow)**

- **The Issue:** In `dashboard/team/payroll/page.tsx`, the form action calls `generatePayrollAction`, and if successful, immediately calls `await processPayrollAction(result.payroll.id)`.
- **The Impact:** This completely bypasses the `PENDING` state. Owners cannot review the generated payroll before it is permanently marked as `COMPLETED` and paid. The "Process This Payroll" button in the history UI is essentially dead code because a payroll can never exist in the `PENDING` state.
- **The Fix:** Remove the auto-call to `processPayrollAction` in the form submission. Let the payroll generate as `PENDING`, allowing the owner to review it and click "Process This Payroll" from the list below.

**11. The Midnight Date Truncation Bug (Math/Logic Break)**

- **The Issue:** The payroll form uses `<input type="date">`. When cast to `new Date('YYYY-MM-DD')` in the server action, it defaults to `00:00:00 UTC` of that day.
- **The Impact:** Any jobs completed on the `periodEnd` date after midnight UTC are silently excluded from the payroll.
- **The Fix:** In `generatePayrollAction`, set the end date to the very end of the day: `end.setUTCHours(23, 59, 59, 999)`.

**12. Zero-Worker Earnings Deletion (Math Break)**

- **The Issue:** In `calculateJobSplit`, if `workerCount === 0` (e.g., the owner does the job alone but isn't assigned because they aren't a `TeamMember`), the function returns an empty array `[]`.
- **The Impact:** The entire revenue of the job simply vanishes from the team's internal ledger.
- **The Fix:** Ensure the owner is a `TeamMember` (Fix #1), and add a fallback in `calculateJobSplit` to assign 100% of the earnings to the Team Owner if `workerCount === 0`.

---

### **13.5 Team Communication**

**13. Completely Missing Feature (Architecture Break)**

- **The Issue:** Your specification explicitly requires: _"13.5.1 Team announcement broadcasting backed by TeamAnnouncement model."_
- **The Impact:** There is absolutely no code for this. No `TeamAnnouncement` model usage, no server actions to create broadcasts, and no UI in the dashboard to view or post announcements.
- **The Fix:** 1. Create server actions for `createAnnouncement(teamId, message, priority)`. 2. Add an "Announcements" card to `/dashboard/team/page.tsx`. 3. Push real-time updates to team members using your existing `lib/socket.ts` or `realtime-broadcast.ts`.

  Here is the absolute deepest layer of the feature audit. Moving beyond the standard broken flows, this analysis uncovers **"Ghost Code"** (backend logic with no UI), **Math Crashes**, and **Data Destruction Time-Bombs** deeply hidden in the architecture of the Team Management OS.

Here are the remaining critical flaws that must be fixed for this module to be production-safe:

---

### **1. The Financial Deletion Time-Bomb (Ledger Destruction)**

- **The Issue:** In `src/app/actions/team.ts`, the `removeTeamMember` function executes a hard delete: `prisma.teamMember.delete({ where: { id: memberId } });`.
- **The Impact:** In an ERP/Business system, financial ledgers must be immutable. If a worker quits after 6 months and the owner clicks "Remove Member", one of two catastrophic things will happen depending on your Prisma schema:
  1. **Cascade Delete:** The system wipes out all `TeamJobAssignment` and `TeamEarning` records tied to that worker. The team's historical financial metrics will permanently drop, and past payrolls will be corrupted.
  2. **Restrict (500 Error):** The database blocks the deletion because financial records exist, resulting in a generic 500 crash, meaning the owner can _never_ remove the worker from the UI.
- **The Fix:** Implement **Soft Deletes**. Change `removeTeamMember` to update the record: `prisma.teamMember.update({ data: { isActive: false, status: 'OFFLINE' } })`. Update all UI queries to filter by `isActive: true`.

### **2. The `NaN` Payroll Crash (Mathematical Failure)**

- **The Issue:** In `src/lib/teams/earnings-calculator.ts`, the `calculateJobSplit` logic relies strictly on the team's default setting: `const ownerSplit = job.team.defaultSplit; const workerSplit = 100 - ownerSplit;`.
- **The Impact:** Because there is **no Team Settings UI** (see point 3 below), a newly created team will likely have a `defaultSplit` of `null` or `0`. If it's `null`, `100 - null` or operations on it will result in `NaN` (Not a Number) or mathematically invalid amounts. All generated earnings records will be corrupted with `NaN` amounts, permanently breaking the dashboard total calculations.
- **The Fix:** Add a mathematical fallback in the backend immediately: `const ownerSplit = job.team.defaultSplit ?? 70; // Default 70/30 split`.

### **3. The "Ghost Code" Epidemic (Missing UI Surfaces)**

There are multiple fully-fleshed backend features that are entirely inaccessible because the UI pages or buttons do not exist.

- **Missing Team Settings:** `updateTeamSettings` exists in the backend to set `defaultSplit` and `payrollCycle`. The `dashboard/team/page.tsx` has a link to `/dashboard/team/settings`, but **the settings page file does not exist**.
- **Missing Role Management:** `updateMemberPermissions` exists in `teams.ts`, but the `members/page.tsx` UI has no dropdown or button to promote a `MEMBER` to an `ADMIN`.
- **Missing Bonus/Tip System:** `addBonusEarning` exists in `earnings-calculator.ts` with 100% split routing logic, but there is no "Add Bonus" button in the Payroll or Members UI.
- **Missing Payroll Cancellation:** `cancelPayroll` exists in `payroll-processor.ts`, but the `payroll/page.tsx` UI lacks a "Cancel" button for pending payrolls.
- **The Fix:** You must build the missing `/dashboard/team/settings/page.tsx` immediately to allow split configuration, and wire up the missing buttons to their respective server actions.

### **4. Timezone Blindness in Dispatching (Missed Jobs)**

- **The Issue:** In `src/lib/teams/job-dispatcher.ts`, the `getTodaysJobs` function uses server-side Node.js dates:
  `const today = new Date(); today.setHours(0, 0, 0, 0);`
- **The Impact:** Vercel/Node backends operate in UTC. Kenya is UTC+3. At 1:00 AM in Kenya, the server thinks it is 10:00 PM the _previous day_. Jobs scheduled for early morning will not appear in "Today's Jobs" until the sun is already up, causing teams to miss morning dispatches.
- **The Fix:** Use a timezone-aware library like `date-fns-tz` to calculate the start and end of the day relative to `Africa/Nairobi`.

### **5. The "Fake" Payment Gateway Disconnect**

- **The Issue:** In `dashboard/team/jobs/page.tsx`, an owner can click "Mark Collected" and select `MPESA` or `CARD`.
- **The Impact:** This action _only_ updates a text string in the database (`paymentMethod: 'MPESA'`). It does not actually interact with your IntaSend payment gateway. It creates a dangerous false sense of security where an owner thinks the client was billed via Card/M-Pesa digitally, but no actual money moved through the platform.
- **The Fix:** Rename the UI options to "Collected via Cash", "Collected via External M-Pesa", etc., to make it explicitly clear these are _manual ledger entries_, not triggered payment gateway transactions.

### **6. Unused Geolocation Matching**

- **The Issue:** `job-dispatcher.ts` contains a highly advanced `findNearestAvailable` function utilizing the Haversine formula to sort workers by distance to a job site.
- **The Impact:** It is completely unused. The UI in `jobs/page.tsx` simply loads all workers via a basic `prisma.teamMember.findMany` dropdown in alphabetical order, completely wasting the geolocation capabilities built into the backend.
- **The Fix:** In `jobs/page.tsx`, replace the standard `availableMembers` query with a call to `findNearestAvailable(team.id, job.location)` so the dropdown intelligently suggests the closest workers first.

This represents the absolute deepest, final layer of the architectural audit. We are now moving past UI disconnects and IDORs into **Race Conditions, State-Locks, Idempotency Failures, and Memory Voids**.

These are the types of bugs that pass standard QA but destroy data integrity after 3–6 months in production.

---

### **1. The "Busy" State Lock (Permanent Worker Paralysis)**

Your dispatch engine traps workers in a state where they can never be assigned work again if a job goes wrong.

- **The Break:** In `src/lib/teams/job-dispatcher.ts`, when a job is assigned, `assignJobToMembers` sets the worker's status to `BUSY`. The only place this is reverted is in `updateJobStatus`, which explicitly checks `if (status === 'COMPLETED')` to set them back to `ONLINE`.
- **The Impact:** If a client cancels a job, or if a team owner marks a job as `CANCELLED`, the system never releases the workers. They are permanently locked in the `BUSY` state. Because `findNearestAvailable` strictly filters for `['ONLINE', 'OFFLINE']`, these workers are practically erased from the dispatch system forever until an admin manually hacks the database to free them.
- **The Fix:** Update `updateJobStatus` to release workers on both terminal states: `if (status === 'COMPLETED' || status === 'CANCELLED') { ... set ONLINE ... }`.

### **2. The Earnings Duplication Exploit (Lack of Idempotency)**

Your financial engine allows money to be created out of thin air due to a severe race condition in the job lifecycle.

- **The Break:** In `src/app/actions/team.ts`, earnings are triggered in two places:
  1. `updateJobStatusAction` calls `processJobEarnings` if status changes to `COMPLETED` and the job is marked `collected`.
  2. `markJobAsCollected` calls `processJobEarnings` if the job is already `COMPLETED`.
- **The Impact:** In `src/lib/teams/earnings-calculator.ts`, the `processJobEarnings` function has absolutely **zero idempotency checks**. It blindly runs `prisma.teamEarning.create` every time it is called. If a bad actor intercepts the network and sends the "Mark Collected" payload 50 times for a completed job, the backend will generate 50 identical earning records, artificially inflating the workers' payroll balance by 50x.
- **The Fix:** In `calculateJobSplit` (or `processJobEarnings`), add a query: `const existing = await prisma.teamEarning.findFirst({ where: { jobId } }); if (existing) return;`.

### **3. The "Phantom Team" Account Corruption**

Your team resolution logic has a routing flaw that permanently locks a user out of a team if they accidentally (or intentionally via API) create their own team.

- **The Break:** In `src/app/actions/team.ts`, `getMyTeam` evaluates ownership _before_ membership:
  `let team = await prisma.team.findUnique({ where: { ownerId: session.user.id } });`
  If it finds an owned team, it returns immediately. It only checks `TeamMember` if ownership is false.
- **The Impact:** Suppose User A is invited to the "Nairobi Plumbers" team and works there for 3 months. One day, they hit the `/api/provider/teams` POST route (or UI glitch) and create a team called "User A's Team". From that moment on, `getMyTeam` will _always_ return "User A's Team" because they own it. They are instantly and permanently locked out of "Nairobi Plumbers" in the UI, unable to see their assigned jobs or pending payroll, even though they are still legally a member in the database.
- **The Fix:** A user must be restricted to exactly ONE team context. Prevent team creation if a `TeamMember` record already exists for that user, OR implement a "Switch Team" dropdown in the UI if you intend to support multi-team associations.

### **4. Unhandled Rejections in Payroll (Server Crash)**

Your payroll form assumes perfect database conditions and will hard-crash the application for the user if conditions aren't met.

- **The Break:** In `src/lib/teams/payroll-processor.ts`, if there are no earnings to process, `generatePayroll` throws an explicit error: `throw new Error("No unpaid earnings found for this period");`.
- **The Impact:** In `src/app/dashboard/team/payroll/page.tsx`, the `<form action={...}>` calls `generatePayrollAction` but does absolutely nothing to catch or display this error. If an owner accidentally clicks "Process Payroll" twice, or selects a date range with no jobs, the Next.js Server Action throws the unhandled exception directly to the client, resulting in a generic "500 Internal Server Error" page overlay, destroying the UX.
- **The Fix:** Wrap the server action in a `try/catch`, return `{ success: false, error: e.message }`, and use `toast.error()` or inline form errors to display it gracefully.

### **5. The "Data Void" (Missing Pagination)**

Historical business records simply vanish into the ether because the UI arbitrarily caps data without providing a way to navigate it.

- **The Break:** In `src/app/dashboard/team/jobs/page.tsx`, the Prisma query hardcodes `take: 50`. In `payroll/page.tsx`, it hardcodes `take: 20`.
- **The Impact:** There is no pagination UI (no "Next Page", no "Load More"). If a team does 5 jobs a day, after 10 days, their older jobs permanently disappear from the UI. If there is a dispute regarding a job from 3 weeks ago, the team owner cannot view the job details, assignment history, or payment status because the UI fundamentally cannot access record #51.
- **The Fix:** Implement standard cursor-based or offset pagination (`skip`, `take`) mapped to URL search parameters (e.g., `?page=2`) in both the jobs and payroll dashboard views.

### **6. Unbounded Collection Queries (Memory/Performance Leak)**

While jobs are limited to 50, other queries are completely unbounded, leading to inevitable server degradation.

- **The Break:** In `src/lib/teams/earnings-calculator.ts`, the `getTodaysCollections` function queries `collectedAt: { gte: today }`. Notice it lacks an `lt: tomorrow` upper bound.
- **The Impact:** Because there is no upper bound, if a timestamp gets skewed, or if you run this function later to calculate historical metrics, it pulls _every single collected job from that day until the end of time_ into Node.js memory. Furthermore, it uses a JavaScript `.reduce()` to calculate the totals instead of relying on Prisma's `aggregate({ _sum })`. As the team grows, this function will increasingly consume server RAM until it triggers Vercel/Node OOM (Out of Memory) kills.
- **The Fix:** Add `lt: tomorrow` to the Prisma query, and refactor the grouping logic to use `prisma.teamJob.groupBy` and `prisma.teamJob.aggregate` to offload the heavy math to the SQL database.

## NOW THIS IS CRITICAL AND MUST BE SOLVED AS WELL

I inspected the Team & Agency Management feature across:

- `src/app/actions/team.ts`
- `src/app/actions/teams.ts`
- `src/app/dashboard/team/*`
- `src/components/team/*`
- `src/components/teams/*`
- `src/lib/teams/*`
- `src/app/api/provider/teams/route.ts`
- `prisma/schema.prisma`

The biggest problem is that this feature is split into **two competing implementations**:

- `actions/team.ts` + `components/teams/*` + `dashboard/team/*`
- `actions/teams.ts` + `components/team/*`

That split is causing data drift, inconsistent authorization, and flows that are partially built in one path but not the other.

## Cross-cutting issues affecting the whole feature

1. **Duplicate feature stacks**
   - `src/app/actions/team.ts` and `src/app/actions/teams.ts` both implement team creation/member operations differently.
   - `src/components/team/*` and `src/components/teams/*` are also parallel UI stacks.
   - Result: one screen can create data in a shape that another screen does not expect.

   **Fix**
   - Consolidate into one stack only:
     - keep `src/app/actions/team.ts`
     - keep one component namespace, preferably `src/components/team/*`

   - Delete or migrate the duplicate implementation completely.

2. **Authorization is weak or missing on many server actions**
   - Several actions only check “is logged in” and do not verify team ownership or team membership for the specific resource.
   - This affects `createJob`, `assignMembersToJob`, `updateJobStatusAction`, `markJobAsCollected`, `getTodaysJobsAction`, `getTodaysCollectionsAction`, `getMemberBalanceAction`, `generatePayrollAction`, `processPayrollAction`, `getPendingPayrollAction`.

   **Fix**
   - Centralize authorization helpers:
     - `assertTeamOwner(teamId, userId)`
     - `assertTeamMember(teamId, userId)`
     - `assertJobBelongsToUserTeam(jobId, userId)`

   - Use them in every action before mutating or returning data.

3. **Too many direct DB queries inside pages**
   - Pages like `/dashboard/team/jobs`, `/dashboard/team/members`, `/dashboard/team/payroll` query Prisma directly.
   - That makes business rules inconsistent because the page bypasses validation and shared loaders.

   **Fix**
   - Move all data loading into one domain service/action layer.
   - Pages should call a single loader per screen.

4. **Multi-team data model is partially supported, but UI is single-team**
   - `/api/provider/teams` returns multiple teams.
   - `getMyTeam()` just returns the owned team or the first membership it finds.
   - No team switcher exists on dashboard pages.

   **Fix**
   - Add `teamId` route context or query param.
   - Build screens under `/dashboard/team/[teamId]/...`
   - Add team switcher using `/api/provider/teams`.

---

# Exhaustive audit by requirement

## 13.1 Team Structure

### 13.1.1 Team creation via `team.ts` / `teams.ts` server actions

### Broken / risky

**Issue A — creation logic is inconsistent**

- `src/app/actions/teams.ts#createTeam` creates the owner’s `TeamMember` row with owner permissions.
- `src/app/actions/team.ts#createTeam` creates only the `Team` and does **not** create the owner as a `TeamMember`.

**Impact**

- Owner may exist as `team.ownerId` but not as a member.
- Member counts, status, payroll breakdown, assignment logic, and location/status updates can exclude the owner.
- Different creation entry points produce different data.

**Issue B — duplicate ownership rules**

- Both actions enforce “one owned team per user,” but only one sets membership/permissions.
- A team created from `/dashboard/team` uses the newer action and skips owner membership.

**Issue C — no transactional creation**

- Team + owner member creation should be atomic.

**Fix**

- Keep one `createTeam` action only.
- Wrap in transaction:
  - create `Team`
  - create owner `TeamMember`
  - assign `OWNER_PERMISSIONS`
  - optionally seed default announcement/settings

- Revalidate all team routes.

---

### 13.1.2 Team dashboard at `/dashboard/team`

### Broken / partial

**Issue A — broken settings link**

- Dashboard links to `/dashboard/team/settings`
- That page does not exist.

**Impact**

- Direct 404 from a primary dashboard action.

**Issue B — dashboard depends on mixed assumptions**

- It expects owner/member stats and members to be coherent, but owner membership may be missing depending on how the team was created.

**Issue C — no active team context**

- If user belongs to multiple teams, dashboard cannot choose which one to show.

**Issue D — cards are incomplete**

- No announcement card.
- No pending invites.
- No dispatch queue summary.
- No payroll exceptions or failed processing alerts.

**Fix**

- Add a real settings page or remove the link until it exists.
- Make dashboard route team-scoped.
- Build a unified dashboard loader returning:
  - team
  - members
  - job stats
  - collections
  - payroll status
  - announcements

---

### 13.1.3 Team listing via `/api/provider/teams`

### Partial

**What works**

- Route exists and merges owned teams + member teams.

**Broken / disconnected**

- Main dashboard does not use it.
- No team switching UI.
- No notion of current team selection.
- Not used by the Team OS pages at all.

**Fix**

- Add team switcher in team dashboard header.
- Use this API to populate it.
- Persist active team in route or session state.

---

### 13.1.4 Team model: `Team`

### Data-model issues

**Issue A — owner and member concepts drift**

- `ownerId` exists separately from membership, but owner membership is not guaranteed.

**Issue B — `payrollCycle` and `defaultSplit` are not properly surfaced**

- They exist on model but active UI for settings is missing.

**Issue C — `isActive` is not respected consistently**

- API route filters `isActive`.
- Team dashboard/actions do not consistently enforce it.

**Fix**

- Treat owner as mandatory member.
- Add settings UI.
- Enforce `isActive` in all team loaders/actions.

---

## 13.2 Member Management

### 13.2.1 Member invitation and direct add/remove operations

### Broken / incomplete

**Issue A — active invite path likely fails at runtime**

- `src/app/actions/team.ts#inviteTeamMember` creates `TeamMember` with:
  - `teamId`
  - `userId`
  - `role`

- But schema requires `permissions: String[]`.
- That field is not provided.

**Impact**

- Member invitation through `/dashboard/team/members` is likely broken server-side.

**Issue B — old invite flow and new invite flow differ**

- `actions/teams.ts#addMember` accepts permissions.
- `actions/team.ts#inviteTeamMember` does not.
- Active page uses the broken one.

**Issue C — no true invite lifecycle**

- It is not invitation-based.
- It only “direct adds if account already exists.”
- No pending invite, acceptance, expiry, resend, or email notification.

**Issue D — remove flow is inconsistent**

- `actions/teams.ts#removeMember` deletes by `memberId` without verifying that member belongs to requester’s team.
- `actions/team.ts#removeTeamMember` does verify team ownership.
- Again: two standards.

**Issue E — no self-leave flow**

- Members cannot leave a team.
- Owner cannot transfer ownership.

**Fix**

- Replace both with one member service:
  - `inviteMember`
  - `acceptInvite`
  - `removeMember`
  - `leaveTeam`
  - `transferOwnership`
  - `updateMemberRole`
  - `updateMemberPermissions`

- Always create member with role-derived default permissions.
- Add invite table instead of direct TeamMember creation if you want actual invitation UX.

---

### 13.2.2 Member role and permission updates

### Mostly missing

**Issue A — no active role update UI**

- Members page only supports invite and remove.

**Issue B — no active role update action in the main stack**

- Old stack has `updateMemberPermissions`.
- New stack does not expose proper role/permissions management.

**Issue C — permission model exists but is not wired to active pages**

- `TeamPermission`, `OWNER_PERMISSIONS`, `ADMIN_PERMISSIONS`, `DEFAULT_MEMBER_PERMISSIONS` exist.
- But active pages do not use them for editing or enforcing view access.

**Fix**

- Add role/permission editor on `/dashboard/team/members`.
- Map role changes to default permission presets.
- Persist fine-grained overrides separately if needed.
- Enforce permissions on jobs, payroll, messages, bookings, services.

---

### 13.2.3 Member status and location updates

### Partial but effectively broken in product flow

**Issue A — actions exist, but no UI or client integration**

- `updateMemberLocation`
- `updateMemberStatus`
- No page or polling mechanism calls them.

**Issue B — status lifecycle is not trustworthy**

- Assignment sets members to `BUSY`.
- Completing a job sets members to `ONLINE`.
- No “ON_JOB” transition is properly managed in live UI.
- No timeout/heartbeat for stale online status.

**Issue C — location is never actually fed from a shared tracking flow**

- Status/location card UI exists, but source updates are absent.

**Issue D — if owner is not a TeamMember, owner cannot participate in status/location flow**

- Caused by broken team creation in `actions/team.ts`.

**Fix**

- Add mobile/client-side heartbeat:
  - location ping
  - availability status
  - last seen timestamp

- Auto-transition status:
  - `ONLINE` → available
  - `BUSY` → assigned awaiting start
  - `ON_JOB` → started
  - `OFFLINE` → stale/no heartbeat/manual off

- Use shared device location utility.

---

### 13.2.4 Team members page at `/dashboard/team/members`

### Partial / UX issues

**Issue A — owner card is fake and detached from actual owner data**

- The page renders a generic “Team Owner” card, not actual owner identity details.
- If owner is also in `members`, they can appear twice conceptually.

**Issue B — owner duplication or omission**

- If team created via old action, owner appears as TeamMember and also via special owner card.
- If team created via new action, owner may not appear in member list at all.

**Issue C — no success/error feedback**

- Server forms just submit; no visible confirmation, validation summary, or inline errors.

**Issue D — no permission editing**

- No member detail drawer or edit flow.

**Issue E — imports suggest unfinished refactor**

- Page imports `MemberCard`, `inviteTeamMember`, `removeTeamMember` at top but mostly uses inline forms.

**Fix**

- Render owner from real team owner data.
- Show one unified member list including owner.
- Add optimistic UI/toasts.
- Add edit member modal for role, permissions, status, location.
- Replace inline server form actions with client action wrappers for better UX.

---

### 13.2.5 Team member model: `TeamMember`

### Data issues

**Issue A — required `permissions` field is not respected by active invite flow**

- This is a real schema/action mismatch.

**Issue B — aggregate metrics can become incorrect**

- `totalJobsCompleted` and `totalEarnings` are incremented during earnings recording.
- If earnings are duplicated, member totals inflate permanently.

**Issue C — no audit trail**

- No member role/status/permission history.

**Fix**

- Make metrics derived where possible or protect them with idempotent writes.
- Add member audit events if operational traceability matters.

---

## 13.3 Job Dispatch

### 13.3.1 Team jobs module at `/dashboard/team/jobs`

### Partial / broken flow

**Issue A — it is disconnected from platform bookings**

- Jobs are manually created in Team OS.
- Spec mentions assignment tracking and likely relation to actual work.
- `bookingId` exists on model but no UI connects booking -> team job.

**Issue B — no team context switching**

- Same multi-team issue.

**Issue C — page imports actions it does not use**

- Indicates incomplete refactor and unclear source of truth.

**Issue D — no filtering/search**

- For dispatch, 50 jobs dumped in one list is weak operational UX.

**Fix**

- Add booking-to-team-job dispatch path.
- Add tabs: Today, Upcoming, In Progress, Completed, Uncollected.
- Add team-scoped routes.

---

### 13.3.2 Assign members to specific jobs with assignment tracking

### Broken / incomplete

**Issue A — assign flow only supports one member at a time**

- Spec says assign members plural.
- UI only has a single select.

**Issue B — offline members are assignable**

- Available members query includes `ONLINE` and `OFFLINE`.
- Dispatching work to offline staff is a flow problem.

**Issue C — no accept/decline UI**

- `respondToAssignment` exists in library.
- There is no action/page/member-facing screen to use it.

**Issue D — assignment status is not shown**

- UI shows assigned chips but not `PENDING`, `ACCEPTED`, `DECLINED`, `IN_PROGRESS`, `COMPLETED`.

**Issue E — duplicate assignment conflict is not handled gracefully**

- `TeamJobAssignment` has unique `(jobId, memberId)`.
- Reassigning same member likely throws and surfaces as generic failure.

**Issue F — no bulk reassignment / unassign flow**

- Cannot remove assignee, replace, or rebalance team.

**Fix**

- Replace single select with multi-select assignment panel.
- Only show truly available members by default.
- Add member assignment inbox with accept/decline.
- Show assignment timeline/status chips.
- Add unassign/reassign support.
- Catch unique constraint errors and return friendly messages.

---

### 13.3.3 Team job status updates and progress operations

### Broken logic

**Issue A — `IN_PROGRESS` depends on accepted assignments that can never happen from UI**

- `updateJobStatus(..., 'IN_PROGRESS')` only updates assignments with status `ACCEPTED`.
- But no UI exists for members to accept assignments.

**Impact**

- Job can move to `IN_PROGRESS` while assignments stay pending.

**Issue B — completion updates every assignment to completed**

- Even declined or untouched assignments can get marked completed.

**Issue C — no transition validation**

- You can progress status without checking required conditions.
- No guard against:
  - completing unassigned job
  - collecting before completion in some alternate flows
  - cancelling after payroll/earnings logic started

**Issue D — job progress is owner-only**

- No field worker-side flow to start/pause/complete/report issues.

**Fix**

- Add a strict state machine:
  - `PENDING -> ASSIGNED`
  - `ASSIGNED -> IN_PROGRESS` only if at least one accepted assignee
  - `IN_PROGRESS -> COMPLETED`
  - `ASSIGNED/IN_PROGRESS -> CANCELLED` with rules

- Sync assignment statuses based on job status through controlled transitions only.
- Add member-side operational actions.

---

### 13.3.4 Daily job and collection retrieval actions

### Partial

**What exists**

- `getTodaysJobs`
- `getTodaysCollections`

**What is broken**

- Main jobs page ignores `getTodaysJobsAction` and directly queries Prisma for all jobs.
- Dashboard uses daily summaries but jobs page is not day-oriented.
- No dedicated collections drill-down.

**Fix**

- Use one shared loader for “today’s dispatch board”.
- Add collection ledger view for today with collector, method, and job linkage.

---

### 13.3.5 Team job models: `TeamJob`, `TeamJobAssignment`

### Data flow issues

**Issue A — `collectedBy` is semantically unstable**

- Model comment says member ID.
- `markJobAsCollected` uses `member?.id || session.user.id`.
- If current user is owner but not a TeamMember, raw `user.id` gets stored in a field that is supposed to hold a member ID.

**Impact**

- Collection attribution becomes inconsistent and hard to resolve.

**Issue B — assignments are not tied to real acceptance/operational flow**

- Statuses exist but product does not use them correctly.

**Issue C — no relation from TeamEarning to TeamJob in Prisma**

- `TeamEarning` stores `jobId` as plain string, not relational FK.
- Harder to enforce integrity and prevent duplicate earnings.

**Fix**

- Make `collectedByMemberId` explicit and always store TeamMember ID.
- Add relation from `TeamEarning.jobId` to `TeamJob.id`.
- Add stronger workflow rules around assignment statuses.

---

## 13.4 Team Earnings & Payroll

### 13.4.1 Earnings split calculation across team members

### Broken

**Issue A — owner split is computed conceptually but never recorded**

- `calculateJobSplit` reads `team.defaultSplit` as owner share.
- Then it only creates `TeamEarning` records for assigned workers.
- No owner earning/team revenue record is created.

**Impact**

- Financial model does not match the field meaning.
- Part of money effectively disappears from payroll logic.

**Issue B — repeated processing can duplicate earnings**

- `processJobEarnings(jobId)` can be triggered:
  - when job becomes completed and already collected
  - when collected after completion

- No idempotency check exists.
- `TeamEarning` has no unique constraint per `(jobId, memberId, reason)`.

**Impact**

- Duplicate earnings
- inflated `totalEarnings`
- inflated `totalJobsCompleted`
- payroll overpayment

**Issue C — custom split validation is missing**

- If custom splits are introduced, totals may exceed allowed share.

**Fix**

- Decide the accounting model:
  - worker earnings + owner earning
  - or worker earnings + retained team margin

- Make earnings idempotent:
  - unique constraint on job payout records
  - or `processedEarningsAt` on `TeamJob`

- Move all payout creation into one transaction.

---

### 13.4.2 Member balance retrieval

### Partial / insecure

**Issue A — action lacks auth**

- `getMemberBalanceAction(memberId)` returns any member balance by ID.

**Issue B — no UI**

- The feature exists in code but not in the Team OS screens.

**Fix**

- Restrict to team owner/admin or self.
- Add member detail panel showing:
  - unpaid balance
  - paid history
  - pending earnings

---

### 13.4.3 Payroll generation and processing actions

### Broken / high risk

**Issue A — payroll generation can rebatch already batched unpaid earnings**

- `generatePayroll()` filters:
  - `isPaid: false`
  - date range

- It does **not** filter `payrollId: null`

**Impact**

- Earnings already attached to another pending payroll can be linked into a new payroll.

**Issue B — no authorization checks**

- Any logged-in user could potentially process payroll if they know the IDs and can invoke the action.

**Issue C — processing is not transactional**

- Payroll status set to `PROCESSING`
- earnings updated
- payroll set to `COMPLETED`
- If step 2 fails midway, state can desync.

**Issue D — payroll page auto-processes immediately after generation**

- Generate form does:
  - generate payroll
  - then auto-process it

- No review step, no confirmation, no batch inspection.

**Issue E — no payout provider integration metadata**

- No transfer reference, payout status from processor, reconciliation fields.

**Fix**

- `generatePayroll` must filter `payrollId: null`
- Wrap payroll generation and payroll processing in DB transactions.
- Add owner/admin permission checks.
- Remove auto-process after generate.
- Add review screen:
  - preview batch
  - approve batch
  - process batch
  - cancel batch

---

### 13.4.4 Pending payroll retrieval and payout history

### Partial

**Issue A — pending summary exists but is limited**

- Good summary, but no exclusion of stale/problem batches beyond `payrollId: null`.

**Issue B — history page bypasses service layer**

- Payroll page directly queries Prisma instead of `getPayrollHistory`.

**Issue C — no member payout history screen**

- Only owner sees payroll list.
- Team members cannot inspect what was paid to them.

**Fix**

- Use `getPayrollHistory` consistently.
- Add member-facing payout history.
- Add filters for period, status, member, amount.

---

### 13.4.5 Payroll page at `/dashboard/team/payroll`

### Partial / UX problems

**Issue A — generate-and-process in one click**

- Operationally unsafe.

**Issue B — no visible success/failure state from server form**

- User gets no proper result surface.

**Issue C — owners only in UI, not in action guard**

- Visual restriction exists, backend restriction is weak.

**Issue D — period defaults are naive**

- “last 7 days” ignores `team.payrollCycle`.

**Fix**

- Use `team.payrollCycle` to suggest periods.
- Add preview table before processing.
- Add action result banners/toasts.
- Enforce owner/admin permissions in actions.

---

### 13.4.6 Team payroll models: `TeamEarning`, `TeamPayroll`

### Data concerns

**Issue A — `processedBy` is raw string, no FK**

- Harder to trace processor identity reliably.

**Issue B — no reconciliation or transfer metadata**

- No `externalPayoutId`, `failureReason`, `processedVia`, `reference`.

**Issue C — `TeamEarning.jobId` is not relational**

- Integrity risk.

**Fix**

- Add stronger relations and reconciliation fields.
- Add failure/cancel states and notes for operational clarity.

---

## 13.5 Team Communication

### 13.5.1 Team announcement broadcasting backed by `TeamAnnouncement`

### Missing

**Current state**

- Model exists in Prisma.
- I found no team announcement actions, routes, UI, or realtime broadcast integration for this feature.

**Impact**

- This requirement is effectively not implemented.

**Fix**

- Add:
  - `createAnnouncement`
  - `listAnnouncements`
  - `dismissAnnouncement` or read state

- Show latest announcements on dashboard.
- Optionally broadcast through existing realtime layer.

---

### 13.5.2 Team-centric UI cards in the team dashboard

### Partial

**What exists**

- Members
- jobs
- collections
- pending payroll cards

**What is missing / broken**

- No announcement card
- No team settings card despite broken settings link
- No team switcher
- No pending assignments card
- No operational alerts
- Cards rely on data flows that are currently inconsistent

**Fix**

- Expand cards into a proper ops dashboard:
  - active team selector
  - announcements
  - today’s dispatch
  - uncollected jobs
  - pending payroll
  - member availability map/status
  - failed or stale jobs

---

# Highest-priority fixes in order

## P0 — fix immediately

1. Remove duplicate implementation and choose one Team domain stack.
2. Fix `inviteTeamMember` to include `permissions`.
3. Fix `createTeam` so owner is always created as `TeamMember`.
4. Add authorization guards to every team/job/payroll action.
5. Fix payroll generation to require `payrollId: null`.
6. Prevent duplicate earnings generation for the same job.
7. Remove or implement `/dashboard/team/settings`.

## P1 — next

1. Build proper role/permission editing.
2. Add assignment acceptance/decline UI and member-side job flow.
3. Add team switcher and team-scoped routes.
4. Normalize `collectedBy` to always use TeamMember ID.
5. Replace page-level Prisma queries with domain loaders.

## P2 — after stabilization

1. Add announcements system.
2. Add payout/member history views.
3. Add job filters, analytics, and dispatch board.
4. Add audit history for team membership and payroll operations.

# Best architectural fix

Create a single Team domain module with:

- `team.service.ts`
- `team.policy.ts`
- `team.loaders.ts`
- `team.actions.ts`

And split logic into:

- team setup
- members
- dispatch
- earnings
- payroll
- announcements

Then make routes team-scoped:

- `/dashboard/team/[teamId]`
- `/dashboard/team/[teamId]/members`
- `/dashboard/team/[teamId]/jobs`
- `/dashboard/team/[teamId]/payroll`
- `/dashboard/team/[teamId]/settings`

That removes the current ambiguity and fixes most of the broken UI/data flow at the root.

## EVERYTHING IN THIS DOCUMENT MUST BE ADDRESSED
