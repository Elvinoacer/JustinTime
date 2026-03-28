# Security & Data-Flow Audit (March 28, 2026)

## Scope
- API routes under `src/app/api/**`
- Auth/session flow in `src/auth.ts` and related auth routes
- Payment/wallet webhooks and verification flow
- Onboarding, booking, messaging, and provider service data paths

## Executive Summary
- **Total findings:** 13
- **Critical:** 5
- **High:** 5
- **Medium:** 3

Primary risk themes:
1. Multiple trust-boundary violations in payment/auth endpoints.
2. Missing authorization checks (IDOR and destructive operations).
3. Broken data integrity guarantees (duplicate/race processing, ranking drift).

---

## Findings

### C-01: Unauthenticated destructive account cleanup endpoint
- **Severity:** Critical
- **Type:** AuthZ / Destructive action exposure
- **Evidence:** `src/app/api/account/cleanup-deletions/route.ts:6-72`
- **Issue:** `POST /api/account/cleanup-deletions` executes account deletion logic with no auth, secret, or cron signature.
- **Impact:** Any unauthenticated caller can trigger bulk user deletions once `deletionScheduledAt <= now`.
- **Fix:** Require admin auth and/or a signed cron secret header; deny by default.

### C-02: Unauthenticated PII disclosure via `/api/users/me?email=`
- **Severity:** Critical
- **Type:** Data exposure / IDOR
- **Evidence:** `src/app/api/users/me/route.ts:7-42`
- **Issue:** Supplying `email` bypasses session auth and returns user record + profile fields.
- **Impact:** Email-based user enumeration and PII leakage (phone, profile, timestamps, role).
- **Fix:** Remove unauthenticated email lookup path; keep session-only access or internal-service auth token.

### C-03: Forgable Google sign-in provisioning endpoint
- **Severity:** Critical
- **Type:** Auth trust boundary bypass
- **Evidence:** `src/app/api/auth/google-signin/route.ts:13-112`
- **Issue:** Public endpoint trusts posted `email/name/image`, sets `emailVerified`, and creates/updates accounts without validating Google ID token inside the endpoint.
- **Impact:** Attacker can mark arbitrary emails as verified or create verified accounts for emails they don't own.
- **Fix:** Remove public route usage; perform provisioning only inside trusted NextAuth Google callback using provider claims.

### C-04: Wallet credit minting via client-controlled verify endpoint
- **Severity:** Critical
- **Type:** Payment integrity / business logic abuse
- **Evidence:**
  - `src/app/api/wallet/verify/route.ts:74-99`
  - `src/lib/api/hooks/useWallet.ts:35-37`
  - `src/app/client/wallet/page.tsx:51-53`
- **Issue:** `/api/wallet/verify` accepts client-supplied `amount` and increments wallet balance directly; frontend calls it with arbitrary amount (`1000` hardcoded in client flow).
- **Impact:** Authenticated users can self-credit wallet balances without confirmed payment.
- **Fix:** Deprecate this endpoint immediately; rely only on server-verified webhook/payment-status checks with immutable transaction records.

### C-05: Payment webhooks are forgeable and non-idempotent
- **Severity:** Critical
- **Type:** Payment authenticity/integrity
- **Evidence:**
  - `src/app/api/wallet/webhook/route.ts:24-101`
  - `src/app/api/onboarding-fee/webhook/route.ts:30-157`
  - `src/app/api/subscription/webhook/route.ts:9-46`
- **Issue:**
  - `wallet` and `onboarding-fee` webhooks do not verify provider signature/HMAC; only optional challenge token.
  - User mapping uses `id startsWith(userIdPart)` from `api_ref`.
  - No strong idempotency key (e.g., unique `invoice_id` lock table).
- **Impact:** Forged callbacks can credit wallets, grant onboarding privileges, or mutate subscriptions.
- **Fix:** Verify signed payloads, validate invoice with provider API, use unique processed-webhook table keyed by provider event/invoice ID.

### H-01: Webhooks acknowledge processing errors with HTTP 200 (lossy money flow)
- **Severity:** High
- **Type:** Reliability / data integrity
- **Evidence:**
  - `src/app/api/wallet/webhook/route.ts:105-109`
  - `src/app/api/onboarding-fee/webhook/route.ts:167-171`
- **Issue:** On exceptions, handlers return success-style 200 responses, preventing provider retries.
- **Impact:** Real paid events can be permanently dropped during transient failures.
- **Fix:** Return non-2xx on recoverable failures and ensure idempotent retry-safe processing.

### H-02: Arbitrary file deletion via authenticated URL input
- **Severity:** High
- **Type:** Broken object authorization
- **Evidence:**
  - `src/app/api/upload/route.ts:93-99`
  - `src/app/api/upload-pdf/route.ts:65-74`
- **Issue:** Any authenticated user can call delete with arbitrary object URL; no ownership/path validation.
- **Impact:** Cross-user asset deletion (messages, identity docs, service media).
- **Fix:** Enforce key prefix ownership (`/<folder>/<session.user.id>/...`) before delete.

### H-03: Proposal list endpoint leaks all proposals to unauthorized users
- **Severity:** High
- **Type:** Authorization / data confidentiality
- **Evidence:** `src/app/api/jobs/[id]/proposals/route.ts:22-30`
- **Issue:** Any authenticated user can fetch all proposals for any job.
- **Impact:** Competitor intelligence leak (pricing, identities, cover letters).
- **Fix:** Restrict GET to the job owner client (and admin) or proposal owner for own proposal only.

### H-04: Booking creation has race window for double-booking
- **Severity:** High
- **Type:** Data consistency race condition
- **Evidence:** `src/app/api/bookings/route.ts:195-217` then `:265+`
- **Issue:** Availability/conflict checks run before transaction, then booking is created later with no locking/unique conflict guard.
- **Impact:** Concurrent requests can pass checks and create overlapping bookings.
- **Fix:** Move conflict check + create into one transaction with serializable isolation or DB constraints/locking strategy.

### H-05: Interaction endpoints are unauthenticated and unthrottled
- **Severity:** High
- **Type:** Abuse / integrity
- **Evidence:** `src/app/api/services/[id]/interactions/route.ts:7-69` (same pattern in professionals interactions)
- **Issue:** Public callers can inflate views/favorites and trigger notification spam repeatedly.
- **Impact:** Fake growth metrics, noisy provider notifications, possible mail/push cost amplification.
- **Fix:** Add auth or anti-abuse controls (IP/user/device dedupe + rate limits + cooldown).

### H-06: WhatsApp webhook POST does not verify Meta signature
- **Severity:** High
- **Type:** Webhook spoofing
- **Evidence:** `src/app/api/webhooks/whatsapp/route.ts:26-49`
- **Issue:** Incoming webhook body is accepted without verifying `X-Hub-Signature-256`.
- **Impact:** Attackers can spoof inbound messages and trigger downstream automation.
- **Fix:** Validate provider signature against app secret for every POST.

### M-01: HTML injection risk in message notification emails
- **Severity:** Medium
- **Type:** Injection (email content)
- **Evidence:** `src/app/api/messages/send/route.ts:70-76`
- **Issue:** Raw `content` and `session.user.name` are interpolated into HTML email without escaping.
- **Impact:** HTML/script-like payloads can render in permissive email clients, phishing-style spoofing.
- **Fix:** Escape/sanitize all user-supplied content before template interpolation.

### M-02: Services ranking/pagination flow is inconsistent
- **Severity:** Medium
- **Type:** Broken data flow / UX integrity
- **Evidence:** `src/app/api/services/route.ts:233-256`
- **Issue:** In-memory promotion sorting is done after paged DB fetch; comments acknowledge global ordering is incorrect.
- **Impact:** Promoted/premium ordering is inconsistent across pages; business ranking promises are violated.
- **Fix:** Implement DB-level deterministic ranking query or two-phase fetch with stable global ordering.

### M-03: Duplicate delete loop in provider service update
- **Severity:** Medium
- **Type:** Logic bug / side-effect duplication
- **Evidence:** `src/app/api/provider/services/route.ts:184-188`
- **Issue:** Nested duplicate `for` loop deletes each image twice.
- **Impact:** Extra storage calls, noisy failures, brittle updates.
- **Fix:** Remove duplicate loop and add tests for media update paths.

---

## Priority Remediation Plan

### 0-48 hours
1. Disable or lock down:
   - `/api/wallet/verify`
   - `/api/account/cleanup-deletions`
   - `/api/users/me?email=...` unauth path
   - `/api/auth/google-signin` public invocation path
2. Add strict signature verification + idempotency table for all payment webhooks.
3. Add ownership checks for upload delete endpoints.

### 3-7 days
1. Fix proposal GET authorization and booking race condition.
2. Add anti-abuse controls for interactions and WhatsApp signature checks.
3. Patch medium-severity logic issues (services ranking, duplicate media delete loop, email escaping).

### 1-2 weeks
1. Add security regression tests for each finding class:
   - webhook forgery
   - IDOR/authz checks
   - race-condition booking tests
   - file ownership deletion tests
2. Add endpoint threat-model docs and mandatory authz middleware patterns.

---

## Notes
- This audit is static-code based and focused on server/API trust boundaries and data integrity.
- Runtime infra settings (WAF, CDN rules, secret rotation, alerting) were not validated here.
