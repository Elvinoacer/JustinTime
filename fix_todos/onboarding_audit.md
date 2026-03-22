# JustInTime — Onboarding & Auth Flow Full Audit

**Files audited:**
`src/app/onboarding/page.tsx` · `components/StepVerification.tsx` · `components/CameraCapture.tsx` · `components/OnboardingShell.tsx` · `components/StepComplete.tsx` · `api/users/onboarding/route.ts` · `api/upload/route.ts` · `src/auth.ts` · `src/proxy.ts` · `src/lib/api/client.ts` · `src/lib/s3.ts`

---

## Bug Index

| ID | Bug | Severity | Where it breaks |
|----|-----|----------|-----------------|
| B1 | Session update race condition → proxy redirects user back to `/onboarding` after submit | 🔴 Critical | `page.tsx` → `proxy.ts` |
| B2 | Upload API stores ID documents in the `messages/` folder | 🔴 Critical | `api/upload/route.ts` |
| B3 | Error extraction from `apiClient` is broken — `error?.response?.data?.message` is always `undefined` | 🔴 Critical | `page.tsx` (both submit handlers) |
| B4 | Rejection message is silently hidden after face comparison fails | 🔴 Critical | `StepVerification.tsx` |
| B5 | `update()` spreads the full stale session — can overwrite fields with old data | 🟠 High | `page.tsx` |
| B6 | Zero upload progress feedback — user sees "Finishing..." for 5–30s with no stage info | 🟠 High | `page.tsx` → `handleVerificationComplete` |
| B7 | Generic "Upload failed" thrown from raw `fetch` — no actionable error detail | 🟠 High | `page.tsx` → `uploadFile` |
| B8 | `CameraCapture` stream leak — cleanup runs against stale `null` stream reference | 🟠 High | `CameraCapture.tsx` |
| B9 | Face match score threshold displayed as "28% ✓ Above threshold" — looks broken to users | 🟡 Medium | `StepVerification.tsx` |
| B10 | `handleClientSubmit` step calculation is a dead ternary — always evaluates the same branch | 🟡 Medium | `page.tsx` |
| B11 | `isFinalStep` renders `StepComplete` while `isLoading` is still `true` — split-brain state | 🟡 Medium | `page.tsx` |
| B12 | Onboarding API route does not validate required fields before the Prisma call | 🟡 Medium | `api/users/onboarding/route.ts` |

---

## B1 — Session Update Race Condition (The Core Submit Bug)

### What is happening

This is the **primary bug** causing problems after clicking "Complete Setup". The sequence is:

```
1. handleVerificationComplete() → upload files → POST /api/users/onboarding ✅
2. await update({ ...session, user: { role: "PROVIDER", onboardingCompleted: true } })
   → NextAuth writes a new JWT cookie (async, takes 100–600ms)
3. setCurrentStep(4)  → StepComplete renders "Redirecting you to your dashboard..."
4. setTimeout(() => router.push("/dashboard"), 2000)
   → Browser navigates to /dashboard
5. proxy.ts reads the JWT from the cookie
   → IF the new cookie hasn't been written yet: hasCompletedOnboarding = false
   → proxy.ts line: if (!hasCompletedOnboarding) redirect to /onboarding  ← LOOP
```

The 2-second `setTimeout` is a guess. On slow connections or under load, `update()` takes longer than 2 seconds to write the new cookie. The user is redirected back to `/onboarding` and the page resets to step 1.

### Fix

Don't use a fixed timeout. Wait for the session to actually reflect the update before navigating:

```tsx
// In page.tsx — handleVerificationComplete and handleClientSubmit
// Replace:
await update({ ... });
setCurrentStep(4);
setTimeout(() => router.push("/dashboard"), 2000);

// With:
await update({
  user: { role: selectedRole, onboardingCompleted: true }  // B5 fixed here too
});

// Poll the session until onboardingCompleted is true in the token
let attempts = 0;
const maxAttempts = 20; // 10 seconds max

const waitForSession = async () => {
  const { data: refreshed } = await getSession(); // or re-call useSession with update
  if (refreshed?.user?.onboardingCompleted) {
    setCurrentStep(selectedRole === "CLIENT" ? 3 : 4);
    router.push(selectedRole === "PROVIDER" ? "/dashboard" : "/client/dashboard");
    return;
  }
  attempts++;
  if (attempts < maxAttempts) {
    setTimeout(waitForSession, 500);
  } else {
    // Fallback: force full page reload which re-reads the cookie
    window.location.href = selectedRole === "PROVIDER" ? "/dashboard" : "/client/dashboard";
  }
};

await waitForSession();
```

The cleanest version uses `router.refresh()` after `update()` which forces Next.js to re-fetch the session server-side:

```tsx
await update({ user: { role: selectedRole, onboardingCompleted: true } });
setCurrentStep(selectedRole === "CLIENT" ? 3 : 4);
router.refresh(); // Flushes the stale RSC cache + re-reads cookie
setTimeout(() => {
  router.push(selectedRole === "PROVIDER" ? "/dashboard" : "/client/dashboard");
}, 1500);
```

---

## B2 — Upload Route Stores ID Documents in `messages/` Folder

### What is happening

`src/app/api/upload/route.ts` line:
```ts
const fileName = `messages/${session.user.id}/${timestamp}-${safeName}`;
```

Every file uploaded through this route — including government-issued ID documents and selfies captured during identity verification — is stored under the `messages/` prefix in DO Spaces. This means:
- Identity documents are mixed with chat attachments
- If you ever add a policy to auto-delete old message files, you'd destroy verification records
- Admin tools filtering `identity/` files will find nothing

### Fix

The upload route should accept a `folder` parameter, or you should create a dedicated `/api/upload/identity` route for onboarding:

```ts
// Option A: parameterized folder (add to existing route)
const folder = (formData.get('folder') as string) || 'uploads';
const allowedFolders = ['messages', 'identity', 'services', 'avatars'];
const safeFolder = allowedFolders.includes(folder) ? folder : 'uploads';
const fileName = `${safeFolder}/${session.user.id}/${timestamp}-${safeName}`;

// In page.tsx uploadFile helper:
const uploadFile = async (file: File, folder: 'identity' | 'messages' | 'avatars' = 'uploads') => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  // ...
};

// Then:
if (result.idFile) idDocumentUrl = await uploadFile(result.idFile, 'identity');
if (fileToUpload) selfieUrl = await uploadFile(fileToUpload, 'avatars');
```

---

## B3 — Error Extraction is Broken for API Errors

### What is happening

`src/lib/api/client.ts` response interceptor reshapes errors:
```ts
return Promise.reject({
  status,
  message,   // ← the error message IS here
  data: error.response.data,
});
```

But in `page.tsx`, the error is extracted like this:
```ts
const errorMessage =
  error?.message ||                         // ← this works (message is at root)
  error?.response?.data?.message ||         // ← this ALWAYS undefined (no .response on reshaped error)
  "Onboarding failed. Please try again.";
```

`error?.response` will always be `undefined` because `apiClient` has already unwrapped it. The second line never executes. For the raw `fetch()` upload errors, `throw new Error("Upload failed")` means `error.message` is `"Upload failed"` which does work. But for Prisma-level errors from the onboarding API (like a P2002 unique constraint), the error is `{ status: 409, message: "A user with this field already exists." }` — which works via `error.message`. So in practice this usually shows the right message, but the chain is fragile and confusing.

### Fix

Clean up the extraction to match the actual reshaped error shape:

```ts
// page.tsx - both handleClientSubmit and handleVerificationComplete
} catch (error: any) {
  console.error("Onboarding failed:", error);
  
  // apiClient errors are shaped: { status, message, data }
  // Raw fetch errors are standard Error objects with .message
  const errorMessage =
    error?.message ||
    error?.data?.message ||
    "Onboarding failed. Please try again.";
  
  toast.error(errorMessage);
}
```

---

## B4 — Rejection Message Hidden After Face Comparison

### What is happening

In `StepVerification.tsx`, the status message block has this condition:
```tsx
{verificationMessage && !faceMatchScore && (
  <div>...</div>  // shows the rejection message text
)}
```

But `faceMatchScore` is set to a number on EVERY call to `verifyIdentity` that reaches the comparison step — both pass AND fail. So when a user fails face matching:
1. `faceMatchScore` is set to e.g. `15` (a non-zero value)
2. `!faceMatchScore` is `false`
3. The rejection message block does **not** render
4. The user only sees the score bar showing "15% ✗ Below threshold"
5. The `toast.error("Face match failed")` fires and disappears
6. The user is left staring at a score bar with no explanation of what to do

This is why users are confused at the verification step. The "Faces Don't Match" text in the score bar header is the only remaining feedback, and it's easy to miss.

### Fix

Remove the `!faceMatchScore` condition entirely. The score bar and the message should coexist:

```tsx
{/* Always show the status message when one exists */}
{verificationMessage && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`p-3 sm:p-4 rounded-lg sm:rounded-xl flex items-start gap-2 sm:gap-3 ${
      verificationStatus === "VERIFIED"
        ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
        : verificationStatus === "REJECTED"
        ? "bg-red-50 text-red-800 border border-red-100"
        : "bg-blue-50 text-blue-800 border border-blue-100"
    }`}
  >
    <span className="material-symbols-outlined text-lg sm:text-xl flex-shrink-0">
      {verificationStatus === "VERIFIED" ? "verified"
        : verificationStatus === "REJECTED" ? "error" : "info"}
    </span>
    <div>
      <p className="text-xs sm:text-sm font-bold">{verificationMessage}</p>
      {verificationStatus === "REJECTED" && (
        <p className="text-xs mt-1 opacity-75">
          Try retaking your selfie in better lighting, or use a clearer photo of your ID.
        </p>
      )}
    </div>
  </motion.div>
)}
```

Show the score bar separately, only when face comparison has been run:

```tsx
{faceMatchScore !== null && (
  <div ...>
    {/* score bar */}
  </div>
)}
```

---

## B5 — `update()` Spreads Stale Session

### What is happening

```ts
await update({
  ...session,                // ← spreads the ENTIRE current session object
  user: {
    ...session?.user,        // ← spreads all current user fields
    role: "PROVIDER",
    onboardingCompleted: true,
  },
});
```

In NextAuth v5 beta, the `update()` function triggers the `jwt` callback with `trigger === "update"` and the object you pass as `session`. The callback then does:
```ts
if (trigger === "update" && session?.user) {
  token.onboardingCompleted = session.user.onboardingCompleted;
  token.role = session.user.role;
  // ...
}
```

Spreading `...session` and `...session?.user` means you're writing back whatever was in the session before — including any stale role, stale image, stale interests. If the session had stale data at the moment of `update()`, that stale data gets written into the new token.

### Fix

Only send the delta — just the fields that changed:

```ts
// Provider
await update({
  user: {
    role: "PROVIDER",
    onboardingCompleted: true,
  },
});

// Client
await update({
  user: {
    role: "CLIENT",
    onboardingCompleted: true,
  },
});
```

---

## B6 — No Upload Stage Feedback During Submit

### What is happening

When the provider clicks "Complete Setup" in StepVerification, `handleVerificationComplete` is called in `page.tsx`. The sequence is:
1. `setIsLoading(true)` → StepVerification button shows "Finishing..."
2. `await uploadFile(result.idFile)` — can take 3–20s on slow mobile
3. `await uploadFile(selfieFile)` — another 3–20s
4. `await apiClient.post('/users/onboarding', payload)` — another 1–3s
5. `await update(...)` — another 0.5–2s
6. `setCurrentStep(4)` → StepComplete renders

During steps 2–5 the button just says "Finishing..." with a spinner. The user has zero idea if the uploads are in progress, stuck, or failed silently. On a Kenyan mobile connection, this could be 30+ seconds of mystery.

### Fix

Add a `submitStage` state with descriptive messages shown below the spinner:

```tsx
// In page.tsx
const [submitStage, setSubmitStage] = useState<string>("");

const handleVerificationComplete = async (result: VerificationResult) => {
  setIsLoading(true);
  
  try {
    setSubmitStage("Uploading ID document...");
    if (result.idFile) idDocumentUrl = await uploadFile(result.idFile, 'identity');

    setSubmitStage("Uploading profile photo...");
    if (fileToUpload) selfieUrl = await uploadFile(fileToUpload, 'avatars');

    setSubmitStage("Saving your profile...");
    await apiClient.post("/users/onboarding", payload);

    setSubmitStage("Finalizing your account...");
    await update({ user: { role: "PROVIDER", onboardingCompleted: true } });

    setCurrentStep(4);
    // ... redirect logic
  } catch (error) {
    // ...
  } finally {
    setIsLoading(false);
    setSubmitStage("");
  }
};
```

Pass `submitStage` down to StepVerification via the `isSubmitting` prop or a new `submitStage` prop and render it below the spinner button.

---

## B7 — Generic "Upload Failed" With No Detail

### What is happening

```ts
const uploadFile = async (file: File): Promise<string> => {
  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  if (!res.ok) throw new Error("Upload failed");  // ← no status, no server message
  const data = await res.json();
  return data.url;
};
```

If S3 credentials are wrong, the bucket policy rejects the file, the file is too large, or the session expired mid-upload, the user sees "Upload failed" and nothing else. The actual error from the server is discarded.

### Fix

Read the error response before throwing:

```ts
const uploadFile = async (file: File, folder: string = 'uploads'): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    credentials: "include"
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      detail = errBody?.error || errBody?.message || detail;
    } catch {}
    throw new Error(`Upload failed: ${detail}`);
  }

  const data = await res.json();
  if (!data.url) throw new Error("Upload succeeded but no URL returned.");
  return data.url;
};
```

---

## B8 — CameraCapture Stream Leak

### What is happening

`CameraCapture.tsx` has two `useEffect` hooks that both try to clean up the stream:

```tsx
// Effect 1 — runs on mount, captures stream async
useEffect(() => {
  let active = true;
  navigator.mediaDevices.getUserMedia({ ... }).then((s) => {
    if (!active) {
      s.getTracks().forEach((t) => t.stop()); // good
      return;
    }
    setStream(s);
    if (videoRef.current) videoRef.current.srcObject = s;
  });

  return () => {
    active = false;
    stream?.getTracks().forEach((t) => t.stop()); // ← `stream` is null here on first render
  };
}, [facingMode]);

// Effect 2 — also runs cleanup on stream change
useEffect(() => {
  return () => {
    stream?.getTracks().forEach((t) => t.stop()); // this is the one that actually works
  };
}, [stream]);
```

Effect 1's cleanup closes over the `stream` state at mount time, which is `null`. So on unmount, Effect 1's cleanup does nothing (`null?.getTracks()` is a no-op). Effect 2 does the actual cleanup. This works for the common case but if the component unmounts before `setStream()` runs (very fast close), the `active = false` guard prevents the track from being added to state, and Effect 2 has nothing to stop. The track leaks — camera stays on.

### Fix

Use a ref for the stream instead of state — refs don't close over stale values:

```tsx
const streamRef = useRef<MediaStream | null>(null);

useEffect(() => {
  let cancelled = false;
  navigator.mediaDevices.getUserMedia({ video: { facingMode } })
    .then((s) => {
      if (cancelled) {
        s.getTracks().forEach((t) => t.stop()); // fast-close: stop immediately
        return;
      }
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    })
    .catch(() => setError("Camera not available. Please use file upload instead."));

  return () => {
    cancelled = true;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
}, [facingMode]);

// Remove the second useEffect entirely — it's redundant and uses stale closure
```

Update the `capture` function to use `streamRef.current`:
```tsx
const capture = useCallback(() => {
  // ...
  canvas.toBlob((blob) => {
    if (blob) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onCapture(blob);
    }
  }, "image/jpeg", 0.92);
}, [onCapture]);
```

---

## B9 — Face Match Score Visual Threshold Confuses Users

### What is happening

The verification logic uses:
```ts
const MATCH_THRESHOLD = 0.72; // euclidean distance
const score = Math.max(0, (1 - distance) * 100); // converts to 0-100%
```

When `distance = 0.72`, `score = 28`. So the pass/fail line is at 28%. The UI then shows:
```
Match score: 28%  ✓ Above threshold
```

A "28% match" that passes verification looks broken to any user. They will think verification is wrong or too lenient.

### Fix

Don't display the raw mathematical score to users. Either remap it to a more intuitive scale, or show a categorical label instead:

```tsx
// Option A: remap to 0-100 where 50% = threshold
const displayScore = Math.min(100, Math.max(0, ((1 - distance) / (1 - 0.72)) * 50 + 50));
// When distance=0.72 (threshold): displayScore = 50%
// When distance=0 (perfect): displayScore = 100%
// When distance=1 (completely different): displayScore = ~0% (clamped)

// Option B: categorical
const matchLabel =
  distance < 0.4 ? "Excellent match"
  : distance < 0.55 ? "Good match"
  : distance < 0.72 ? "Acceptable match"
  : "No match";

// Display:
<p className="text-xs mt-1.5 text-gray-600">
  Face similarity: <span className="font-bold">{matchLabel}</span>
</p>
```

---

## B10 — Dead Ternary in `handleClientSubmit`

### What is happening

```ts
// In handleClientSubmit — only reachable when selectedRole === "CLIENT"
setCurrentStep(selectedRole === "CLIENT" ? 3 : 4);
```

This function is only ever called from the CLIENT branch. `selectedRole` is always `"CLIENT"` here. The ternary always evaluates to `3`. The `4` branch is unreachable dead code. It's not a crash bug but it's a code smell that signals the step number logic hasn't been thought through.

### Fix

```ts
setCurrentStep(3); // CLIENT success step is always 3
```

And in `handleVerificationComplete`:
```ts
setCurrentStep(4); // PROVIDER success step is always 4
```

---

## B11 — `StepComplete` Renders While `isLoading` is Still `true`

### What is happening

```ts
// handleVerificationComplete:
await apiClient.post("/users/onboarding", payload);
await update(...);
setCurrentStep(4);         // ← triggers StepComplete render
setTimeout(() => router.push("/dashboard"), 2000);
// ... finally block:
setIsLoading(false);       // ← only now does loading stop
```

Between `setCurrentStep(4)` and `setIsLoading(false)`, both `isFinalStep = true` AND `isLoading = true`. StepComplete renders but `isSubmitting` in StepVerification is also `true`. This creates a brief split state where both components could theoretically render if `AnimatePresence` doesn't unmount the previous step fast enough.

More importantly: if `setCurrentStep(4)` is called but `isLoading` is still `true`, the "Finishing..." button in StepVerification might briefly flash before `AnimatePresence` completes the exit animation.

### Fix

Set loading to false before advancing the step:

```ts
await apiClient.post("/users/onboarding", payload);
await update({ user: { role: "PROVIDER", onboardingCompleted: true } });
setIsLoading(false);         // ← clear loading first
setCurrentStep(4);           // ← then advance
router.refresh();
setTimeout(() => router.push("/dashboard"), 1500);
```

And remove `setIsLoading(false)` from the `finally` block (it would double-fire and cause a no-op state set after unmount).

---

## B12 — Onboarding API Route Has No Input Validation

### What is happening

`api/users/onboarding/route.ts` destructures the body and immediately calls `prisma.user.update` and `prisma.profile.upsert` with whatever arrives. There are no guards like:
- Is `role` one of the valid enum values (`CLIENT`, `PROVIDER`)?
- For PROVIDER: are `skills`, `bio`, `phone`, and `location` present and non-empty?
- Is `hourlyRate` a valid positive number?
- Is `phone` a valid Kenyan number format?

If the client sends a malformed payload (bug in the frontend, or a direct API call), Prisma will throw and the error handler returns a 500. But the error message leaked in the response could expose internal Prisma schema details.

### Fix

Add validation at the top of the route handler:

```ts
// Validate role
if (!["CLIENT", "PROVIDER"].includes(role)) {
  return NextResponse.json({ message: "Invalid role" }, { status: 400 });
}

// Provider-specific validation
if (role === "PROVIDER") {
  const { verificationStatus, idDocument } = body;
  if (!skills?.length) {
    return NextResponse.json({ message: "At least one skill is required" }, { status: 400 });
  }
  if (!bio?.trim()) {
    return NextResponse.json({ message: "Bio is required" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ message: "Phone number is required" }, { status: 400 });
  }
  if (hourlyRate !== undefined && (isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0)) {
    return NextResponse.json({ message: "Invalid hourly rate" }, { status: 400 });
  }
}
```

---

## Fix Implementation Order

Execute in this sequence. B1 and B4 are the two bugs the user is actually experiencing. Fix those first:

| Priority | Bug | Files to touch | Time |
|----------|-----|---------------|------|
| 🔴 NOW | B4 — Remove `!faceMatchScore` condition, always show message | `StepVerification.tsx` | 10 min |
| 🔴 NOW | B1 — Replace setTimeout redirect with session-aware redirect + `router.refresh()` | `page.tsx` | 30 min |
| 🔴 NOW | B5 — Send only delta to `update()`, remove session spread | `page.tsx` | 5 min |
| 🟠 NEXT | B6 — Add `submitStage` state with per-upload progress messages | `page.tsx`, `StepVerification.tsx` | 45 min |
| 🟠 NEXT | B7 — Read error body before throwing in `uploadFile` | `page.tsx` | 15 min |
| 🟠 NEXT | B2 — Add `folder` param to upload route, use `identity/` for ID docs | `api/upload/route.ts`, `page.tsx` | 30 min |
| 🟠 NEXT | B8 — Fix stream leak in CameraCapture using ref | `CameraCapture.tsx` | 30 min |
| 🟡 THEN | B3 — Fix error extraction chain to match `apiClient` error shape | `page.tsx` | 10 min |
| 🟡 THEN | B9 — Remap face match score to user-friendly label | `StepVerification.tsx` | 20 min |
| 🟡 THEN | B11 — Set `isLoading(false)` before `setCurrentStep` | `page.tsx` | 5 min |
| 🟡 THEN | B10 — Remove dead ternary in `handleClientSubmit` | `page.tsx` | 2 min |
| 🟢 LATER | B12 — Add input validation to onboarding API route | `api/users/onboarding/route.ts` | 45 min |

---

## Quick Reference — Exact Line Fixes

### B4 — `StepVerification.tsx`
```tsx
// REMOVE this condition:
{verificationMessage && !faceMatchScore && (

// REPLACE with:
{verificationMessage && (
```

### B1 — `page.tsx` — both submit handlers
```tsx
// REMOVE:
setCurrentStep(4);
setTimeout(() => router.push("/dashboard"), 2000);

// REPLACE WITH:
setIsLoading(false);
setCurrentStep(4);
router.refresh();
setTimeout(() => router.push("/dashboard"), 1800);
```

### B5 — `page.tsx` — both `update()` calls
```tsx
// REMOVE:
await update({ ...session, user: { ...session?.user, role: "PROVIDER", onboardingCompleted: true } });

// REPLACE WITH:
await update({ user: { role: "PROVIDER", onboardingCompleted: true } });
```

### B8 — `CameraCapture.tsx`
```tsx
// REPLACE the two useEffects with one ref-based effect:
const streamRef = useRef<MediaStream | null>(null);

useEffect(() => {
  let cancelled = false;
  navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } } })
    .then((s) => {
      if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    })
    .catch(() => setError("Camera not available. Please use file upload instead."));
  return () => {
    cancelled = true;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };
}, [facingMode]);
```