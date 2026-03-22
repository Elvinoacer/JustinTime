# JustInTime — Authentication Fix Plan

## Audit Summary

The auth system has **two parallel implementations that fight each other**, a fake "Resend Email" button, a redirect loop trap for Google users, and broken role-based routing after login. Below is every bug found, ranked by severity, with the exact fix for each.

---

## Bug Index

| # | Bug | Severity | Files |
|---|-----|----------|-------|
| B1 | Dead parallel JWT auth system | 🔴 Critical | `api/auth/login/route.ts`, `lib/auth/jwt.ts`, `lib/auth/credentials.ts` |
| B2 | Google users trapped in email-verification loop | 🔴 Critical | `src/auth.ts`, `src/proxy.ts` |
| B3 | "Resend Email" is a fake `setTimeout` — no real API call | 🔴 Critical | `auth/verify-request/page.tsx` |
| B4 | Internal fetch fallback to hardcoded prod URL breaks dev | 🔴 Critical | `src/auth.ts` |
| B5 | Wrong post-login redirect for CLIENT users (double redirect) | 🟠 High | `auth/login/page.tsx`, `proxy.ts` |
| B6 | JWT token has no `authProvider` field | 🟠 High | `src/auth.ts` |
| B7 | `verify-email` success page never auto-redirects or signs in | 🟠 High | `auth/verify-email/page.tsx` |
| B8 | `/provider/` routes unprotected in proxy | 🟠 High | `src/proxy.ts` |
| B9 | Google sign-in silently ignores DB creation failures | 🟡 Medium | `src/auth.ts` |
| B10 | Missing `resend-verification` API endpoint | 🟡 Medium | (new file needed) |
| B11 | Dead `verifyCredentials` function in `credentials.ts` | 🟢 Low | `src/lib/auth/credentials.ts` |

---

## B1 — Delete the Dead Parallel JWT Auth System

### What's wrong
`src/app/api/auth/login/route.ts` is a completely separate login system that generates its own JWT tokens via `src/lib/auth/jwt.ts`. The login page **never calls it** — it uses NextAuth's `signIn()`. Nothing in the app uses this route. It's dead code that creates a false impression of a working auth flow and a security liability (separate JWT secret, no session invalidation).

### Files to DELETE
```
src/app/api/auth/login/route.ts      ← delete entire file
src/lib/auth/credentials.ts          ← delete entire file
src/lib/auth/jwt.ts                  ← delete entire file
```

`src/lib/auth/password.ts` — **keep this**, it's used by the real auth system.

---

## B2 — Google Users Trapped in Email-Verification Loop

### What's wrong
`proxy.ts` redirects all logged-in users without `emailVerified` in their JWT to `/auth/verify-request`:

```ts
if (isLoggedIn && !emailVerified && !isOnAuth) {
  return NextResponse.redirect(new URL("/auth/verify-request", nextUrl));
}
```

Google users should **never** hit this. Their email is verified by Google. But if the `signIn` callback's internal fetch to `/api/auth/google-signin` fails (network, DB error, cold start), the user gets a valid session with no `emailVerified` in their JWT, and they are permanently trapped — there's no "verify your email" link that works for a Google account.

Even when everything works, the JWT token stores no information about which provider was used, so the proxy has no reliable way to skip this check for Google users.

### Fix — Part 1: Add `authProvider` to the JWT in `src/auth.ts`

In the `jwt` callback, save the provider:

```ts
async jwt({ token, user, trigger, session, account }) {
  // Persist the provider on first sign-in
  if (account) {
    token.authProvider = account.provider; // "google" | "credentials"
  }

  if (user) {
    if (account?.provider === "google") {
      // ... existing Google fetch logic
      token.authProvider = "google";
    } else {
      token.role = (user as any).role;
      token.id = user.id;
      token.onboardingCompleted = (user as any).onboardingCompleted;
      token.clientInterests = (user as any).clientInterests;
      token.emailVerified = (user as any).emailVerified;
      token.authProvider = "credentials";
    }
  }
  // ... rest of callback
}
```

In the `session` callback, expose it:

```ts
async session({ session, token }) {
  if (token && session.user) {
    session.user.role = token.role as string;
    session.user.id = token.id as string;
    session.user.onboardingCompleted = token.onboardingCompleted as boolean;
    session.user.clientInterests = token.clientInterests as string[];
    session.user.emailVerified = token.emailVerified as Date | null;
    session.user.authProvider = token.authProvider as string; // ADD THIS
  }
  return session;
}
```

### Fix — Part 2: Update `src/proxy.ts` email verification check

Replace:

```ts
if (isLoggedIn && !emailVerified && !isOnAuth) {
  return NextResponse.redirect(new URL("/auth/verify-request", nextUrl));
}
```

With:

```ts
const authProvider = req.auth?.user?.authProvider;
const isGoogleUser = authProvider === "google";

// Only enforce email verification for credentials (password) users
if (isLoggedIn && !isGoogleUser && !emailVerified && !isOnAuth) {
  return NextResponse.redirect(new URL("/auth/verify-request", nextUrl));
}
```

### Fix — Part 3: Update `next-auth.d.ts` type declarations

Add `authProvider` to the session type so TypeScript doesn't complain:

```ts
// src/types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      onboardingCompleted: boolean;
      clientInterests: string[];
      emailVerified: Date | null;
      authProvider: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    id: string;
    onboardingCompleted: boolean;
    clientInterests: string[];
    emailVerified: Date | null;
    authProvider: string;
  }
}
```

---

## B3 — "Resend Email" Button is Fake

### What's wrong

`src/app/auth/verify-request/page.tsx` has this handler:

```ts
const handleResendEmail = async () => {
  if (!email || isResending) return;
  setIsResending(true);
  setResendSuccess(false);

  // Simulate API call  ← THIS IS THE PROBLEM
  setTimeout(() => {
    setIsResending(false);
    setResendSuccess(true);
    // ...
  }, 1500);
};
```

It's a `setTimeout` pretending to be an API call. No email is ever sent. Users with expired tokens are permanently stuck.

### Fix — Step 1: Create `src/app/api/auth/resend-verification/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return 200 even if user not found to prevent email enumeration
      return NextResponse.json({ message: "If that email exists, a link was sent." });
    }

    // Don't resend if already verified
    if (user.emailVerified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    // Rate-limit: check if a fresh token was created in the last 2 minutes
    const recentToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        expires: { gt: new Date(Date.now() + 22 * 60 * 60 * 1000) }, // still has >22h = created <2h ago
      },
    });

    if (recentToken) {
      return NextResponse.json(
        { error: "Please wait a few minutes before requesting another link." },
        { status: 429 }
      );
    }

    // Delete old tokens for this email
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    // Generate new token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;
    await sendVerificationEmail(email, user.name || "User", verificationUrl);

    return NextResponse.json({ message: "Verification email sent." });
  } catch (error) {
    console.error("[RESEND_VERIFICATION_ERROR]", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
```

### Fix — Step 2: Update `verify-request/page.tsx` to call the real endpoint

Replace the fake `setTimeout` with a real fetch:

```ts
const handleResendEmail = async () => {
  if (!email || isResending) return;
  setIsResending(true);
  setResendSuccess(false);
  setResendError("");

  try {
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      setResendError(data.error || "Failed to send. Try again.");
    } else {
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    }
  } catch {
    setResendError("Network error. Please try again.");
  } finally {
    setIsResending(false);
  }
};
```

Also add `const [resendError, setResendError] = useState("")` to state and display the error in the UI.

---

## B4 — Internal Fetch Falls Back to Hardcoded Production URL

### What's wrong

In `src/auth.ts`, the `signIn` and `jwt` callbacks resolve the base URL like this:

```ts
const baseUrl = process.env.NEXTAUTH_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || 'https://justintimeservices.vercel.app'; // ← hardcoded!
```

During local development, if `NEXTAUTH_URL` is not set in `.env.local`, internal fetches go to the production server. This makes Google sign-in silently broken in dev — the dev DB is never updated, the JWT never gets populated, and Google users get routing errors.

### Fix — Use relative URLs for internal API calls in `src/auth.ts`

Since these callbacks run server-side in the same process, use the `NEXTAUTH_URL` env variable, and **fail loudly if it's missing**:

```ts
function getBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL;
  if (!url) {
    throw new Error(
      "[Auth] NEXTAUTH_URL is not set. Add it to .env.local for development " +
      "or your deployment environment variables."
    );
  }
  return url;
}
```

Then replace every instance of the multi-fallback URL resolution in `auth.ts` with `getBaseUrl()`. This will surface the misconfiguration immediately instead of silently sending traffic to prod.

Also add to `.env.local` documentation (in `README.md` or a `.env.example` file):

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...
```

---

## B5 — Wrong Post-Login Redirect for CLIENT Users

### What's wrong

`src/app/auth/login/page.tsx`:

```ts
const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
```

A CLIENT user logging in gets sent to `/dashboard` (the provider dashboard). `proxy.ts` then catches this and redirects them to `/client/dashboard`. That's two redirects for every CLIENT login — and if anything in the proxy logic shifts, clients land on the wrong page.

### Fix — Smart post-login redirect using session role

After `signIn()` resolves, read the session to determine the correct destination:

```ts
import { getSession } from "next-auth/react";

// After successful signIn():
const session = await getSession();
const role = session?.user?.role;
const hasOnboarded = session?.user?.onboardingCompleted;

let destination = "/onboarding";

if (hasOnboarded) {
  destination = role === "PROVIDER" ? "/dashboard" : "/client/dashboard";
} else if (role === "ADMIN") {
  destination = "/admin";
}

router.push(destination);
```

Apply this to BOTH places in `login/page.tsx` where `router.push(callbackUrl)` is called (after normal login, and after 2FA login).

For Google sign-in in `signup/page.tsx`, remove the hardcoded `/dashboard`:

```ts
// Before
await signIn("google", { callbackUrl: "/dashboard" });

// After — let proxy.ts handle the redirect based on role
await signIn("google", { callbackUrl: "/onboarding" });
```

---

## B6 — JWT Token Missing `authProvider` Field

Covered as part of B2 Fix — Part 1 above. The fix there adds `authProvider` to both the JWT and the session. Reference that section for implementation.

---

## B7 — `verify-email` Page Doesn't Auto-Redirect After Success

### What's wrong

After successful email verification, the user is shown a "Verified!" screen with a manual link to login. They must click through themselves. There's no sign-in attempt, no redirect, and no success context passed to the login page.

### Fix — Auto-redirect with verified flag

In `src/app/auth/verify-email/page.tsx`, after a successful API response:

```ts
if (response.ok) {
  setStatus("success");
  setMessage("Your email has been successfully verified!");

  // Auto-redirect to login with success flag after 2 seconds
  setTimeout(() => {
    router.push("/auth/login?verified=true");
  }, 2000);
}
```

In `src/app/auth/login/page.tsx`, read the flag and show a toast:

```ts
const verified = searchParams.get("verified");

useEffect(() => {
  if (verified === "true") {
    toast.success("Email verified! You can now sign in.");
  }
}, [verified]);
```

---

## B8 — `/provider/` Routes Unprotected in `proxy.ts`

### What's wrong

`src/proxy.ts` protects `/dashboard`, `/client`, `/admin`, and `/onboarding`, but completely ignores `/provider/`. Any unauthenticated user can hit `/provider/onboarding` or other provider routes.

### Fix — Add protection in `proxy.ts`

Add the check alongside the existing route guards:

```ts
const isOnProviderOnboarding = nextUrl.pathname.startsWith("/provider");

// Add to the protection block:
if (isOnProviderOnboarding) {
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }
  // Only PROVIDER or users upgrading to PROVIDER should access this
  if (userRole === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }
  return NextResponse.next();
}
```

---

## B9 — Google Sign-In Silently Ignores DB Failures

### What's wrong

In `src/auth.ts` `signIn` callback:

```ts
if (!response.ok) {
  const errorText = await response.text();
  console.error("[Google Sign-In API Error]", response.status, errorText);
  // Don't fail sign-in, just log the error  ← THIS IS THE PROBLEM
}
```

If the user record creation fails (DB down, constraint violation), the callback returns `true` anyway. The user gets a session but has no DB record. All subsequent DB lookups for this user return null and the app throws unhandled errors.

### Fix — Return `false` on critical failures

```ts
if (!response.ok) {
  const errorText = await response.text();
  console.error("[Google Sign-In API Error]", response.status, errorText);

  // Only allow sign-in to continue if user already exists (409 Conflict = duplicate)
  // For any other error, deny sign-in to prevent orphaned sessions
  if (response.status !== 409) {
    return false; // This redirects user to /auth/error
  }
}
```

Also add an `error` page at `src/app/auth/error/page.tsx` since `src/auth.ts` declares `pages.error: "/auth/error"` but the file likely doesn't exist (not in the zip listing).

---

## B10 — Missing `/api/auth/resend-verification` Endpoint

Covered as part of B3 — the full implementation is there.

---

## B11 — Dead `verifyCredentials` in `credentials.ts`

`src/lib/auth/credentials.ts` exports a `verifyCredentials` function that's never imported or called anywhere. The actual credential verification runs in `src/app/api/auth/verify-credentials/route.ts`.

**Action:** Delete `src/lib/auth/credentials.ts`. The file in `src/lib/auth/` folder now only needs `password.ts`.

---

## Complete File Change Summary

### Delete these files
```
src/app/api/auth/login/route.ts
src/lib/auth/credentials.ts
src/lib/auth/jwt.ts
```

### Create these files
```
src/app/api/auth/resend-verification/route.ts    ← B3 fix
src/app/auth/error/page.tsx                      ← B9 dependency
src/types/next-auth.d.ts                         ← B2 fix (or update existing)
```

### Modify these files
```
src/auth.ts                      ← B2 (authProvider in JWT), B4 (getBaseUrl), B9 (return false)
src/proxy.ts                     ← B2 (skip verify for Google), B5 (role redirect), B8 (/provider protection)
src/app/auth/login/page.tsx      ← B5 (smart post-login redirect), B7 (verified toast)
src/app/auth/signup/page.tsx     ← B5 (Google callbackUrl fix)
src/app/auth/verify-email/page.tsx ← B7 (auto-redirect)
src/app/auth/verify-request/page.tsx ← B3 (real resend call)
```

---

## Implementation Order

Do these in sequence — each one unblocks the next:

1. **B4 first** — fix `getBaseUrl()` so internal fetches are reliable before testing anything else
2. **B1** — delete the dead auth system to eliminate confusion
3. **B11** — clean up `credentials.ts`
4. **B6 + B2** — add `authProvider` to JWT and fix the proxy's verification check together (they're one atomic change)
5. **B3 + B10** — implement the real resend endpoint and wire it to the UI
6. **B8** — protect `/provider/` routes
7. **B9** — harden the Google `signIn` callback
8. **B5** — fix post-login role-aware redirects
9. **B7** — auto-redirect after email verification

---

## `.env.local` Minimum Required for Auth to Work

```env
# Required — without this, B4 fires and breaks Google sign-in
NEXTAUTH_URL=http://localhost:3000

# Required — session signing key
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# Required for Google sign-in
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

# Required for email sending
RESEND_API_KEY=<from resend.com>

# The "from" address for all emails (must be a verified domain in Resend)
ADMIN_EMAIL=noreply@justintime.co.ke
```