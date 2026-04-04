Implementation update on 2026-04-04:

- Completed the auth/account lifecycle remediation in code.
- Standardized verification routing and added a compatibility `/auth/verify` token handler.
- Replaced the deprecated Google auth dead-end with a compatibility wrapper route.
- Centralized credentials + 2FA verification logic in shared auth lifecycle helpers.
- Enforced banned-user blocking, pending-deletion restrictions, and JWT session invalidation for password changes and bans.
- Fixed wrong auth/settings/signup links in email and UI flows.
- Unified server-side password policy across signup, reset, and change-password flows.
- Aligned signup and Google provisioning to persist `roles` consistently.
- Clarified JWT-based session behavior in settings instead of inventing fake DB sessions.
- Fixed JWT refresh semantics so failed DB refreshes do not falsely stamp successful sync time.
- Preserved auth query state across login/signup/verify flows, including mobile footer links.
- Restored Google auth intent propagation and carried signup referral/provider intent into OAuth signup context.
- Made shared header account navigation role-aware for client vs provider users.
- Replaced broken auth `/support` destinations with public contact paths.
- Made resend-verification responses generic and wrapped email verification in a transaction.

I audited the uploaded codebase for **Feature 2: Authentication & Account Lifecycle** and there are multiple broken flows, spec mismatches, and consistency problems.

## Overall verdict

This feature is **partially implemented**, but it is **not fully coherent end to end**. The main issues are:

- route/spec mismatches
- duplicated auth logic across UI, server actions, API routes, and NextAuth
- session strategy inconsistency
- weak lifecycle enforcement for banned / scheduled-for-deletion users
- several broken links and wrong destinations
- some settings/account flows wired to the wrong workspace

---

# Critical issues

## 1) `/auth/verify` does not implement direct token verification

**Spec:** `2.2.4 Verify page (/auth/verify) for direct token handling`

**Actual code:** `src/app/auth/verify/page.tsx` is an **identity verification upload UI**, not email token verification.

Files:

- `src/app/auth/verify/page.tsx`
- `src/lib/api/endpoints.ts:13`

### Why this is broken

You have a spec-level auth route that is expected to handle verification tokens, but the actual page is unrelated. Anything using `/auth/verify` from shared endpoint constants is pointing at the wrong feature entirely.

### Fix

Choose one of these and standardize:

- either make `/auth/verify` a thin token-handler page that delegates to `/api/auth/verify-email`
- or remove `/auth/verify` from auth endpoint constants and use `/auth/verify-email` everywhere

Also rename the current identity verification page to something like:

- `/dashboard/verification`
- `/auth/identity-verification` only if it truly belongs to auth

---

## 2) Google sign-in route exists in spec but is deprecated in code

**Spec:** `2.1.2 Google OAuth sign-in via /api/auth/google-signin`

**Actual code:** route returns `410 Gone`.

File:

- `src/app/api/auth/google-signin/route.ts:1-12`

### Why this is broken

The feature spec says this endpoint is part of the flow. In reality, the UI uses `signIn("google")` from NextAuth and bypasses this route.

### Fix

Pick one contract:

- **preferred:** remove `/api/auth/google-signin` from feature docs and code references, and document that Google auth is handled by NextAuth directly
- or reintroduce the endpoint as a real wrapper if you want a stable internal contract

Right now it is a dead spec path.

---

## 3) Session management spec says Prisma `Session`/`Account`, but auth uses JWT strategy

Files:

- `src/auth.ts:101-104`
- `prisma/schema.prisma:170-196`
- `src/app/api/settings/route.ts:29-70`

### Why this is broken

Your spec says session management is via Prisma `Session` and `Account` models, but the actual auth config is:

```ts
session: {
  strategy: "jwt";
}
```

That means:

- `Account` may still be used for OAuth identity linkage
- `Session` rows are **not the source of truth**
- settings UI tries to read DB sessions, then falls back to `"current-jwt-session"`

This creates an inconsistent product contract and a half-real “active sessions” feature.

### Fix

Choose one architecture:

### Option A — keep JWT

Then:

- update docs/spec to say session management is JWT-based
- remove or downgrade DB-backed active sessions UI
- stop implying multi-device session inventory if you cannot revoke/manage it centrally

### Option B — use database sessions

Then:

- switch NextAuth/Auth.js session strategy to `"database"`
- make `Session` truly authoritative
- add revoke-session support

Right now the feature is in a mixed state.

---

## 4) Banned users are not blocked at sign-in

Files:

- `prisma/schema.prisma:41`
- `src/app/api/auth/verify-credentials/route.ts`
- `src/app/actions/auth.ts`
- `src/auth.ts`

### Why this is broken

You store `isBanned` on `User`, and admin UI can toggle it, but auth verification never checks it before allowing login.

That means a banned user can still authenticate unless some later page blocks them.

### Fix

Enforce in all auth entry points:

- `src/app/api/auth/verify-credentials/route.ts`
- `src/app/actions/auth.ts` for the pre-check
- `src/auth.ts` `signIn` callback for Google accounts too
- `src/proxy.ts` as defense in depth for already-issued sessions

Expected behavior:

- credentials login → reject banned users
- Google login → reject banned users
- existing session → force sign-out / redirect to auth error or suspended page

---

## 5) Users scheduled for deletion are not lifecycle-gated

Files:

- `src/app/api/account/request-deletion/route.ts`
- `src/app/api/account/cancel-deletion/route.ts`
- `src/app/api/account/cleanup-deletions/route.ts`
- `src/app/api/auth/verify-credentials/route.ts`
- `src/auth.ts`
- `src/proxy.ts`

### Why this is broken

Once `deletionScheduledAt` is set:

- the user remains fully active
- there is no auth/session restriction
- there is no special UI state outside settings
- they are not auto-signed-out
- cleanup hard-deletes later

This is a weak account lifecycle implementation.

### Fix

Add central lifecycle enforcement:

- in auth/session refresh, include `deletionScheduledAt`
- in `proxy.ts`, if deletion is scheduled:
  - allow settings/account restore
  - optionally allow read-only access
  - block destructive/new actions

- after scheduling deletion, sign user out or show a global “pending deletion” mode
- after cancellation, restore normal access

At minimum, the lifecycle should be explicit and consistent.

---

# Major broken flows

## 6) 2FA is split across two different auth paths

Files:

- `src/app/actions/auth.ts`
- `src/app/api/auth/verify-credentials/route.ts`
- `src/auth.ts`
- `prisma/schema.prisma:206-220`

### Current flow

- page calls `loginWithCredentials()` server action first
- that action checks password and sends 2FA token
- then page calls `signIn("credentials")`
- NextAuth internally calls `/api/auth/verify-credentials`
- that route re-checks password and validates 2FA code

### Why this is problematic

This is duplicated verification logic across:

- server action
- API route
- NextAuth authorize
- login page UI

Also:

- `TwoFactorConfirmation` model exists but is not used
- comments in `verify-credentials` explicitly admit the flow is awkward
- the 2FA contract depends on UI behavior rather than a single server-side state machine

### Fix

Unify the flow.

Best approach:

1. keep **one** source of truth for credential + 2FA verification
2. either:
   - move the whole credentials+2FA logic into NextAuth authorize
   - or create a proper two-step challenge flow with a persisted challenge record

Recommended shape:

- step 1: submit email/password
- server creates short-lived auth challenge if password valid and 2FA enabled
- step 2: submit challengeId + code
- finalize sign-in
- use `TwoFactorConfirmation` or replace it with a better-named challenge model

Do not keep password validation duplicated in both `loginWithCredentials` and `/api/auth/verify-credentials`.

---

## 7) 2FA toggle revalidates provider settings even for client settings

File:

- `src/app/actions/twoFactor.ts:22`

### Why this is broken

`toggleTwoFactor()` always does:

```ts
revalidatePath("/dashboard/settings");
```

But both:

- provider settings page
- client settings page

use this action.

So client settings can toggle 2FA but the revalidation target is provider-only.

### Fix

Either:

- revalidate both:
  - `/dashboard/settings`
  - `/client/settings`

- or stop depending on path revalidation and invalidate via client query state only

---

## 8) Account deletion emails link to the wrong settings workspace

File:

- `src/lib/email.ts:101-132`

### Why this is broken

Deletion email tells user to restore account via:

- `/dashboard/settings`

That is wrong for client users, whose settings page is:

- `/client/settings`

### Fix

Build role-aware settings URL:

- client → `/client/settings`
- provider → `/dashboard/settings`
- admin probably should not use self-service deletion at all

Use the user’s role when composing the email.

---

## 9) Deleted-account confirmation email links to nonexistent `/signup`

File:

- `src/lib/email.ts:192, 220`

### Why this is broken

The app signup route is:

- `/auth/signup`

But the email points to:

- `/signup`

### Fix

Replace with `/auth/signup`.

---

## 10) Client onboarding page links to nonexistent `/client/signup`

File:

- `src/app/client/onboarding/page.tsx:398-403`

### Why this is broken

The route used is:

- `/client/signup`

The real route is:

- `/auth/signup`

### Fix

Replace with `/auth/signup` and preserve any callback/intended destination if needed.

---

## 11) Password reset email fallback domain is inconsistent with the rest of the app

File:

- `src/app/api/auth/forgot-password/route.ts:94`

### Why this is broken

Fallback URL:

- `https://justintimeservices.vercel.app`

Most other auth URLs use:

- `https://justintime.gtss.software`

That creates broken or confusing reset flows depending on environment configuration.

### Fix

Centralize base URL resolution in one helper and use it everywhere:

- signup verification
- resend verification
- reset password
- account deletion emails
- admin reset emails
- site metadata

Never hardcode multiple production domains.

---

## 12) Signup does not populate `roles` even though auth/session logic expects it

Files:

- `prisma/schema.prisma:35-36`
- `src/app/api/auth/signup/route.ts:118-136`
- `src/auth.ts`
- `src/lib/auth/roles.ts`

### Why this is broken

`User` has both:

- `role`
- `roles`

But signup only writes `role`, not `roles`.

You later patch around this by generating default roles dynamically in session payloads, but the DB itself remains inconsistent.

### Fix

On user creation, write both:

- `role`
- `roles: getDefaultRolesForPrimaryRole(role)`

Do the same in Google sign-in user creation and any admin-created users.

---

# Auth/UI inconsistencies

## 13) Login page only preserves `callbackUrl`, but signup preserves more intent context

Files:

- `src/app/auth/login/page.tsx:30`
- `src/app/auth/signup/page.tsx:33-45`

### Why this is broken

Signup preserves:

- `ref`
- `callbackUrl`
- `returnTo`
- `intent`

Login only reads:

- `callbackUrl`

So auth context can be dropped depending on which screen the user switches to.

### Fix

Make login and signup symmetric:

- read and preserve `ref`, `callbackUrl`, `returnTo`, `intent`
- use one helper for auth query propagation

---

## 14) Login page has no UI handling for `reset=success`

The reset page redirects to:

- `/auth/login?reset=success`

But login page only reads:

- `verified`

Files:

- `src/app/auth/reset-password/page.tsx`
- `src/app/auth/login/page.tsx:30-38`

### Why this is broken

A successful reset redirect happens, but the target page ignores the signal.

### Fix

Add login-page effect for:

- `reset=success` → success toast/banner

---

## 15) Verify-request page can show any arbitrary email from querystring

File:

- `src/app/auth/verify-request/page.tsx`

### Why this is weak

It is mostly cosmetic, but the page trusts `?email=` blindly and presents it as “we sent a verification link to …”

This can mislead users if linked incorrectly.

### Fix

Safer options:

- generic copy without echoing email unless it came from a just-completed signup action
- or store pending verification email in safe client state/session storage after signup

---

## 16) Password policy is inconsistent across signup, reset, and change-password

Files:

- `src/app/auth/signup/page.tsx`
- `src/app/auth/reset-password/page.tsx`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/settings/change-password/route.ts`

### Current inconsistency

- signup UI uses a strength score
- reset UI uses a strength score
- reset API only enforces min length 8
- change-password API enforces upper/lower/number
- signup API relies on schema min length only

### Why this is broken

A password accepted in reset may be rejected in settings, or vice versa.

### Fix

Create one shared password policy helper/schema and use it in:

- signup API
- reset API
- change-password API
- optional client-side strength UI

UI hints can vary; server validation must not.

---

## 17) Password change route imports `bcryptjs` directly while auth uses shared password helpers

Files:

- `src/app/api/settings/change-password/route.ts`
- `src/lib/auth/password`

### Why this is inconsistent

The app already has password helpers, but this route bypasses them and uses `bcrypt` directly. That increases drift risk if hashing parameters change later.

### Fix

Use shared helpers everywhere:

- `comparePassword`
- `hashPassword`

---

# Proxy / route protection issues

## 18) `proxy.ts` is correctly used for Next.js 16+, but auth guards are incomplete

File:

- `src/proxy.ts`

### Good

You are already on `proxy.ts`, not `middleware.ts`.

### Still broken

The guard layer does not enforce:

- banned users
- scheduled deletion state
- any suspended lifecycle state

It only does:

- logged-in checks
- onboarding checks
- role/workspace routing
- email verification gating

### Fix

Extend `req.auth.user` payload and proxy checks to include:

- `isBanned`
- `deletionScheduledAt`

Then route accordingly.

---

## 19) Email verification gate uses `hasCompletedOnboarding` as a substitute for verification

File:

- `src/proxy.ts:406-413`

### Why this is risky

```ts
const isEffectivelyVerified =
  isGoogleUser || Boolean(emailVerified) || Boolean(hasCompletedOnboarding);
```

That means onboarding completion can bypass actual email verification state.

### Fix

Do not use onboarding as a proxy for email verification.
Use:

- Google user → verified
- otherwise require `emailVerified`

If you need a temporary migration bridge, isolate it behind an explicit migration flag.

---

# Account settings issues

## 20) `/api/client/settings` is just a proxy to `/api/settings`, but account deletion and password change are not scope-aware

Files:

- `src/app/api/client/settings/route.ts`
- `src/app/client/settings/page.tsx`
- `src/app/dashboard/settings/page.tsx`

### Why this is inconsistent

Settings data is scoped through a client proxy route, but:

- password change always goes to `/api/settings/change-password`
- deletion always goes to `/api/account/*`

That is not inherently wrong, but it means the “client settings scope” is only partially modeled.

### Fix

Either:

- make settings truly global and remove fake scope indirection
- or create full client/provider-specific settings contracts consistently

Right now it is half-scoped.

---

## 21) Active sessions feature is partially fake under JWT strategy

File:

- `src/app/api/settings/route.ts:29-70`

### Why this is broken

The UI implies session listing, but under JWT strategy it falls back to a synthetic session:

- `"current-jwt-session"`

No revoke, no device metadata, no trustworthy multi-session inventory.

### Fix

Either:

- remove the active sessions section from UI
- or switch to DB sessions and implement proper session management

---

# Missing robustness / enforcement

## 22) Cleanup endpoint has no rate limit and no idempotency guard

File:

- `src/app/api/account/cleanup-deletions/route.ts`

### Why this matters

Even though it requires admin or cron secret, it still should be hardened:

- repeated calls are possible
- no batching/locking
- no explicit idempotent marker besides deletion itself

### Fix

Add:

- route-level rate limiting
- batch size cap
- structured deletion job logging
- optional transactional/batched cleanup

---

## 23) Request deletion and cancel deletion do not validate transition state

Files:

- `src/app/api/account/request-deletion/route.ts`
- `src/app/api/account/cancel-deletion/route.ts`

### Why this is weak

They do not check:

- already scheduled deletion
- cancel when nothing is scheduled
- repeated schedule overriding existing timestamp
- whether user type is eligible

### Fix

Add state checks:

- request deletion → reject or no-op if already scheduled
- cancel deletion → reject/no-op if not scheduled
- include current state in response

---

## 24) Account deletion request does not terminate current session

File:

- `src/app/api/account/request-deletion/route.ts`

### Why this is a lifecycle gap

You schedule deletion but leave the user fully logged in with ordinary access.

### Fix

After scheduling:

- either sign them out immediately and direct them to restore flow
- or place account in pending-deletion mode with restricted capabilities

---

# Spec mismatches

## 25) `2.1.5 Session management via Session and Account Prisma models, handled by NextAuth`

Not true as implemented.

Reality:

- `Account` may be used by provider linkage
- `Session` is not authoritative because strategy is JWT

## 26) `2.1.2 Google OAuth sign-in via /api/auth/google-signin`

Not true as implemented.

Reality:

- route is deprecated
- Google sign-in goes through NextAuth client call

## 27) `2.2.4 Verify page (/auth/verify) for direct token handling`

Not true as implemented.

Reality:

- `/auth/verify` is an identity-verification upload screen
- email token verification is handled by `/auth/verify-email`

---

# Recommended fix plan

## 1. Standardize route contract first

Make these canonical:

- login: `/auth/login`
- signup: `/auth/signup`
- verify request: `/auth/verify-request`
- verify email token: `/auth/verify-email`
- forgot password: `/auth/forgot-password`
- reset password: `/auth/reset-password`

Then:

- remove `/auth/verify` from auth endpoint constants unless you repurpose it correctly
- remove or replace `/api/auth/google-signin`

## 2. Unify credential auth into one server authority

Do not split between:

- server action pre-check
- API verify route
- NextAuth authorize

Use one formal flow for:

- email/password
- 2FA challenge
- final sign-in

## 3. Enforce account lifecycle centrally

At auth/proxy level enforce:

- `isBanned`
- `deletionScheduledAt`
- `emailVerified`

## 4. Fix broken links and URLs

Replace:

- `/client/signup` → `/auth/signup`
- `/signup` → `/auth/signup`
- role-blind `/dashboard/settings` in deletion emails → role-aware settings URL
- all hardcoded domain fallbacks → one shared base-url helper

## 5. Normalize password policy

Use one shared password validator in:

- signup API
- reset API
- change-password API

## 6. Make DB state consistent

On all user creation/update paths, write both:

- `role`
- `roles`

## 7. Decide session architecture

Either:

- keep JWT and simplify/remove active session management UI
- or move to DB sessions and implement it properly

---

# Highest-priority fixes to do immediately

1. Fix `/auth/verify` mismatch.
2. Block banned users in all auth flows.
3. Enforce pending-deletion lifecycle in auth/proxy.
4. Remove deprecated `/api/auth/google-signin` from the contract.
5. Fix broken links: `/client/signup`, `/signup`, wrong settings restore URL.
6. Unify password rules.
7. Consolidate 2FA flow.

Yes — the deeper pass surfaced more issues beyond the first audit.

## Additional issues I found

### 1) Active JWT sessions survive password reset and password change

Files:

- `src/auth.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/settings/change-password/route.ts`

You are using `session.strategy = "jwt"`, but after:

- password reset
- password change
- ban/unban
- deletion scheduling

there is **no session invalidation mechanism**. Existing JWT sessions stay valid until expiry.

### Why this is broken

A user can change their password because of compromise, but an attacker with an already-issued session can remain logged in.

### Fix

Add a token version / session invalidation field on `User`, such as:

- `sessionVersion`
- or `authInvalidatedAt`

Then:

- embed it into JWT on login
- compare it on session refresh / proxy
- increment/update it on password reset, password change, ban, deletion scheduling, critical email change

---

### 2) Ban/unban has no immediate auth enforcement

Files:

- `src/app/actions/admin.ts`
- `src/auth.ts`
- `src/proxy.ts`

Admin can ban a user, but:

- sign-in is not blocked centrally
- existing sessions are not revoked
- route protection does not check `isBanned`

This means the admin action is mostly a database flag, not a real auth lifecycle control.

### Fix

On ban:

- reject all future sign-ins
- invalidate all active JWTs
- redirect already-signed-in users to a suspended page from `proxy.ts`

---

### 3) Signup UI and signup API are drifting

Files:

- `src/app/auth/signup/page.tsx`
- `src/app/api/auth/signup/route.ts`

The API accepts more than the page sends:

- `role`
- `phone`

The page only sends:

- `name`
- `email`
- `password`
- `referralCode`

### Why this matters

You have an auth contract that suggests richer registration capability, but the actual UI always creates the default account path.

### Fix

Either:

- simplify the API contract to exactly what the UI supports
- or update signup UI to intentionally support role-driven signup and validated phone capture

---

### 4) Provider acquisition flow is weakly connected to account creation

Files:

- `src/app/join/page.tsx`
- `src/app/auth/signup/page.tsx`
- `src/auth.ts`

`/join` sends people to signup with `callbackUrl=/provider/onboarding`, but signup still creates users with default role behavior, and Google-created users are explicitly created as:

- `role: "CLIENT"`

### Why this is broken

A user entering from the “join as pro” funnel is not strongly persisted as provider-intent during account creation.

### Fix

Persist provider intent at signup:

- query param like `intent=provider`
- or `initialRole=PROVIDER`
- or store pending onboarding mode before redirecting to OAuth

Then on account creation:

- create proper `role` / `roles`
- or at least preserve a `pendingWorkspaceIntent`

---

### 5) Google auth drops important context on the login page

Files:

- `src/app/auth/login/page.tsx`
- `src/app/auth/signup/page.tsx`

Signup preserves:

- `ref`
- `callbackUrl`
- `returnTo`
- `intent`

Login only preserves:

- `callbackUrl`

Google login from the login page uses:

- `callbackUrl || "/onboarding"`

So `returnTo`, `intent`, and referral context are dropped.

### Fix

Make login and signup use the same auth-intent propagation helper.

---

### 6) Referral flow is not consistently applied for OAuth account creation

Files:

- `src/app/auth/signup/page.tsx`
- `src/app/api/auth/signup/route.ts`
- `src/auth.ts`

Referral relationships are created in the email/password signup API, but the Google sign-in path creates users directly in `src/auth.ts` and does **not** create the equivalent referral linkage.

### Why this is broken

A referred user who signs up with Google can lose referral attribution.

### Fix

Persist referral intent before OAuth redirect, then consume it during Google account creation.

---

### 7) `roles` is still inconsistently written on Google user creation

File:

- `src/auth.ts`

When Google creates a new user, it writes:

- `role: "CLIENT"`

but not the `roles` array.

You patch around this at session time, but DB state remains inconsistent.

### Fix

Write both:

- `role`
- `roles`

in every user-creation path.

---

### 8) `TwoFactorConfirmation` exists in schema but is effectively unused

Files:

- `prisma/schema.prisma`
- `src/app/api/auth/verify-credentials/route.ts`

The code comments even say confirmation creation is optional / skipped.

### Why this is a problem

This is dead or half-dead lifecycle state. It makes the schema look more mature than the implementation.

### Fix

Either:

- use `TwoFactorConfirmation` as the real second-step confirmation/challenge state
- or remove it and keep a simpler token-only flow

---

### 9) Password change email contains stale product copy

File:

- `src/lib/email.ts`

The password-change email says:

- “Enable Two-Factor Authentication for extra security (coming soon)”

But 2FA already exists.

### Fix

Update the email copy to reflect the real feature state.

---

### 10) Password change email links to the wrong route

File:

- `src/lib/email.ts`

It links users to:

- `/settings?tab=security`

But your settings pages are:

- `/dashboard/settings`
- `/client/settings`

### Fix

Use role-aware settings URLs, same as the account deletion email fix.

---

### 11) Auth pages link to a nonexistent `/support` route

Files:

- `src/app/auth/verify-request/page.tsx`
- `src/app/auth/verify-email/page.tsx`
- `src/app/auth/forgot-password/page.tsx`
- `src/app/auth/reset-password/page.tsx`

These pages link to `/support`, but the app does not have a public `src/app/support/page.tsx`.

### Why this is broken

Users in failed auth or recovery states are sent to a dead destination.

### Fix

Point these to:

- `/contact`
- or create a real public `/support` page

---

### 12) Stale auth endpoint constants advertise routes that do not exist

File:

- `src/lib/api/endpoints.ts`

These constants are declared:

- `/auth/logout`
- `/auth/refresh`
- `/auth/verify`

But they are not real auth contracts in the app.

### Fix

Remove or correct them. This is exactly the kind of stale contract that causes future UI/data-flow breakage.

---

### 13) `/auth/verify-request` leaks account state once email is known

Files:

- `src/app/auth/verify-request/page.tsx`
- `src/app/api/auth/resend-verification/route.ts`

The resend route:

- hides “user not found”
- but returns explicit `"Email is already verified"` for known verified accounts

### Why this is inconsistent

It partially defeats the non-enumeration posture.

### Fix

Return the same generic success message for:

- non-existent email
- already verified email
- resend success

If you want better UX, do it only for authenticated users.

---

### 14) Email verification is not transactional

File:

- `src/app/api/auth/verify-email/route.ts`

The flow does:

1. find token
2. update user
3. delete token

If step 3 fails, the user becomes verified but the token may remain.

### Fix

Wrap verification in a transaction:

- verify token
- update user
- delete token

This also makes replay/idempotency cleaner.

---

### 15) Signup verification URL construction is inconsistent and brittle

Files:

- `src/app/api/auth/signup/route.ts`
- `src/app/api/auth/resend-verification/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/auth.ts`

`src/auth.ts` fails loudly if `NEXTAUTH_URL` is missing, but other routes:

- hardcode fallbacks
- or assume the variable exists
- and use different fallback domains

### Fix

Create one shared base-url helper and use it everywhere.

---

### 16) Header/account navigation is inconsistent for client users

File:

- `src/components/Header.tsx`

The authenticated account menu points to:

- `/dashboard/profile`
- `/dashboard/settings`

even when the signed-in user is a client.

### Why this matters for this feature

This directly affects account lifecycle navigation. A client can land in the wrong workspace when trying to manage their account.

### Fix

Make header menu role-aware:

- provider → `/dashboard/...`
- client → `/client/...`

---

### 17) The “active sessions” concept is doubly misleading after password changes

Files:

- `src/app/api/settings/route.ts`
- `src/auth.ts`

Because you use JWT strategy:

- active sessions are not truly inventoried
- sessions are not revoked on password changes
- the UI still implies stronger session control than exists

### Fix

Either:

- implement true session invalidation/versioning
- or simplify the UI so it does not imply central session governance

---

### 18) Provider / client settings are only partially separated

Files:

- `src/app/client/settings/page.tsx`
- `src/app/dashboard/settings/page.tsx`
- `src/app/actions/twoFactor.ts`
- `src/lib/email.ts`

This shows up in multiple places:

- 2FA action revalidates only provider settings
- password/security emails link to wrong settings route
- shared settings actions are not consistently role-aware

### Fix

Create a single helper for “current user settings URL” and use it in:

- emails
- redirects
- header menus
- revalidation
- settings CTAs

---

## Bigger structural conclusion after the deeper pass

The auth/account lifecycle feature has a recurring pattern:

- **the UI exists**
- **the DB fields exist**
- **the route exists**
- but the **lifecycle enforcement is not centralized**

That is why the same issues keep repeating around:

- bans
- deletion scheduling
- password changes
- 2FA
- provider vs client settings
- JWT vs DB-session assumptions

## Best next fixes after this deeper pass

Do these next, in this order:

1. Add **central auth-state enforcement** for `isBanned`, `deletionScheduledAt`, and password/session invalidation.
2. Add **JWT invalidation/versioning**.
3. Normalize **all account URLs** by role.
4. Remove stale route contracts from `src/lib/api/endpoints.ts`.
5. Unify auth-intent propagation across login/signup/Google flows.
6. Fix OAuth account creation so it preserves:
   - referral
   - provider intent
   - `roles`

Based on an architectural review of the provided code for the **Authentication & Account Lifecycle** feature, there are several broken flows, edge-case bugs, and inconsistencies between the documentation, UI state, and `proxy.ts` (middleware) routing logic.

Here is the breakdown of the identified issues and their recommended fixes:

### 1. Endpoint & Feature Documentation Mismatch

- **Issue:** Feature document lists `2.1.2 Google OAuth sign-in via /api/auth/google-signin`. However, looking at `src/app/api/auth/google-signin/route.ts`, this route is hardcoded to return a `410 Gone` error stating the endpoint is deprecated. Google Auth is now handled natively by NextAuth callbacks in `auth.ts`.
- **Fix:** Update the architecture feature spec to reflect that Google authentication relies strictly on NextAuth's native providers, and delete the deprecated `/api/auth/google-signin` route completely to avoid dead-code confusion.

### 2. Broken UI State in Login Flow (Unreachable "Resend Verification" Button)

- **Issue:** In `login/page.tsx`, there is logic meant to display a "Resend verification email" action if an unverified user tries to log in. It relies on checking if the error string includes _"verify your email"_:
  ```typescript
  const showVerifyAction =
    !showTwoFactor && error.toLowerCase().includes("verify your email");
  ```
  However, later in the `handleSubmit` execution, when NextAuth `signIn` fails, the error is strictly mapped:
  ```typescript
  const message =
    signInResult.error === "CredentialsSignin"
      ? "Invalid email or password"
      : "Unable to sign in right now...";
  ```
  Because the error is forcefully overwritten to generic text, `showVerifyAction` will **never** evaluate to true. Users whose accounts are unverified will just see "Invalid email or password" and won't be able to trigger the resend email function.
- **Fix:** Adjust the NextAuth backend (`authorize` in `auth.ts` or `/api/auth/verify-credentials`) to throw a specific error for unverified emails (e.g., `UnverifiedEmailError`). Then, in `login/page.tsx`, check for that specific string before overriding the error message.

### 3. Routing Inconsistencies & Redirect Loops

- **Issue A: Admin Redirect Loop in `login/page.tsx`**
  After a successful login, `login/page.tsx` evaluates where to push the user:

  ```typescript
  if (!onboarded) {
    router.push("/onboarding");
  } else if (role === "ADMIN") {
    router.push("/admin");
  }
  ```

  If an Admin account was created manually and has `onboardingCompleted: false`, the frontend pushes them to `/onboarding`. However, `proxy.ts` explicitly protects admins from the onboarding app:

  ```typescript
  if (
    isLoggedIn &&
    userRole === "ADMIN" &&
    (isOnAnyDashboard || isOnOnboarding)
  ) {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }
  ```

  This creates a fragmented flow and potential race conditions.
  **Fix:** Check for the Admin role _before_ the onboarding check in `login/page.tsx`:

  ```typescript
  if (role === "ADMIN") {
    router.push("/admin");
  } else if (!onboarded) {
    router.push("/onboarding");
  }
  ```

- **Issue B: Lost `callbackUrl` during Email/Password Signup**
  In `signup/page.tsx`, if a user signs up using Google, the `callbackUrl` (and `referralCode`) are cleanly passed to the `signIn("google", ...)` action. However, if they submit the credentials form, upon success the router executes:
  ```typescript
  router.push(`/auth/verify-request?email=${encodeURIComponent(data.email)}`);
  ```
  The `callbackUrl` and `returnTo` parameters are completely dropped. Once the user verifies their email, the app won't know where to return them.
  **Fix:** Append the `callbackUrl` to the `verify-request` redirect:
  ```typescript
  router.push(
    `/auth/verify-request?email=${encodeURIComponent(data.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
  );
  ```

### 4. Double Rate-Limiting Penalty

- **Issue:** There is overlapping rate-limit architecture. `proxy.ts` globally restricts `/api/auth` routes (which includes `api/auth/callback/credentials` and `api/auth/session`):
  ```typescript
  else if (pathname.startsWith("/api/auth")) {
    checks.push({ key: `api:auth:ip:${ip}`, limit: proxyLimits.authGenericLimit... });
  }
  ```
  However, `src/app/api/auth/[...nextauth]/route.ts` _also_ implements a secondary, strict rate-limiter using `enforceRateLimits()`.
  This means every NextAuth request burns limits in two separate memory stores. If limits fall out of sync, legitimate users might get sporadic `429 Too Many Requests` errors without clear visibility into which layer blocked them.
- **Fix:** In `proxy.ts`, exclude NextAuth's managed routes from the generic `/api/auth` proxy rate limit catch-all, delegating rate-limiting responsibility for those specific paths to `[...nextauth]/route.ts`.

### 5. `webAuthnCredentialId` Schema Error Handle

- **Issue:** In `signup/route.ts`, there is an error catch block looking for `isPrismaMissingColumnError(error, "webAuthnCredentialId")`. This indicates the application has code preparing for WebAuthn/Passkeys, but it is not listed in your architecture feature list (2.1 Authentication Methods).
- **Fix:** If WebAuthn (Passkeys) is planned for the near future, ensure it's added to section `2.1` of the architectural data flow. If it is legacy/abandoned, remove the Prisma error handler from the `signup` route to avoid masking genuine database availability issues with a "Service Unavailable" response.

Here is an additional, deeper analysis of the provided code. Beyond the surface-level routing and UI issues, there are several subtle architectural bugs, security enforcement gaps, and state-loss issues in the **Authentication & Account Lifecycle** flow:

### 6. Client-Side vs. Server-Side Validation Gap (Weak Passwords)

- **Issue:** In `signup/page.tsx`, the application includes a robust password strength calculator (`calculatePasswordStrength`) and explicitly blocks users from submitting if the score is less than 3 (`strength.score < 3`). However, looking at the API route (`/api/auth/signup/route.ts`), the backend only checks for `rawPassword.length > 128` and relies on `signupSchema` (which standardly only enforces minimum length, usually 8 characters).
  If a malicious user bypasses the frontend (e.g., using Postman or cURL) or if `signupSchema` doesn't mirror the exact complexity rules, they can successfully create an account with a weak password like `"password123"`.
- **Fix:** Move the password complexity logic to the backend (e.g., using a library like `zxcvbn` or enforcing regex in `signupSchema`) to ensure the server strictly rejects weak passwords, regardless of how the payload is submitted.

### 7. Dropped Parameters on Mobile Views

- **Issue:** The application goes to great lengths to preserve query parameters (`callbackUrl`, `returnTo`, `intent`, `ref`) so users are correctly routed after authentication. In `signup/page.tsx`, this is compiled into a `loginHref` variable. However, in the **Mobile Footer Links** section of `signup/page.tsx`, the code hardcodes the link:
  ```tsx
  <Link href="/auth/login" className="...">
    Already have an account? Sign in
  </Link>
  ```
  The same mistake exists in the `login/page.tsx` mobile footer (`<Link href="/auth/signup">`). Mobile users who toggle between Login and Signup will silently lose their redirect URLs and context parameters.
- **Fix:** Use the dynamically constructed `loginHref` (and build a similar `signupHref` in the login page) for the mobile footer links, exactly as is done for the desktop text links.

### 8. Dropped "Intent" on Google OAuth Signup

- **Issue:** In `signup/page.tsx`, the page extracts an `intent` parameter from the URL (e.g., `?intent=book_service`). However, when building the `googleCallbackUrl` for the NextAuth `signIn` function:
  ```typescript
  let googleCallbackUrl = callbackUrl || returnTo || "/onboarding";
  if (!callbackUrl && referralCode) {
    googleCallbackUrl = `/onboarding?ref=${encodeURIComponent(referralCode)}`;
  }
  ```
  The `intent` parameter is completely ignored. If a user tries to sign up via Google to fulfill a specific intent, the app will forget what they were trying to do once Google returns them to the site.
- **Fix:** Append the `intent` parameter to the `googleCallbackUrl` if it exists.

### 9. Silent Failure Masking in JWT Database Sync

- **Issue:** In `auth.ts`, the NextAuth `jwt` callback attempts to sync the session with the database every 60 seconds to catch role changes or bans.
  ```typescript
  if (shouldRefreshFromDb) {
    const latestDbUser = await fetchDbUserByEmail(token.email);
    if (latestDbUser) {
      // ... updates token claims
    }
    token.lastDbSyncAt = nowSeconds; // <--- The Bug
  }
  ```
  If the database is temporarily unreachable, `fetchDbUserByEmail` safely catches the error and returns `null`. However, because `token.lastDbSyncAt = nowSeconds;` is placed _outside_ the `if (latestDbUser)` check, the system will record a successful sync even when it failed. The application will serve potentially stale JWT claims and won't attempt to check the database again for another 60 seconds.
- **Fix:** Move `token.lastDbSyncAt = nowSeconds;` _inside_ the `if (latestDbUser)` block so that if the sync fails, the system will immediately retry on the user's next request.

### 10. Automatic Account Linking Security Risk

- **Issue:** In `auth.ts`, during the `signIn` callback for Google, the system looks for an existing user by email. If it finds one, it automatically updates that user's record:
  ```typescript
  if (existingUser) {
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { emailVerified: new Date(), ... } // Forces email verification
    });
  }
  ```
  If a user registered via Email/Password but never verified their email (meaning they do not actually own the email address), the real owner of that email address can sign in via Google. The system will automatically link the Google account to the unverified database record and force `emailVerified: new Date()`. While technically correct (Google verified the email), it merges the OAuth identity into a potentially hijacked/pre-created account without resetting existing properties (like `role`, `clientInterests`, etc.) set by the first unverified user.
- **Fix:** If merging accounts, ensure that if the original account was unverified, sensitive profile data/preferences are reset, or explicitly enforce NextAuth's `allowDangerousEmailAccountLinking: false` policy.

### 11. Stale Role Array during Feature Flag Toggles

- **Issue:** In `auth.ts`, the `roles` array is only updated in the JWT if a feature flag is active:
  ```typescript
  if (multiRoleFeatureFlags.writeEnabled) {
    token.roles = normalizeRoles({ role: dbUser.role, roles: dbUser.roles });
  }
  ```
  If an admin dynamically toggles `writeEnabled` to `false` (e.g., during an incident), the JWT callback stops syncing the `roles` array. If a user's primary `role` is then updated in the DB, `token.role` updates, but `token.roles` remains stuck in its historical state. `proxy.ts` checks both `role` and `roles` to grant access, leading to split-brain permissions where the JWT holds conflicting authorization states.
- **Fix:** You should always _read_ and map the roles into the token. The feature flag `writeEnabled` should only restrict writing roles to the _database_, not hydrating the JWT from the database.

## ALL THE ISSUES IN THIS DOC MUST BE ADDRESSED
