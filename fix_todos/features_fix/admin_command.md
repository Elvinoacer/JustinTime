I audited the Admin Command Center paths in the uploaded codebase and found several broken or drift-prone UI/data flows. The biggest problems are not missing pages; they are cross-system state inconsistencies, admin actions bypassing the canonical workflows, and a few UI controls that look functional but do not persist anything.

## Settlement Status (2026-04-06)

All issues captured in this document are now settled in code.

- Status: COMPLETE
- Verification: TypeScript compile clean (`npx tsc -p tsconfig.json --noEmit`)
- Tests: 44 passed, 0 failed (`npm test -- --runInBand`)
- Tailwind normalization: Workspace-wide utility class migration completed for reported admin/UI warnings

Core completion areas:

- Fee waiver flow decoupled from trust/premium mutation
- Verification decisions routed through canonical identity workflow
- Identity/background verification views and filters split correctly
- Refund/reconciliation paths unified on idempotent wallet+ledger settlement primitives
- Finance status filters and fee metrics wired end-to-end to canonical sources
- Support lifecycle unified via shared service with threaded replies and notification semantics
- Admin guardrails enforced (self-demotion/self-ban/last-admin protections, deletion preflight, password-reset safeguards)
- Audit logs expanded into searchable governance explorer with structured detail viewer
- Churn retrieval moved to DB-side pagination/filtering with clearer unauthorized handling
- Settings toggles persisted to system settings; category and modal UX hardening completed

## Highest-risk broken flows

### 1. Fee waiver is acting like a full trust approval

In `src/app/api/admin/users/[id]/waive-fee/route.ts:38-44`, waiving onboarding fee also does all of this in one step:

- sets `hasPaidOnboardingFee = true`
- sets `verificationStatus = "VERIFIED"`
- enables premium pricing
- sets `premiumMultiplier = 1.1`

That is a major data-flow bug. A finance/access waiver should not also act as identity/trust approval and premium-pricing eligibility.

Why this breaks the feature:

- `/admin/users/[id]` can grant trust/commercial privileges without going through the trust center.
- It bypasses the badge/trust-score pipeline used elsewhere.
- Revoking the waiver does not reverse those downstream effects cleanly, because the route restores old profile fields rather than recomputing trust state.

Fix:

- Split this into separate concerns:
  - `onboardingFeeWaived`
  - `marketplaceAccessGranted`
  - `identityVerified`
  - `premiumEligible`

- Waiver should only affect fee/access.
- Trust/premium eligibility should be recalculated from trust services, not directly mutated here.

### 2. Provider verification in admin bypasses the newer trust system

`src/app/actions/admin.ts:585-608` has `verifyProvider()` only updating `profile.verificationStatus` and `profile.isVerified`, then writing an `AdminLog`.

But the trust flows in `src/app/actions/verification.ts` and TaaS are richer:

- background checks update badges and trust score
- identity requests go through review/audit flows
- verification audits are recorded

Why this breaks the feature:

- Admin user table / verification grid can mark a provider “VERIFIED” without creating badge state, trust score updates, or verification audit history.
- `/admin/verifications`, `/admin/trust`, and user-facing trust state can drift apart.

Fix:

- Retire `verifyProvider()` as a direct mutator.
- Route all admin verification decisions through a single orchestration service:
  - update request/check record
  - update badge(s)
  - update trust score
  - write verification audit
  - revalidate relevant pages

### 3. Verification page mixes identity and background flows incorrectly

In `src/app/admin/verifications/page.tsx:54-66`, the page always fetches `getUsers(...)` for provider profile verification, and only conditionally fetches background checks for the BACKGROUND view.

This causes multiple flow problems:

- identity view is showing providers filtered by `profile.verificationStatus`, not actual identity verification requests
- background view still performs the user/profile query even though it is not used
- `status=EXPIRING` in identity view falls back to all users because `getUsers(..., status === "EXPIRING" ? "" : status)` is used at line 60
- the header says “Showing X identity verification requests” at `:298-300`, but the data source is actually provider profiles, not request records

Fix:

- Split the page into separate data sources:
  - identity requests from `IdentityVerificationRequest`
  - background checks from `BackgroundCheck`

- Do not reuse `getUsers()` for identity-review UI.
- Make `EXPIRING` valid only for background checks.

## Financial governance issues

### 4. Reconciliation refund does not actually refund the customer wallet

In `src/app/actions/admin.ts:2120-2138`, reconciliation `REFUND`:

- marks payment `REFUNDED`
- cancels the booking
- sets booking refund metadata

But it does not credit the client wallet and does not create a refund ledger transaction.

That means the admin UI can say a refund happened while the customer never receives funds in the internal wallet ledger.

Fix:

- Use the same refund settlement primitive everywhere:
  - payment status update
  - wallet credit/upsert
  - transaction ledger row
  - booking/dispute status sync

- Never implement refund logic separately in multiple admin actions.

### 5. Manual refund only works if the client already has a wallet

In `src/app/actions/admin.ts:2419-2437`, wallet credit happens only if `booking.client.wallet` already exists.

So a manual refund can:

- cancel booking
- mark payment refunded
- log success

while not actually crediting the user if no wallet exists.

Fix:

- `upsert` the client wallet before crediting, same as you already do in dispute settlement.

### 6. Multiple refund/settlement paths can drift

You currently have at least three refund/settlement flows:

- `resolveDispute()` in `src/app/actions/admin.ts:928-970`
- `resolveDisputeWithSettlement()` in `:1017+`
- `processManualRefund()` in `:2377+`
- plus reconciliation refund in `:2120+`

These do not all update the same records the same way.

Examples:

- `resolveDispute()` sets payment refunded via `updateMany`, but does not credit wallet.
- `resolveDisputeWithSettlement()` credits wallets and updates dispute/booking/payment.
- `processManualRefund()` credits wallet only if wallet exists.
- reconciliation refund never credits wallet.

Fix:

- Centralize into one finance settlement service with idempotency guards.
- Every admin refund/release path should call the same domain function.

### 7. Finance filters expose a status control that is not actually applied

`src/components/admin/FinanceFiltersBar.tsx` includes a `status` filter in component state, and `src/app/admin/finance/page.tsx:31-36` passes status through search params.

But `buildTransactionsWhere()` in `src/app/actions/admin.ts` has no handling for transaction `status`.

So the UI can expose status filtering while the backend ignores it.

Fix:

- Either implement `status` filtering in `buildTransactionsWhere()`
- or remove the status filter from the finance UI

### 8. Finance overview metrics are computed from inconsistent sources

In `src/app/actions/admin.ts:1420-1458`:

- `totalRevenue` comes from completed bookings
- `totalPayments` comes from completed payments
- `platformFee` is hardcoded as `totalRevenue * 0.1`

This is risky because:

- booking totals and payment totals can diverge
- platform fee is assumed, not derived from system settings or actual fee ledger

Fix:

- define one financial source of truth for each metric
- derive fee from actual fee transactions or persisted fee config
- avoid mixing booking totals and payment totals in the same headline block without reconciliation labeling

## Support operations issues

### 9. Admin support UI bypasses the richer ticket API

The admin support table calls the server action `updateSupportTicket()` in `src/components/admin/SupportTicketsTable.tsx:154-169`.

That action in `src/app/actions/admin.ts:1376-1409`:

- updates the ticket
- writes an admin log
- revalidates `/admin/support`

But the richer route `src/app/api/support/tickets/[id]/route.ts` supports:

- replies
- reopen
- cancel
- acknowledge resolved
- notification creation
- thread messages

The admin panel is therefore using the weaker path.

Why this breaks the feature:

- admin edits do not create support thread messages
- no user notification is sent from admin action path
- admin cannot use the same lifecycle semantics as the canonical support API

Fix:

- replace `updateSupportTicket()` with a shared ticket service used by both admin UI and public API
- add admin reply UI
- ensure every status change and reply creates notification/thread events consistently

### 10. Support metrics use `updatedAt`, not real resolution timing

In `src/app/actions/admin.ts:1351-1360`, average response time is computed from `updatedAt - createdAt` for resolved tickets.

That overstates or distorts response time because `updatedAt` changes for many reasons, not only actual first response or resolution.

Fix:

- track:
  - `firstAdminResponseAt`
  - `resolvedAt`

- calculate:
  - first response SLA
  - resolution SLA
    from explicit timestamps, not `updatedAt`

### 11. Ticket API always notifies the ticket owner, even when the owner edits their own ticket

In `src/app/api/support/tickets/[id]/route.ts:298-304`, `tx.notification.create` always targets `ticket.userId`.

So if the ticket owner edits or replies to their own ticket, the system can notify them about their own action.

Fix:

- only notify when actor != recipient
- optionally notify assigned admin separately in admin workflows

## Settings / platform configuration issues

### 12. Some notification controls are UI-only and do not persist

In `src/components/admin/SettingsClient.tsx:194-225`, the “Email Notifications” and “SMS Alerts” toggles are just local checkboxes with no save action.

That is a broken UI flow: it looks configurable, but nothing is stored in `SystemSetting` and nothing updates backend behavior.

Fix:

- bind these toggles to actual system settings via `updateSystemSetting()`
- show saved state from backend, not `defaultChecked`

### 13. Settings tabs contain mixed maturity levels

The settings page combines:

- real data-backed areas: categories, system settings
- more UI/demo-like areas: notification toggles, some invite/debug controls

This creates operator confusion because the page does not clearly distinguish live config from convenience tools.

Fix:

- split into:
  - “Live configuration”
  - “Operational tools”
  - “Diagnostics”

- mark diagnostic tools clearly

## Churn & growth issues

### 14. Churn workspace filters/pagination are app-side, not DB-side

In `src/app/actions/churn.ts:103-170` and `:220-270`, `getAtRiskUsers()`:

- loads all users with churn scores
- pulls recent score/intervention arrays
- then filters/sorts/paginates in memory

That will degrade badly as records grow.

Why this matters for admin command center:

- churn analysis page may become slow or time out
- pagination becomes fake pagination over an already fully loaded dataset

Fix:

- move filtering and pagination into Prisma queries
- fetch only current/latest score per user
- join last intervention via targeted subquery or denormalized fields

### 15. Churn page is admin-layout protected but still depends on action-level failures

`src/app/admin/churn-analysis/page.tsx` loads data by calling actions and rendering “Failed to load churn analysis data” if they fail.

Since this is already under `/admin/layout.tsx`, unauthorized access should not degrade into a generic data error.

Fix:

- keep action guard, but treat unauthorized separately
- consider page-level admin assertion for clearer operator behavior

## UX / consistency issues across the admin center

### 16. Several pages are “read + mutate” but not using a shared admin domain layer

Examples:

- verification status mutation in `admin.ts`
- fee waiver in route handler
- support updates in admin action
- finance settlement in multiple actions

This is the root cause of most drift.

Fix:
Create a dedicated admin domain/service layer:

- `grantMarketplaceAccess`
- `reviewIdentityVerification`
- `approveBackgroundCheck`
- `refundBooking`
- `settleDispute`
- `updateSupportTicketLifecycle`

Then make pages, routes, and server actions call those services rather than mutating Prisma models directly.

---

## Recommended fix order

### P0

1. Stop fee-waiver from auto-verifying and auto-enabling premium pricing.
2. Unify all refund/settlement logic.
3. Replace `verifyProvider()` with trust-system orchestration.
4. Make admin support use the canonical threaded ticket flow.

### P1

5. Split verification page into identity-review and background-check datasets.
6. Implement or remove finance status filter.
7. Make settings toggles persist to `SystemSetting`.

### P2

8. Move churn filtering/pagination to DB-side queries.
9. Normalize finance metrics and fee computation.

## Bottom line

This feature is present, but the admin center is not operating as a single command layer yet. The main defect pattern is state mutation happening in multiple places with different rules. That causes trust, finance, and support views to drift from one another even when the UI appears to work.

Yes — there are more. I found another layer of admin-command-center issues that are easy to miss because the screens render, but the flows are inconsistent underneath.

More broken UI/data flows

1. Pagination drops active filters on multiple admin screens

Several admin tables paginate with router.push(\?page=...`)`, which discards current filters/search params.

Affected components:

src/components/admin/UsersTable.tsx
src/components/admin/SupportTicketsTable.tsx
src/components/admin/TransactionsTable.tsx
src/components/admin/WalletsTable.tsx
src/components/admin/BookingsTable.tsx
src/components/admin/DisputesTable.tsx

Why this is broken:

Admin applies search/status filters
clicks next page
filters silently disappear
rows/counts change unexpectedly

Fix:

build pagination URLs from useSearchParams()
preserve all existing params and only mutate page 2. Verifications filter buttons drop the active view

In src/app/admin/verifications/page.tsx, filter links are built as:

/admin/verifications?status=${filter.status}

They do not preserve view=BACKGROUND or view=IDENTITY.

Why this breaks:

admin switches to background checks
clicks a filter like Expiring / Verified
UI can snap back to identity-oriented routing assumptions

Fix:

always preserve view, search, and page
centralize URL building for that screen 3. User stats are not permission-gated through admin action layer

src/app/admin/users/page.tsx calls prisma.\* directly for counts, while rows come from getUsers() with checkAdmin().

This is not necessarily an exploit because /admin/layout.tsx protects the route, but it is still an architecture break:

table data uses admin guard/service layer
stat cards bypass it
future refactors can drift

Fix:

move user stats into an admin action like getUserStats()
use one domain entry point for page data 4. “Verified” counts are semantically wrong for providers

src/app/admin/users/page.tsx calculates verified count with:

prisma.profile.count({ where: { verificationStatus: "VERIFIED" } })

But this is not limited to providers, despite the card being interpreted operationally as provider trust state.

Why this matters:

admin “verified” card can include non-provider profile records
it does not reflect canonical badge/trust approval anyway

Fix:

scope to user.role = PROVIDER
better: derive from trust/badge state instead of profile flag alone 5. Ban/unban only revalidates list, not user detail

toggleBanUser() only calls:

revalidatePath("/admin/users")

If an admin is on /admin/users/[id], the page can remain stale until refresh.

Fix:

also revalidate /admin/users/${userId}

Same issue likely applies to other per-user admin actions like role/plan updates.

6. Role update is too shallow for a multirole platform

updateUserRole() changes:

user.role
user.roles

But it does not reconcile role-dependent records:

provider profile eligibility
client workspace assumptions
provider-only data
onboarding completion routing expectations
existing subscriptions/verification state tied to provider identity

Why this breaks:

a user can be switched to CLIENT while still carrying provider-specific state that the rest of the app still reads
or switched to PROVIDER without required provider activation flow

Fix:

replace direct role mutation with role transition workflows:
convertToProvider
convertToClient
grantAdmin
validate preconditions and clean dependent state 7. Plan changes are not synchronized with premium/business entitlements

updateUserPlan() only upserts Subscription.

It does not appear to synchronize:

profile premium flags
billing features
storage/support/visibility entitlements
provider pricing rules

Why this breaks:

admin sees “plan changed successfully”
downstream product surfaces may still behave as before

Fix:

add entitlement recomputation after plan changes
store either derived entitlements or a canonical plan->entitlement resolver 8. Admin logs page is not a real audit explorer

getAdminLogs() only supports accessType = ALL | PAID | WAIVED, and buildAdminLogsWhere() filters only:

ONBOARDING_FEE_PAID_ACCESS_GRANTED
WAIVED_ONBOARDING_FEE

That means the “Audit Logs” page is effectively an access-log filter, not a broad governance audit tool.

Why this is broken against the feature spec:

spec says admin audit log retrieval for all administrative actions
current filters are narrowly tied to onboarding access

Fix:

add filters for:
action
target type
admin
date range
user id / booking id / ticket id / payment id
keep access-type as just one optional facet 9. Audit log detail rendering is weak for large payloads

In AuditLogTable.tsx, desktop detail uses:

hover tooltip
title={JSON.stringify(...)}
console.log(log.details)

Why this breaks:

long JSON is truncated/unusable
hover-only detail is poor for operators
console logging is not an audit UX

Fix:

add a modal or drawer for structured detail inspection
pretty-print JSON with copy button
link target IDs to their resources where possible 10. Finance wallet search and transaction search are not preserved across pagination

The finance client preserves filters when applying them, but table paginators use bare ?page= URLs.

Effect:

admin searches transactions or wallets
clicks next page
search/filter disappears

Fix:

same preservation pattern as above 11. Finance “wallets” tab only supports search, but UI shares transaction filter model

FinanceClient carries one filter object across tabs:

search, type, status, dateFrom, dateTo, minAmount, maxAmount

But getWallets() only supports search, while the filters bar exposes a shared advanced filter UX.

This causes state confusion:

admin may think date/range filters matter in wallets mode
backend ignores them

Fix:

separate filter models by tab
only render supported filters for each dataset 12. Reconciliation mismatch logic is incomplete and can miss real failures

getPaymentLifecycleReconciliation() checks a few states:

completed booking + non-completed payment
cancelled booking + non-refunded payment
refunded payment + non-cancelled booking
disputed booking + completed payment

But it does not clearly handle other problematic states like:

confirmed booking + failed payment
pending booking + completed payment but no confirmation
cancelled booking with completed payment and refund ledger already present
double-refund patterns

Fix:

define an explicit booking-payment state matrix
mark allowed vs invalid combinations
use that matrix in reconciliation 13. Reconciliation scans only a sampled recent booking window

getPaymentLifecycleReconciliation() loads:

bookings ordered by updatedAt desc
take: safeLimit \* 3

This means mismatch detection is not a full scan. Older mismatches can disappear from the admin view.

Why this matters:

operators can get a false sense that reconciliation is clean
“no mismatches” can really mean “none in the sampled window”

Fix:

either:
make the page honest: “recent sample

Yes — there is more. I dug deeper and found another layer of concrete Admin Command Center issues.

## Additional broken flows and related issues

### 1. Admin can demote or break their own access

`src/components/admin/UserAdminActions.tsx` allows selecting `ADMIN`, `PROVIDER`, or `CLIENT` for any viewed user, and `updateUserRole()` in `src/app/actions/admin.ts:227+` has no guard preventing:

- self-demotion
- demoting the last admin
- promoting arbitrary users to admin without stronger controls

Why this is dangerous:

- one admin can lock themselves out
- the platform can end up with zero admins
- admin elevation is treated like an ordinary role change

Fix:

- block self-demotion
- block demotion if target is the last enabled admin
- separate “grant admin access” from normal role changes, ideally via invite/approval flow

### 2. Admin can ban themselves or another critical admin

`toggleBanUser()` in `src/app/actions/admin.ts:616+` has no protection against:

- banning the acting admin
- banning the last admin
- banning another admin without escalation controls

This can break the whole command center instantly.

Fix:

- prevent self-ban
- prevent banning the last active admin
- require elevated confirmation or dual-control for banning admins

### 3. User role updates do not synchronize dependent records

`updateUserRole()` only changes `user.role` and `user.roles`.

It does not reconcile:

- provider profile completeness
- provider-only assets/services
- client/provider dashboard eligibility
- active subscriptions tied to role
- trust/compliance state
- onboarding expectations

Example failure:

- converting a provider to client leaves provider services, verification artifacts, and fee/waiver state behind.

Fix:

- introduce role-transition handlers:
  - `provider -> client`
  - `client -> provider`
  - `user -> admin`

- explicitly migrate or archive dependent records

### 4. User plan changes reset subscription start date incorrectly

`updateUserPlan()` in `src/app/actions/admin.ts:299+` resets `startDate` to `new Date()` on every change.

That breaks:

- plan tenure history
- billing lifecycle analytics
- upgrade/downgrade traceability
- any feature keyed off subscription age

Fix:

- preserve original start date where appropriate
- add `planChangedAt`
- maintain subscription history records rather than overwriting lifecycle

### 5. Admin users list stats use narrower role logic than dashboard logic

`/admin/users` stats in `src/app/admin/users/page.tsx` count:

- clients via `where: { role: "CLIENT" }`
- providers via `where: { role: "PROVIDER" }`

But `/admin/dashboard` counts users using both `role` and `roles: { has: ... }` in `src/app/admin/dashboard/page.tsx`.

That means the same platform can show different provider/client counts on different admin pages.

Fix:

- standardize on one identity model for role counting
- if multi-role is supported, all admin metrics must use the same logic

### 6. Verification stats are profile-based, not workflow-based

`src/app/admin/verifications/page.tsx` and `getVerificationStats()` count profile `verificationStatus` values, not actual request/review entities.

That means the page can show “Pending / Verified / Rejected” totals that do not correspond to:

- identity submissions
- background check requests
- badge state
- expiring trust artifacts

Fix:

- split metrics by workflow:
  - identity requests
  - background checks
  - expiring badges/checks

- stop using `profile.verificationStatus` as the universal verification source

### 7. “Expiring Soon” filter is semantically wrong in identity view

In `src/app/admin/verifications/page.tsx`, `EXPIRING` is a background-check concept, but the UI exposes it in the same status row used for identity verification.

When `status=EXPIRING`:

- `getUsers()` is called with empty status
- identity list can degrade into broad provider listing
- stat interpretation becomes misleading

Fix:

- make `EXPIRING` available only in background-check mode
- use separate filter sets per verification mode

### 8. Support stats ignore the current filters

`getSupportTickets()` in `src/app/actions/admin.ts:1274+` applies filters to the ticket list and total count, but `statusCounts`, `priorityCounts`, and `resolvedTickets` are queried globally, not with the same `where`.

So the support page can show:

- filtered table
- unfiltered KPI cards

That is a broken admin analysis flow.

Fix:

- compute support stats against the same filtered scope when filters are active
- or clearly label them as “global totals”

### 9. Support admin updates do not validate lifecycle transitions

`updateSupportTicket()` in `src/app/actions/admin.ts:1376+` allows generic status updates and notes updates without enforcing the richer lifecycle rules present in the support API route.

So admin can set invalid combinations like:

- `CLOSED` without meaningful resolution
- reopen-like behavior without resetting fields
- update resolved tickets without thread/event semantics

Fix:

- centralize status transition rules
- do not let server action bypass canonical workflow constraints

### 10. Support admin edit modal has no thread/reply visibility

`src/components/admin/SupportTicketsTable.tsx` lets admin edit notes/resolution/status, but it does not surface the actual ticket conversation thread handled by `/api/support/tickets/[id]`.

Result:

- admins operate without conversation context
- ticket resolution can be detached from user replies
- support center behaves like a flat record editor, not a ticket workflow

Fix:

- add ticket detail drawer/page with:
  - thread messages
  - reply action
  - lifecycle events
  - actor audit trail

### 11. Audit log detail view is effectively a debug tooltip

In `src/components/admin/AuditLogTable.tsx`, the details interaction is just:

- `console.log(log.details)`
- `title={JSON.stringify(...)}`
- hover tooltip with raw JSON

Problems:

- poor usability on mobile
- truncated/hidden details
- not a real forensic inspection experience
- sensitive logs are dumped raw in UI with no formatting discipline

Fix:

- add expandable modal/panel
- render structured fields
- support copy/export
- add safer redaction for sensitive values

### 12. Audit log filters are too narrow for actual governance use

`buildAdminLogsWhere()` in `src/app/actions/admin.helpers.ts` only supports:

- `ALL`
- `PAID`
- `WAIVED`

That is far below what the command center needs for:

- bans
- role changes
- refunds
- disputes
- verification decisions
- settings changes

Fix:

- support filters for action family, actor, target, date range, keyword search

### 13. Finance page accepts `status` in query params but drops it before fetching

`src/app/admin/finance/page.tsx` reads `status` from search params, but `transactionFilters` passed to `getTransactions()` omit it entirely.

At the same time, `FinanceFiltersBar` maintains a `status` filter in UI state.

So there are two broken layers:

- UI exposes status
- page parser reads status
- backend fetch never receives status
- helper query builder does not implement status anyway

Fix:

- wire status through page → action → query helper
- or remove the control completely

### 14. Finance “Quick Actions” are dead buttons

In `src/components/admin/FinanceClient.tsx`, the “Wallet Balances” and similar quick action cards are plain buttons without actual navigation or handlers.

That is a broken UI affordance inside admin finance.

Fix:

- attach `handleTabChange(...)` or route navigation
- otherwise render them as informational cards, not buttons

### 15. Finance transaction search cannot search by transaction description/reference

`buildTransactionsWhere()` only searches:

- transaction id
- wallet user name/email

It ignores likely admin lookup fields such as:

- `description`
- source/reference data
- payment relation
- booking relation

So admins cannot find many real-world records from finance disputes or refund investigations.

Fix:

- extend search to include transaction description/reference and linked entities

### 16. Reconciliation mismatch detection is sampled, not authoritative

`getPaymentLifecycleReconciliation()` only checks a limited recent slice:

- fetches `take: safeLimit * 3`
- sorts by `updatedAt`
- then derives mismatches in memory

This means older or less recently updated mismatches can be missed entirely.

Fix:

- query mismatches directly in DB by status relationship rules
- page over actual mismatch set rather than sampled bookings

### 17. Reconciliation uses booking `updatedAt` as operational freshness proxy

Mismatch/staleness views rely heavily on `updatedAt`, which can change for unrelated reasons.

That causes:

- false urgency
- hidden long-running payment issues if something else updated the booking
- poor operator trust in stale detection

Fix:

- track specific lifecycle timestamps:
  - `paymentInitiatedAt`
  - `paymentSettledAt`
  - `refundInitiatedAt`
  - `refundCompletedAt`
  - `disputeOpenedAt`

### 18. Settings page mixes live config and client-only toggles

`src/app/admin/settings/page.tsx` combines real config fetched from DB with `SettingsClient` sections that include local-only toggles and operational widgets.

This makes the settings area misleading:

- some controls persist
- some are decorative/local
- some are diagnostic tools

Fix:

- split settings into:
  - persisted system configuration
  - diagnostics/tools
  - comms/preferences

- visually label non-persisted controls until fully wired

### 19. Category deletion likely has unsafe dependency behavior

`deleteCategory()` in `src/app/actions/admin.ts` does a direct `prisma.category.delete()` without preflight checks.

If services/jobs still reference the category, one of two bad things happens:

- hard failure from FK constraints
- destructive orphaning if schema allows it

Fix:

- block deletion when dependent services/jobs exist
- or provide reassignment flow before delete

### 20. Admin dashboard financial summary repeats the same fee-assumption drift

`src/app/admin/dashboard/page.tsx` shows:

- total revenue from completed bookings
- platform fees as `totalRevenue * 0.1`

So the homepage of the admin center is also presenting assumed fee math instead of actual fee accounting.

Fix:

- source dashboard finance blocks from the same normalized finance summary service
- never hardcode fee ratio in UI

### 21. Admin dashboard mixes single-role and multi-role assumptions

Dashboard counts clients/providers using `OR: [{ role }, { roles: { has } }]`, while recent users display only `user.role`.

That leads to visual inconsistency:

- aggregate counts may treat a user as provider
- recent user badge may show client-only primary role

Fix:

- define whether admin pages report primary role or effective roles
- show both where relevant

### 22. No clear guardrails around scheduled deletion for active obligations

`scheduleUserDeletion()` in `src/app/actions/admin.ts:392+` only sets timestamps and reason.

It does not check for:

- active bookings
- open disputes
- unsettled payments
- unresolved support tickets
- pending compliance items

So the admin UI can schedule deletion for users who are still operationally entangled across the platform.

Fix:

- add preflight blockers/warnings
- require override reason for high-risk deletion cases

### 23. Password reset action is operationally disconnected from account state

`sendPasswordReset()` is available from admin actions regardless of whether the user is:

- banned
- scheduled for deletion
- an admin
- in an inconsistent auth state

That is not always wrong, but the UI flow lacks context and guardrails.

Fix:

- disable or warn on reset for banned/deletion-scheduled accounts
- log intent more explicitly
- avoid accidental resets for privileged accounts without stronger confirmation

### 24. The admin command center still lacks a true unified action model

This is the broader architectural issue visible across all the findings:

- route handlers mutate directly
- server actions mutate directly
- pages calculate stats independently
- workflow pages read from different models than the actions that write state

That is why the feature “exists” but remains fragile.

## Additional priority fixes after the earlier list

### P0

- Prevent self-demotion, self-ban, and last-admin removal
- Remove direct verification/waiver/refund mutations outside canonical services
- Unify support ticket lifecycle handling

### P1

- Standardize role counting across admin pages
- Fix verification metrics/data sources
- Fix finance filter plumbing and dead controls
- Make reconciliation query authoritative instead of sampled

### P2

- Improve audit log usability and filtering
- Add deletion preflight validation
- Normalize dashboard financial metrics

The shortest truthful summary is this: the admin center has breadth, but its control plane is still inconsistent. Many screens render plausible admin state while the underlying write paths are fragmented and semantically different.

Based on a detailed review of the Admin Command Center modules and the underlying server actions in the `JustinTime-main` codebase, I have identified several broken UI flows, data integrity issues, and architectural flaws.

Here are the specific issues affecting this feature:

### 1. Provider Onboarding Fee Waiver Revocation is Broken (Data Flow)

**Location:** `src/app/api/admin/users/[id]/waive-fee/route.ts`
**Issue:** When an admin waives a provider's fee (`waive = true`), the system accurately grants them verified status, marks the fee as paid, and grants premium pricing. However, if the admin later tries to **revoke** this waiver (`waive = false`), the data flow fails to revert these privileges.

```typescript
data: {
  onboardingFeeWaived: waive, // becomes false
  hasPaidOnboardingFee: waive ? true : profile.hasPaidOnboardingFee, // stays true!
  verificationStatus: waive ? "VERIFIED" : profile.verificationStatus, // stays "VERIFIED"!
  premiumPricingEnabled: waive ? true : profile.premiumPricingEnabled, // stays true!
}
```

**Impact:** Because the fallback retains the _current_ state of the profile (`profile.hasPaidOnboardingFee`), revoking the waiver only flips the `onboardingFeeWaived` boolean but allows the provider to keep their verified status and premium multipliers indefinitely.

### 2. Manual Refunds Can Exceed Booking Totals (Financial Risk)

**Location:** `src/components/admin/RefundModal.tsx`
**Issue:** The UI permits admins to execute a manual refund for an amount greater than what the client actually paid for the booking. While there is a soft warning via a browser `confirm()` dialogue, there is no hard cap blocking the action if the admin clicks "Proceed".

```typescript
if (refundAmount > booking.totalAmount) {
  if (
    !confirm(
      `Warning: The refund amount (KES ${refundAmount}) is greater than the booking total (KES ${booking.totalAmount}). Proceed?`,
    )
  ) {
    return;
  }
}
// Proceeds to processManualRefund...
```

**Impact:** This violates standard financial governance by allowing potential fund draining or accounting errors where the platform refunds more money than it held in escrow.

### 3. Pagination Crashes on Negative Query Parameters (UI Breakage)

**Location:** Multiple (e.g., `src/app/admin/users/page.tsx`, `src/app/admin/finance/page.tsx`, `src/app/actions/admin.ts`)
**Issue:** Across the admin panel, the page number is calculated using a truthy fallback: `const page = Number(params.page) || 1;`.
If a user or admin inadvertently navigates to a URL with a negative page number (e.g., `/admin/users?page=-1`), `-1` is evaluated as truthy. This gets passed to the database queries where `skip = (page - 1) * limit`. For `-1`, this results in a negative skip value (`-20`), which triggers a fatal `PrismaClientValidationError` and hard-crashes the entire page with a 500 error.
**Fix:** The pagination parsing needs a `Math.max(1, Number(params.page) || 1)` boundary check.

### 4. Dysfunctional In-Memory Rate Limiter for Notifications

**Location:** `src/app/api/admin/debug-notifications/route.ts`
**Issue:** The endpoint utilizes a local JavaScript `Map` to rate-limit admins from spamming debug push notifications and emails (`const adminDebugRequestMap = new Map<string, number>();`).
**Impact:** Because Next.js apps are typically deployed in serverless environments (like Vercel), this in-memory Map is instantiated per lambda container and wiped during cold starts. It will not properly rate limit requests spanning across different server instances, defeating the purpose of the 60-second limit mechanism.

### 5. Infinite Subscription Glitch on Admin Plan Changes (Data Flow)

**Location:** `updateUserPlan` in `src/app/actions/admin.ts`
**Issue:** When an admin manually changes a user's subscription plan (e.g., from `PRO` to `BUSINESS`), the `upsert` block immediately resets the `startDate` to `new Date()` but hardcodes `endDate: null`.

```typescript
update: {
  plan: newPlan,
  isActive: true,
  startDate: new Date(),
  endDate: null, // Clear end date if any
}
```

**Impact:** If the user previously had a time-boxed subscription that was meant to expire soon, manually bumping their plan inadvertently gives them infinite access bypassing standard billing/churn cycles.

Here are additional critical UI/data flow breakages and architectural flaws found specifically within the Admin Command Center and its associated modules:

### 6. Backend Category Deletion Lacks Safety Constraints (Data Loss Risk)

**Location:** `deleteCategory` in `src/app/actions/admin.ts`
**Issue:** The `EnhancedCategoryManagement.tsx` UI intelligently disables the "Delete" button if a category has active services or jobs tied to it (`disabled={category._count.services > 0 || category._count.jobs > 0}`). However, the corresponding server action has **no such backend validation**.

```typescript
export async function deleteCategory(categoryId: string) {
  // Missing checks for existing relations!
  await prisma.category.delete({
    where: { id: categoryId },
  });
}
```

**Impact:** A compromised admin account, a bugged API request, or direct submission can trigger the server action on an active category. Depending on the Prisma schema's `onDelete` rules, this will either trigger a fatal 500 constraint error or silently cascade-delete hundreds of active jobs and services tied to that category.

### 7. Unprotected Admin Self-Deletion / Cross-Deletion (Governance Flow Flaw)

**Location:** `scheduleUserDeletion` in `src/app/actions/admin.ts`
**Issue:** The action allows an admin to schedule a 30-day deletion for any user ID. There is absolutely no role-hierarchy check implemented to prevent an admin from targeting another Admin, or even their own account.

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { name: true, email: true }, // Fails to fetch or check role
});
```

**Impact:** A rogue or compromised admin could systematically schedule all other platform administrators for deletion, locking down the Command Center and causing a catastrophic administrative lockout.

### 8. TOCTOU Race Condition in Manual Wallet Adjustments (Financial Flaw)

**Location:** `processWalletManualAdjustmentAction` in `src/app/actions/admin.ts`
**Issue:** When an admin processes a manual wallet `DEBIT`, the system reads the balance, validates it, and then updates it in sequential Prisma calls.

```typescript
const wallet = await tx.wallet.upsert({ ... });
const beforeBalance = Number(wallet.balance);

if (direction === "DEBIT" && beforeBalance < adjustmentValue) {
  throw new Error("Insufficient wallet balance");
}

const updatedWallet = await tx.wallet.update({
  where: { id: wallet.id },
  data: { balance: { decrement: adjustmentValue } } // vulnerable window
});
```

**Impact:** Because Prisma's default `$transaction` doesn't apply row-level locks (`SELECT ... FOR UPDATE`), a Time-Of-Check to Time-Of-Use (TOCTOU) race condition exists. A provider could initiate a withdrawal at the exact millisecond an admin executes a manual debit, bypassing the check and driving the user's wallet balance into negative numbers.

### 9. System Settings `NaN` & Type Corruption (UI Breakage)

**Location:** `handleSave` in `src/components/admin/SystemSettings.tsx`
**Issue:** When editing system settings (like `platform_fee_percentage` or `min_withdrawal_amount`), the component blindly casts the input value using `Number()`. There are no bound checks (e.g., checking for negative fees) or `isNaN` safeguards before submission.

```typescript
let processedValue: any = formData.value;
if (defaultSetting?.type === "number") {
  processedValue = Number(formData.value); // If input is text/empty, becomes NaN
}
```

**Impact:** If an admin accidentally types "abc" or leaves a numeric field blank, it saves as `NaN` (or `null`) in the `SystemSetting` database model. When the financial engine later queries `platform_fee_percentage` and attempts mathematical operations with `NaN`, it will systematically fail all incoming checkout and invoice processes across the application.

### 10. Arbitrary Entity Linking in Support Tickets (Security / Data Flow)

**Location:** `PATCH` action in `src/app/api/support/tickets/[id]/route.ts`
**Issue:** Users (or admins) updating a ticket can modify the `relatedEntityId` (e.g., linking a ticket to a Booking or Invoice). The API enforces that the _type_ is valid, but completely fails to validate if the `relatedEntityId` actually exists or belongs to the requesting user.

```typescript
if (nextRelatedEntityId !== undefined) {
  updateData.relatedEntityId = nextRelatedEntityId || null; // Zero ownership validation
}
```

**Impact:** A user can arbitrarily link their ticket to financial transaction IDs, job IDs, or booking IDs belonging to _other_ clients. This corrupts the support dashboard data flow and allows malicious actors to probe the system for valid internal IDs.

Based on a deep dive into the provided React UI components (`EnhancedCategoryManagement.tsx`, `SystemSettings.tsx`, and `UserAdminActions.tsx`), I have identified several critical UI/UX bugs, state management flaws, and interaction issues.

Here is a breakdown of the specific UI and rendering problems, along with suggested fixes:

### 1. System Settings JSON Corruption (Data Mutation Bug)

**Location:** `src/components/admin/SystemSettings.tsx`
**The Issue:** The component attempts to handle complex objects by stringifying them for the input field: `if (typeof setting.value === 'object') return JSON.stringify(setting.value);`.
However, in the `handleSave` function, it completely forgets to parse this string back into a JSON object before sending it to the server action.

```typescript
let processedValue: any = formData.value;
if (defaultSetting?.type === "number") {
  processedValue = Number(formData.value);
} else if (defaultSetting?.type === "boolean") {
  processedValue = formData.value === "true";
}
// MISSING: Object parsing!
```

**Impact:** If an admin edits a JSON-based configuration (e.g., a tax rules object or feature flags), the UI sends it as a raw string. Prisma saves this string, fundamentally breaking any part of the application expecting an actual JSON object.
**The Fix:** Add a JSON parsing block in `handleSave`:

```typescript
if (defaultSetting?.type === "object") {
  try {
    processedValue = JSON.parse(formData.value);
  } catch (e) {
    alert("Invalid JSON format");
    return;
  }
}
```

### 2. Destructive Category Slug Overwrites (SEO & Routing Breakage)

**Location:** `src/components/admin/EnhancedCategoryManagement.tsx`
**The Issue:** The `Name` input field has an `onBlur={handleSlugify}` event. If an admin simply opens an _existing_ category to fix a typo in the name (e.g., changing "Web Dev" to "Web Development"), the UI automatically regenerates the slug to `web-development`.
**Impact:** Changing the slug of an active category immediately breaks all existing public URLs, bookmarks, and SEO rankings tied to the old slug (e.g., `/categories/web-dev` will now 404).
**The Fix:** Only auto-generate the slug if you are creating a _new_ category. Existing slugs should require intentional, separate modification.

```tsx
onBlur={() => {
  if (!editingCategory) handleSlugify(); // Only auto-slugify for new categories
}}
```

### 3. Blocking `alert()` Usage Instead of Toast Notifications

**Location:** `src/components/admin/EnhancedCategoryManagement.tsx` & `SystemSettings.tsx`
**The Issue:** While `UserAdminActions.tsx` properly uses non-blocking toast notifications (`toast.error()`), the Category and Settings components use native browser `alert()` for error handling:

```typescript
if (result.success) {
  router.refresh();
} else {
  alert(result.error || "Failed to save category"); // Blocks the main thread
}
```

**Impact:** Native alerts block the browser's main thread, freeze the UI, and provide a jarring, unstyled user experience that feels completely out of place in a modern dashboard.
**The Fix:** Import `toast` from `sonner` (or your toast library) and replace all `alert()` calls with `toast.error()`.

### 4. Inconsistent API Patterns Breaking Loading States

**Location:** `src/components/admin/UserAdminActions.tsx` (Fee Waiver action)
**The Issue:** Most actions in this component (Ban, Role Change, Delete) correctly use React's `useTransition` hook (`startTransition`) calling Server Actions. This seamlessly toggles the `isPending` state, disabling the main "Admin Actions" dropdown button to prevent double-clicks.
However, the `handleFeeWaiver` function completely breaks this pattern. It uses a raw `fetch` to an API route and manual `setIsWaiving` state.
**Impact:** Because it bypasses `startTransition`, the main "Admin Actions" button does not disable (`disabled={isPending}`). An admin could accidentally click other actions while the fee waiver is still processing in the background.
**The Fix:** Refactor `handleFeeWaiver` to use a Server Action inside `startTransition`, matching the rest of the component.

### 5. Category Grid DOM Bloat (No Pagination)

**Location:** `src/components/admin/EnhancedCategoryManagement.tsx`
**The Issue:** The component maps over `filteredCategories` to render cards.

```tsx
{
  filteredCategories.map((category, index) => (
    <MobileCategoryCard key={category.id} category={category} index={index} />
  ));
}
```

**Impact:** The `getCategories` server action fetches _all_ categories. If the platform scales to hundreds of sub-categories, rendering hundreds of complex DOM nodes (with images, framer-motion animations, and nested menus) all at once will cause massive layout thrashing and crash mobile browsers.
**The Fix:** The component must implement either virtualized scrolling (e.g., `@tanstack/react-virtual`) or basic client-side pagination (e.g., slicing the array to show 20 items per page).

### 6. Modal Scroll-Lock Failure

**Location:** Across all modals in `UserAdminActions.tsx` and `EnhancedCategoryManagement.tsx`
**The Issue:** The modals use standard fixed positioning with a backdrop. However, they do not lock the body scroll.
**Impact:** If an admin scrolls while interacting with a long modal on a smaller screen, the background (the underlying table or page) scrolls simultaneously. This is a confusing UX, especially on mobile devices.
**The Fix:** Add a `useEffect` hook to toggle `document.body.style.overflow = "hidden"` when a modal is open, and revert it to `"unset"` when closed.
