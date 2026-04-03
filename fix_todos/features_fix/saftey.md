Based on the audit of the **Trust, Safety & Verification (Section 9)** files, there are several critical security vulnerabilities, missing integrations, and incomplete data flows. Because this section deals with physical safety, legal compliance, and user trust, these flaws are severe.

Here is the comprehensive analysis and fix plan for the Trust, Safety & Verification flows:

### 9.1 & 9.2 Verification & TaaS (Critical Security Flaw)

**Identified Issues:**

1. **Broken Admin Authorization:** In `src/app/actions/verification.ts`, the functions `approveBackgroundCheck`, `rejectBackgroundCheck`, and `getExpiringChecks` all contain the comment `// TODO: Add strict admin check` and only verify that `session?.user?.id` exists. **This means any logged-in user (client or provider) can send an API request to approve their own background check**, bypass the verification queue, and gain a verified badge.
2. **Camera Blob Data Flow:** The `CameraCapture.tsx` component correctly accesses the device camera and captures a Blob. However, passing raw binary Blobs through Next.js Server Actions is highly inefficient and prone to payload size limits (usually 1MB-4MB). There is no intermediary step to upload this image to S3/Cloudinary and return a URL before submitting the background check data.

**Fix Plan:**

1. **Enforce Admin Roles:** Update `verification.ts` to strictly verify the user's role.
   ```typescript
   const session = await auth();
   if (!session?.user?.id || session.user.role !== "ADMIN") {
     throw new Error("Unauthorized");
   }
   ```
2. **Implement Pre-signed URLs for Camera Uploads:** When `CameraCapture.tsx` fires `onCapture(blob)`, immediately send that Blob to the `/api/upload` route (using FormData), retrieve the secure CDN URL, and _then_ pass that URL string into `submitBackgroundCheck({ dciCertificateUrl: url })`.

### 9.3 Safety Operations (The "Silent" SOS)

**Identified Issues:**

1. **Placebo Panic Button:** In `src/app/actions/safety.ts`, the `triggerSOS` function successfully logs the alert to the database, but the actual emergency notification is just a `console.log` stub (`// TODO: Integrate actual SMS provider`). If a provider is in physical danger and presses the Panic Button, their trusted contacts will not actually receive an SMS.
2. **Dangerous Polling Latency:** `SOSOverlay.tsx` uses a `setInterval` to check `getActiveSOS()` every 10 seconds. In an active emergency, a 10-second delay in UI feedback can cause panic, leading users to press the button multiple times.
3. **Missing "Block User" Flow:** The architecture specifies a `BlockedUser` model (9.3.5), but there are no server actions in `safety.ts` to block a user, and the `ReportUserModal` does not include an option to sever communication entirely.

**Fix Plan:**

1. **Integrate Africa's Talking / Twilio SMS:** Replace the stub in `safety.ts` with an immediate, high-priority SMS dispatch to all phone numbers in the `trustedContacts` array, containing the Google Maps link.
2. **Socket-Driven Emergencies:** Instead of a 10s poll, when `triggerSOS` fires, it should push a WebSocket event to the client to immediately mount the `SOSOverlay`.
3. **Implement Blocking:** Add `blockUser(targetId)` to `safety.ts` which inserts a record into the `BlockedUser` table. Update the `/api/messages/send` route to strictly return a `403 Forbidden` if either user has blocked the other.

### 9.4 Reviews & Dispute Resolution (Incomplete State Machine)

**Identified Issues:**

1. **Review Lockout:** `POST /api/reviews/route.ts` strictly enforces `if (booking.status !== "COMPLETED") return error;`. However, if a provider behaves poorly and the booking is `CANCELLED` midway, or if it results in a `DISPUTED` state, the client is locked out of leaving a warning review.
2. **Missing Resolution Actions:** `DisputesClient.tsx` renders the table of disputes, but the actual actions (Refund Client, Release to Provider, Split Escrow) are absent. The UI for the "Refund Preview" capability (9.4.5) has not been implemented in this file.

**Fix Plan:**

1. **Expand Review Eligibility:** Allow reviews for bookings that are `COMPLETED`, `CANCELLED` (if cancelled after the scheduled start time), or `RESOLVED` (post-dispute).
2. **Build Resolution Modals:** Create a `<ResolveDisputeModal>` inside the admin disputes page. This modal must call a secure server action that simultaneously:
   - Transitions the dispute state.
   - Calls the IntaSend/Wallet API to release or refund the escrowed funds.
   - Dispatches an FCM notification to both parties regarding the outcome.

### 9.5 Insurance & Risk (Massive Data Leak)

**Identified Issues:**

1. **Global Data Exposure:** In `src/app/actions/insurance.ts`, the `getClaims()` function contains the comment `// In real app, check if admin` and immediately proceeds to query `prisma.insuranceClaim.findMany()` and return ALL claims on the platform. Any authenticated user (even a brand new client) can call this server action from the browser console and download the names, emails, booking amounts, and damage descriptions of every user on the platform.
2. **Missing Evidence Upload:** `submitInsuranceClaim` expects `evidence` as a comma-separated string of URLs. There is no multipart form handling or connection to the `s3.ts` uploader, meaning users cannot actually attach photos of property damage.

**Fix Plan:**

1. **Lock Down Claims Retrieval:** Immediately add a strict `if (session.user.role !== 'ADMIN') throw new Error()` block to `getClaims()`.
2. **Implement Evidence Uploader:** Create a client-side component for the Insurance Claim form that uses `Dropzone` to upload damage photos to S3 via `/api/upload`, collects the returned URLs, and passes them to `submitInsuranceClaim`.

Based on an even deeper architectural analysis of the Trust, Safety & Verification codebase, I have identified a second layer of critical logic flaws. These issues move beyond missing UI into deep state machine errors, financial loopholes, and safety risks.

Here are the additional, advanced broken flows and data vulnerabilities identified:

### 9.2 Trust-as-a-Service (The "Permanent Premium" Loophole)

**Identified Issue:**

- **No Demotion Mechanism:** In `src/app/actions/taas.ts`, the `togglePremiumPricing` function correctly checks if a provider's `trustScore?.premiumEligible` is true before enabling premium pricing on their profile. However, there is no corresponding listener or trigger to **disable** it if their trust score drops.
- A provider could achieve "Elite" status, toggle Premium Pricing on, and then receive terrible reviews or have disputes filed against them. Even if their tier drops to "Unverified," they will retain their `premiumMultiplier` indefinitely because the system never forcefully resets `premiumPricingEnabled` back to `false`.

**Fix Plan:**

1. **Event-Driven Demotion:** Update `updateTrustScore` (inside `trust-score-calculator.ts`) to check if the new score drops below the premium eligibility threshold.
2. **Auto-Revoke:** If the threshold is lost, forcefully run `prisma.profile.update({ data: { premiumPricingEnabled: false, premiumMultiplier: 1.0 } })` and send an automated notification to the provider explaining why their premium access was revoked.

### 9.2 Verification (The "Zombie Badge" Problem)

**Identified Issue:**

- **Missing Expiration Engine:** The system has an action `getExpiringChecks()` and `getExpiringBadgesAdmin()` to let admins _view_ badges that are about to expire. However, there is no automated cron job or background worker actually executing the expirations.
- A Good Conduct certificate or Background Check that is valid for 1 year will remain completely valid and active on the provider's public profile long past its expiration date unless an admin manually checks the expiring list and clicks "Revoke" on every single one.

**Fix Plan:**

1. **Implement a Daily Cron:** Create an API route `GET /api/internal/cron/expire-badges` secured by a cron secret.
2. **Automated Status Updates:** Have the cron script run `prisma.verificationBadge.updateMany({ where: { expiresAt: { lt: new Date() }, status: 'VERIFIED' }, data: { status: 'EXPIRED' } })`.
3. **Grace Period Warnings:** Modify the cron to send automated email/FCM warnings to providers 30, 14, and 3 days before their badges expire so they have time to renew.

### 9.3 Safety Operations (The Dangerous Geolocation Fallback)

**Identified Issue:**

- **Lethal IP Fallback for SOS:** In `PanicButton.tsx`, if the browser's GPS location fails (e.g., the user denied permissions previously), it falls back to IP-based location and triggers the SOS with the message: _"Using approximate location from your network"_.
- **This is extremely dangerous.** IP geolocation in mobile networks (like Safaricom or Airtel) often resolves to a generic ISP data center in the capital city (e.g., Nairobi), even if the user is hundreds of kilometers away. Sending emergency contacts or police to an IP-based location during an active physical attack is worse than sending no location at all, as it provides a false sense of security and misdirects help.

**Fix Plan:**

1. **Strict GPS Enforcement:** Modify `PanicButton.tsx` to explicitly reject IP-based location for SOS alerts.
2. **Explicit User Input Fallback:** If high-accuracy GPS fails, pop up an immediate `<EmergencyAddressModal>` forcing the user to type in their cross-streets or house number.
3. **Tag Accuracy Data:** Ensure the `SOSAlert` database model records the `accuracy` radius (in meters) so emergency responders know the margin of error of the ping.

### 9.4 Reviews & Dispute Resolution (The TOCTOU Race Condition)

**Identified Issue:**

- **Review Bombing via Double-Click:** In `POST /api/reviews/route.ts`, the code prevents duplicate reviews by doing an application-level check: `if (booking.review) { return 409 }` before running `prisma.review.create`.
- This is a classic Time-of-Check to Time-of-Use (TOCTOU) race condition. If a user has a slow connection and rapidly taps "Submit Review" 5 times, 5 concurrent API requests will pass the `if (booking.review)` check simultaneously, resulting in 5 duplicate reviews being created for the same booking, artificially tanking or boosting a provider's trust score.

**Fix Plan:**

1. **Database-Level Integrity:** Open `schema.prisma` and add a `@unique` constraint to the `bookingId` field on the `Review` model. This forces PostgreSQL to reject duplicates at the database level, completely preventing race conditions.
2. **Idempotency Keys:** Require the frontend to send an `idempotencyKey` in the review payload to ensure accidental retries are ignored.

### 9.5 Insurance & Risk (Dead-End State Machine)

**Identified Issue:**

- **Unresolvable Insurance Claims:** In `src/app/actions/insurance.ts`, a user can submit a claim which creates a record with `status: 'PENDING'`. However, there is absolutely no logic, server action, or API route in the codebase to `APPROVE`, `REJECT`, or `PAY_OUT` an insurance claim.
- The claims simply sit in the database forever. There is no integration tying an approved insurance claim to the `Wallet` system to actually distribute compensation to the victim.

**Fix Plan:**

1. **Admin Resolution Action:** Create a new server action `resolveInsuranceClaim(claimId, status, payoutAmount)` restricted to ADMIN roles.
2. **Financial Engine Integration:** If a claim is approved, the action must automatically interface with the `Wallet` API to credit the claimant's account with the `payoutAmount`, and deduct it from the platform's central insurance reserve wallet.
3. **Status Notifications:** Dispatch notifications via `dispatcher.ts` to inform the user of their claim outcome and the ETA of their funds.

## EVEN BETTER (MUST DO )

I audited the project files for **Trust, Safety & Verification**. This feature area has some solid building blocks, but it also has several **hard breaks**, several **broken UI/data flows**, and a few **critical missing implementations** for a marketplace.

The biggest finding is this:

**part of this feature is not merely incomplete — some of it is structurally broken because code and Prisma schema are out of sync.**

---

# Overall diagnosis

This area is split into six sub-systems:

1. identity verification / onboarding verification
2. provider verification + badge lifecycle
3. trust score / TaaS / premium pricing
4. safety ops: SOS, trusted contacts, blocking
5. reviews + disputes
6. insurance claims

The main recurring problems are:

- **schema drift** between server actions and Prisma models
- **verification shown in multiple conflicting ways** (`profile.isVerified`, `profile.verificationStatus`, `VerificationBadge`, `TrustScore`)
- **UI surfaces that exist, but stop short of completing the actual operational workflow**
- **admin actions without strict admin authorization**
- **safety and insurance flows that are mostly stubs**
- **public trust presentation not aligned with the newer TaaS model**

---

# 1) Identity Verification: broken flows and gaps

## 1.1 Onboarding identity verification is client-side only and not a real verification system

### Confirmed issue

`src/app/onboarding/components/StepVerification.tsx`:

- captures ID and selfie
- runs face matching entirely in the browser with `face-api.js`
- marks the user “VERIFIED” locally in the onboarding step payload

### Result

This is not a trustworthy verification flow by itself.

Problems:

- no server-side verification result persistence from this step
- no admin review queue tied to these artifacts
- no anti-spoofing/liveness
- no structured document extraction/validation
- no audit trail from the onboarding step itself
- easy mismatch between “user saw verified in onboarding” and “actual platform trust state”

### Fix

Treat onboarding identity verification as **verification evidence capture**, not final truth.

Implement:

- upload of ID front/back + selfie to storage
- server-side creation of a verification request record
- clear status model:
  - `SUBMITTED`
  - `UNDER_REVIEW`
  - `VERIFIED`
  - `REJECTED`
  - `EXPIRED`

- audit record on submission
- optional automated face match score persisted server-side
- optional liveness step
- admin or trusted vendor review flow

The onboarding screen should say something like:

- “Identity check submitted”
- not “verified” unless the backend has actually confirmed it

---

## 1.2 Identity verification state is duplicated and inconsistent across models

### Confirmed issue

There are at least four trust-related truth sources:

- `Profile.isVerified`
- `Profile.verificationStatus`
- `VerificationBadge`
- `TrustScore`

### Result

These can drift.

Examples already visible in code:

- public listings still rely heavily on `profile.isVerified`
- TaaS uses `VerificationBadge` and `TrustScore`
- onboarding and fee flows also set `profile.isVerified` directly
- admin screens mostly act on `Profile.verificationStatus`

So one user can appear:

- verified in one place,
- unverified in another,
- premium-eligible in a third,
- and missing badges in a fourth.

### Fix

Choose one canonical trust model.

Recommended:

- `Profile.verificationStatus` for core identity account verification
- `VerificationBadge` for badgeable claims
- `TrustScore` as derived output only
- `profile.isVerified` should either be deprecated or computed consistently from canonical state

Do not let all four act as primary truth.

---

## 1.3 Admin verification route naming/state does not fully align with TaaS

### Confirmed issue

There are two parallel admin verification worlds:

- `/admin/verifications` for profile/background check review
- badge approval/revocation actions in `src/app/actions/taas.ts`

### Result

Admin identity verification and admin badge verification are not one cohesive workflow.

### Fix

Unify admin trust operations into one center with tabs:

- identity verification
- badge requests
- background checks
- expiring badges/checks
- audit history

---

# 2) Background checks: hard-broken by schema drift

This is one of the most serious findings.

## 2.1 `verification.ts` background check actions do not match the Prisma schema

### Confirmed issue

`src/app/actions/verification.ts` uses fields like:

- `providerId`
- `dciCertificateUrl`
- `submittedAt`
- `clearedAt`
- `adminNotes`
- statuses like `SUBMITTED`, `CLEARED`

But the actual Prisma `BackgroundCheck` model has:

- `userId`
- `documents`
- `reportUrl`
- `createdAt`
- `updatedAt`
- statuses `PENDING`, `APPROVED`, `REJECTED`

### Result

This flow is structurally broken.
At runtime or type-check time, these actions do not align with the actual DB model.

The same mismatch appears in:

- `getProviderBackgroundCheck`
- `approveBackgroundCheck`
- `rejectBackgroundCheck`
- `getExpiringChecks`
- `getBackgroundChecks` in admin actions
- `BackgroundChecksList`

### Fix

You need a full background-check model normalization.

Two options:

### Option A — align code to current schema

Use:

- `userId`
- `documents[]`
- `reportUrl`
- `status: PENDING | APPROVED | REJECTED`

And update all actions/components accordingly.

### Option B — evolve schema to match intended product

If you actually want:

- certificate URL
- admin notes
- submittedAt
- clearedAt
- richer renewal workflow

then extend Prisma model accordingly and migrate.

Current best practical option: **migrate schema to the intended richer model**, because the UI/admin flow already expects it.

Recommended additions:

- `submittedAt`
- `reviewedAt`
- `reviewedBy`
- `adminNotes`
- `certificateType`
- `documentUrls`
- `reportUrl`
- `expiresAt`
- `renewalStatus`

---

## 2.2 Admin verifications page maps wrong statuses for background checks

### Confirmed issue

`src/app/admin/verifications/page.tsx` maps:

- PENDING → SUBMITTED
- VERIFIED → CLEARED
- REJECTED → REJECTED

But Prisma background check enum is:

- `PENDING`
- `APPROVED`
- `REJECTED`

### Result

Even if the rest worked, this status mapping is wrong against current schema.

### Fix

Normalize one status language across:

- DB
- server actions
- admin page
- badges/trust calculations

Use one consistent set.

---

## 2.3 Background checks list UI expects fields that do not exist

### Confirmed issue

`src/components/admin/BackgroundChecksList.tsx` expects:

- `check.provider`
- `check.dciCertificateUrl`
- `check.submittedAt`
- status `SUBMITTED`, `CLEARED`

Those do not match current Prisma model.

### Result

This admin UI is broken against current schema.

### Fix

Update component to actual schema, or migrate schema to intended design.

---

# 3) TaaS / Trust Score / Badge system

## 3.1 Trust score calculator references the wrong review field

### Confirmed issue

In `src/lib/taas/trust-score-calculator.ts`, reviews are queried with:

- `where: { revieweeId: userId }`

But the `Review` model uses:

- `targetId`

### Result

This trust score calculation is broken as written.

### Fix

Change `revieweeId` to `targetId`.

This is another schema drift issue.

---

## 3.2 Tier model does not match the feature spec exactly

### Confirmed issue

Feature spec says:

- Unverified → Basic → Verified → Elite

Current trust calculator uses:

- `UNVERIFIED`
- `BASIC`
- `VERIFIED`
- `PREMIUM`
- `ELITE`

### Result

Product language and implementation language differ.
That can confuse UX, analytics, pricing logic, and admin understanding.

### Fix

Decide whether `PREMIUM` is:

- a trust tier, or
- a pricing entitlement layered on top of trust tier

I would recommend:

- trust tiers: `UNVERIFIED`, `BASIC`, `VERIFIED`, `ELITE`
- premium pricing eligibility as a separate boolean derived from trust score/tier

That is cleaner.

---

## 3.3 Premium pricing toggle UI is one-way and broken

### Confirmed issue

`src/app/dashboard/verification/page.tsx` always calls:

- `togglePremiumPricing(true)`

It does not read current enablement state and does not support disabling properly.

### Result

This is not a real toggle. It is effectively an “enable only” button.

### Fix

Load current profile premium settings and render a true toggle:

- enabled / disabled state
- action flips accordingly
- show current multiplier
- persist and revalidate consistently

---

## 3.4 Badge request UI does not actually upload documents

### Confirmed issue

On `/dashboard/verification`, badge actions for document-required badges say “Upload”, but the form submits:

- `requestVerificationBadge(type, undefined)`

No file upload occurs.

### Result

The UI promises a document flow that is not implemented.

### Fix

For document-required badges:

- real file picker
- upload to storage
- pass `documentUrl`
- optionally collect metadata like license number, issuer, expiry date

Right now the UI is misleading.

---

## 3.5 Verification page links to the wrong route

### Confirmed issue

`src/app/dashboard/verification/page.tsx` links SOS setup to:

- `/dashboard/sos`

Actual safety route is:

- `/dashboard/safety`

### Result

That is a direct broken navigation flow.

### Fix

Change to `/dashboard/safety`.

---

## 3.6 Public trust display is still tied too much to old `isVerified`

### Confirmed issue

Multiple public/provider listing surfaces still use:

- `profile.isVerified`

Examples appear in professionals, services, cards, solar, bookings, proposals, etc.

### Result

Your newer badge/trust-score system is not the thing users actually see consistently.

### Fix

Introduce a unified public trust presentation helper:

- `getPublicTrustPresentation(userId)`
- returns:
  - identity verified boolean
  - badges summary
  - tier
  - premium eligible
  - trust score band if desired

Then migrate all public/provider UI to that contract.

---

# 4) Safety operations

## 4.1 SOS flow is mostly a stub, not an operational safety system

### Confirmed issue

`src/app/actions/safety.ts`:

- creates SOS alert
- logs contact notification to console
- does not actually send SMS/push
- does not alert internal safety ops
- does not link to booking/job/session context

### Result

The UI says:

- “We send SMS & Notifications”
- “Our 24/7 Safety Team is alerted”

But the action only logs to console.

That is a critical product-trust mismatch.

### Fix

Implement actual SOS dispatch:

- push notification
- SMS provider integration
- internal ops alert
- incident log
- escalation path

At minimum:

- send to trusted contacts,
- create internal admin alert,
- record dispatch status.

---

## 4.2 SOS cancel marks alert as `RESOLVED`, not `CANCELLED`

### Confirmed issue

Feature spec includes:

- SOS cancel operation

But `cancelSOS()` updates status to:

- `RESOLVED`

Schema has:

- `ACTIVE`
- `RESOLVED`
- `CANCELLED`

### Result

User-initiated cancellation and ops-resolved incident are being conflated.

### Fix

Use:

- `CANCELLED` for user self-cancel / false alarm / safe now
- `RESOLVED` for operational resolution by platform/admin/support

This matters for audit and analytics.

---

## 4.3 No route or UI for blocked users in Safety Center

### Confirmed issue

`BlockedUser` model and reporting actions exist.
But `/dashboard/safety` only shows:

- trusted contacts
- panic button
- SOS overlay

No blocked users management appears there.

### Result

Feature exists in code, but not as a coherent trust/safety surface.

### Fix

Add Safety Center sections for:

- blocked users list
- unblock action
- report history
- safety preferences

---

## 4.4 Trusted contacts have no dedupe, validation, or minimum/maximum rules

### Confirmed issue

`addTrustedContact()` creates records directly.
No checks for:

- duplicate phone number
- invalid phone format
- self phone
- too many contacts
- region normalization

### Result

Bad data can accumulate and weaken SOS reliability.

### Fix

Add:

- phone normalization
- unique per user on normalized phone
- minimum 2 contacts for SOS badge
- maybe max 5–10 contacts
- self-number rejection

---

## 4.5 Active SOS is user-only and not operationally surfaced enough

### Confirmed issue

`getActiveSOS()` is only for current user.
I did not see a real admin/ops active incident board in this feature slice.

### Result

The system can show the user their active alert, but does not fully support actual safety operations.

### Fix

Add admin/ops incident dashboard:

- active alerts
- location
- contact dispatch status
- booking/job context
- time since triggered
- resolve/escalate actions

---

# 5) Reviews & disputes

## 5.1 Reviews route is generally functional, but review eligibility is too narrow

### Confirmed issue

`/api/reviews` only allows review if booking status is `COMPLETED`, which is good.

But I did not see richer protections like:

- review window
- edited review flow
- response from provider
- moderation/reporting around abusive reviews

### Result

Basic flow works, but trust quality controls are minimal.

### Fix

Add:

- review window (for example 30 days)
- edit review within short period
- provider response
- moderation/reporting
- anti-retaliation/admin visibility

---

## 5.2 Dispute creation forbids disputes on completed bookings

### Confirmed issue

`src/app/api/bookings/[id]/dispute/route.ts` says:

- completed bookings cannot be disputed

### Result

That is often the opposite of real marketplace need.

Many disputes happen **after completion**:

- poor quality
- partial work
- fraud
- damage
- overcharge

### Fix

Allow disputes for:

- completed bookings within a defined time window
- maybe also in-progress/problem statuses

Then use a more precise rule:

- disallow only terminally closed/resolved/refunded bookings if needed

This is a significant product-flow issue.

---

## 5.3 Dispute model is too shallow for serious resolution operations

### Confirmed issue

`Dispute` currently has:

- bookingId
- creatorId
- defendantId
- reason
- status
- resolution

No structured fields for:

- category
- evidence
- amount contested
- assigned admin
- refund recommendation
- timeline/events
- claimant requested outcome

### Result

Admin dispute handling will be shallow and hard to audit.

### Fix

Extend dispute model:

- `category`
- `evidenceUrls`
- `requestedResolution`
- `assignedAdminId`
- `resolutionType`
- `refundPreview`
- `resolvedAt`
- `internalNotes`
- `timeline` or related event model

---

## 5.4 Refund preview capability is incomplete

### Confirmed issue

You mentioned refund preview capability.
Current admin dispute resolution flow in `admin.ts` does create wallet refunds in some paths, but I did not see a dedicated preview model exposed cleanly as a user-facing/admin pre-resolution calculation contract.

### Result

The capability exists partially in logic, but not clearly as a reusable resolution-preview feature.

### Fix

Add dedicated action:

- `getDisputeRefundPreview(disputeId)`

Return:

- booking amount
- paid amount
- fees
- refundable portion
- policy notes
- recommended resolution options

---

# 6) Insurance & risk

## 6.1 Insurance claims submission lacks authorization against booking ownership/relationship

### Confirmed issue

`submitInsuranceClaim()` accepts `bookingId` from form data and creates a claim with current user as claimant.
I did not see validation that the current user is actually:

- the client,
- the provider,
- or otherwise involved in that booking.

### Result

A user may potentially submit a claim against a booking they do not belong to.

### Fix

Before claim creation:

- load booking
- verify user is booking client or provider
- verify booking eligible for claim
- optionally ensure only one side can initiate claim or allow both with rules

This is critical.

---

## 6.2 Insurance claims are not linked to operational workflows

### Confirmed issue

Insurance claim model exists and actions exist, but I did not find:

- dedicated claim page
- admin risk dashboard
- booking UI entry points
- claim lifecycle UI
- review/approve/reject action surface

### Result

This is mostly a backend stub, not a completed feature.

### Fix

Add:

- claim submission entry from booking detail
- “My claims” page
- admin claims review page
- claim decision actions
- claim audit/history
- notification flow

---

## 6.3 `getClaims()` exposes all claims to any authenticated user

### Confirmed issue

`getClaims()` says:

- if authenticated, fetches all claims
- comment says “In real app, check if admin”

### Result

That is a serious authorization problem.

### Fix

Restrict:

- admins/risk team → all claims
- normal users → only own claims

This is high priority.

---

## 6.4 Claim submission revalidation path is likely wrong

### Confirmed issue

`submitInsuranceClaim()` revalidates:

- `/bookings/${bookingId}`

But the app’s actual booking paths are mostly role-scoped like:

- `/client/bookings/...`
- `/dashboard/bookings/...`

### Result

The intended UI may not refresh properly.

### Fix

Revalidate actual affected routes or use tag-based invalidation.

---

# 7) Authorization and safety governance gaps

## 7.1 Multiple admin actions do not enforce admin role properly

### Confirmed issue

Several actions only check authenticated user, with TODOs for admin checks:

- background check approve/reject/get expiring
- badge admin actions also only check auth, not strict admin in that file

### Result

Sensitive trust actions are under-protected at the action layer.

### Fix

Use one strict admin guard everywhere:

- `checkAdmin()` or equivalent
- no TODOs left in trust/safety actions

This is urgent.

---

## 7.2 Verification audit exists but is not surfaced end to end

### Confirmed issue

`VerificationAudit` exists and some actions write to it.
But I did not see a strong UI surface for:

- provider seeing their audit history
- admin seeing full trust audit history across identity + badges + score + background checks

### Result

Audit model exists, but operational visibility is limited.

### Fix

Add:

- provider audit/history tab on verification page
- admin audit timeline in verification center

---

# 8) Missing critical implementations relevant to this feature

These are important absences.

## 8.1 No real identity verification request model

Right now identity evidence is mixed into onboarding/profile/badge ideas, but not modeled as a first-class verification request.

### Add

- `IdentityVerificationRequest`
- artifact URLs
- match score
- liveness status
- extracted document metadata
- review decision
- reviewedBy / reviewedAt

---

## 8.2 No real safety operations dashboard

For a marketplace with SOS, this is critical.

### Add

- active incidents board
- incident statuses
- escalation owner
- dispatch logs
- booking/user context
- incident timeline

---

## 8.3 No unified trust profile for public/provider-facing display

Users see old `isVerified` logic instead of the richer trust model.

### Add

- one trust presentation API/helper for all profile/service/listing pages

---

## 8.4 No claim management center

Insurance claims exist but not as a complete workflow.

### Add

- user claims page
- admin/risk claims page
- claim decisions and notifications

---

## 8.5 No structured evidence handling for disputes and reviews

This weakens moderation and resolution quality.

### Add

- evidence attachments
- admin evidence review UI
- evidence snapshots for trust/safety incidents

---

# Full fix plan

## Phase 1 — Fix the hard breaks first

1. Repair all schema/code mismatches:
   - `BackgroundCheck`
   - `trust-score-calculator` review query
   - admin background-check UI/actions

2. Fix `/dashboard/verification` link from `/dashboard/sos` to `/dashboard/safety`
3. Enforce strict admin checks on all sensitive trust actions
4. Lock down `getClaims()` authorization

## Phase 2 — Establish one canonical trust model

1. Decide how `Profile.isVerified`, `Profile.verificationStatus`, `VerificationBadge`, and `TrustScore` relate
2. Deprecate redundant truth fields where possible
3. Create shared trust presentation mapper for public/provider UI

## Phase 3 — Make verification real

1. Introduce first-class identity verification request workflow
2. Persist onboarding verification artifacts server-side
3. Add review queue + audit trail + decision lifecycle
4. Implement real document upload flows for badge requests

## Phase 4 — Complete safety ops

1. Build real SOS dispatch
2. Add blocked-users UI to Safety Center
3. Add trusted-contact validation/normalization
4. Add admin active-SOS operations board
5. Distinguish `CANCELLED` from `RESOLVED`

## Phase 5 — Strengthen disputes/reviews/claims

1. Allow post-completion disputes within policy window
2. Extend dispute schema with evidence and resolution metadata
3. Add dispute refund preview action
4. Build claims pages and admin/risk management flow
5. Add provider response and moderation options for reviews

## Phase 6 — Align pricing and TaaS UX

1. Make premium pricing a real toggle
2. Decide whether `PREMIUM` is a tier or a separate entitlement
3. Reflect current premium state on UI
4. Make public trust badge/tier display consistent everywhere

---

# Highest-priority problems

If I had to rank the biggest issues:

1. **Background check system is broken by schema drift**
2. **Trust score calculation uses wrong review field**
3. **Insurance claims access control is too weak**
4. **Verification state is duplicated across incompatible truth sources**
5. **SOS is presented as operationally real, but is mostly a stub**
6. **Completed bookings cannot be disputed, which breaks a common real-world trust flow**
7. **Verification page includes fake upload behavior and a broken route**

---

# Bottom line

This feature area is promising, but right now it is **half modern trust platform, half older boolean verification system, and half stubbed ops tooling**.

The most important structural fix is to make trust and verification **one coherent domain** with:

- one canonical verification truth,
- one real identity verification workflow,
- one badge/audit/trust-score pipeline,
- and operationally real safety and claims handling.
