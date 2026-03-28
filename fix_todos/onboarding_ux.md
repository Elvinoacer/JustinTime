# JustInTime — Onboarding Flow Overhaul Plan

**Scope:** `src/app/onboarding/page.tsx` + supporting components + verification logic  
**Goal:** Fix UX confusion, get precise user location reliably, make selections visually obvious, and upgrade identity verification from face-detection-only to real ID + face matching with a fingerprint hook.

---

## 1. Current State Audit

### 1.1 UX Problems

| #   | Problem                                                                                                                                                                                                                            | Where                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| P1  | Role cards have no selected state — clicking CLIENT/PROVIDER gives zero visual feedback before jumping to step 2                                                                                                                   | Step 1 role selection   |
| P2  | Progress bar labels show "Role / Details / Verify / Complete" but Verify only exists for providers; clients see a broken 3-label bar that jumps to 4-label if they switch roles                                                    | Progress bar            |
| P3  | Category chips are small and the only way to know you've picked one is a tiny change in `CategorySelector` — no persistent summary on mobile until you scroll up                                                                   | Step 2 skills/interests |
| P4  | `handleComplete` is reused for both "go to step 3" and "final submit" — the button label changes between "Next: Verification" and "Complete Setup" but the logic lives in one function with `if/else` chains; this is a bug magnet | `handleComplete()`      |
| P5  | Location is fully optional in the UI (no asterisk, no required attribute on the GPS button) even though `latitude/longitude` are critical for service matching                                                                     | Both step 2 variants    |
| P6  | No back-button state preservation — going Back clears nothing but also doesn't warn the user their data is still there; confusing for first-timers                                                                                 | All steps               |
| P7  | On mobile the "Next: Verification" button text truncates to "Next" via `hidden sm:inline`, which is fine, but the back button on Step 3 just silently goes back without a "your info is still saved" cue                           | Step 3 → Step 2 nav     |
| P8  | No camera/live-capture option for selfie — only file upload. For mobile users this is a missed native UX affordance                                                                                                                | Step 3 selfie           |
| P9  | `verifyIdentity` only checks that both images contain a face — it does not match the face in the ID against the selfie at all. The verification is cosmetic                                                                        | `verifyIdentity()`      |
| P10 | No fingerprint or biometric hook, even though the Web Authentication API supports it on all modern mobile browsers                                                                                                                 | Step 3                  |

### 1.2 Location Problems

| #   | Problem                                                                                                                                                                                                                                                                             | Impact |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| L1  | `navigator.geolocation.getCurrentPosition` is fire-and-forget — on browsers that silently deny the prompt (especially iOS Safari with no prior prompt), the `error` callback fires with code 1 (PERMISSION_DENIED) and the user just sees a toast. There is no guidance or fallback | High   |
| L2  | `enableHighAccuracy: true` is set, but `timeout: 10000` is too short for AGPS cold starts on Android. Users on cheap Android handsets often time out and get an error                                                                                                               | High   |
| L3  | No permission pre-check (`navigator.permissions.query`) before calling `getCurrentPosition` — on Chrome/Edge you can check the state (`granted / denied / prompt`) and tailor the UI accordingly                                                                                    | Medium |
| L4  | No IP-based fallback — if GPS is denied, the user gets nothing. A fallback to an IP geolocation API would at least populate city/region                                                                                                                                             | Medium |
| L5  | Reverse geocoding calls Nominatim (OpenStreetMap) without a User-Agent header, which violates their usage policy and will rate-limit production traffic                                                                                                                             | Medium |
| L6  | Coordinates stored to 4 decimal places in the UI display but full float precision is sent to the DB — fine, but the user has no way to manually correct a bad GPS fix                                                                                                               | Low    |

### 1.3 Verification Problems

| #   | Problem                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Current `verifyIdentity()` only detects that both images have a face. It does not compare them — a user could upload any two photos with human faces and pass |
| V2  | No ID document authenticity check — orientation, text zones, hologram patterns are completely ignored                                                         |
| V3  | No real-time camera capture for ID scan (LinkedIn-style)                                                                                                      |
| V4  | No fingerprint / WebAuthn step                                                                                                                                |
| V5  | face-api.js models are loaded in a `useEffect` on mount, causing a delay with no loading skeleton for the verification step                                   |

---

## 2. Plan

### Phase 1 — UX & Navigation Overhaul

#### 1A. Separate step logic into individual components

Currently all four steps live in one 700-line component. Split into:

```
src/app/onboarding/
├── page.tsx                     ← orchestrator only (step state, router)
├── components/
│   ├── OnboardingShell.tsx      ← progress bar, animated wrapper
│   ├── StepRoleSelect.tsx       ← step 1
│   ├── StepClientDetails.tsx    ← step 2 (client)
│   ├── StepProviderDetails.tsx  ← step 2 (provider)
│   ├── StepVerification.tsx     ← step 3 (provider only)
│   └── StepComplete.tsx         ← step 4
```

`page.tsx` becomes:

```tsx
const steps =
  selectedRole === "PROVIDER"
    ? ["Role", "Details", "Verify", "Done"]
    : ["Role", "Details", "Done"];
```

#### 1B. Fix role card selected state

The role cards must show a clear selected state when clicked BEFORE transitioning to step 2. Add a 300ms pause so the user sees the selection visually confirmed:

```tsx
const handleRoleSelect = (role: Role) => {
  setSelectedRole(role);
  // Show selection briefly before advancing
  setTimeout(() => setCurrentStep(2), 350);
};
```

The selected card gets a solid border + filled background + a checkmark badge:

- `border-emerald-500 bg-emerald-50` for CLIENT
- `border-blue-500 bg-blue-50` for PROVIDER
- Checkmark `✓` absolutely positioned top-right corner

#### 1C. Persistent selection summary bar

After any category/skill selection in Step 2, show a sticky bottom-anchored pill strip (on mobile) or a side panel (on desktop) listing all selected items. This strip is always visible while scrolling through the category grid.

```tsx
// Bottom of StepProviderDetails / StepClientDetails
{
  selectedIds.length > 0 && (
    <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex flex-wrap gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      {selectedIds.map((id) => (
        <Chip
          key={id}
          label={getCategoryName(id)}
          onRemove={() => onToggle(id)}
        />
      ))}
    </div>
  );
}
```

This directly fixes P3.

#### 1D. Split handleComplete into discrete handlers

Replace the overloaded `handleComplete` with clear functions:

- `handleStep2Next()` — validates step 2, advances to step 3 or submits (client)
- `handleStep3Next()` — validates verification status, submits (provider)
- `handleSubmit()` — actual API call + session update

#### 1E. Progress bar fix

Dynamic based on role and step:

```tsx
const totalSteps = selectedRole === "PROVIDER" ? 4 : 3;
const progress = (currentStep / totalSteps) * 100;
const labels =
  selectedRole === "PROVIDER"
    ? ["Role", "Details", "Verify", "Done"]
    : ["Role", "Details", "Done"];
```

Render step dots (not just a bar) so the user can see exactly where they are:

```
● ──── ● ──── ○ ──── ○
Role  Details  Verify  Done
```

Each dot is filled/colored for completed steps and outlined for future steps.

---

### Phase 2 — Reliable Location Acquisition

The goal is to get latitude/longitude with the highest possible success rate across all browsers and devices.

#### 2A. Permission pre-check before prompt

Before calling `getCurrentPosition`, check if permission was already granted or denied:

```ts
const getLocationWithPermissionCheck = async (
  userType: "provider" | "client",
) => {
  // Step 1: Check permission status (Chrome, Edge, Firefox — not Safari)
  if ("permissions" in navigator) {
    const perm = await navigator.permissions.query({ name: "geolocation" });
    if (perm.state === "denied") {
      // Show instructions panel instead of toast
      setLocationStatus("DENIED");
      return;
    }
  }
  // Step 2: Attempt GPS
  requestGPSLocation(userType);
};
```

#### 2B. Multi-attempt GPS with escalating timeout

```ts
const GPS_OPTIONS_TIERS = [
  { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }, // Tier 1: precise, fresh
  { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }, // Tier 2: fast, allow cached
];

const requestGPSLocation = (userType: string, tier = 0) => {
  if (tier >= GPS_OPTIONS_TIERS.length) {
    // All GPS tiers failed — fall back to IP
    requestIPFallbackLocation(userType);
    return;
  }
  setIsGettingLocation(true);
  navigator.geolocation.getCurrentPosition(
    (pos) => onGPSSuccess(pos, userType),
    (err) => {
      if (err.code === err.TIMEOUT) {
        // Try next tier
        requestGPSLocation(userType, tier + 1);
      } else {
        // PERMISSION_DENIED or POSITION_UNAVAILABLE
        requestIPFallbackLocation(userType);
      }
    },
    GPS_OPTIONS_TIERS[tier],
  );
};
```

#### 2C. IP geolocation fallback

When GPS fails or is denied, call a free IP geolocation API:

```ts
const requestIPFallbackLocation = async (userType: string) => {
  try {
    // ip-api.com free tier: 45 req/min, no key needed
    const res = await fetch(
      "http://ip-api.com/json/?fields=lat,lon,city,regionName,country",
    );
    const data = await res.json();
    if (data.lat && data.lon) {
      const address = `${data.city}, ${data.regionName}, ${data.country}`;
      applyLocation(userType, data.lat, data.lon, address, "IP");
    }
  } catch {
    setLocationStatus("FAILED");
  } finally {
    setIsGettingLocation(false);
  }
};
```

Show a clear UI indicator of the accuracy source:

- 🎯 GPS (high accuracy) — green badge
- 📶 Network/IP (approximate) — yellow badge with city-level note
- ❌ Location unavailable — red with manual entry prompt

#### 2D. Fix Nominatim reverse geocoding

Add the required `User-Agent` header and add a timeout:

```ts
const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    {
      headers: {
        "User-Agent": "JustInTime/1.0 (support@gtss.software)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(5000),
    },
  );
  const data = await res.json();
  return data.display_name ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
};
```

#### 2E. Manual location correction

After GPS captures, allow the user to manually type a correction in the location text field (which is currently read-only when GPS fills it). Keep GPS coordinates stored but let the human-readable address be editable.

#### 2F. Location permission denied — browser instructions modal

When permission is DENIED, show a modal with OS-specific instructions:

```
Your browser has blocked location access.
To fix this:

[Android Chrome] Tap the lock icon in your address bar → Site settings → Location → Allow
[iOS Safari]     Go to Settings → Safari → Location → Allow
[Desktop Chrome] Click the lock icon in the URL bar → Location → Allow
```

---

### Phase 3 — Identity Verification Upgrade

This is the most complex phase. The plan breaks it into three independent sub-systems, each buildable in isolation.

#### 3A. Face-to-ID matching using face-api.js (immediate — no new library)

The current `verifyIdentity()` already loads all three required models (`ssdMobilenetv1`, `faceLandmark68Net`, `faceRecognitionNet`). The models are already there to do a proper match — they just aren't being used for comparison. Fix this now with the existing stack:

```ts
const verifyIdentity = async () => {
  // ... existing face detection code ...

  // Both faces detected — now ACTUALLY COMPARE THEM
  const distance = faceapi.euclideanDistance(
    idDetection.descriptor,
    selfieDetection.descriptor,
  );

  // Threshold explanation:
  // 0.4 = very strict (twins would fail)
  // 0.6 = standard (same person, different lighting)
  // 0.7 = lenient (handles 10-20 year old ID photos)
  // 0.75 = very lenient (handles heavy beard growth, glasses etc)
  const MATCH_THRESHOLD = 0.72; // Lenient to account for aged ID photos

  if (distance > MATCH_THRESHOLD) {
    setVerificationStatus("REJECTED");
    setVerificationMessage(
      `Face match failed (distance: ${distance.toFixed(2)}). ` +
        `Please ensure your selfie clearly shows your face, similar to your ID photo.`,
    );
    return;
  }

  setVerificationStatus("VERIFIED");
  setVerificationMessage(
    `Identity verified ✓ (match score: ${((1 - distance) * 100).toFixed(0)}%)`,
  );
};
```

**Important threshold notes for Elvin:**

- `0.72` is the recommended starting threshold for a "somewhat lenient" match
- For IDs taken 20+ years ago, consider `0.78`
- Store the distance score in the DB alongside `verificationStatus` so admin can audit
- Add a new Prisma field: `faceMatchScore Float?`

#### 3B. Real-time ID document scan (camera capture)

Add a camera-capture option alongside file upload for both ID and selfie. This is the "LinkedIn-style" experience.

**New component: `CameraCapture.tsx`**

```tsx
// Uses MediaDevices API — works on all modern mobile browsers
// Falls back gracefully when camera is unavailable

const CameraCapture = ({ onCapture, onClose, facingMode = "user" }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode } })
      .then((s) => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => onClose()); // Graceful degradation
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const capture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current!.videoWidth;
    canvas.height = videoRef.current!.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current!, 0, 0);
    canvas.toBlob((blob) => blob && onCapture(blob), "image/jpeg", 0.92);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full max-w-lg rounded-xl"
      />
      <div className="flex gap-4 mt-6">
        <button onClick={capture} className="...">
          📸 Capture
        </button>
        <button onClick={onClose} className="...">
          Cancel
        </button>
      </div>
    </div>
  );
};
```

**ID-specific UX:**

- Use `facingMode: 'environment'` (rear camera) for ID scanning
- Overlay a card-shaped guide frame on the live video (dashed border, ID-sized aspect ratio)
- Show a prompt: "Hold your ID flat, ensure all corners are visible"

**Selfie-specific UX:**

- Use `facingMode: 'user'` (front camera)
- Overlay an oval face guide
- Show a prompt: "Look straight ahead, ensure your face fills the oval"

**Upload vs. Scan toggle:**
Each upload zone gets two options:

```
┌─────────────────────────────────┐
│  [📸 Use Camera]  [📁 Upload File] │
└─────────────────────────────────┘
```

#### 3C. Open-source ID document validation

For checking that the uploaded document looks like a real ID (layout, text zones, etc.), use **Tesseract.js** — available as an npm package, runs entirely in the browser.

**Package:** `tesseract.js` (already MIT licensed, no API key)

```ts
import Tesseract from "tesseract.js";

const validateIDDocument = async (
  idFile: File,
): Promise<{
  hasText: boolean;
  suspectedDocType: "national_id" | "passport" | "unknown";
  nameFound: boolean;
}> => {
  const {
    data: { text },
  } = await Tesseract.recognize(idFile, "eng", {
    logger: () => {}, // Suppress console spam
  });

  const upper = text.toUpperCase();

  return {
    hasText: text.trim().length > 20,
    suspectedDocType: upper.includes("PASSPORT")
      ? "passport"
      : upper.includes("NATIONAL ID") || upper.includes("REPUBLIC OF KENYA")
        ? "national_id"
        : "unknown",
    nameFound: /[A-Z]{2,}\s+[A-Z]{2,}/.test(text), // Two+ capitalized words = likely a name
  };
};
```

This runs client-side so no PII leaves the browser before the upload. Run this **in parallel** with face detection — don't block verification on it, just use it as a secondary signal.

**Minimum acceptance criteria for ID:**

1. Image has detectable text (`hasText: true`)
2. At least one face detected by face-api.js
3. Face in ID matches selfie face (distance < threshold)

All three must pass for `VERIFIED`.

#### 3D. Fingerprint / WebAuthn integration

The Web Authentication API (WebAuthn) supports fingerprint, Face ID, and Windows Hello. It works on: Android Chrome (fingerprint), iOS Safari 16+ (Face ID / Touch ID), Windows Chrome/Edge (Windows Hello).

**When to use it:**

- Not as the primary onboarding verification (biometrics can't prove identity on first registration — the device has no template to compare against)
- Use it as a **2FA confirmation step** at the end of onboarding
- Future: use it for subsequent logins without a password

**Implementation plan:**

```ts
// Check if the device supports biometric auth
const checkBiometricSupport = async (): Promise<{
  supported: boolean;
  type: "fingerprint" | "face" | "pin" | "none";
}> => {
  if (!window.PublicKeyCredential) return { supported: false, type: "none" };

  const available =
    await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  if (!available) return { supported: false, type: "none" };

  // We can't detect the specific biometric type from the API
  // iOS → Face ID/Touch ID, Android → Fingerprint/Face, Windows → Hello
  return { supported: true, type: "fingerprint" }; // Generic label for now
};

// Register biometric credential during onboarding
const registerBiometric = async (userId: string, userName: string) => {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "JustInTime", id: window.location.hostname },
      user: {
        id: Uint8Array.from(userId, (c) => c.charCodeAt(0)),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Device biometric only (not USB keys)
        userVerification: "required",
      },
      timeout: 60000,
    },
  });

  // Send credential.id and credential.response to server for storage
  return credential;
};
```

**New Prisma fields needed:**

```prisma
webAuthnCredentialId    String?  // The credential ID from WebAuthn registration
webAuthnPublicKey       String?  // Base64 encoded public key
biometricRegisteredAt   DateTime?
```

**UX for biometric step:**

- After passing ID verification, show an optional "Secure your account with fingerprint/Face ID" prompt
- Make it skippable — some users will be on desktops
- Show device-appropriate icon: fingerprint (🖐️) on Android, Face ID icon on iOS

---

### Phase 4 — Database Changes

Add the following fields to the Prisma `User` model:

```prisma
// Verification improvements
faceMatchScore          Float?    // Score from face-api.js comparison (0.0 - 1.0)
idDocumentType          String?   // 'national_id' | 'passport' | 'drivers_license'
verificationAttempts    Int       @default(0) // Track failed attempts
lastVerificationAt      DateTime?

// Biometric
webAuthnCredentialId    String?
webAuthnPublicKey       String?   @db.Text
biometricRegisteredAt   DateTime?

// Location accuracy
locationSource          String?   @default("MANUAL") // GPS | IP | MANUAL
locationAccuracy        Float?    // Meters accuracy from GPS
```

New migration: `add_verification_and_biometric_fields`

---

### Phase 5 — API Changes

#### 5A. `/api/users/onboarding` — extend payload

Add to the onboarding POST body:

```ts
{
  // Existing fields...
  faceMatchScore: number | null;
  idDocumentType: string | null;
  locationSource: 'GPS' | 'IP' | 'MANUAL';
  locationAccuracy: number | null;
  webAuthnCredentialId?: string;
  webAuthnPublicKey?: string;
}
```

#### 5B. New route: `/api/auth/webauthn/register`

Receives the WebAuthn credential from the browser, verifies the attestation, and stores `credentialId` and `publicKey` against the user.

#### 5C. New route: `/api/auth/webauthn/authenticate`

For subsequent logins — verifies WebAuthn assertion. Out of scope for this PR but should be stubbed.

---

### Phase 6 — Implementation Order

Execute phases in this order to ship incrementally:

| Priority | Task                                                                         | Effort | Impact                       |
| -------- | ---------------------------------------------------------------------------- | ------ | ---------------------------- |
| 🔴 P0    | Fix `handleComplete` split (P4 UX bug)                                       | 1h     | Prevents submission bugs     |
| 🔴 P0    | Fix verification to actually compare faces (V1) with `euclideanDistance`     | 1h     | Core security fix            |
| 🔴 P0    | Fix Nominatim User-Agent header (L5)                                         | 30min  | Prevents rate limits in prod |
| 🟠 P1    | Role card selected state + 350ms delay (P1, P2)                              | 1h     | UX clarity                   |
| 🟠 P1    | GPS permission pre-check + multi-tier timeout + IP fallback (L1, L2, L3, L4) | 3h     | Core reliability             |
| 🟠 P1    | Persistent category selection summary strip (P3)                             | 2h     | UX clarity                   |
| 🟠 P1    | Step dot progress bar (P5)                                                   | 1h     | UX clarity                   |
| 🟡 P2    | Component split (1A)                                                         | 2h     | Maintainability              |
| 🟡 P2    | Camera capture for ID + selfie (3B)                                          | 4h     | UX parity with LinkedIn      |
| 🟡 P2    | Tesseract.js ID document validation (3C)                                     | 3h     | Verification depth           |
| 🟡 P2    | DB migration for new fields (Phase 4)                                        | 30min  | Enabler for above            |
| 🟢 P3    | WebAuthn fingerprint registration (3D)                                       | 4h     | Security enhancement         |
| 🟢 P3    | Permission-denied browser instructions modal (2F)                            | 1h     | Edge case UX                 |
| 🟢 P3    | Manual location correction after GPS (2E)                                    | 1h     | Edge case UX                 |

Total estimated effort: ~25 hours of focused implementation.

---

## 3. Package Dependencies

The following npm packages are needed. All are free, open-source, and client-side (no API keys, no PII sent to third parties):

```bash
# Already in the project
# face-api.js ✓ (currently installed)
# framer-motion ✓
# react-image-crop ✓ (for selfie cropper)

# New additions
npm install tesseract.js         # OCR for ID document text extraction (MIT)
# WebAuthn — no package needed, it's a native browser API
# MediaDevices — no package needed, native browser API
# ip-api.com — no package needed, just a fetch() call
```

---

## 4. Open Questions

1. **Face match threshold:** `0.72` is the recommended starting point. Should the threshold be different for CLIENT vs PROVIDER onboarding? Providers are doing paid work so a stricter `0.65` might be warranted.

2. **Selfie as avatar:** Currently the selfie is uploaded as the user's profile picture. After this plan, the selfie is also used for face verification. Confirm this dual use is intentional — or add a separate "profile photo" step after verification.

3. **Biometric opt-in timing:** Should the fingerprint/WebAuthn prompt appear inside the onboarding flow (Step 4) or as a post-onboarding prompt on the dashboard? Inside the flow is higher completion but adds friction. Dashboard prompt is lower friction but lower completion.

4. **IP geolocation for providers:** IP geolocation accuracy is city-level (~50km radius). For providers, this may be too coarse to be useful. If GPS fails for a provider, should they be forced to manually type their location rather than accepting an IP-derived one?

5. **Admin ID review:** Even with automated face matching, should there be a manual admin review queue for newly registered providers before their account is activated? The current `verificationStatus: "PENDING"` field supports this — it just needs an admin UI action to flip to `"VERIFIED"`.
