Implementation update on 2026-04-05:

- Replaced `/provider/onboarding` and `/client/onboarding` with redirects into the real shared onboarding flow.
- Updated auth and join entrypoints to hand provider intent into `/onboarding?intent=provider`.
- Made the shared onboarding shell intent-aware and resumable with server-backed draft save/load via `/api/users/onboarding` GET/PATCH.
- Added the missing client name field and provider business name plus primary category fields to the onboarding data contract.
- Integrated provider onboarding fee initiation directly into the provider onboarding submission flow.
- Changed provider onboarding handoff to secure payment and `/dashboard/onboarding-complete` instead of jumping straight to service creation.
- Fixed manual location edits to clear stale GPS coordinates and aligned location source badges with submitted form state.
- Reworked phone validation so it is rechecked on submit, tracks validated state, and does not hard-lock the form on transient validation API failures.
- Made provider face-match failures fall back to manual review submission instead of dead-ending onboarding.
- Stopped invalid referral codes from invisibly blocking onboarding submission and surfaced applied referral state in the onboarding UI.
- Added upload cleanup for provider onboarding failures before the onboarding record is saved.

I audited the uploaded codebase statically against the full **3. Onboarding & Role Setup** feature.

The headline result: **this feature is only partially implemented, and several flows are broken or inconsistent**. The biggest problems are:

- the dedicated `/provider/onboarding` and `/client/onboarding` routes are **not real onboarding flows**
- provider onboarding **does not integrate onboarding fee payment in-flow**
- onboarding state is **not persisted per step/resumable**
- several UI/data mismatches can save **stale or incomplete data**
- a few auth entrypoints send provider users into the **wrong path**

Below is the full breakdown.

---

## What is broken

### 1) `/provider/onboarding` is not the provider onboarding flow

The spec says this is the dedicated provider onboarding entry. In the code, `/provider/onboarding/page.tsx` is a **marketing/landing page**, not the multi-step provider onboarding experience. It has CTA links like `/dashboard/profile` rather than the onboarding shell or provider steps.
File: `src/app/provider/onboarding/page.tsx`

**Why this breaks flow**

- Any callback or CTA pointing to `/provider/onboarding` lands on a promo page, not the onboarding process.
- That means provider sign-up/login intent can terminate on the wrong screen.

**Fix**

- Make `/provider/onboarding` render the actual onboarding shell with provider preselected, or redirect to `/onboarding?intent=provider`.

---

### 2) `/client/onboarding` is also not the client onboarding flow

Same issue for client. The spec says `/client/onboarding` is a dedicated onboarding entry, but the page is another marketing-style experience, not the actual onboarding form.
File: `src/app/client/onboarding/page.tsx`

**Why this breaks flow**

- The feature contract says dedicated client onboarding exists, but it does not.
- Any path or email/callback using `/client/onboarding` will not complete onboarding.

**Fix**

- Make `/client/onboarding` mount the shared onboarding shell with the client path selected, or redirect to `/onboarding?intent=client`.

---

### 3) Auth entrypoints point providers to the wrong onboarding route

Google sign-in and join/signup flows use `/provider/onboarding` as the provider callback/fallback path.
Files:

- `src/app/auth/login/LoginClient.tsx:260-269`
- `src/app/auth/signup/SignupClient.tsx:99-107`
- `src/app/join/page.tsx:25-30`

Because `/provider/onboarding` is not the real onboarding flow, this is a concrete broken entry path.

**Fix**

- Change provider fallback/callback URLs to a real onboarding path such as `/onboarding?intent=provider`.
- Or convert `/provider/onboarding` into the actual onboarding flow.

---

### 4) Role selection is not persisted until final submit

The spec says onboarding state is tracked and persisted via `/api/users/onboarding (POST)`. In practice, the app only posts once on final client completion or provider verification completion.
Files:

- `src/app/onboarding/page.tsx:266-301`
- `src/app/onboarding/page.tsx:323-381`

**What this means**

- Role choice is only local state.
- Step progress is only local state.
- Refreshing or leaving mid-flow loses everything.
- There is no resumable onboarding.

**Fix**

- Persist onboarding draft state on each step:
  - selected role
  - current step
  - phone validation status
  - provider details
  - client details
  - verification progress metadata

- Add GET support for draft hydration and POST/PATCH for step saves.

---

### 5) The provider onboarding fee is **not integrated directly in the onboarding flow**

The spec requires:
**“Onboarding fee payment initiation integrated directly in the flow via `/api/onboarding-fee/initiate`.”**

That does not happen in the onboarding flow. The provider path goes:

1. provider details
2. verification upload + local face match
3. submit `/api/users/onboarding`
4. redirect to `/dashboard/services?create=true&from=onboarding`

Files:

- `src/app/onboarding/page.tsx:305-381`
- `src/app/api/onboarding-fee/initiate/route.ts`
- `src/components/revenue/OnboardingAccessNotice.tsx`
- `src/components/revenue/OnboardingFeeModal.tsx`

Payment initiation exists, but it is triggered later from dashboard notices/modals, not directly in onboarding.

**Why this breaks flow**

- The implemented flow contradicts the feature definition.
- Provider onboarding completes before payment initiation.
- Verification/payment activation is deferred into dashboard UX.

**Fix**

- Insert a payment step after local verification and before completion.
- Call `/api/onboarding-fee/initiate` from onboarding itself.
- Only mark provider onboarding complete after payment initiation or confirmed payment, depending on your intended business rule.

---

### 6) Provider completion redirect is wrong for the specified feature

Spec says provider completion handoff goes to `/dashboard/onboarding-complete`.
Actual code redirects provider to `/dashboard/services?create=true&from=onboarding`.
File: `src/app/onboarding/page.tsx:378-380`

`/dashboard/onboarding-complete` exists, but it is used only as IntaSend’s redirect after payment, not as the onboarding handoff.
Files:

- `src/app/api/onboarding-fee/initiate/route.ts:41-43`
- `src/app/dashboard/onboarding-complete/page.tsx`

**Fix**

- Align one flow:
  - either provider onboarding ends at `/dashboard/onboarding-complete`
  - or update the feature spec

- Do not keep both as separate contradictory end states.

---

### 7) Provider onboarding is missing the **business name** field

The spec requires the provider detail step to collect:

- business name
- service category
- bio
- skills

The implemented provider detail form only collects:

- skills
- phone
- hourlyRate
- bio
- location

Files:

- `src/app/onboarding/components/StepProviderDetails.tsx:17-27`
- `src/app/onboarding/components/StepProviderDetails.tsx`

There is no provider business name field in this onboarding payload, and the onboarding API does not accept/store one.
File: `src/app/api/users/onboarding/route.ts`

**Fix**

- Add `businessName` to the provider onboarding form and API.
- Persist it to the correct model.

---

### 8) Provider onboarding does not collect a primary **service category** as specified

The provider form stores selected `skills` as category IDs, but there is no explicit primary service category field or dedicated service category step/data contract.
Files:

- `src/app/onboarding/components/StepProviderDetails.tsx:99-132`
- `src/app/api/users/onboarding/route.ts:114-158, 323-358`

This may be acceptable if “skills == categories” was the design, but it does **not match the feature wording** and creates ambiguity for downstream ranking, profile setup, and onboarding analytics.

**Fix**

- Decide whether:
  - `skills` are categories, or
  - there is a `primaryCategoryId` plus `skills[]`

- Then model and persist it explicitly.

---

### 9) Client onboarding is missing the **name** field from the required detail step

The spec says client detail step includes:

- name
- location
- preferences

The actual client step asks for:

- phone
- full address
- current location
- optional interests

Files:

- `src/app/onboarding/components/StepClientDetails.tsx`

There is no editable client name in onboarding.

**Fix**

- Add name input or explicitly reuse account name with an editable field.
- Save it if changed.

---

### 10) Phone validation can be bypassed on both client and provider

Phone validation happens only on `onBlur`.
Files:

- Client: `src/app/onboarding/components/StepClientDetails.tsx:112-135`
- Provider: `src/app/onboarding/components/StepProviderDetails.tsx:156-182`

The submit buttons are disabled only by:

- presence of value
- `phoneError`
- `isCheckingPhone`

If the user types an invalid number and immediately clicks continue/complete without blurring, `phoneError` may still be null and the button can remain enabled.

**Result**

- Frontend allows progress
- backend rejects later
- bad UX / broken validation flow

**Fix**

- Run validation on submit as well, not just blur.
- Or validate on change using debounce.
- Disable progression unless the phone has explicitly passed validation.

---

### 11) Manual location edits keep stale GPS coordinates

This is an important broken data flow.

When the user manually edits the location/address, the code changes:

- `location`
- `locationSource = "MANUAL"`
- `locationAccuracy = null`

but **does not clear `latitude` and `longitude`**.

Files:

- Client: `src/app/onboarding/components/StepClientDetails.tsx:251-258`
- Provider: `src/app/onboarding/components/StepProviderDetails.tsx:694-703`

**Why this is bad**
A user can:

1. auto-capture GPS in Westlands
2. manually type “Kisumu”
3. submit `"location": "Kisumu"` with old Nairobi coordinates

That corrupts search, matching, and geospatial behavior.

**Fix**
When manual address changes, either:

- clear `latitude` and `longitude`, or
- re-geocode the manual address to new coordinates before submit.

---

### 12) Location source badge can become inconsistent with persisted form data

The badge reads from `loc.location.source`, not from `clientData.locationSource` / `providerData.locationSource`.
Files:

- Client: `src/app/onboarding/components/StepClientDetails.tsx:137-169`
- Provider: `src/app/onboarding/components/StepProviderDetails.tsx:184-216`

Because the form data and hook state are maintained separately, the displayed source can drift from what is actually submitted.

**Fix**

- Drive the badge from the form state that will actually be sent.
- Keep a single source of truth for onboarding location data.

---

### 13) Onboarding success messaging contradicts provider verification/payment reality

After provider onboarding, `StepComplete` says:

> “You're ready to start getting booked. Redirecting you to create your first service.”

File: `src/app/onboarding/components/StepComplete.tsx:33-35`

But the same codebase also shows providers may still need fee activation or verification review:

- dashboard notice checks payment activation state
  `src/components/dashboard/DashboardLayoutClient.tsx:23-27`
- onboarding complete payment page says verification proceeds after payment confirmation
  `src/app/dashboard/onboarding-complete/page.tsx:61-74`

**Why this is broken**
The UX tells the provider they are fully ready, while the system still treats verification/payment activation as pending.

**Fix**

- Make provider completion state-specific:
  - “Profile submitted”
  - “Payment pending”
  - “Awaiting verification review”
  - “Ready to publish services”

---

### 14) Provider uploads happen before onboarding save, which can orphan files

During provider submission:

- upload ID
- upload selfie
- then POST onboarding payload

File: `src/app/onboarding/page.tsx:314-361`

If onboarding POST fails after upload, the files remain stored with no cleanup.

**Fix**

- Either create a draft onboarding record first, then upload against that record
- or delete uploaded assets on submit failure
- or use a temporary upload state with finalization

---

### 15) Dedicated onboarding shell does not honor auth intent / preselected role

The auth flow builds URLs with `intent=provider` or provider callback paths, but the shared onboarding page does not read intent and does not preselect a role.
Files:

- URL builders: `src/lib/auth/query.ts:48-67`
- onboarding page state: `src/app/onboarding/page.tsx`

So even when auth carries provider intent, `/onboarding` still starts at role selection with no automatic provider path.

**Fix**

- Read `intent` from search params on `/onboarding`
- preselect `PROVIDER` or `CLIENT`
- optionally skip step 1 when intent is explicit

---

### 16) “Phone validation step” exists only as inline blur validation, not as a real onboarding step

The spec calls out phone number validation as a step. The code has the endpoint and uses it, but only inline on blur.
Files:

- `src/app/api/users/onboarding/validate-phone/route.ts`
- `src/app/onboarding/components/StepClientDetails.tsx`
- `src/app/onboarding/components/StepProviderDetails.tsx`

This is more of a spec mismatch than a bug, but it contributes to the broken mental model because step sequencing does not match the defined feature.

---

## What is implemented correctly or mostly correctly

These parts do exist and are functional in structure:

- unified onboarding shell at `/onboarding`
  `src/app/onboarding/page.tsx`
- role selection UI
  `src/app/onboarding/components/StepRoleSelect.tsx`
- phone validation endpoint
  `src/app/api/users/onboarding/validate-phone/route.ts`
- client location capture with manual entry
- provider location capture with manual entry
- provider identity verification with upload/camera capture
- onboarding persistence endpoint for final save
  `src/app/api/users/onboarding/route.ts`

So the feature is not absent. It is just **not aligned end-to-end** with the documented contract.

---

## Status against each requirement

### 3.1 Unified Onboarding Shell

- **3.1.1 `/onboarding`**: implemented
- **3.1.2 role selection**: implemented
- **3.1.3 onboarding state persisted via POST**: **partially implemented only at final submit**
- **3.1.4 phone validation endpoint**: implemented, but UI flow is weak/bypassable

### 3.2 Provider Onboarding Path

- **3.2.1 `/provider/onboarding`**: **broken**
- **3.2.2 provider details**: **partial**; missing business name, ambiguous category handling
- **3.2.3 identity verification**: implemented
- **3.2.4 GPS + denied fallback**: mostly implemented, but data consistency issues exist
- **3.2.5 onboarding fee initiation in flow**: **not implemented as specified**
- **3.2.6 handoff to `/dashboard/onboarding-complete`**: **not implemented**

### 3.3 Client Onboarding Path

- **3.3.1 `/client/onboarding`**: **broken**
- **3.3.2 name, location, preferences**: **partial**; no name field
- **3.3.3 GPS + manual fallback**: implemented structurally, but stale coordinate bug exists
- **3.3.4 redirect to client dashboard**: implemented

---

## Highest-priority fixes in order

1. **Replace `/provider/onboarding` and `/client/onboarding` with real onboarding routes**
2. **Make auth/signup/join callbacks point to the real onboarding flow**
3. **Integrate onboarding fee payment directly into provider onboarding**
4. **Fix manual location editing so stale coordinates are not submitted**
5. **Persist onboarding draft state step-by-step**
6. **Add missing provider business name and client name fields**
7. **Validate phone again on submit, not only on blur**
8. **Align provider completion/redirect copy with actual payment + verification state**

---

## Recommended final flow

### Provider

`auth/signup or login`
→ `/onboarding?intent=provider`
→ role preselected
→ provider details
→ phone verified
→ location captured or manual entry
→ identity verification
→ onboarding fee initiation
→ `/dashboard/onboarding-complete`
→ payment settled
→ dashboard with verification review state

### Client

`auth/signup or login`
→ `/onboarding?intent=client`
→ role preselected
→ name + phone + location + preferences
→ submit
→ `/client/dashboard`

---

## Bottom line

No, this feature is **not fully correct end-to-end**.

The most important broken flows are:

- **wrong dedicated routes**
- **wrong auth callbacks**
- **missing in-flow payment**
- **wrong provider completion redirect**
- **stale manual-location coordinates**
- **missing required onboarding fields**
- **no draft/resume persistence**

Based on a comprehensive review of the provided codebase against your feature specifications, I have identified several broken UI flows, missing data connections, and UX issues within the Onboarding & Role Setup process.

Here is a detailed breakdown of the issues categorized by their respective feature requirements:

### 2. Dedicated Entry Pages Bypass the Actual Onboarding Flow (Spec 3.2.1 & 3.3.1)

**The Issue:**
The specifications mention dedicated onboarding entries at `/provider/onboarding` and `/client/onboarding`. While these pages exist, they act as marketing landing pages and have broken CTA (Call to Action) routing.

- In `src/app/provider/onboarding/page.tsx`, the "Complete Your Profile" button links directly to `/dashboard/profile`.
- In `src/app/client/onboarding/page.tsx`, the "Post Your First Job" button links to `/client/post-job`, and "Create Free Account" links to `/auth/signup`.
- If a new user lands on these pages and clicks the buttons, they will bypass the required unified multi-step shell (`/onboarding`), missing phone validation, location capture, and identity verification.

**The Fix:**
Update the `href` links on both landing pages to point to `/onboarding?role=PROVIDER` and `/onboarding?role=CLIENT`, and update `src/app/onboarding/page.tsx` to read this URL parameter and automatically skip the `StepRoleSelect` component.

### 3. Missing "Business Name" Data Flow (Spec 3.2.2)

**The Issue:**
Spec 3.2.2 states the Provider detail step should include: "business name, service category, bio, and skills".

- In `src/app/onboarding/components/StepProviderDetails.tsx`, the `ProviderData` state interface and the UI form only collect `skills`, `location`, `bio`, `phone`, and `hourlyRate`.
- The `businessName` field is entirely missing from the frontend UI and the backend payload in `src/app/api/users/onboarding/route.ts`.

**The Fix:**
Add a `businessName` text input to `StepProviderDetails.tsx`, include it in the `ProviderData` interface, and update the Prisma `profile.upsert` block in `api/users/onboarding/route.ts` to save it.

### 4. Referral Code Validation Fails Silently & Blocks Onboarding (Spec 3.1.3)

**The Issue:**
In `src/app/onboarding/page.tsx`, the app quietly grabs a referral code from the URL parameters (`?ref=...`) and attaches it to the submission payload.

- If the referral code is malformed or invalid, `src/app/api/users/onboarding/route.ts` returns a `400 Bad Request` with an error like `"Invalid referral code format"`.
- Because there is no UI input showing the referral code in the onboarding forms, the user gets a generic toast error on submission, gets permanently stuck, and has no way to clear the invisible URL parameter.

**The Fix:**
Either display the applied referral code in the UI with a "Remove" button, or update `api/users/onboarding/route.ts` to ignore invalid referral codes rather than throwing a hard 400 error that blocks the entire account creation.

### 5. Identity Verification is a Hard Blocker with No Manual Fallback (Spec 3.2.3)

**The Issue:**
In `src/app/onboarding/components/StepVerification.tsx`, the local `face-api.js` script compares the ID photo to the selfie.

- If the local score drops below `0.72`, `verificationStatus` is set to `"REJECTED"`.
- The "Verify my identity" button requires a `"PASSED"` status to proceed to `handleNext()`.
- If a user has an older ID document where their face has changed slightly, or if they have poor lighting, they are permanently locked out of onboarding.

**The Fix:**
Allow the user to proceed even if the local match fails, but flag the submission payload (`faceMatchScore`) so the admin dashboard knows it requires manual review. Change the "Verify" button to a "Submit for Manual Review" state if `faceMatchScore` is below the threshold.

### 6. Phone Validation API Error Locks the Form (Spec 3.1.4)

**The Issue:**
In both `StepClientDetails.tsx` and `StepProviderDetails.tsx`, the `onBlur` event fires `validatePhone`.

- If `/api/users/onboarding/validate-phone` returns a 500 error or a network failure occurs, `phoneError` is populated.
- The "Complete Setup" / "Continue to verification" buttons are disabled as long as `!!phoneError` is true. A temporary network hiccup permanently bricks the form until the user modifies the input again.

**The Fix:**
In the catch block of `validatePhone` inside the frontend components, allow the user to bypass the error if it's a 500/network error, or add a "Retry" button. Ensure the backend `/users/onboarding` POST route performs a final fallback validation so bad data doesn't get through.

## everything in this document should be addressed and nothing should be ignored
