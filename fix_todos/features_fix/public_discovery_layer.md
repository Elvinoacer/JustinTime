I audited the uploaded codebase as a static source review. I did not run the app, so this is a code-path audit of route/UI/API wiring, not a live browser verification.

Here is the full public/discovery feature audit.

## Overall verdict

This feature set is **not fully clean**. The public layer exists, but there are several real broken UI/data flows and a few product gaps:

- the **landing search funnel is partially broken**
- the **`/join` acquisition page is not actually implemented as a page**
- **location-based discovery has no usable manual fallback**
- **interaction tracking can fail silently**
- the **jobs board is using service-category data**
- the **blog is a mock/static placeholder, not a real content flow**
- filter/search state is **poorly shareable and weakly URL-synced** on several public surfaces

---

## 1.1 Landing & Conversion

### 1.1.1 Hero landing page with service search and category entry points

**Status: Partially implemented, with a broken downstream flow**

The hero exists and pushes users into `/services` using query params. In `src/components/Hero.tsx:212-225`, it sends:

- `search`
- `location`
- `country`

But `src/app/services/ServicesClient.tsx:29-31` only reads `category` from `useSearchParams()`. It does **not** read `search`, `location`, or `country`.

That means:

- typing a service in the hero search box does not hydrate the services page search state
- selecting a county/location from the hero does not affect discovery
- non-Kenya country selection is not consumed anywhere in the services page flow

So the landing funnel looks connected, but most of the search intent is lost on navigation.

### 1.1.2 Conversion funnel pages for both service seekers and professionals

**Status: Partially implemented**

There are strong CTA paths from landing, but they are inconsistent:

- seeker CTA goes to signup/browse flows
- pro CTA goes straight to signup/onboarding

The issue is that these conversion flows are not normalized through a dedicated acquisition page. The site behaves more like a set of direct links than a managed funnel.

### 1.1.3 Join/signup prompt page (`/join`) for professional acquisition

**Status: Broken / effectively missing**

`src/app/join/page.tsx:7-16` immediately redirects to `/auth/signup` or `/auth/signup?ref=...`.

So `/join` is not a real acquisition page. It does not render messaging, value props, FAQs, trust proof, or a role-specific conversion flow.

Also, pro CTAs bypass `/join` entirely:

- `src/components/JoinAsPro.tsx:95`
- `src/components/CTA.tsx:19-20`
- `src/components/Hero.tsx:256`

These all link straight to auth/signup instead of `/join`.

This is a direct miss against the requirement.

### 1.1.4 Analytics event capture for landing interactions

**Status: Partially implemented**

`/api/analytics/landing-events` exists and accepts a bounded event set. That part is fine.

But the landing search analytics are more trustworthy than the product flow itself, because the event is captured before redirect while the destination page drops most query state. So analytics may show search intent that the discovery page never honors.

---

## 1.2 Public Services Catalog

### 1.2.1 Browsable service listing page (`/services`) with category filtering

**Status: Implemented**

This exists and is reasonably complete.

### 1.2.2 Geolocation-aware service discovery — nearest providers first

**Status: Implemented, but operationally fragile**

The services page can sort by distance once `userLocation` is set.

But there is a major fallback flaw: `LocationPicker` has no actual manual location entry. In `src/components/LocationPicker.tsx:239-241`, manual input is literally:

- `"Manual location input coming soon!"`

That means if:

- browser geolocation is denied
- IP approximation is wrong
- user wants to refine location

they cannot recover properly. For a locality-based marketplace, that is a real broken flow.

### 1.2.3 Service detail page (`/services/[id]`) with provider profile, pricing, reviews

**Status: Implemented**

This page is present and substantially wired.

### 1.2.4 Service interaction tracking for ranking and performance intelligence

**Status: Implemented, but can fail silently**

The `InteractionBar` posts to `/services/[id]/interactions`. That route requires `x-forwarded-for` or `x-real-ip`.

In `src/app/api/services/[id]/interactions/route.ts:27-31` and `:61-66`, if no IP header exists, the route returns 400 `"Unable to validate request origin"`.

That creates a brittle data flow:

- on some local/dev setups, proxies, or edge configurations, view/favorite tracking fails
- the UI mostly just logs the failure and keeps going
- ranking/performance intelligence becomes incomplete without an obvious product error

The same structural issue exists for professional interactions.

### 1.2.5 Category browsing via `/api/categories` with service counts

**Status: Implemented**

This route is correctly service-oriented.

One side issue: this same categories API is reused in other places where job-specific category semantics are needed, which causes cross-surface mismatch.

### Additional services-layer issues

`/services` has weak URL-state sync. It reads `category`, but not search/location from URL, and the current filter state is not robustly mirrored back into the URL. That hurts:

- shareable discovery links
- refresh persistence
- back/forward navigation consistency

---

## 1.3 Public Professionals Directory

### 1.3.1 Full professionals listing page (`/professionals`) with filtering and sorting

**Status: Implemented**

The page exists, supports search, verification filter, sorting, and radar/cards view.

### 1.3.2 Professional detail profile page (`/professionals/[id]`) with stats, skills, reviews

**Status: Implemented**

Present and fairly complete.

### 1.3.3 Interaction tracking on professional profile views

**Status: Implemented, but fragile for the same reason as services**

`src/components/InteractionBar.tsx:38-46` posts to `/professionals/[id]/interactions`, and that route has the same IP-header dependency pattern. So profile view/favorite tracking can silently fail depending on deployment/request headers.

### 1.3.4 Verification badge display and trust-tier signaling

**Status: Implemented**

This is wired in both list and detail surfaces.

### Additional professionals-layer issues

The professionals page does not read search/filter state from URL. Unlike `/services`, there is no `useSearchParams` entry flow at all in `src/app/professionals/ProfessionalsClient.tsx:1-30`.

That means:

- you cannot deep-link a filtered professional search well
- back/refresh behavior is weaker than it should be for a discovery surface

There is also a structured-data mismatch on the homepage metadata: the homepage SearchAction points to `/professionals?q=...`, but the public professionals page does not consume `q` from the URL.

---

## 1.4 Public Jobs Board

### 1.4.1 Public job listings page (`/jobs`) showing open client job postings

**Status: Partially implemented, with scope/data mismatches**

The page exists, but it exposes more than open jobs by design.

`src/app/jobs/JobsClient.tsx:33-36` defines tabs for:

- `OPEN`
- `IN_PROGRESS`
- `COMPLETED`

That is broader than “public job listings showing open client job postings.” If the product intent is a public jobs marketplace, showing in-progress/completed states is probably wrong or at least needs explicit product confirmation.

### 1.4.2 Job detail page (`/jobs/[id]`) with full description and proposal entry

**Status: Implemented**

This page exists and contains a full proposal flow.

### Broken / mismatched jobs flows

#### Jobs page uses service categories, not job categories/counts

`src/app/jobs/JobsClient.tsx:63-64` uses `useCategories()`, which hits `/api/categories`. But `src/app/api/categories/route.ts:5-10` is explicitly a **service counts** endpoint.

Then the jobs API expects `category` to be a **job categoryId** in `src/app/api/jobs/route.ts:186-188`.

So the job board category filter is populated from the service taxonomy/counts surface, then reused as a job filter. Even if category IDs overlap in the database, the UI semantics are wrong:

- counts shown are service counts, not job counts
- dropdown options may not reflect actual public jobs distribution
- this can mislead users into selecting categories that have little/no job inventory

This is one of the clearer data-model mismatches in the feature.

#### Jobs page lacks proper URL-based shareable filters

Like professionals, the jobs page does not initialize from URL search params. So filtered job discovery is not properly bookmarkable/shareable.

#### Public jobs surface is carrying too much provider workflow complexity

The detail page contains a lot of provider-specific proposal tooling. That is not inherently broken, but it increases guest dead-ends and complexity in a public page that should be very crisp for anonymous browsing.

---

## 1.5 Public Content Pages

### 1.5.1 About page

**Status: Implemented**

### 1.5.2 FAQ page

**Status: Implemented**

### 1.5.3 Blog page

**Status: Present, but not production-real**

`src/app/blog/page.tsx:31-41` shows hardcoded mock posts with static dates and placeholder images like `/api/placeholder/400/300`.

So the route exists, but this is not a real blog data flow. Current issues:

- no CMS/content source
- no per-post pages wired from those slugs
- fake/static metadata
- placeholder imagery

If “blog page” only means “a page exists,” it passes. If it means a real public content system, it does not.

### 1.5.4 Contact page with form submission via `/api/contact`

**Status: Implemented**

This is one of the cleaner public flows.

### 1.5.5 Terms page

**Status: Implemented**

### 1.5.6 Privacy page

**Status: Implemented**

### 1.5.7 Cookie Policy page

**Status: Implemented**

### 1.5.8 Newsletter subscription via `/api/newsletter/subscribe`

**Status: Implemented**

Footer wiring exists and handles 201/409 reasonably.

---

## Other issues affecting this whole public feature

### 1. Discovery state is inconsistent across pages

Only `/services` partially reads query params. `/professionals` and `/jobs` do not initialize from URL-driven public search/filter state.

That creates bad UX for:

- shared links
- browser back/forward
- refresh persistence
- attribution from landing funnel

### 2. Manual location flow is not finished

This is bigger than one page. Since public discovery relies on “near me” behavior, the lack of manual fallback is a real functional hole, not a small enhancement.

### 3. Interaction analytics are too deployment-dependent

Requiring forwarded IP headers for anonymous view/favorite tracking is brittle. You are making ranking intelligence depend on infra headers that may be absent.

### 4. Landing CTAs are not normalized

Public acquisition is split across:

- `/auth/signup`
- provider onboarding callback URLs
- `/services`
- `/professionals`
- redirect-only `/join`

That weakens conversion clarity and makes funnel analytics harder to trust.

### 5. Public content is uneven in maturity

About/FAQ/terms/privacy/contact are real pages. Blog is clearly still a mock surface. `/join` is missing as a content surface entirely.

---

## Highest-priority fixes

If you want the fastest path to making this feature solid, do these first:

1. **Fix the landing → services handoff**
   Make `/services` consume `search`, `location`, and `country` from URL on first load. Ideally persist them back into URL as users refine filters.

2. **Implement a real `/join` page**
   Move pro-acquisition CTAs to `/join`, and let that page branch users into the right signup/onboarding path.

3. **Finish manual location input**
   Add searchable manual place entry in `LocationPicker` and reuse it across all public discovery pages.

4. **Decouple interaction tracking from required proxy IP headers**
   Fall back to a client-generated anonymous ID or allow degraded tracking rather than returning 400.

5. **Split job categories from service categories**
   The jobs board should not use a service-count endpoint to populate its category filter.

6. **Decide whether public jobs should show only OPEN**
   If the requirement is strict, remove public tabs for `IN_PROGRESS` and `COMPLETED`.

7. **Replace mock blog with a real content source or intentionally label it as editorial preview**
   Right now it looks production-facing but is placeholder content.

---

## Bottom line

You do **not** have a fully clean public/discovery layer yet.

The most important broken flows are:

- **hero search params get dropped**
- **`/join` is missing as a real page**
- **location discovery has no manual fallback**
- **service/professional interaction tracking can fail silently**
- **jobs categories are sourced from the wrong dataset**
- **public filtering state is not consistently URL-driven**
- **blog is still placeholder content**

Based on the audit reports and the implementation files you provided, I have analyzed the codebase to identify broken UI, UX, and data flows within the **Public & Discovery Layer**.

While it appears you have successfully refactored parts of the `Jobs` and `Professionals` pages to use the new compact headers and infinite scroll patterns, the **Services** page and several underlying routing/auth flows have been left behind.

Here is the comprehensive breakdown of broken flows across the Public & Discovery Layer:

### 1.1 Landing & Conversion

- **Missing Guest CTAs (H2, H4):** The landing page header currently displays a "Post Service" button to unauthenticated guests. Clicking this fails silently or redirects without explanation. There is no clear "Sign Up" or "Get Started" button above the fold in the hero pathway.
- **Role Constraint Blocking Conversion:** Users are currently restricted to a singular role (Client OR Provider). A guest looking to both post jobs and offer services is blocked by the UI and data model. The system needs to be updated to support an array of roles (`[CLIENT, PROVIDER]`) to prevent users from needing dual accounts.
- **Navigation Confusion (H1):** The mobile and desktop navigation menus use identical icons for "Services" and "Jobs," and fail to visually group authentication actions separately from standard navigation links.

### 1.2 Public Services Catalog (`/services`)

- **Desynced Architecture (S1, S3):** Unlike the refactored Jobs and Professionals pages, `ServicesClient.tsx` is still using the legacy layout. It features a massive hero section (`py-24`) that consumes 45% of the viewport, burying the core search and location functionalities below the fold.
- **Data Flow Break (Pagination - S5):** The Services page still uses standard page-based fetching (`<ServicesList onPageChange={handlePageChange} />`). When a user clicks "Next Page," the current array of services is entirely replaced rather than appended. This breaks the scroll experience, whereas the new Jobs and Professionals pages correctly utilize `useInfiniteQuery` and `InfiniteScrollSentinel`.
- **Location Discovery Buried (S2):** The `LocationPicker` is hidden inside the scrolling view rather than being pinned to a sticky top bar, making geolocation discovery highly unintuitive for guests.

### 1.3 Public Professionals Directory (`/professionals`)

- **"Nearest First" Dead-End (P5):** In `ProfessionalsClient.tsx`, if a guest hasn't set their location, the "Nearest First" sort option is simply greyed out with a `disabled` flag and a "Set location" hint. It does not act as an active CTA to trigger the browser's Geolocation API, breaking the intended discovery flow.
- **Radar View Fallback:** The new `<RadarBrowse>` component relies strictly on the user granting location permissions. If a guest denies location access on load, the Radar UI fails silently without prompting the user to manually input a city or address.

### 1.4 Public Jobs Board (`/jobs`)

_While the UI in `JobsClient.tsx` is updated, the external routing data flows pointing to this page are critically broken:_

- **Share Link Generates 404s:** The "Share Job" button in the client dashboard copies an auth-gated URL (`/client/jobs/[id]`) instead of the public `/jobs/[id]` link. Any guest or provider clicking this shared link hits a redirect wall.
- **Broken Email Alerts:** When a new job is created, the system emails matching providers with a link to `/dashboard/jobs/[id]`. This page does not exist (resulting in a 404) because the provider dashboard uses a tabbed flat list, not subfolders. The email should point to the public `/jobs/[id]` page.
- **Provider Navigation Misdirection:** Inside the provider dashboard, the "Browse Jobs" CTA incorrectly routes the provider to `/services` (the consumer catalog) instead of `/jobs` (the marketplace).

### 1.5 Multi-Role / Team Visibility Gaps

- **Client Job Management:** Clients have no index page to view their posted jobs. There is no `/client/jobs/page.tsx`, forcing them to rely on dashboard widgets instead of a dedicated management UI.
- **Team vs. Individual Jobs:** Providers who belong to a team cannot see team-dispatched jobs (`TeamJob`) inside their standard `/dashboard/jobs` view. The systems are entirely isolated, breaking the unified discovery experience for professionals.

### Recommendations for Immediate Action

1. **Unify the Services Page:** Port the `<PageHeader>`, `<BrowseStickyToolbar>`, and `useInfiniteQuery` implementations from `JobsClient.tsx` over to `ServicesClient.tsx` to standardize the public catalog.
2. **Fix Link Generation:** Immediately patch `src/app/api/jobs/route.ts` and the job sharing handlers to only distribute public `/jobs/[id]` links.
3. **Database Migration:** Begin the shift to `roles: String[]` on the User model to allow users to act as both Clients and Providers seamlessly without hitting authorization walls.

Based on a deeper analysis of the specific code files you provided (`JobsClient.tsx`, `ServicesClient.tsx`, `ProfessionalsClient.tsx`, and `page.tsx`), as well as the feature requirements you listed, there are several more subtle but critical UI, UX, and data flow breakages in the **Public & Discovery Layer**.

Here is the deeper, "Phase 2" audit of your public layer:

### 1. Analytics & Tracking Data Flow is Missing

Your requirements specifically demand:

- _1.1.4 Analytics event capture for landing page interactions_
- _1.2.4 Service interaction tracking for ranking_
- _1.3.3 Interaction tracking on professional profile views_

**The Break:** None of the public client components are firing these events.

- In `page.tsx`, there is no tracking code attached to the Hero, Categories, or CTA clicks.
- In `ServicesClient.tsx`, `JobsClient.tsx`, and `ProfessionalsClient.tsx`, the components fetch data and render, but there are no `useEffect` observers firing impression events to `/api/analytics/*`, nor are there `onClick` handlers tracking interactions. The data flow for your ranking algorithms is starved because the client isn't sending telemetry.

### 2. Public Jobs "Status" Leak (Logical Flaw)

- **The Break:** In `JobsClient.tsx`, the `STATUS_TABS` array explicitly allows unauthenticated guests to filter jobs by `IN_PROGRESS` and `COMPLETED`.
- **Why it's broken:** A public jobs board intended for providers to find work should generally only expose `OPEN` jobs. Surfacing "In Progress" or "Completed" jobs to the public confuses the discovery flow (providers might try to apply to closed jobs if the UI doesn't explicitly block them). If these are meant for "past work examples," the UI does not distinguish them as such.

### 3. Geolocation State Desync Across Pages

- **The Break:** In `ServicesClient.tsx`, the `resetToBrowseAll` function correctly calls `clearLocationFromStorage()` when a user clears their location. However, in `JobsClient.tsx` and `ProfessionalsClient.tsx`, there is no mechanism to clear the location from local storage when the user removes the location filter.
- **Why it's broken:** If a guest sets their location on the Jobs page, then removes it, the system might still aggressively sort by distance on the Services page because the storage was never cleared, leading to unpredictable sorting behavior for the user.

### 4. UI View Mode State Loss (UX Breakage)

- **The Break:** Both `JobsClient.tsx` and `ProfessionalsClient.tsx` introduce an excellent feature allowing users to toggle between `cards` and `radar` view modes. However, this is managed with a simple local state: `const [viewMode, setViewMode] = useState("cards");`.
- **Why it's broken:** If a user switches to "Radar" view, clicks on a Professional to view their profile, and then clicks the browser's "Back" button, the state is destroyed and defaults back to "Cards". For standard e-commerce/marketplace UX, view modes should be synced to the URL (e.g., `?view=radar`) so the user's preference survives navigation.

### 5. SEO / JSON-LD Data Flow Gap

- **The Break:** The landing page (`page.tsx`) correctly injects a `<script type="application/ld+json">` block for Google Search indexing. However, the individual catalog pages lack dynamic schema injection.
- **Why it's broken:** For a public marketplace, SEO is critical. The `JobsClient.tsx` and `ProfessionalsClient.tsx` pages rely strictly on Next.js `metadata` exports, but do not map their fetched arrays into `JobPosting` or `LocalBusiness` JSON-LD schemas, severely limiting organic search discovery.

### 6. Category URL Parameter Race Condition

- **The Break:** In `ServicesClient.tsx`, the URL parameter `?category=` is parsed inside a `useEffect` and directly overrides the `selectedCategory` state.
- **Why it's broken:** It does this blindly, without checking if that category actually exists in the `categoriesData` fetched from `useCategories()`. If a user lands on a malformed URL (e.g., `/services?category=fake`), the query fires with an invalid parameter, potentially crashing the results or returning an unhandled empty state, rather than falling back to "All Services".

Here is **Phase 3** of the audit. This deep-dive uncovers architectural edge cases, SEO data malformations, and severe conversion-funnel leaks that exist beneath the surface of the components you provided.

### 1. The "Lost Context" Conversion Leak (Critical Funnel Break)

**Affects:** 1.2.3 (Service Details), 1.4.2 (Job Details)

- **The Break:** On the `Jobs` and `Services` pages, unauthenticated guests see CTAs like "Sign Up to Apply" or "Start Working". These link directly to `/auth/signup`.
- **Why it’s a critical failure:** Your onboarding flow (as seen in the migration files like `add_onboarding_fields` and `StepProviderDetails`) is a multi-step process. If a guest clicks "Apply" on Job #104, goes through a 5-minute signup and verification process, the `callbackUrl` context is lost. They will land on a generic `/dashboard`, completely losing the job or service they originally intended to interact with.
- **The Fix:** Guest conversion CTAs on specific entities must append a return parameter: `href="/auth/signup?returnTo=/jobs/104&intent=apply"`.

### 2. SEO JSON-LD Search Mismatch (Data Flow Break)

**Affects:** 1.1 (Landing Page), 1.3 (Public Professionals Directory)

- **The Break:** In `src/app/page.tsx`, you have injected Schema.org JSON-LD for Google Search indexing. Look closely at the `SearchAction` target:
  ```json
  target: "https://justintime.gtss.software/professionals?q={search_term_string}",
  "query-input": "required name=search_term_string"
  ```
- **Why it’s broken:** If a user uses the Google Sitelinks search box to search for "Plumber", Google will send them to `/professionals?q=Plumber`. However, inside `ProfessionalsClient.tsx`, your state relies on the URL parameter `search` (or local state), not `q`. Furthermore, the component does not parse the `q` query string on mount. Google traffic will land on a completely unfiltered page, destroying your organic search conversion rate.

### 3. Data Privacy vs. Radar UI Conflict (Logical/UX Break)

**Affects:** 1.4 (Public Jobs Board)

- **The Break:** In `JobsClient.tsx`, the `<RadarBrowse>` component maps over `jobs` and uses `job.latitude` and `job.longitude` to plot them on a visual radar relative to the user.
- **Why it’s broken:** Exposing exact client GPS coordinates to unauthenticated, public web traffic is a massive safety and privacy violation. If your backend `GET /api/jobs` endpoint correctly strips exact coordinates for unauthenticated users (replacing them with generic city-center coordinates or `null`), the Radar UI will break or stack all jobs in the exact same fake spot. If it _doesn't_ strip them, you are leaking client home addresses to the public.
- **The Fix:** Radar view for jobs should likely be disabled for guests, or the API must generate randomized offsets (jitter) within a 2km radius for public viewing.

### 4. Surge Pricing "Bait-and-Switch" (Data Flow Break)

**Affects:** 1.2 (Public Services Catalog)

- **The Break:** Your database schema includes a `20260203183100_add_surge_pricing` migration. However, the public `ServicesClient.tsx` UI only exposes generic `minPrice` and `maxPrice` filters, and the `ServiceCard` skeleton implies a static price display.
- **Why it’s broken:** If a guest filters for services under 1,000 KES, sees a service listed at 800 KES, clicks it, logs in, and enters the booking flow during a high-demand period, the surge multiplier will suddenly price the service at 1,200 KES. Because the public catalog does not badge services with a "Surge Active" icon or dynamically update prices based on the live multiplier, you create a frustrating bait-and-switch experience for the guest.

### 5. Trust Tier Flattening (UI/UX Break)

**Affects:** 1.3 (Public Professionals Directory)

- **The Break:** Your system has a robust "Trust as a Service" (TaaS) layer (noted in migrations `20260205104640_add_taas_verification` and `20260327190500_add_profile_verification_enhancements`). But `ProfessionalsClient.tsx` reduces this entire complex system to a single binary toggle: `setVerifiedOnly(!verifiedOnly)`.
- **Why it’s broken:** A professional who has submitted basic ID vs. a professional who has passed a rigorous criminal background check and license verification are visually treated the exact same way in the public discovery layer. Guests cannot filter by "Background Checked" or "Licensed", severely under-utilizing your platform's main competitive advantage (safety and trust).

### 6. The "Double-Fetch" Hydration Bug (Performance Break)

**Affects:** 1.2, 1.3, 1.4 (All Listing Pages)

- **The Break:** In `JobsClient.tsx`, `ServicesClient.tsx`, and `ProfessionalsClient.tsx`, you have a debounce effect:
  ```javascript
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);
  ```
- **Why it’s broken:** On initial page load, `searchInput` is `""`. The component mounts, Next.js hydration kicks in, and the `useQuery` fires to fetch the initial list. 400ms later, the timeout resolves, setting `searchQuery` to `""`. Because `searchQuery` is in the `useMemo` dependency array for `filters`, the filters object gets a new reference, triggering a _second identical API call_ immediately after the first one completes. This doubles your database read load for every single guest visiting the site.

## EVERYTHING IN THIS DOCUMENT SHOULD BE ADDRESSED AND NOTHIN SHOULD BE IGNORED
