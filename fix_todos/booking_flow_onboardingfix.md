# JustInTime — Implementation Plan

**Prepared for:** GTSS Software  
**Codebase:** JustInTime-main (Next.js 14, Prisma, NextAuth, Tailwind)  
**Scope:** Contact page email update · Booking flow UX overhaul · Onboarding validation hardening · System-wide integrity

---

## Codebase Snapshot (Context for Developers)

Before touching anything, here is the current state of the system as audited:

| Layer    | Technology                                                 |
| -------- | ---------------------------------------------------------- |
| Frontend | Next.js 14 App Router, React, Tailwind CSS, Framer Motion  |
| Auth     | NextAuth v5 (JWT strategy), Google + Credentials providers |
| API      | Next.js Route Handlers (`/src/app/api/**`)                 |
| Database | PostgreSQL via Prisma ORM                                  |
| Email    | Custom `sendContactFormEmail` in `/src/lib/email.ts`       |
| State    | React `useState`, TanStack Query for server state          |

---

## Part 1 — Contact Page Email Update

### Problem Statement

The codebase currently has **10 files** containing inconsistent, outdated email addresses that must all be replaced with `support@gtss.software`. Some files already use the correct address (particularly `email.ts` for transactional emails), but the UI-facing contact surfaces do not.

### Audit: Files Requiring Changes

| File                                              | Current Email(s)                                       | Change Required                           |
| ------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| `src/app/contact/ContactClient.tsx`               | `support@gtss.software`, `support@gtss.software`       | Replace both with `support@gtss.software` |
| `src/app/faq/FAQClient.tsx`                       | `support@gtss.software` (×2 — text + href)             | Replace both instances                    |
| `src/app/terms/TermsClient.tsx`                   | `support@gtss.software`                                | Replace with `support@gtss.software`      |
| `src/app/privacy/PrivacyClient.tsx`               | `support@gtss.software`                                | Replace with `support@gtss.software`      |
| `src/app/cookie-policy/CookiePolicyClient.tsx`    | `support@gtss.software`                                | Replace with `support@gtss.software`      |
| `src/app/dashboard/help/page.tsx`                 | `support@gtss.software` (×2 — href + display text)     | Replace both instances                    |
| `src/components/admin/SystemSettings.tsx`         | `support@gtss.software` (defaultValue)                 | Replace default value                     |
| `src/components/admin/EnhancedSystemSettings.tsx` | `support@gtss.software` (defaultValue)                 | Replace default value                     |
| `src/lib/email.ts`                                | `support@gtss.software` (fallback in `getEmailConfig`) | Replace the env fallback string           |
| `src/app/onboarding/hooks/useLocation.ts`         | `support@gtss.software` (User-Agent header)            | Replace with `support@gtss.software`      |

### Implementation Steps

**Step 1.1 — UI Components (pure find-and-replace)**

In each file listed above, replace every occurrence of the old email with `support@gtss.software`. Pay attention to two patterns per file: the visible display text AND the `href="mailto:..."` attribute — both must be updated together to avoid a mismatch (e.g. showing one email but `mailto:` linking to another).

Example pattern to fix in `ContactClient.tsx`:

```tsx
// BEFORE
<a href="mailto:support@gtss.software">
  support@gtss.software
</a>

// AFTER
<a href="mailto:support@gtss.software">
  support@gtss.software
</a>
```

The `support@gtss.software` in `ContactClient.tsx` should also be used as the single support address.

**Step 1.2 — Backend Config (email.ts)**

In `/src/lib/email.ts`, the `getEmailConfig()` function has this fallback:

```ts
const emailEnv =
  process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || "support@gtss.software";
```

Change the hardcoded fallback to `"support@gtss.software"`.

Also verify that `sendContactFormEmail` (line ~1605) sends to `process.env.EMAIL_USER || "support@gtss.software"` — this is already correct and should be left as-is.

**Step 1.3 — Admin Settings Components**

`SystemSettings.tsx` and `EnhancedSystemSettings.tsx` both have `defaultValue: "support@gtss.software"` for the support email setting field. Update these defaults. Note: if this value is already persisted in the database for existing deployments, you will also need to run a one-time DB update:

```sql
UPDATE "Settings" SET value = 'support@gtss.software'
WHERE key = 'support_email';
```

Confirm the exact table/key names against your Prisma schema before running.

**Step 1.4 — User-Agent Header**

In `src/app/onboarding/hooks/useLocation.ts`, the IP geolocation call sends a `User-Agent` header with the old email. Update to:

```ts
"User-Agent": "JustInTime/1.0 (support@gtss.software)"
```

**Step 1.5 — Verification**

After all changes, run a global search across the entire repo to confirm no old addresses remain:

```bash
grep -rn "support@gtss.software" src/
```

This should return zero results.

---

## Part 2 — Service Booking Flow (UX + System Design)

### Problem Statement

The current booking page (`/src/app/booking/page.tsx`) is a single long form with no step-based UX. The auth check only fires at submission time, there are no progress indicators, no character limits on free-text fields, and the callbackUrl on auth redirect preserves the professional ID but loses all form state (selected service, dates, time slots, notes). This creates a frustrating "start over" experience after login.

### Proposed Architecture: Multi-Step Booking Flow

Convert the single-page form into a **4-step stepper** with persistent state and an auth gate before the final step.

```
Step 1: Select Service
Step 2: Pick Dates & Times
Step 3: Contact & Notes         ← Auth gate fires HERE (not at submit)
Step 4: Review & Confirm        ← Only authenticated users reach this
```

### Step-by-Step Implementation

---

#### Step 2.1 — Create the Stepper Shell Component

Create `/src/components/booking/BookingStepShell.tsx`.

This component renders:

- A horizontal progress bar at the top showing steps 1–4 with labels ("Service", "Schedule", "Details", "Confirm")
- The current step number and step label as a heading
- A "Back" button (disabled on step 1)
- The children (current step content)

Design requirements:

- Active step: filled emerald circle with white step number
- Completed step: filled emerald circle with a checkmark icon
- Upcoming step: gray outlined circle
- Step connector lines turn emerald as steps are completed
- On mobile, show only the current step label and "Step X of 4" — collapse the full stepper to save space

---

#### Step 2.2 — Extract Step Components

Refactor the current monolithic `BookingPageContent` into four isolated components, each in `/src/components/booking/`:

**`StepSelectService.tsx`**

- Renders the list of the professional's services as selectable cards
- Each card shows: service title, description (clamped to 2 lines), price, duration, and location type badge
- Selected card gets a prominent emerald border and a checkmark
- CTA: "Continue →" (disabled until a service is selected)
- If `serviceId` is passed as a query param, pre-select that service and auto-advance to step 2

**`StepPickSchedule.tsx`**

- Calendar (multi-date selection) — desktop inline, mobile bottom-sheet modal (existing pattern preserved)
- Time slot grid per selected date
- Show a loading skeleton while slots are being fetched (replace the current silent empty state)
- CTA: "Continue →" (disabled until at least one date AND one time slot is selected)
- Show a persistent summary chip at the top: "3 slots selected across 2 dates"

**`StepContactDetails.tsx`**

- Phone number input with country code prefix (default: +254)
- Address textarea
- Notes textarea (optional)
- All fields have character counters and limits (see Section 3 for exact limits)
- Real-time inline validation — red border + error message on blur if invalid
- **Auth gate logic lives here** (see Step 2.3)
- CTA: "Review Booking →"

**`StepConfirmBooking.tsx`**

- Read-only summary of all previous selections: professional name/avatar, service, dates & times, contact info, notes
- Pricing breakdown card: subtotal, excise duty, happiness pledge, total
- Promo code input (move it here from the sidebar — it belongs at checkout)
- Negotiate Terms button
- Primary CTA: "Confirm Booking" (full-width, prominent, emerald gradient)
- No inputs — this step is pure review and submission

---

#### Step 2.3 — Auth Interception (State-Preserving)

**Current problem:** Auth check fires at `handleSubmit`. The redirect is:

```ts
router.push(`/auth/login?callbackUrl=/booking?professional=${professionalId}`);
```

After login, the user lands back on `/booking?professional=X` with an empty form — all selections are lost.

**Fix — localStorage state bridge:**

When the auth gate fires on step 3 (before the user can proceed to review), save the entire form state to `localStorage` before redirecting:

```ts
// In StepContactDetails, before redirecting to login:
const bookingDraft = {
  professionalId,
  selectedService,
  selectedDates: selectedDates.map((d) => d.toISOString()),
  selectedTimeSlots,
  notes,
  location,
  clientPhone,
  clientAddress,
  savedAt: Date.now(),
};
localStorage.setItem("jit_booking_draft", JSON.stringify(bookingDraft));
router.push(
  `/auth/login?callbackUrl=${encodeURIComponent(`/booking?professional=${professionalId}&restore=1`)}`,
);
```

**Fix — Draft restoration on mount:**

In the main booking page, on mount check for the `restore=1` query param AND a valid (less than 30 minutes old) draft in `localStorage`. If found, restore state and jump straight to step 3:

```ts
useEffect(() => {
  const restoreParam = searchParams.get("restore");
  if (restoreParam === "1" && session) {
    const raw = localStorage.getItem("jit_booking_draft");
    if (raw) {
      const draft = JSON.parse(raw);
      const ageMs = Date.now() - draft.savedAt;
      if (ageMs < 30 * 60 * 1000) {
        // 30 min TTL
        // Restore all state fields
        setSelectedService(draft.selectedService);
        setSelectedDates(draft.selectedDates.map((s: string) => new Date(s)));
        setSelectedTimeSlots(draft.selectedTimeSlots);
        setNotes(draft.notes);
        setClientPhone(draft.clientPhone);
        setClientAddress(draft.clientAddress);
        setCurrentStep(3); // Return to details step
        toast.success("Your booking details have been restored.");
      }
      localStorage.removeItem("jit_booking_draft");
    }
  }
}, [session, searchParams]);
```

**The auth gate check itself** should live in `StepContactDetails` as a guard on the "Review Booking" CTA — if the user is not authenticated, clicking it triggers the save-and-redirect flow above instead of advancing to step 4. The gate should not block the user from filling in step 3 fields — only from proceeding to step 4.

---

#### Step 2.4 — Loading States & Feedback

Every async action must have a visible loading state. Apply these across the booking flow:

| Action                        | Current State                                | Required State                                                                       |
| ----------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| Fetching available time slots | Silent (slots just appear)                   | Skeleton grid of 8 gray placeholder buttons with pulse animation                     |
| Fetching monthly availability | Silent                                       | Subtle "Loading calendar..." text below the calendar header                          |
| Applying promo code           | "..." text on button                         | Button shows spinner icon + "Checking..."                                            |
| Submitting booking            | `isSubmitting` spinner (already implemented) | Keep, but also disable all interactive elements and show overlay on the confirm card |

---

#### Step 2.5 — API-Level Validation for Booking Inputs

The current booking API (`/src/app/api/bookings/route.ts`) validates that `professionalId` and `serviceId` are present, but does not validate free-text field lengths. Add this validation block to the POST handler after the existing field checks:

```ts
// Character limit validation
if (notes && notes.length > 500) {
  return NextResponse.json(
    { error: "Notes must not exceed 500 characters." },
    { status: 400 },
  );
}
if (clientAddress && clientAddress.length > 300) {
  return NextResponse.json(
    { error: "Address must not exceed 300 characters." },
    { status: 400 },
  );
}
if (clientPhone && clientPhone.length > 20) {
  return NextResponse.json(
    { error: "Phone number is too long." },
    { status: 400 },
  );
}
if (location && location.length > 200) {
  return NextResponse.json(
    { error: "Location must not exceed 200 characters." },
    { status: 400 },
  );
}
```

---

#### Step 2.6 — Wiring It All Together

The main `BookingPage` component becomes a thin orchestrator:

```tsx
// /src/app/booking/page.tsx (simplified)
export default function BookingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formState, setFormState] = useBookingFormState(); // custom hook holding all fields

  return (
    <BookingStepShell currentStep={currentStep} totalSteps={4}>
      {currentStep === 1 && <StepSelectService ... onNext={() => setCurrentStep(2)} />}
      {currentStep === 2 && <StepPickSchedule ... onBack={() => setCurrentStep(1)} onNext={() => setCurrentStep(3)} />}
      {currentStep === 3 && <StepContactDetails ... onBack={() => setCurrentStep(2)} onNext={() => setCurrentStep(4)} />}
      {currentStep === 4 && <StepConfirmBooking ... onBack={() => setCurrentStep(3)} onSubmit={handleSubmit} />}
    </BookingStepShell>
  );
}
```

Extract all booking-related state into a custom hook `useBookingFormState()` stored in `/src/hooks/useBookingFormState.ts`. This hook holds: `selectedService`, `selectedDates`, `selectedTimeSlots`, `notes`, `location`, `clientPhone`, `clientAddress`, `promoCode`, `appliedPromo`, `promoDiscount`. This makes draft save/restore and step isolation much cleaner.

---

## Part 3 — Onboarding Flow: Validation & Service Limits

### Problem Statement

The onboarding flow for providers allows unlimited skill/service category selection at the UI level, and the API enforces only that at least one skill exists. There are no character limits on the bio or name fields at the frontend, and the API has no length guards. The client interests selection similarly has no cap.

### 3.1 — Define the Limits

Establish these as named constants in a new file `/src/lib/constants/validation.ts` so they are imported — never hardcoded — in both frontend and API:

```ts
export const VALIDATION = {
  // Onboarding — Provider
  MAX_PROVIDER_SKILLS: 5,
  MIN_PROVIDER_SKILLS: 1,
  MAX_BIO_LENGTH: 600,
  MIN_BIO_LENGTH: 50,
  MAX_HOURLY_RATE: 100000,

  // Onboarding — Client
  MAX_CLIENT_INTERESTS: 8,

  // Booking
  MAX_NOTES_LENGTH: 500,
  MAX_ADDRESS_LENGTH: 300,
  MAX_PHONE_LENGTH: 20,
  MAX_LOCATION_LENGTH: 200,

  // General
  MAX_NAME_LENGTH: 100,
  MAX_SUBJECT_LENGTH: 150,
  MAX_MESSAGE_LENGTH: 2000,
} as const;
```

---

### 3.2 — Provider Skill Selection Limit (UI)

**File:** `src/app/onboarding/components/StepProviderDetails.tsx`

Modify `handleSkillToggle` to enforce `MAX_PROVIDER_SKILLS`:

```ts
import { VALIDATION } from "@/lib/constants/validation";

const handleSkillToggle = (skillId: string) => {
  const isSelected = providerData.skills.includes(skillId);

  if (
    !isSelected &&
    providerData.skills.length >= VALIDATION.MAX_PROVIDER_SKILLS
  ) {
    toast.error(
      `You can select up to ${VALIDATION.MAX_PROVIDER_SKILLS} services.`,
    );
    return;
  }

  setProviderData((prev) => ({
    ...prev,
    skills: isSelected
      ? prev.skills.filter((id) => id !== skillId)
      : [...prev.skills, skillId],
  }));
};
```

Also add a visible counter below the `CategorySelector`:

```tsx
<p className="text-sm text-gray-500 mt-2">
  {providerData.skills.length} / {VALIDATION.MAX_PROVIDER_SKILLS} services
  selected
  {providerData.skills.length >= VALIDATION.MAX_PROVIDER_SKILLS && (
    <span className="text-amber-600 font-medium ml-2">Maximum reached</span>
  )}
</p>
```

Pass a `disabled` prop to `CategorySelector` when the limit is reached (so unselected categories show as non-interactive), or add an `isDisabled` check inside `CategorySelector`'s item rendering that grays out and disables un-selected items when `selectedIds.length >= maxAllowed`.

---

### 3.3 — Client Interest Selection Limit (UI)

**File:** `src/app/onboarding/components/StepClientDetails.tsx`

The `onInterestToggle` prop is passed down from `page.tsx`. In `page.tsx`, the handler that calls `setClientInterests` must enforce `MAX_CLIENT_INTERESTS`:

```ts
const handleInterestToggle = (id: string) => {
  const isSelected = clientInterests.includes(id);
  if (
    !isSelected &&
    clientInterests.length >= VALIDATION.MAX_CLIENT_INTERESTS
  ) {
    toast.error(
      `You can select up to ${VALIDATION.MAX_CLIENT_INTERESTS} interests.`,
    );
    return;
  }
  setClientInterests((prev) =>
    isSelected ? prev.filter((i) => i !== id) : [...prev, id],
  );
};
```

Add the same counter display below the category selector in `StepClientDetails`.

---

### 3.4 — Bio Character Limit (UI + Real-time Feedback)

**File:** `src/app/onboarding/components/StepProviderDetails.tsx`

Add `maxLength` to the bio textarea and a live character counter:

```tsx
<textarea
  id="bio"
  value={providerData.bio}
  onChange={(e) => setProviderData((prev) => ({ ...prev, bio: e.target.value }))}
  maxLength={VALIDATION.MAX_BIO_LENGTH}
  rows={4}
  // ...existing className
/>
<div className="flex justify-between mt-1">
  <p className={`text-xs ${
    providerData.bio.length < VALIDATION.MIN_BIO_LENGTH
      ? 'text-gray-400'
      : 'text-emerald-600'
  }`}>
    {providerData.bio.length < VALIDATION.MIN_BIO_LENGTH
      ? `Minimum ${VALIDATION.MIN_BIO_LENGTH} characters required`
      : '✓ Good length'}
  </p>
  <p className={`text-xs ${
    providerData.bio.length > VALIDATION.MAX_BIO_LENGTH - 50
      ? 'text-red-500'
      : 'text-gray-400'
  }`}>
    {providerData.bio.length} / {VALIDATION.MAX_BIO_LENGTH}
  </p>
</div>
```

Also update the "Next" button disabled condition to include the minimum bio length:

```ts
disabled={
  !providerData.skills.length ||
  !providerData.phone ||
  !providerData.bio ||
  providerData.bio.trim().length < VALIDATION.MIN_BIO_LENGTH ||
  !providerData.location ||
  isLoading
}
```

---

### 3.5 — Onboarding API Validation

**File:** `src/app/api/users/onboarding/route.ts`

Import the constants and add hard validation after the existing role check:

```ts
import { VALIDATION } from "@/lib/constants/validation";

// Inside the PROVIDER block:
if (skills.length > VALIDATION.MAX_PROVIDER_SKILLS) {
  return NextResponse.json(
    {
      message: `You may select a maximum of ${VALIDATION.MAX_PROVIDER_SKILLS} services.`,
    },
    { status: 400 },
  );
}
if (bio.trim().length < VALIDATION.MIN_BIO_LENGTH) {
  return NextResponse.json(
    {
      message: `Bio must be at least ${VALIDATION.MIN_BIO_LENGTH} characters.`,
    },
    { status: 400 },
  );
}
if (bio.length > VALIDATION.MAX_BIO_LENGTH) {
  return NextResponse.json(
    { message: `Bio must not exceed ${VALIDATION.MAX_BIO_LENGTH} characters.` },
    { status: 400 },
  );
}

// Inside the CLIENT block:
if (
  clientInterests &&
  clientInterests.length > VALIDATION.MAX_CLIENT_INTERESTS
) {
  return NextResponse.json(
    {
      message: `You may select a maximum of ${VALIDATION.MAX_CLIENT_INTERESTS} interests.`,
    },
    { status: 400 },
  );
}
```

---

### 3.6 — Contact Form Validation (API)

**File:** `src/app/api/contact/route.ts`

Add character limit checks after the existing field-presence validation:

```ts
import { VALIDATION } from "@/lib/constants/validation";

if (name.length > VALIDATION.MAX_NAME_LENGTH) {
  return NextResponse.json({ error: "Name is too long." }, { status: 400 });
}
if (subject.length > VALIDATION.MAX_SUBJECT_LENGTH) {
  return NextResponse.json({ error: "Subject is too long." }, { status: 400 });
}
if (message.length > VALIDATION.MAX_MESSAGE_LENGTH) {
  return NextResponse.json({ error: "Message is too long." }, { status: 400 });
}
```

Add matching `maxLength` attributes to the contact form inputs in `ContactClient.tsx`.

---

## Part 4 — General System Integrity

### 4.1 — Known Bug Fix: Onboarding Redirect Race (NEW1)

This was documented in `fix_todos/new_onboarding_audit.md` but not yet resolved. The `useEffect` guard in `onboarding/page.tsx` fires immediately after `update()` resolves, cutting the success screen short.

**Fix:** Add a `justCompletedOnboarding` ref that is set to `true` just before calling `update()`, and checked in the guard `useEffect`:

```ts
const justCompletedOnboarding = useRef(false);

// In handleVerificationComplete and handleClientSubmit, BEFORE calling update():
justCompletedOnboarding.current = true;

// In the guard useEffect:
useEffect(() => {
  if (session?.user?.onboardingCompleted) {
    if (justCompletedOnboarding.current) return; // Let StepComplete + setTimeout handle it
    const role = session.user.role;
    router.push(role === "PROVIDER" ? "/dashboard" : "/client/dashboard");
  }
}, [session, router]);
```

---

### 4.2 — Error Handling Consistency

Apply these standards everywhere:

**No silent failures:** Every `fetch()` call must have a `.catch()` or `try/catch` that calls `toast.error(...)`. Audit the following locations where errors are currently swallowed silently:

- `fetchMonthlyAvailability` in `booking/page.tsx` — currently logs to console only, add a non-intrusive toast or inline error state
- `fetchAvailableSlotsForDate` — same issue
- The promo code removal flow (no error handling if the removal somehow fails server-side)

**Consistent error message format:** All API errors returned to the client should use the key `error` (not `message`) for user-facing strings. Audit `users/onboarding/route.ts` which uses `message` while `bookings/route.ts` uses `error`. Pick one and normalize across all routes.

**HTTP status code consistency:**

- `400` — validation failures (malformed input, limit exceeded)
- `401` — unauthenticated
- `403` — authenticated but unauthorized (e.g. booking your own service)
- `404` — resource not found
- `409` — conflict (e.g. slot already booked)
- `500` — internal server error

Review booking routes and ensure these are applied correctly.

---

### 4.3 — Database Integrity

The booking creation flow in `bookings/route.ts` does not currently validate that a user isn't booking their own service. Add this guard:

```ts
if (service.providerId === session.user.id) {
  return NextResponse.json(
    { error: "You cannot book your own service." },
    { status: 403 },
  );
}
```

---

### 4.4 — Input Sanitization

Ensure all free-text fields stored in the database (bio, notes, address, job descriptions) are trimmed before persistence. This should be done at the API layer, not trusted from the client. For example, in `bookings/route.ts`:

```ts
const sanitized = {
  notes: notes?.trim().substring(0, VALIDATION.MAX_NOTES_LENGTH),
  clientPhone: clientPhone?.trim(),
  clientAddress: clientAddress
    ?.trim()
    .substring(0, VALIDATION.MAX_ADDRESS_LENGTH),
};
```

---

## Execution Order & Priority

Work through the tasks in this sequence to minimize risk and maximize testability at each stage:

**Phase 1 — Quick wins (low risk, no architecture change)**

1. Create `/src/lib/constants/validation.ts` with all constants
2. Email address find-and-replace across all 10 files (Step 1.1–1.5)
3. Add character limit validation to `contact/route.ts` and `bookings/route.ts`
4. Add character limit `maxLength` attrs to contact form inputs
5. Fix onboarding redirect race condition (NEW1)

**Phase 2 — Onboarding hardening** 6. Add service/skill selection limit to `StepProviderDetails` (UI) 7. Add client interest limit to `StepClientDetails` (UI) 8. Add bio min/max with live counter to `StepProviderDetails` 9. Add API-level enforcement to `users/onboarding/route.ts`

**Phase 3 — Booking flow refactor** 10. Create `useBookingFormState` custom hook 11. Create `BookingStepShell` progress indicator component 12. Extract `StepSelectService`, `StepPickSchedule`, `StepContactDetails`, `StepConfirmBooking` 13. Implement auth interception + draft save in `StepContactDetails` 14. Implement draft restoration on mount in main `BookingPage` 15. Add loading skeletons for slot/calendar fetching 16. Wire everything together in `BookingPage`

**Phase 4 — Hardening & QA** 17. Normalize error message key across all API routes (`error` vs `message`) 18. Add self-booking guard to `bookings/route.ts` 19. Add input sanitization (trim + truncate) at API layer 20. Run the email address grep to confirm zero old emails remain 21. End-to-end test: unauthenticated user → booking → login → restored state → confirm

---

## Testing Checklist

Before marking any phase complete, verify the following:

**Contact Page**

- [ ] All displayed emails show `support@gtss.software`
- [ ] All `mailto:` links point to `support@gtss.software`
- [ ] Contact form submits successfully and delivers to the correct address
- [ ] No old email addresses found by the grep command

**Booking Flow**

- [ ] Service pre-selection from query param works (step 1 auto-advances)
- [ ] Cannot proceed from step 2 without at least one date AND one time slot
- [ ] Unauthenticated user filling step 3 and clicking "Review" is redirected to login
- [ ] After login, user is returned to step 3 with all data intact
- [ ] Draft expires correctly after 30 minutes (test by manipulating `savedAt`)
- [ ] Promo code validation shows loading state and correct success/error messages
- [ ] Submission shows loading state and disables all controls
- [ ] Notes > 500 chars: rejected at API with clear error message
- [ ] Address > 300 chars: rejected at API with clear error message
- [ ] All step transitions have smooth animations

**Onboarding**

- [ ] Provider cannot select more than 5 services — UI disables additional selection
- [ ] Attempting to bypass via direct API call with 6+ skills returns `400`
- [ ] Bio counter shows correct count; "Next" is disabled below 50 chars
- [ ] Bio > 600 chars: API returns `400` with message
- [ ] Client cannot select more than 8 interests
- [ ] All error messages are human-readable and match between frontend and API

**General**

- [ ] No console errors on any flow
- [ ] No `toast.error` fires on successful actions
- [ ] All async operations show a loading indicator
- [ ] Booking a provider's own service returns `403`

---

_Last updated: March 2026 | Plan version 1.0_
