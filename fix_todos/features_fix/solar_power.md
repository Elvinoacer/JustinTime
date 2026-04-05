I inspected the solar vertical implementation in the codebase. The feature is **only partially built**: the schema exists, two public pages exist, and a few server actions exist, but most end-to-end flows are broken, incomplete, unreachable, or unsafe.

## What is actually implemented

Present:

- Public landing page: `src/app/solar/page.tsx`
- Public estimate wizard: `src/app/solar/estimate/page.tsx`
- Solar actions: `src/app/actions/solar.ts`
- Estimation library: `src/lib/solar/estimation-calculator.ts`
- Prisma models: `VerticalCategory`, `VerticalCertification`, `VerticalSpecialist`, `EquipmentRegistry`, `ProjectTemplate`, `VerticalProject`, `ProjectMilestone`, `SolarEstimationConfig` in `prisma/schema.prisma`

Missing in practice:

- no `/solar/installers` route
- no `/dashboard/solar*` pages
- no solar specialist management UI
- no certification submission UI
- no quote request UI
- no solar project dashboard UI
- no milestone UI
- no equipment/template management UI
- no vertical availability action at all

The repo’s own testing guide already notes the missing dashboard routes at `docs/features/testing-guide.md:677`.

---

## Exhaustive broken UI and data flows

# 18.1 Discovery & Estimation

### 18.1.1 Dedicated solar landing page at `/solar`

This page exists, but several flows on it are broken.

**Broken flows**

- `Browse Installers` points to `/solar/installers`, but that route does not exist. See `src/app/solar/page.tsx:58`.
- `View All` in the featured installers section also points to the same missing route. See `src/app/solar/page.tsx:216`.
- The “quick estimate” form is non-functional:
  - it defines a server action shell that does nothing: `src/app/solar/page.tsx:98-102`
  - the CTA is a `Link`, not a submit button, so the entered bill is discarded: `src/app/solar/page.tsx:116-122`

- The three “Avg System Size / Average Cost / Avg Payback” values are hardcoded marketing numbers, not derived from `getQuickSolarEstimate`.
- Featured installer profile links point to `/profile/${specialist.user.id}`, but there is no public `/profile/[id]` route in `src/app`. Public professional profiles live under `/professionals/[id]`. Broken link at `src/app/solar/page.tsx:274`.
- Marketing trust claims are hardcoded:
  - “Government-verified solar installers”
  - “EPRA Certified”
  - “5-Year Warranty”
    Those are not derived from certification records or warranty data on the rendered specialists.

**Impact**

- Public acquisition funnel breaks at first click.
- Lead intent entered on landing page is lost.
- Trust signals are overstated relative to actual data.

**Fix**

- Build `/solar/installers` or replace all those links with `/professionals?category=solar-installation` or a dedicated solar-filtered professionals page.
- Replace the quick estimate form with a real submit flow:
  - either redirect to `/solar/estimate?monthlyBill=15000`
  - or call `getQuickSolarEstimate` and render instant results in-place.

- Change profile links to `/professionals/${specialist.user.id}`.
- Replace static trust copy with data-backed badges only when certification/verification exists.

---

### 18.1.2 Multi-step solar estimate wizard at `/solar/estimate`

The page exists, but the wizard is not complete and does not hand off to the next business step.

**Broken flows**

- The wizard says “multi-step detailed estimate,” but several supported inputs are not actually collected:
  - `roofType` state exists but there is no UI control to change it from default `"pitched"`.
  - `backupHours` state exists but there is no UI control.
  - `isOffGrid` state exists but there is no UI control.
  - `roofArea` is supported by the library but never collected.
  - `county` is supported by the library but never collected.

- There is no form validation:
  - negative or nonsensical monthly bills can be passed
  - `parseFloat("")` / malformed values can produce invalid calculations
  - no upper/lower bounds

- There is no error handling if `getDetailedSolarEstimate` fails.
- The wizard ends in another dead link to `/solar/installers`: `src/app/solar/estimate/page.tsx:408`.
- There is no “request quote”, “save estimate”, “match specialist”, or “book site survey” handoff. So the estimate flow ends without entering project lifecycle.

**Impact**

- Users cannot complete a true solar quote flow.
- “Detailed estimate” is materially under-specified.
- High-intent leads fall out after estimate generation.

**Fix**

- Add missing wizard fields:
  - property type
  - roof type
  - roof area
  - battery yes/no
  - battery type
  - backup hours
  - on-grid/off-grid
  - county/location

- Add Zod validation on both client and server.
- Add error state and retry state.
- Replace final CTA with:
  - “Request site assessment”
  - “Get matched to installers”
  - “Save estimate and continue”

- Connect that CTA to `requestSolarQuote`.

---

### 18.1.3 Quick estimate and detailed estimate actions via `solar.ts`

Both actions exist, but only one is reachable, and neither is production-grade.

**Broken flows**

- `getQuickSolarEstimate` exists in `src/app/actions/solar.ts:31` but is not used by the landing page.
- `getDetailedSolarEstimate` exists in `src/app/actions/solar.ts:42`, but the wizard does not provide enough inputs to make it genuinely detailed.
- Neither action validates input shape or ranges before calculation.

**Impact**

- Quick estimate feature is effectively dead code.
- Detailed estimate is weaker than advertised.
- Bad input can propagate to bad outputs.

**Fix**

- Add shared Zod schemas for quick and detailed estimate actions.
- Use `getQuickSolarEstimate` on landing page.
- Use `getDetailedSolarEstimate` only after collecting all required fields.
- Return structured validation errors for field-level UI messaging.

---

### 18.1.4 Estimation calculator library for sizing and ROI outputs

The library exists, but several inputs are ignored and config integration is missing.

**Broken logic**

- `propertyType` is accepted in `SolarEstimationInput` but never used in calculations.
- `roofType` is accepted but never used.
- `roofArea` is accepted but never used.
- `county` is accepted but never used.
- The comment says pricing “can be overridden by `SolarEstimationConfig`” at `src/lib/solar/estimation-calculator.ts:6`, but the library never reads from DB config.
- ROI logic is simplistic and not tied to actual tariffs, degradation, or financing assumptions.
- `monthlySavings` is derived from generation using a constant factor, not capped against actual bill or differentiated by property/load profile.
- Off-grid behavior is not represented in the UI even though it changes battery sizing.

**Impact**

- Large parts of the estimator are placebo inputs.
- Results will look precise but are not grounded in the configuration model.
- Admin-configurable pricing is not actually configurable.

**Fix**

- Split the calculator into:
  - deterministic engineering calculation
  - configurable pricing engine
  - ROI assumptions engine

- Make action layer load active `SolarEstimationConfig` from DB.
- Use `county` via `locationMultipliers`.
- Use `roofArea` to validate whether the system physically fits.
- Use `propertyType` and `roofType` to apply install complexity multipliers.

---

### 18.1.5 Solar estimation configuration model: `SolarEstimationConfig`

The model exists in Prisma, but it is disconnected.

**Broken flows**

- No action reads from it.
- No admin UI manages it.
- No seed/default active config is guaranteed.
- No versioning or “current active config” selection logic is present.

**Impact**

- The configuration model is inert.
- Ops/admin cannot tune pricing without code changes.

**Fix**

- Add an admin action and page to manage the active solar pricing config.
- Make all estimate actions resolve the current active config.
- Add fallback behavior if no config exists.
- Keep config snapshots on quote/project creation so historical quotes remain stable.

---

# 18.2 Specialist Management

### 18.2.1 Solar specialist registration action

The action exists in `src/app/actions/solar.ts:123`, but the flow is incomplete.

**Broken flows**

- There is no UI route or form that calls `registerAsSolarSpecialist`.
- No role/permission guard ensures only providers can register as specialists.
- No validation enforces `minExperienceYears` from `VerticalCategory`.
- No linkage to existing provider profile/service profile.
- Revalidation targets `/dashboard/solar`, which does not exist: `src/app/actions/solar.ts:181`.

**Impact**

- Registration is unreachable from UI.
- Any authenticated user could potentially become a specialist, including clients.
- Revalidation is pointed at a dead route.

**Fix**

- Create a provider-only page like `/dashboard/verticals/solar/apply`.
- Require provider role and completed onboarding.
- Validate experience against vertical requirements.
- Revalidate the real management route, not `/dashboard/solar`.

---

### 18.2.2 Vertical certification submission workflow backed by `VerticalCertification`

The action exists in `src/app/actions/solar.ts:192`, but the workflow is not complete.

**Broken flows**

- No UI for submitting certifications.
- No upload widget or document storage handoff is shown in this feature.
- The action depends on the SOLAR vertical existing first; if the vertical hasn’t been created yet, it fails with “Solar vertical not found.”
- No graceful handling of unique constraint collisions on `(verticalId, userId, name)`.
- Revalidation points to another missing route: `/dashboard/solar/certifications` at `src/app/actions/solar.ts:223`.
- No visible admin review UI tied to this solar workflow.

**Impact**

- Certification lifecycle is unreachable and brittle.
- First-time submissions can fail depending on data bootstrap state.
- Duplicate submissions will likely surface as generic server failures.

**Fix**

- Ensure solar vertical bootstrap exists independently of specialist registration.
- Add certification submission page and uploader.
- Catch Prisma unique violations and return friendly errors.
- Add solar certification review queue for admins, or wire into existing verification admin flow.
- Revalidate the actual page used.

---

### 18.2.3 Featured solar specialist retrieval action

This part exists and is the only specialist-management piece actually visible.

**Problems**

- It only returns `isVerified: true` specialists, but newly registered specialists are created with `isVerified: false`. Without a visible verification path, they never surface on `/solar`.
- The featured list is server-rendered correctly, but the public card links are broken, as noted earlier.
- There is no fallback UX when there are zero specialists.

**Fix**

- Add a pending-review lifecycle and onboarding state for solar specialists.
- Add an empty-state CTA:
  - “No verified solar installers yet”
  - “Request a quote”
  - “Apply as solar specialist”

---

### 18.2.4 Vertical availability retrieval action

This requirement is **missing**.

**Evidence**

- No availability retrieval action exists in `src/app/actions/solar.ts`.
- No solar availability UI or API exists under `src/app`.

**Impact**

- Specialist matching cannot consider service radius, scheduling, or current capacity.
- The project quote flow cannot assign or recommend specialists intelligently.

**Fix**

- Add `getSolarSpecialistAvailability` action that combines:
  - specialist service radius
  - provider availability
  - optional geo matching
  - current workload / project count

- Surface it in `/solar/installers` and quote-assignment flow.

---

### 18.2.5 Vertical specialist model: `VerticalSpecialist`

The model exists, but operationalization is incomplete.

**Broken flows**

- No management UI for specialists to edit solar-specific fields.
- No admin UI for featured toggle / verification state.
- No public directory route dedicated to this model.
- No sync with general provider profile, ratings, or completed job history.

**Impact**

- Solar specialist data can exist in DB but has weak lifecycle and low discoverability.

**Fix**

- Add:
  - provider solar profile page
  - admin review/feature controls
  - public solar specialist directory

- Sync `projectsCompleted`, `averageRating`, and `totalRevenue` from actual project/booking/review events instead of manual drift.

---

# 18.3 Project Lifecycle

### 18.3.1 Solar quote request action

The action exists at `src/app/actions/solar.ts:236`, but it is not wired to the UI and has major data integrity issues.

**Broken flows**

- No UI calls `requestSolarQuote`.
- It requires the SOLAR vertical row to already exist; otherwise it fails.
- It creates a `VerticalProject` with:
  - `clientId = session.user.id`
  - `providerId = session.user.id`
    This is a major modeling bug at `src/app/actions/solar.ts:277-279`.

- It hardcodes panel type to monocrystalline and battery type to lithium, ignoring the estimate wizard’s actual choices.
- It does not capture `backupHours`, `panelType`, `county`, coordinates, or any selected specialist.
- It creates project and milestone in two separate writes, not a transaction. If milestone creation fails, you get a half-created project.
- Revalidation points to missing `/dashboard/solar/projects`.

**Impact**

- Client and provider ownership are corrupted from project inception.
- Quote request data is lossy relative to the estimate.
- Project history can become inconsistent.

**Fix**

- Make `providerId` nullable in `VerticalProject`, or create a separate `VerticalQuoteRequest` model before provider assignment.
- Pass through actual estimate selections from the wizard.
- Wrap project + first milestone creation in `prisma.$transaction`.
- Add assignment flow:
  - unassigned quote request
  - shortlisted specialists
  - accepted specialist
  - then create/attach provider

---

### 18.3.2 Project and milestone models: `VerticalProject`, `ProjectMilestone`

Models exist, but the lifecycle around them is skeletal.

**Broken flows**

- No project detail page.
- No milestone creation/update/complete UI.
- No milestone checklist UI.
- No payment milestone handling.
- No document/photo workflow attached to the project model.
- No transition from quote request to site assessment to proposal to approval in UI.

**Impact**

- Lifecycle data exists in schema but not in product.

**Fix**

- Add:
  - `/client/solar/projects/[id]`
  - `/dashboard/verticals/solar/projects/[id]`
  - milestone timeline component
  - milestone completion actions
  - upload support for proposal, contract, photos

- Model the workflow explicitly as a state machine.

---

### 18.3.3 Project status update actions

The action exists at `src/app/actions/solar.ts:347`, but it is unsafe and incomplete.

**Broken flows**

- No authorization check beyond “authenticated user.”
  Any logged-in user who can obtain a project ID can call `updateProjectStatus`.
- No ownership check against `clientId` or `providerId`.
- No vertical check.
- No allowed transition validation.
  Example: a project can jump from `QUOTE_REQUESTED` straight to `COMPLETED`.
- `notes` parameter is accepted but never used.
- No milestone updates are triggered when status changes.
- No audit/history record is created.
- Revalidation again points to a missing route.

**Impact**

- This is the most serious backend flaw in the feature.
- Project state can be tampered with and drift from milestone reality.

**Fix**

- Enforce authz:
  - client may approve/cancel
  - provider may move operational statuses
  - admin may override

- Add a transition map.
- Persist status notes/history.
- Auto-create or update milestones on valid transitions.
- Revalidate actual client/provider project detail routes.

---

### 18.3.4 Equipment registry and project template models

Both models exist, but they are completely disconnected from the product flow.

**Broken flows**

- No actions to CRUD `EquipmentRegistry`.
- No actions to CRUD `ProjectTemplate`.
- `requestSolarQuote` does not select a template.
- No staffing/equipment readiness check before provider assignment.
- No template-based milestone generation.

**Impact**

- These models are dead weight right now.
- Project execution cannot be standardized or operationalized.

**Fix**

- Add template selection during quote-to-project conversion.
- Generate milestones from `ProjectTemplate.phases`.
- Add provider equipment registry management page.
- Use required equipment + certifications to qualify specialists for assignment.

---

### 18.3.5 Vertical category model: `VerticalCategory`

The model exists, but solar bootstrap is flawed.

**Broken flows**

- `registerAsSolarSpecialist` lazily creates the SOLAR vertical if missing.
- `submitCertification` and `requestSolarQuote` do not; they simply fail if the vertical does not exist.
- There is no guaranteed seed path for the solar category.

**Impact**

- Whether a quote request works can depend on whether a specialist happened to register earlier.
- The public customer flow is coupled to provider bootstrap state.

**Fix**

- Seed all vertical categories in migration or bootstrap script.
- Remove runtime “create vertical if missing” from registration action.
- Treat `VerticalCategory` as controlled reference data, not ad hoc runtime data.

---

## Cross-cutting defects

These cut across the whole feature.

### Dead-route problem

Referenced but missing:

- `/solar/installers`
- `/dashboard/solar`
- `/dashboard/solar/certifications`
- `/dashboard/solar/projects`

This breaks both UI navigation and revalidation strategy.

### Missing end-to-end funnel

Current reality:
`/solar` → `/solar/estimate` → dead link

Needed:
`/solar` → estimate → save quote request → match specialists → project lifecycle → milestone tracking

### Missing validation everywhere

No Zod or equivalent for:

- estimate inputs
- specialist registration inputs
- certification submission inputs
- quote request inputs
- status transitions

### No vertical scoping on “my projects”

`getMySolarProjects` in `src/app/actions/solar.ts:324-327` filters only by `clientId/providerId`, not by solar `verticalId`. Once more verticals are added, this action will leak non-solar vertical projects into solar views.

### Placeholder provider modeling bug

`VerticalProject.providerId` is required in schema, which forces the code into the wrong placeholder behavior. This is the root cause behind client=self-provider corruption.

### No actual integration with existing marketplace primitives

The solar vertical does not meaningfully integrate with:

- professionals directory
- provider onboarding
- booking flow
- reviews
- availability
- messaging
- notifications

---

## Fix plan: what to do in order

## Phase 1: Stop the bleeding

1. Replace or build all dead routes.
2. Change solar profile links to `/professionals/[id]`.
3. Make the landing quick estimate actually submit.
4. Remove or qualify unsupported trust claims.
5. Add validation to all solar actions.

## Phase 2: Repair the data model

1. Seed `VerticalCategory` for SOLAR.
2. Make `VerticalProject.providerId` nullable until assignment, or split quote requests into a separate model.
3. Add transition rules for `ProjectStatus`.
4. Add solar scoping in `getMySolarProjects`.
5. Wrap project + milestone creation in a transaction.

## Phase 3: Complete the acquisition funnel

1. Finish the estimate wizard fields.
2. Add “Request quote” from results.
3. Persist selected estimate inputs onto the quote/project record.
4. Add confirmation screen and quote tracking entry point.

## Phase 4: Build specialist operations

1. Add provider solar application page.
2. Add certification submission page.
3. Add admin verification/review tooling.
4. Add featured/verified specialist management.
5. Add solar installers directory page.

## Phase 5: Build actual project execution

1. Add client and provider solar project pages.
2. Add milestone generation from `ProjectTemplate`.
3. Add milestone completion actions and timeline UI.
4. Add status notes, audit trail, documents, and photos.
5. Add provider assignment and availability matching.

---

## Recommended target architecture

Use this flow:

**Customer**

- `/solar`
- `/solar/estimate`
- submit estimate → create `VerticalQuoteRequest` or unassigned `VerticalProject`
- match top specialists by service radius + availability + certification
- customer picks specialist or receives proposals
- accepted proposal becomes assigned `VerticalProject`

**Specialist**

- apply as solar specialist
- submit certifications
- get verified
- manage service radius, equipment, and availability
- receive solar quote leads
- convert lead to proposal/project

**Project**

- project created from quote
- template selected
- milestones generated
- status changes only via valid transitions
- documents, photos, payments, and warranty tracked

---

## Highest-priority defects to fix first

1. Missing `/solar/installers` route
2. quick estimate form discards user input
3. estimate wizard ends in dead link
4. `requestSolarQuote` sets `providerId = clientId`
5. `updateProjectStatus` has no ownership/authorization guard
6. `SolarEstimationConfig` is unused
7. no solar vertical seed/bootstrap
8. specialist/certification/project dashboards do not exist
9. no vertical availability action
10. no quote-request UI wired from estimate results

Based on a comprehensive analysis of the provided code (`solar.ts`, `estimation-calculator.ts`, `schema.prisma`, and the React pages), I have identified several broken UI flows, architectural data model flaws, and missing implementations across the Solar & Green Tech Vertical feature set.

Here is the complete breakdown of the issues detected and the actionable plans to fix them.

---

### 18.1 Discovery & Estimation

#### 1. The Quick Estimate Form is a Stub (Broken UI/Data Flow)

- **Detection:** In `src/app/solar/page.tsx`, the "How Much Could You Save?" quick estimate form has an empty server action `action={async (formData: FormData) => { "use server"; // This would redirect }}`. It accepts input but goes nowhere, entirely bypassing the `getQuickSolarEstimate` action defined in `solar.ts`.
- **Fix Plan:** 1. Wire the form to extract `monthlyBill` from `formData`. 2. Use `redirect('/solar/estimate?bill=' + monthlyBill)` from `next/navigation`. 3. In `src/app/solar/estimate/page.tsx`, read the URL search parameter on mount (e.g., via `useSearchParams()`) and pre-fill the state, automatically skipping to Step 2.

#### 2. Hardcoded Pricing Ignores `SolarEstimationConfig` Database Model (Broken Data Flow)

- **Detection:** Feature 18.1.5 defines the `SolarEstimationConfig` model in the Prisma schema to allow dynamic pricing configuration (e.g., `monocrystallinePerWatt`, `laborPerKw`). However, `src/lib/solar/estimation-calculator.ts` totally ignores this database model and uses a hardcoded `DEFAULT_PRICING` object.
- **Fix Plan:** 1. Modify `getDetailedSolarEstimate` in `solar.ts` to first query `prisma.solarEstimationConfig.findFirst({ where: { isActive: true } })`. 2. Pass this config object into the `estimateSolarSystem(input, dbConfig)` function in `estimation-calculator.ts`. 3. Map the DB config values to override the hardcoded defaults before executing the math.

#### 3. Dead-End Estimate Wizard (Broken UI Flow)

- **Detection:** In `src/app/solar/estimate/page.tsx` Step 3, the user gets a detailed estimate but the flow hits a dead end. There is a button to "Find Installers Near You", but no way to actually save the estimate or convert it into a concrete project request using the `requestSolarQuote` action.
- **Fix Plan:**
  1. Add a **"Request Official Quote"** button in Step 3 of the estimate UI.
  2. When clicked, open a small modal to capture the `title` and `siteAddress`.
  3. Trigger the `requestSolarQuote` server action directly with the collected address and the current estimate state, successfully converting the lead.

---

### 18.2 Specialist Management

#### 4. Missing "Vertical Availability Retrieval Action" (Missing Data Flow)

- **Detection:** Feature requirement 18.2.4 explicitly mandates a "Vertical availability retrieval action". Looking at `src/app/actions/solar.ts`, there are actions to register a specialist and get featured specialists, but **no action exists** to fetch a specialist's availability.
- **Fix Plan:**
  1. Create a new exported server action in `solar.ts` called `getSpecialistAvailability(specialistId: string)`.
  2. Query the `Availability` and `AvailabilityException` models in Prisma filtering by the `providerId` linked to the specialist.
  3. Return the merged schedule to the client.

#### 5. Missing UI for Certification/Registration (Missing UI Flow)

- **Detection:** While `solar.ts` contains `registerAsSolarSpecialist` and `submitCertification` actions, there are no UI files provided (e.g., `/provider/solar/setup`) to actually call these functions. Providers cannot onboard into the Solar vertical.
- **Fix Plan:** 1. Create a new route `src/app/dashboard/solar/onboarding/page.tsx`. 2. Implement a multi-step form that collects `experienceYears`, `specializations`, and `documentUrl` (for certificates) and wires up to the existing server actions.

---

### 18.3 Project Lifecycle

#### 6. Critical Schema Bug: The `providerId` Hack in Quote Requests (Broken Data Model & Flow)

- **Detection:** In `src/app/actions/solar.ts` under `requestSolarQuote`, when a client requests a quote, a provider hasn't been assigned yet. Because `providerId` is a required field on the `VerticalProject` schema model, the developer hacked it by assigning the client's own ID as the provider: `providerId: session.user.id // Placeholder`.
- **Impact:** This destroys data integrity. Clients are now recorded as the providers of their own projects. The `getMySolarProjects` query relies on an `OR` statement which will break UI logic downstream because the system will treat the client as a provider.
- **Fix Plan:**
  1. Update `prisma/schema.prisma`: Change `providerId String` to `providerId String?` inside the `VerticalProject` model to make it nullable.
  2. Run `npx prisma db push` or create a migration.
  3. In `solar.ts` -> `requestSolarQuote`, completely remove the `providerId` injection.
  4. Create an `assignProviderToProject(projectId, providerId)` action to update the field later in the lifecycle.

#### 7. Unused Equipment Registry & Project Templates (Missing Data Flow)

- **Detection:** Requirement 18.3.4 dictates models for `EquipmentRegistry` and `ProjectTemplate`. While these exist in `schema.prisma`, there are zero server actions in `solar.ts` to create, update, or fetch equipment or templates. The `ProjectTemplate` has complex JSON properties (`phases`, `materialsTemplate`) that are entirely dormant.
- **Fix Plan:**
  1. Add CRUD server actions for `ProjectTemplate` so admins/specialists can create templated installations (e.g., "Standard 5kW System").
  2. Add CRUD server actions for `EquipmentRegistry` so specialists can list the tools they own.
  3. Modify the `requestSolarQuote` action to optionally accept a `templateId` and populate the new `VerticalProject` with the templated phases and materials.

  Here are **even more** deeply buried broken UI flows, logic errors, and data flow disconnects across the Solar & Green Tech feature set, focusing on the deeper integration layers and state management.

---

### 18.1 Discovery & Estimation

#### 8. The Hidden "Off-Grid" Configuration (Broken UI Flow)

- **Detection:** In `src/app/solar/estimate/page.tsx`, the component initializes `const [isOffGrid, setIsOffGrid] = useState(false);` and passes it to the `getDetailedSolarEstimate` action. However, there are **no UI elements** (toggle, checkbox, or button) anywhere in Step 2 for the user to actually change this state.
- **Impact:** The off-grid logic—which drastically alters the system calculation by requiring 48 hours of battery autonomy instead of 8 (as seen in `calculateBatteryCapacity` in `estimation-calculator.ts`)—is completely inaccessible to users.
- **Fix Plan:**
  1. Add an "Off-Grid vs Grid-Tied" toggle card selection in Step 2 of the UI, right next to the Battery Backup options.
  2. Wire the `onClick` to `setIsOffGrid(!isOffGrid)`.

#### 9. Unenforced Vertical Category Markup (Broken Pricing Data Flow)

- **Detection:** The `VerticalCategory` schema model includes a `baseMarkup` field (e.g., to charge a premium platform fee for high-value Solar verticals). However, `estimation-calculator.ts` and `solar.ts` entirely ignore this multiplier.
- **Impact:** The platform is losing out on designed revenue mechanisms because the system calculates raw costs and provider margins, but never applies the vertical-specific platform markup.
- **Fix Plan:** 1. In `getDetailedSolarEstimate`, fetch the `VerticalCategory` where `type === 'SOLAR'`. 2. Pass `vertical.baseMarkup` into the `estimateSolarSystem` function and multiply the final `totalCost` by this factor.

---

### 18.2 Specialist Management

#### 10. Expired Featured Specialists Continue to Rank (Broken Query Logic)

- **Detection:** In `src/app/actions/solar.ts`, the `getFeaturedSolarSpecialists` function orders results using: `orderBy: [{ isFeatured: "desc" }, { averageRating: "desc" }]`. It completely ignores the `featuredUntil` timestamp defined in the `VerticalSpecialist` schema model.
- **Impact:** Providers who pay for temporary featured placement will remain featured _forever_ at the top of the landing page, even after their `featuredUntil` date has passed, unless an admin manually toggles their boolean flag off.
- **Fix Plan:** 1. Update the Prisma `where` clause in `getFeaturedSolarSpecialists` to conditionally check the expiry:
  ```typescript
  where: {
    vertical: { type: "SOLAR" },
    isVerified: true,
    OR: [
      { isFeatured: false },
      { isFeatured: true, featuredUntil: { gte: new Date() } }
    ]
  }
  ```

---

### 18.3 Project Lifecycle

#### 11. Hardcoded Equipment Overrides in Official Quotes (Data Loss Flow)

- **Detection:** In `solar.ts`, when a user converts an estimate into a real project via `requestSolarQuote()`, the action calls `estimateSolarSystem` to calculate the final `quotedAmount` to save to the database. However, it **hardcodes** the parameters: `panelType: "monocrystalline"` and `batteryType: "lithium"`.
- **Impact:** Even if a user spent time in the UI configuring a budget system using "Polycrystalline" panels and "Lead Acid" batteries, the moment they request a quote, the backend completely ignores their choices and generates a quote for the most expensive premium system.
- **Fix Plan:** 1. Update the `requestSolarQuote` action signature to accept `panelType` and `batteryType` from the client. 2. Pass those dynamic values into the `estimateSolarSystem` call inside the action instead of the hardcoded strings.

#### 12. Disconnected Financial & Booking Flow (Missing Architecture Flow)

- **Detection:** A `VerticalProject` goes from `QUOTE_REQUESTED` -> `APPROVED` via the `updateProjectStatus` action. The schema has fields for `depositPaid` and `agreedAmount`, as well as an optional `bookingId`. However, there is **no data flow or action** that connects this vertical project to the platform's core `Booking` or `Wallet` payment engine.
- **Impact:** A client can "approve" a 500,000 KES solar quote, but there is no UI or backend logic to actually invoice them, collect the deposit via the wallet, or formally schedule the provider. The project lives in a silo and cannot be monetized.
- **Fix Plan:** 1. Create a `convertQuoteToBooking` server action. 2. When a project hits `APPROVED`, this action should automatically generate a standard `Booking` record with `totalAmount: project.agreedAmount`, linking the `bookingId` back to the `VerticalProject`. 3. Generate an initial `Invoice` for the `depositAmount` so the client can pay through the standard platform checkout/wallet flow.

#### 13. Missing Project Milestones Sync (Broken State Flow)

- **Detection:** The `requestSolarQuote` action creates a single `ProjectMilestone` called "Quote Request". After that, the `updateProjectStatus` blindly updates the overall project status string without logging subsequent milestones.
- **Impact:** The `ProjectMilestone` table is heavily underutilized. When a provider moves a project to `SITE_ASSESSMENT` or `IN_PROGRESS`, the client receives no detailed milestone checklist or timeline updates, which is crucial for high-ticket construction projects.
- **Fix Plan:** 1. Intercept the `updateProjectStatus` action. 2. Whenever the status changes, automatically use `prisma.projectMilestone.create()` to generate the corresponding sequential milestone (e.g., Sequence 1: Site Assessment, Sequence 2: Installation Started) so the UI timeline components have real data to render.
