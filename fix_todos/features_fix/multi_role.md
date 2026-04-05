# JustInTime — Role System Fix Plan

> Multi-role (CLIENT / PROVIDER / ADMIN) — full audit, root causes, and implementation roadmap

---

## Executive Summary

The platform has the scaffolding for a proper dual-role CLIENT/PROVIDER system — the schema, API routes, and UI components exist — but three feature flags default to `false`, which quietly disables all of it at runtime. On top of that, the provider upgrade flow has UX friction (re-entering data already collected), the WorkspaceSwitcher is invisible to single-role users, the admin role has zero onboarding path, and the admin dashboard has inconsistent — and in some places completely missing — role guards. This document maps every broken piece and prescribes exact fixes in priority order.

---

## 1. Root Cause: Feature Flags Off By Default

**File:** `src/lib/auth/roles.ts`

```ts
export const multiRoleFeatureFlags = {
  readEnabled: readFlag(process.env.FF_MULTI_ROLE_READ_ENABLED, false), // ← off
  writeEnabled: readFlag(process.env.FF_MULTI_ROLE_WRITE_ENABLED, false), // ← off
  enforceEnabled: readFlag(process.env.FF_MULTI_ROLE_ENFORCE_ENABLED, false), // ← off
};
```

**What these flags gate:**

| Flag             | When false                                                                                                | Impact                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `readEnabled`    | `normalizeRoles()` ignores `roles[]` array, returns only legacy `role` field                              | A user with `roles: ["CLIENT","PROVIDER"]` is seen as CLIENT only   |
| `writeEnabled`   | Raw SQL write in `persistProviderRole()` is skipped; `POST /api/users/onboarding` skips writing `roles[]` | Role array never actually persists even when data is submitted      |
| `enforceEnabled` | `hasRole()` does an OR between legacy field and roles array (loose) vs strict array check                 | Minor but will cause inconsistency once real multi-role users exist |

**Fix — immediate (one-liner):**

Add to `.env` / Vercel environment:

```
FF_MULTI_ROLE_READ_ENABLED=true
FF_MULTI_ROLE_WRITE_ENABLED=true
FF_MULTI_ROLE_ENFORCE_ENABLED=true
```

This single change unblocks everything downstream. **All other fixes below assume these flags are on.**

---

## 2. Signup Does Not Default Both Roles for a New User

**File:** `src/app/api/auth/signup/route.ts`, line 128–129

```ts
role:  validatedData.role || "CLIENT",
roles: getDefaultRolesForPrimaryRole(validatedData.role || "CLIENT"),
```

**Behaviour today (flags off):**

- `getDefaultRolesForPrimaryRole("CLIENT")` returns `["CLIENT"]`
- `getDefaultRolesForPrimaryRole("PROVIDER")` returns `["CLIENT","PROVIDER"]` — correct, but never written because `writeEnabled = false`

**Behaviour with flags on:**

- A user signing up with `intent=provider` via `?intent=provider` on the signup URL correctly gets `role: PROVIDER, roles: ["CLIENT","PROVIDER"]`
- A user signing up normally gets `role: CLIENT, roles: ["CLIENT"]` — correct

**Remaining issue:** The signup form (`SignupClient.tsx`) only passes `role: intent === "provider" ? "PROVIDER" : undefined`. If intent is absent, no role is sent, so the API defaults to CLIENT. This is correct behaviour. No code change needed beyond enabling the flags.

**Verify this works:**

After enabling flags, sign up with `?intent=provider` and confirm the created user has `roles = ["CLIENT","PROVIDER"]` in the DB.

---

## 3. WorkspaceSwitcher Is Invisible to Single-Role Users

**File:** `src/components/WorkspaceSwitcher.tsx`, lines 22–24

```ts
const hasMultipleRoles = isProvider && isClient;
if (!hasMultipleRoles) return null; // ← single-role users see nothing
```

**Problem:** A CLIENT-only user has no in-app discovery path to become a provider. The WorkspaceSwitcher renders `null`. The ClientSidebar falls back to a `/become-a-provider` link, but this is buried in a sidebar section below the fold and has no visual prominence.

**Fix — `WorkspaceSwitcher.tsx`:**

Replace the early return with a conditional render:

```tsx
// If user doesn't have PROVIDER role yet, show "Become a Provider" CTA instead
if (!hasMultipleRoles) {
  if (isClient && !isProvider) {
    return (
      <Link
        href="/become-a-provider"
        className="group flex w-full items-center gap-3 px-3 py-3 rounded-xl
                   bg-emerald-50 text-emerald-700 hover:bg-emerald-100
                   transition-all duration-200 text-sm font-semibold"
      >
        <span className="material-symbols-outlined text-xl text-emerald-600 shrink-0">
          add_business
        </span>
        Become a Provider
      </Link>
    );
  }
  return null;
}
```

Update `ClientSidebar.tsx` to remove the now-redundant hardcoded `/become-a-provider` link below the WorkspaceSwitcher (it was there as the fallback — WorkspaceSwitcher now owns it).

---

## 4. Provider Setup Re-Collects Data the User Already Gave

**File:** `src/app/provider/setup/page.tsx`, line 46–47

```ts
const [providerData, setProviderData] = useState<ProviderOnboardingData>({
  ...DEFAULT_PROVIDER_ONBOARDING_DATA, // ← all blanks
});
```

`DEFAULT_PROVIDER_ONBOARDING_DATA` initialises `phone: ""`, `location: ""`, etc. The user already submitted their phone and location during client onboarding (stored in DB). The setup page never fetches them.

**Fix — hydrate from profile/session on mount:**

```ts
// In ProviderSetupPage, after auth guards resolve:
useEffect(() => {
  if (!session?.user?.id) return;

  apiClient.get("/users/me").then((res) => {
    const u = res.data;
    setProviderData((prev) => ({
      ...prev,
      phone: u.phone || prev.phone,
      location: u.location || prev.location,
      // businessName could default to user.name as a starting point
      businessName: u.name || prev.businessName,
    }));
  });
}, [session?.user?.id]);
```

**What this achieves:** Phone and location fields arrive pre-filled. User only needs to add business-specific info (category, skills, bio, rate). The DRY principle is respected — data already captured is not asked for again.

Additionally, the `StepProviderDetails` component should mark pre-filled fields with a subtle visual cue (e.g. a small "Pre-filled from your profile" caption) so users know they can edit but don't feel forced to retype.

---

## 5. The `become-a-provider` Page Has a Broken CTA Path for Unauthenticated Users

**File:** `src/app/become-a-provider/page.tsx`, `handleCTA()`

```ts
if (!isAuthenticated) {
  router.push("/auth/login?callbackUrl=/provider/setup");
  return;
}
```

**Problem:** Unauthenticated users land here, click the CTA, get pushed to login, complete login, then land on `/provider/setup` — which redirects them to `/onboarding` if `onboardingCompleted` is false. New users coming through this path hit a confusing onboarding flow that makes them pick a role again (defeating the intent they already expressed).

**Fix — two parts:**

**Part A:** Change the unauthenticated CTA to pass `intent=provider`:

```ts
router.push("/auth/signup?intent=provider&callbackUrl=/provider/setup");
```

This ensures new signups from this page land in the provider-intent onboarding flow that skips the role selection step (step 1) entirely.

**Part B:** In `/onboarding/page.tsx`, the existing logic for `onboardingIntent` already skips to step 2 when `intent=provider` is in the URL:

```ts
setCurrentStep(
  effectiveRole
    ? Math.max(draft?.currentStep || getStepForRole(effectiveRole), 2)
    : draft?.currentStep || 1,
);
```

This is correct. Confirm `getStepForRole("PROVIDER")` returns `2` — which it does in `draft.ts`. No change needed here.

---

## 6. `POST /api/users/onboarding` Skips Role Array Write

**File:** `src/app/api/users/onboarding/route.ts`, around line 174

```ts
async function persistRoles(...) {
  if (!multiRoleFeatureFlags.writeEnabled) return; // ← silently skipped
  ...
}
```

With `writeEnabled=true` (Fix 1 above), this function runs. But review the exact SQL to ensure it's correct:

```ts
await prisma.$executeRawUnsafe(
  `UPDATE "User"
   SET "roles" = (
     SELECT ARRAY(
       SELECT DISTINCT role_item
       FROM unnest(
         COALESCE("roles", ARRAY[]::\"UserRole\"[])
         || ARRAY[$1::\"UserRole\", $2::\"UserRole\"]::\"UserRole\"[]
       ) AS role_item
     )
   )
   WHERE id = $3`,
  "PROVIDER",
  "CLIENT",
  userId,
);
```

This is correct — it appends PROVIDER+CLIENT to whatever roles already exist, deduplicates, and writes back. This is idempotent and safe.

**One gap:** In `POST /api/users/onboarding` (the onboarding completion handler for CLIENT path), when `role === "CLIENT"`, does it write `roles: ["CLIENT"]`? Verify this path also runs `persistRoles` or sets `roles` via Prisma `update`. If it only writes the legacy `role` field, fix it to also write `roles`.

---

## 7. `POST /api/provider/activate` Has a Correct Implementation — Verify It's Reachable

**File:** `src/app/api/provider/activate/route.ts`

This route is well-implemented. It:

- Checks `onboardingCompleted` before allowing upgrade
- Merges roles correctly: `mergeRoles(user.roles, user.role, ["PROVIDER","CLIENT"])`
- Sets `providerSetupCompleted = true` and `preferredWorkspace = "PROVIDER"`
- Creates/upserts the Profile record

**Issues to verify:**

1. **Is this route called by `/provider/setup`?** Check `src/app/provider/setup/page.tsx` — it calls `apiClient.post(...)` somewhere in the submit handler. Confirm the endpoint is `/api/provider/activate` and not a different path. If the setup page is calling `/api/users/onboarding` with `role=PROVIDER` instead, there's a routing mismatch.

2. **Does the session get refreshed after activation?** The `update()` call from `useSession` must be triggered with the new roles after the activate response, otherwise the JWT remains stale and `WorkspaceSwitcher` still sees a CLIENT-only user. Confirm this line runs post-activation:

```ts
await update({
  user: {
    ...session?.user,
    roles: data.roles,
    preferredWorkspace: "PROVIDER",
    providerSetupCompleted: true,
  },
});
```

---

## 8. Middleware Uses Legacy Single-Role Check for Admin

**File:** `src/proxy.ts`

```ts
if (userRole !== "ADMIN") {
  return NextResponse.redirect(new URL("/admin/login", nextUrl));
}
```

`userRole` here reads from `token.role` (the legacy single-field). In a multi-role world where a user could have `role: "CLIENT"` but `roles: ["CLIENT","ADMIN"]`, this check would wrongly deny them.

**Fix — update token read in proxy to check both:**

In the middleware token decode section, update the admin check:

```ts
const userRole = token?.role as string | undefined;
const userRoles = Array.isArray(token?.roles) ? (token.roles as string[]) : [];
const isAdmin = userRole === "ADMIN" || userRoles.includes("ADMIN");

// Then replace all `userRole === "ADMIN"` / `userRole !== "ADMIN"` with `isAdmin`
```

Also update the JWT callback in `src/auth.ts` to include `roles` in the token:

```ts
// In callbacks.jwt:
token.roles = user.roles ?? [];
```

And in `callbacks.session`:

```ts
session.user.roles = token.roles as string[];
```

---

## 9. Admin Layout Has No Role Guard (Security Gap)

**File:** `src/app/admin/layout.tsx`

The layout renders `<AdminSidebar>` with zero auth checking. Individual pages guard themselves inconsistently:

| Page                        | Guard method                     | Issue                                             |
| --------------------------- | -------------------------------- | ------------------------------------------------- |
| `churn-analysis/page.tsx`   | `session.user.role !== "ADMIN"`  | Legacy only — breaks with multi-role              |
| `insurance/page.tsx`        | `hasRole(session.user, "ADMIN")` | Correct                                           |
| `marketing/promos/page.tsx` | `session.user.role !== "ADMIN"`  | Legacy only                                       |
| `dashboard/page.tsx`        | **No guard at all**              | Anyone who gets past middleware sees raw DB stats |

**Fix — add server-side guard to `admin/layout.tsx`:**

Convert the layout to a server component and add:

```ts
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || !hasRole(session.user, "ADMIN")) {
    redirect("/admin/login");
  }
  // ... rest of layout
}
```

Then **remove the per-page guards** — they become redundant and the codebase stays DRY. Keep one source of truth at the layout level.

---

## 10. Admin Role: No Application or Invite Flow

Currently the only way to become an ADMIN is manual DB mutation. There is no:

- Application page
- Invite link system
- Approval workflow in the admin panel
- Audit trail for role promotions

**Proposed flow (phased):**

### Phase 1 — Invite-Only (Ship This)

Admins can generate a one-time invite token from the admin panel and send it to a trusted person. The recipient visits `/auth/admin-invite?token=XYZ`, the system verifies the token, and upgrades their role.

**Schema addition:**

```prisma
model AdminInvite {
  id          String   @id @default(cuid())
  token       String   @unique
  email       String   // Pre-assigned to a specific email
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  usedAt      DateTime?
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}
```

**API routes needed:**

- `POST /api/admin/invites` — generate invite (admin only)
- `POST /api/admin/invites/redeem` — redeem token, set `role = ADMIN`, `roles[] += ADMIN`

**UI needed:**

- `src/app/admin/settings/page.tsx` — add "Invite Admin" section
- `src/app/auth/admin-invite/page.tsx` — redemption page (unauthenticated)

**Verification gate before redemption:**

- Email must match the invite's `email` field
- Token must not be expired or already used
- User must have completed standard onboarding (so they're a known entity with verified identity)

### Phase 2 — Application Flow (Future)

- `/apply-admin` page (authenticated users only)
- Application fields: reason, LinkedIn/portfolio, legal name confirmation
- Review queue in admin panel under `/admin/trust`
- Admin approval triggers role upgrade + audit log entry

---

## 11. Role Switching UX — Current State and What to Improve

**Current state:**

- `WorkspaceSwitcher` exists in both `Sidebar.tsx` (provider) and `ClientSidebar.tsx` (client)
- On switch: calls `PATCH /api/user/workspace`, updates session, navigates to target dashboard
- This is architecturally correct

**UX gaps:**

### Gap A — No visual indicator of current active mode

The user has no persistent header-level badge showing which mode they're in. If they navigate away from a dashboard, they lose context.

**Fix:** Add a mode pill to the top of both sidebars (not in the switcher button — above it):

```tsx
// At the top of the sidebar user section:
<div className="px-3 py-1.5 mb-2 rounded-lg bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
  {currentWorkspace === "PROVIDER" ? "Provider Mode" : "Client Mode"}
</div>
```

### Gap B — Switch is buried in the sidebar

On mobile, the sidebar is closed by default. There's no topbar indication of the mode or a quick-switch trigger.

**Fix:** Add a compact role chip to the mobile header (both client and provider layouts):

```tsx
// In mobile header bar:
<button
  onClick={handleSwitch}
  className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium"
>
  ⇄ Switch to {targetWorkspace === "PROVIDER" ? "Provider" : "Client"}
</button>
```

### Gap C — After switching, the page title/context updates but there's no transition confirmation

Add a brief toast after switch:

```ts
toast.success(
  `Switched to ${targetWorkspace === "PROVIDER" ? "Provider" : "Client"} mode`,
);
```

This already fires in some flows — confirm it's consistent across both variants of the switcher.

---

## 12. Onboarding Step 1 (Role Selection) Shows for Existing Users

**File:** `src/app/onboarding/page.tsx`

When an authenticated user who is already a CLIENT visits `/onboarding` to upgrade to provider (without `?intent=provider`), they land on Step 1 (role selection card). They should be immediately routed to Step 2 with provider intent, since they're already onboarded as a client.

**Fix — add guard in the hydration `useEffect`:**

```ts
// After hydrateDraft resolves:
if (session?.user?.onboardingCompleted && !effectiveRole) {
  // User already onboarded as client. Default to provider intent
  // since there's no reason a completed client would be here otherwise.
  setSelectedRole("PROVIDER");
  setCurrentStep(getStepForRole("PROVIDER")); // step 2
}
```

This prevents the "What brings you here?" screen from showing to users who already have a client account. The only valid reason they'd visit `/onboarding` post-completion is to add provider capabilities.

---

## 13. Middleware Does Not Redirect Dual-Role Users Correctly After Login

**File:** `src/proxy.ts`

Current redirect logic after login (paraphrased):

```ts
if (userRole === "ADMIN") → /admin/dashboard
else if (userRole === "PROVIDER") → /dashboard
else → /client/dashboard
```

This is a single-role check. With multi-role, a PROVIDER+CLIENT user whose `preferredWorkspace = "CLIENT"` would still be sent to `/dashboard` (provider) because `role = PROVIDER` on the legacy field.

**Fix — read `preferredWorkspace` from token for post-login redirect:**

```ts
const preferred = token?.preferredWorkspace as string | undefined;

if (isAdmin) return redirect("/admin/dashboard");
if (preferred === "PROVIDER" && hasProviderRole) return redirect("/dashboard");
if (preferred === "CLIENT" || !preferred) return redirect("/client/dashboard");
```

Add `preferredWorkspace` to the JWT token in `auth.ts` callbacks:

```ts
token.preferredWorkspace = user.preferredWorkspace ?? "CLIENT";
```

---

## 14. Inconsistent Role Field in Admin Dashboard Stats

**File:** `src/app/admin/dashboard/page.tsx`, lines ~20–21

```ts
prisma.user.count({ where: { role: "PROVIDER" } }),
prisma.user.count({ where: { role: "CLIENT"  } }),
```

With multi-role, a user's primary `role` field may be CLIENT but they also have PROVIDER in `roles[]`. These counts will undercount actual providers.

**Fix — count by roles array when multi-role is enabled:**

```ts
prisma.user.count({ where: { roles: { has: "PROVIDER" } } }),
prisma.user.count({ where: { roles: { has: "CLIENT"  } } }),
```

Or, for backward compat during migration, count the union:

```ts
prisma.user.count({
  where: { OR: [{ role: "PROVIDER" }, { roles: { has: "PROVIDER" } }] },
});
```

---

## Implementation Order

Execute in this sequence to avoid breaking the current working flows:

### Step 1 — Enable Feature Flags (zero code change)

Set the three `FF_MULTI_ROLE_*` env vars to `true` in all environments. Test signup, provider activate, and workspace switch in staging.

### Step 2 — Middleware & JWT Fixes (security + correctness)

- Add `roles` and `preferredWorkspace` to JWT token (`auth.ts` callbacks)
- Update `proxy.ts` admin check to use `roles` array
- Update post-login redirect to respect `preferredWorkspace`

### Step 3 — Admin Layout Guard (security)

- Convert `admin/layout.tsx` to server component
- Add `hasRole(session.user, "ADMIN")` guard
- Remove redundant per-page guards, standardise remaining ones to use `hasRole()`

### Step 4 — WorkspaceSwitcher Upgrade

- Show "Become a Provider" CTA for CLIENT-only users
- Add active mode pill to sidebar header
- Add mobile topbar mode indicator
- Add toast confirmation on switch

### Step 5 — Provider Setup DRY Fix

- Hydrate `phone`, `location`, `businessName` defaults from session/DB on mount
- Visual pre-fill indication in form fields

### Step 6 — become-a-provider CTA Fix

- Change unauthenticated CTA to `/auth/signup?intent=provider`
- Guard post-login redirect to skip role-select step

### Step 7 — Onboarding Role-Select Skip

- Skip Step 1 for already-onboarded users landing on `/onboarding`

### Step 8 — Admin Invite System (Phase 1)

- Add `AdminInvite` model + migration
- `POST /api/admin/invites` (create)
- `POST /api/admin/invites/redeem` (consume)
- `src/app/auth/admin-invite/page.tsx` (redemption UI)
- Admin settings section for generating invites

### Step 9 — Admin Dashboard Stats Fix

- Update `prisma.user.count` queries to use `roles` array

---

## Files Changed Summary

| File                                        | Change                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| `.env`                                      | Add 3 feature flag vars                                                         |
| `src/auth.ts`                               | Add `roles`, `preferredWorkspace` to JWT + session callbacks                    |
| `src/proxy.ts`                              | Multi-role admin check; `preferredWorkspace`-aware redirect                     |
| `src/components/WorkspaceSwitcher.tsx`      | Show "Become a Provider" for CLIENT-only users; add mode pill; add switch toast |
| `src/components/ClientSidebar.tsx`          | Remove redundant `/become-a-provider` hardcoded link                            |
| `src/app/admin/layout.tsx`                  | Convert to server component; add ADMIN role guard                               |
| `src/app/admin/**/page.tsx`                 | Remove per-page guards; standardise remaining to `hasRole()`                    |
| `src/app/admin/dashboard/page.tsx`          | Fix user count queries to use `roles` array                                     |
| `src/app/provider/setup/page.tsx`           | Hydrate known user data (phone, location, name) on mount                        |
| `src/app/become-a-provider/page.tsx`        | Fix unauthenticated CTA to route through `?intent=provider` signup              |
| `src/app/onboarding/page.tsx`               | Skip role-select step for already-onboarded users                               |
| `prisma/schema.prisma`                      | Add `AdminInvite` model                                                         |
| `src/app/api/admin/invites/route.ts`        | New — create invite                                                             |
| `src/app/api/admin/invites/redeem/route.ts` | New — redeem invite, upgrade role                                               |
| `src/app/auth/admin-invite/page.tsx`        | New — invite redemption UI                                                      |

---

## What Deliberately Does Not Change

- The `role` (legacy) field stays in the schema. It remains the source of truth for the middleware during the transition. `roles[]` is additive.
- The provider identity verification flow (ID + selfie) is not changed — it is correctly implemented.
- The `/become-a-provider` landing page content stays — it's well-designed and the marketing copy is solid.
- The `WorkspaceSwitcher` PATCH endpoint is correct and stays unchanged.
