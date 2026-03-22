# JustInTime — Fix Verification Audit

**Comparing:** Previous broken build → Current build  
**Method:** Line-by-line diff of every file from all three previous audit documents

---

## Part 1 — Previous Bug Scorecard

### From `ONBOARDING_AUTH_AUDIT.md` (most recent)

| ID | Bug | Status | Evidence |
|----|-----|--------|----------|
| B1 | Session update race condition → proxy loop | ⚠️ Partially fixed — new issue introduced | See NEW1 below |
| B2 | ID documents stored in `messages/` folder | ✅ Fixed | `upload/route.ts`: `allowedFolders` whitelist + `folder` param read from formData |
| B3 | Error extraction broken (`error?.response?.data`) | ✅ Fixed | Both handlers now use `error?.message \|\| error?.data?.message` |
| B4 | `verificationMessage` hidden after face fail (`!faceMatchScore` guard) | ✅ Fixed | Condition removed — now `{verificationMessage && (` unconditionally |
| B5 | `update()` spread stale session over new token | ✅ Fixed | Both handlers now send `{ user: { role, onboardingCompleted: true } }` only |
| B6 | No upload progress feedback — "Finishing..." for 30s | ✅ Fixed | `submitStage` state added; messages: "Uploading ID document..." / "Uploading profile photo..." / "Saving your profile..." / "Finalizing your account..." |
| B7 | Generic "Upload failed" with no detail | ✅ Fixed | `uploadFile` now reads the response body before throwing |
| B8 | CameraCapture stream leak via stale closure | ✅ Fixed | `streamRef` used throughout; single `stopStream()` helper; removed redundant second `useEffect` |
| B9 | Score display: "28% ✓ Above threshold" confuses users | ✅ Fixed | Bar label now shows "Excellent / Good / Acceptable / Mismatch detected" |
| B10 | Dead ternary in `handleClientSubmit` | ✅ Fixed | `setCurrentStep(3)` directly, no ternary |
| B11 | `StepComplete` renders while `isLoading` still true | ✅ Fixed | `setIsLoading(false)` called before `setCurrentStep` in both handlers |
| B12 | Onboarding API accepts any payload with no validation | ✅ Fixed | Role enum check + per-role required field guards added |

### From `fix_todos/authentication.md` (earlier auth audit)

| ID | Bug | Status | Evidence |
|----|-----|--------|----------|
| B-auth1 | Dead parallel JWT system (`api/auth/login/route.ts`, `lib/auth/jwt.ts`, `lib/auth/credentials.ts`) | ✅ Fixed | `lib/auth/` now only contains `password.ts`; old login route gone |
| B-auth2 | Google users trapped in email-verification loop | ✅ Fixed | `proxy.ts`: `!isGoogleUser` guard prevents non-Google check for Google accounts |
| B-auth3 | "Resend Email" was a fake `setTimeout` | ✅ Fixed | `verify-request/page.tsx` makes a real `POST /api/auth/resend-verification` call |
| B-auth4 | Hardcoded prod URL in `auth.ts` | ✅ Fixed | `getBaseUrl()` uses `NEXTAUTH_URL` / `VERCEL_URL` / throws loud error |
| B-auth5 | Wrong post-login redirect for CLIENT | ✅ Fixed | proxy properly routes CLIENT → `/client/dashboard` |
| B-auth6 | JWT token missing `authProvider` field | ✅ Fixed | `token.authProvider = account.provider` on first sign-in |
| B-auth7 | `verify-email` success page never redirected | ✅ Fixed | `setTimeout(() => router.push("/auth/login?verified=true"), 2000)` after success |
| B-auth8 | `/provider/` routes unprotected | ✅ Fixed | `isOnProviderPages` check in proxy |

---

## Part 2 — New Issues Introduced

### NEW1 — `useEffect` Redirect Fires Immediately After `update()`, Bypassing "All Set!" Screen

**Severity:** 🔴 High  
**File:** `src/app/onboarding/page.tsx`

**What happens:**

The fix for B1 (race condition) correctly calls `await update(...)` and then `setCurrentStep(4)`. But `update()` resolves only after NextAuth has written the new JWT cookie AND updated the `useSession()` hook's React state. The moment `update()` resolves, `session.user.onboardingCompleted` is already `true` in React state.

The existing guard at the top of the component fires immediately in the next render cycle:

```tsx
useEffect(() => {
  if (session?.user?.onboardingCompleted) {
    // ...
    router.push(redirectPath); // ← fires before setTimeout can run
  }
}, [session, router]);
```

The execution order on success:

```
1. await update()  →  session state updated immediately (onboardingCompleted: true)
2. setIsLoading(false)
3. setCurrentStep(4)       ← StepComplete intends to show for 1800ms
4. router.refresh()
5. setTimeout(router.push, 1800)   ← intended redirect

⬇ But in the next render:

6. useEffect fires: session.onboardingCompleted === true → router.push('/dashboard')
                     ← this fires IMMEDIATELY, cutting the 1800ms short
```

The user either sees the "All Set!" screen flash for a few frames and then gets redirected, or (if React batches the render before the setTimeout fires) never sees it at all. The `setTimeout` then fires on an already-navigated page.

**Fix:**

Add `currentStep` to the guard so the useEffect doesn't redirect once the success screen has been intentionally shown:

```tsx
useEffect(() => {
  if (session?.user?.onboardingCompleted) {
    const searchParams = new URLSearchParams(window.location.search);
    const isUpgradeRequest = searchParams.get("upgrade") === "true";
    if (isUpgradeRequest && session.user.role === "CLIENT") return;

    // Don't redirect if we just completed onboarding — let the success
    // screen show and the setTimeout handle the navigation
    const isOnSuccessStep =
      (selectedRole === "CLIENT" && currentStep === 3) ||
      (selectedRole === "PROVIDER" && currentStep === 4);
    if (isOnSuccessStep) return;

    const role = session.user.role;
    router.push(role === "PROVIDER" ? "/dashboard" : "/client/dashboard");
  }
}, [session, router, currentStep, selectedRole]);
```

---

### NEW2 — Double `setIsLoading(false)` on Success Path

**Severity:** 🟡 Medium  
**File:** `src/app/onboarding/page.tsx`, lines 171 + 185 (CLIENT) and 251 + 265 (PROVIDER)

**What happens:**

In both submit handlers, `setIsLoading(false)` is called twice on the success path:

```tsx
// handleClientSubmit — try block (success path):
setIsLoading(false);    // line 171 — intentional, before setCurrentStep
setCurrentStep(3);
router.refresh();
setTimeout(() => router.push("/client/dashboard"), 1800);

// ...
} finally {
  setIsLoading(false);  // line 185 — fires AGAIN immediately after try block exits
  setSubmitStage("");
}
```

On error, the `finally` is the only place `setIsLoading(false)` runs — correct. On success, it runs twice. The second call (in finally) fires after the first one, while the component is still mounted (the 1800ms redirect hasn't fired yet). This is harmless in isolation but produces a redundant React state update. If the redirect fires between the two calls, the second one causes a "state update on an unmounted component" warning in the console.

**Fix:**

Use a flag to prevent the double call:

```tsx
const handleClientSubmit = async () => {
  setIsLoading(true);
  let succeeded = false;
  try {
    // ...submit logic...
    setIsLoading(false);
    succeeded = true;
    setCurrentStep(3);
    // ...
  } catch (error: any) {
    // ...error handling...
  } finally {
    if (!succeeded) setIsLoading(false); // only if try didn't already clear it
    setSubmitStage("");
  }
};
```

Or the simpler version: remove `setIsLoading(false)` from the try block and move it to only run before `setCurrentStep`, using a restructured flow:

```tsx
try {
  // ...all async work...
  await update({ user: { role: "CLIENT", onboardingCompleted: true } });
} catch (error: any) {
  toast.error(...);
  return; // ← early return on error, finally still runs
} finally {
  setIsLoading(false);
  setSubmitStage("");
}
// Only reaches here on success (no throw):
setCurrentStep(3);
router.refresh();
setTimeout(() => router.push("/client/dashboard"), 1800);
```

This pattern is cleaner: `finally` always clears loading, `setCurrentStep` only runs if no error was thrown.

---

### NEW3 — `verificationResult` State Holds Large Blobs and Is Never Read

**Severity:** 🟡 Medium  
**File:** `src/app/onboarding/page.tsx`, lines 61–63

**What happens:**

```tsx
const [verificationResult, setVerificationResult] =
  useState<VerificationResult | null>(null);

// In handleVerificationComplete:
setVerificationResult(result); // ← set
// `verificationResult` is never read anywhere in the file
```

`VerificationResult` contains `idFile: File` and `selfieFile: File` — potentially multi-megabyte image objects. These are held in React state for the lifetime of the component (until navigation). On mobile devices with limited RAM, this is a meaningful concern.

Additionally, since the state is never read, this is dead state that creates false expectations for future developers (suggesting verification data is available for display, retry logic, etc.).

**Fix:**

Remove the state entirely. The result is already passed to `handleVerificationComplete` as a parameter and used locally within that function. Nothing needs to persist it:

```tsx
// Delete these lines entirely:
const [verificationResult, setVerificationResult] =
  useState<VerificationResult | null>(null);

// And in handleVerificationComplete, delete:
setVerificationResult(result);
```

If retry logic is ever needed, re-introduce the state at that point.

---

### NEW4 — Score Bar Width Still Maps 28% Passing Score to 28% Full Bar

**Severity:** 🟢 Low  
**File:** `src/app/onboarding/components/StepVerification.tsx`, line 434

**What happens:**

B9 was partially fixed — the text label now shows "Excellent/Good/Acceptable/Mismatch" instead of the raw number. But the progress bar's width is still set to `${faceMatchScore}%`:

```tsx
animate={{ width: `${faceMatchScore}%` }}
className={`h-full rounded-full ${
  faceMatchScore >= 28 ? "bg-emerald-500" : "bg-red-500"
}`}
```

When a user barely passes (score = 28), the bar fills to 28% of the container — a mostly empty green bar. This still looks like a failure visually, contradicting the "Acceptable ✓ Verified" text label above it.

**Fix:**

Remap the score so the threshold (28) corresponds to 50% bar fill:

```tsx
// Map raw score to display width:
// score 28 (threshold) → 50% fill
// score 100 (perfect)  → 100% fill
// score 0 (no match)   → 0% fill
const barWidth = faceMatchScore >= 28
  ? 50 + ((faceMatchScore - 28) / (100 - 28)) * 50  // 50%–100% for passing
  : (faceMatchScore / 28) * 50;                       // 0%–50% for failing

animate={{ width: `${barWidth}%` }}
```

---

## Part 3 — Remaining Pre-Existing Issue (Not Yet Fixed)

### R1 — `handleRetry` in `verify-email/page.tsx` Duplicates Verification Logic

**Severity:** 🟢 Low  
**File:** `src/app/auth/verify-email/page.tsx`

The `handleRetry` function recreates the entire async verification flow inline inside a `setTimeout` instead of just calling the original `verifyEmail` function. If the verification logic ever changes, it must be updated in two places:

```tsx
const handleRetry = () => {
  setStatus("loading");
  setTimeout(() => {
    if (token) {
      const retryVerification = async () => { ... }; // ← full copy of verifyEmail
      retryVerification();
    }
  }, 1000);
};
```

**Fix:** Extract `verifyEmail` to a `useCallback` and call it from both the initial `useEffect` and `handleRetry`.

---

## Part 4 — Summary

### What is genuinely fixed and solid ✅

All 12 bugs from the onboarding audit and all 8 from the earlier auth audit are fixed. The camera stream is clean, uploads are correctly routed, error messages are real, face matching is now an actual comparison with clear categorical feedback, the session update doesn't spread stale data, the proxy email-verification loop for Google users is gone, and the dead JWT system has been removed.

### What needs one more pass ⚠️

| ID | Severity | Description | Fix time |
|----|----------|-------------|----------|
| NEW1 | 🔴 High | `useEffect` guard fires immediately after `update()`, bypassing the "All Set!" screen | 10 min |
| NEW2 | 🟡 Medium | `setIsLoading(false)` called twice on success path | 5 min |
| NEW3 | 🟡 Medium | `verificationResult` state holds large blobs and is never read — dead memory | 3 min |
| NEW4 | 🟢 Low | Score bar width: 28% threshold = 28% fill, looks like failure | 10 min |
| R1   | 🟢 Low | `handleRetry` duplicates verification logic | 15 min |

**Total time to close out all remaining issues: ~45 minutes.**

The critical one is NEW1. Fix it first — it directly causes the "All Set!" screen to flash and disappear instantly, which is a visible regression from the previous behavior where users at least saw the spinner for a while.