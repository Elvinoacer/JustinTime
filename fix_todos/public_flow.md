# JustInTime — Guest Flow UX Overhaul Plan

**Scope:** Landing page · Services page · Jobs page · Professionals page  
**Audience:** Unauthenticated (guest) users encountering the product for the first time  
**Goal:** Every element has a clear purpose, every interaction has a predictable outcome, core features (search, filter, sort, location, pagination) are reliable and fast.

---

## 1. Audit Summary

### 1.1 Landing Page (`/`)

| # | Issue | Severity |
|---|-------|----------|
| H1 | Header has two identical `Briefcase` icons — both "Services" and "Jobs" nav items share the same icon. Zero visual differentiation | 🟠 High |
| H2 | Guest users see a "Post Service" button in the header. Clicking it silently does nothing (or redirects to login without any explanation) — no tooltip, no CTA copy that explains the action requires an account | 🟠 High |
| H3 | Mobile hamburger menu nav items are not grouped — auth items and navigation items are visually indistinct | 🟡 Medium |
| H4 | No explicit "Sign Up" / "Get Started" button in the hero CTA pathway. The hero search presumably links somewhere but the primary conversion action (account creation) has no above-the-fold button | 🟠 High |
| H5 | All landing section buttons need auditing: `PopularServices`, `FeaturedProfessionals`, `JoinAsPro`, and `CTA` components each have buttons — none are confirmed to route correctly for guests | 🟡 Medium |

### 1.2 Services Page (`/services`)

| # | Issue | Severity |
|---|-------|----------|
| S1 | Hero section (`py-24` on desktop) takes up ~45% of the viewport before any content. Stats shown (500+, 10k+, 4.8★) are hardcoded and not linked to real DB values | 🔴 Critical (UX) |
| S2 | LocationPicker sits inside the hero below the stats — visually buried and treated as secondary. It is actually the most actionable element on the page | 🔴 Critical (UX) |
| S3 | After the hero, the category sticky bar, the search input appears below it as a completely separate block inside `<main>`. So the user has: Hero → Categories bar → (scroll) → Search input → Filters. The search is not near the top | 🟠 High |
| S4 | Mobile "Sort" button in the filter toggle bar has an `onClick` that calls `/* Implement sort modal */` — it is a dead button, not implemented | 🔴 Critical (broken) |
| S5 | Pagination uses `handlePageChange(page: number)` passed into `ServicesList` — but there is no `useInfiniteQuery` hook. Each page change refetches page N, replacing the current list (not appending). This is a jarring UX on mobile | 🟠 High |
| S6 | "Quick Tips" section at the bottom has three tip cards in blue/emerald/purple. This color inconsistency breaks the green theme and the section adds no functional value for a guest who hasn't been able to find a service yet | 🟡 Medium |
| S7 | Filter sidebar header uses `from-slate-50 to-gray-50` — not part of the emerald theme. Minor inconsistency that adds up with S6 | 🟢 Low |
| S8 | `isMobile` / `isTablet` states are computed from `window.innerWidth` in a `useEffect` — this causes a flash of incorrect layout on SSR hydration | 🟡 Medium |

### 1.3 Jobs Page (`/jobs`)

| # | Issue | Severity |
|---|-------|----------|
| J1 | Hero section is `pt-16 pb-12 sm:pt-20 sm:pb-16 md:py-28` — at `md` breakpoint this is 112px top and bottom, 224px total. No functional content inside it beyond a headline and tagline | 🔴 Critical (UX) |
| J2 | Mobile search bar is sticky at `top-16` but the desktop filters bar is sticky at `top-0`. These overlap each other at 768–1024px. On tablet the sticky bars fight | 🟠 High |
| J3 | `Load More Jobs` button increments `currentPage` — but the query fetches page N of results, **replacing** the array. Jobs already shown disappear and reappear as page N content loads. The component does not accumulate results across pages | 🔴 Critical (broken) |
| J4 | No location-based filtering exists on the Jobs page at all. Services and Professionals both have `LocationPicker`. Jobs do not | 🟡 Medium |
| J5 | `Job Market Insights` section at bottom shows hardcoded values ("150+", "Kes 5,000", "8", "94%") — these are never fetched from the API | 🟡 Medium |
| J6 | The `mobile CTA` on Services ("Need Help Finding?") and "Pro Tips" on Jobs are inconsistent filler sections. Cross-page consistency is broken | 🟢 Low |

### 1.4 Professionals Page (`/professionals`)

| # | Issue | Severity |
|---|-------|----------|
| P1 | Hero is `py-12 sm:py-16 md:py-20` with the same pattern as the other pages — large empty space before any browseable content | 🟠 High |
| P2 | `useProfessionals` hook uses a plain `useQuery` — no pagination at all. All professionals are fetched in one request. There is no `page` param being sent or a "Load More" mechanism | 🔴 Critical (performance) |
| P3 | Search input lives inside the filter sidebar — on mobile, this means the user must open the filter panel to search. Search should always be visible above the fold | 🔴 Critical (UX) |
| P4 | The desktop sort `<select>` and the sidebar sort buttons are two separate UI elements managing the same `sortBy` state — they are in sync but it's redundant and confusing | 🟡 Medium |
| P5 | `"Nearest First"` sort option is disabled without location but there's no visible prompt to set location first. The option just shows `"Set location"` in muted text — not an actionable CTA | 🟡 Medium |

---

## 2. Plan

### Phase 1 — Landing Page

#### 1A. Fix nav icons — assign unique icons per item

In `Header.tsx`, replace the `navItems` array with correctly differentiated icons:

```ts
const navItems = [
  { name: "Home",          href: "/",             icon: Home        },
  { name: "Services",      href: "/services",     icon: Wrench      },   // was Briefcase
  { name: "Jobs",          href: "/jobs",         icon: Briefcase   },   // stays
  { name: "Professionals", href: "/professionals",icon: Users       },
  { name: "About",         href: "/about",        icon: Info        },
  { name: "Contact",       href: "/contact",      icon: Phone       },
];
```

#### 1B. Header CTA for guests

When the user is **not** logged in, replace the "Post Service" / notification buttons with two clear auth CTAs:

```tsx
{!session ? (
  <div className="flex items-center gap-2">
    <Link href="/auth/login"
      className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-emerald-600 transition-colors">
      Sign In
    </Link>
    <Link href="/auth/signup"
      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all">
      Get Started →
    </Link>
  </div>
) : (
  // existing authenticated buttons
)}
```

This fixes H2 and H4 simultaneously.

#### 1C. Mobile menu — group auth and nav items

In the mobile slide-out menu, add a visual separator between navigation links and auth actions:

```tsx
{/* Navigation links */}
<div className="py-4 border-b border-gray-100 space-y-1">
  {navItems.map(item => <NavLink key={item.name} {...item} />)}
</div>

{/* Auth actions */}
<div className="pt-4 space-y-2">
  {!session ? (
    <>
      <Link href="/auth/signup" className="block w-full px-4 py-3 bg-emerald-600 text-white rounded-xl text-center font-bold">
        Get Started
      </Link>
      <Link href="/auth/login" className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-center font-semibold">
        Sign In
      </Link>
    </>
  ) : (
    // existing session menu items
  )}
</div>
```

#### 1D. Audit and fix landing section CTAs

Go through each landing section component and confirm every button routes correctly for guests:

| Component | Current button text | Required behavior |
|-----------|--------------------|--------------------|
| `Hero` | "Get Started" / search | → `/auth/signup` or `/services` |
| `ServiceCategories` | Category cards | → `/services?category={slug}` |
| `PopularServices` | "View All" / service cards | → `/services` / `/services/{id}` |
| `FeaturedProfessionals` | Professional cards | → `/professionals/{id}` |
| `JoinAsPro` | "Join as Pro" | → `/auth/signup` (then onboarding) |
| `CTA` | "Get Started" | → `/auth/signup` |
| `HowItWorks` | "Start Now" / "Learn More" | → `/auth/signup` / `/about` |

Any button that fires `router.push('/dashboard')` for a guest must redirect to `/auth/login?callbackUrl=/dashboard` instead.

---

### Phase 2 — Services Page

#### 2A. Collapse the hero — replace with a compact sticky search bar

Remove the current `py-24` hero section entirely. Replace it with a compact `<section>` that is part of the sticky bar at `top-0`:

**New layout order:**
```
[Header — sticky top-0 z-50]
[Search + Location bar — sticky top-[64px] z-40]   ← NEW, replaces hero
[Category pills — sticky top-[120px] z-30]
[Main content — filters sidebar + results grid]
```

**Search + Location bar design:**
```tsx
<section className="sticky top-[64px] z-40 bg-white border-b border-gray-100 shadow-sm">
  <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row items-center gap-3">
    {/* Search input — takes most of the width */}
    <div className="relative flex-1 w-full">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
      <input
        type="text"
        placeholder="Search services..."
        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-emerald-500 transition-all text-sm"
      />
    </div>
    {/* Location button — prominent, clearly actionable */}
    <LocationPicker onLocationChange={setUserLocation} />
  </div>
</section>
```

This collapses the 200–280px hero to a ~56px bar, immediately exposing the results grid on load.

#### 2B. Location button redesign

The current `LocationPicker` renders as a small dropdown trigger. Redesign it to be unmistakably a location action button:

```tsx
<button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-100 hover:border-emerald-400 transition-all whitespace-nowrap text-sm min-w-[160px]">
  <span className="material-symbols-outlined text-emerald-600">my_location</span>
  {currentLocation
    ? <span className="truncate max-w-[120px]">{currentLocation.address}</span>
    : <span>Set my location</span>
  }
  {currentLocation && (
    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
  )}
</button>
```

The pulsing dot indicates an active location filter — a common pattern from Airbnb and Uber. The button label changes clearly between "Set my location" and the resolved address.

#### 2C. Fix the broken mobile Sort button

Replace the dead `onClick` with a proper sort sheet:

```tsx
// State
const [showSortSheet, setShowSortSheet] = useState(false);
const sortOptions = [
  { value: 'relevance',   label: 'Relevance' },
  { value: 'rating',      label: 'Highest Rated' },
  { value: 'price_low',   label: 'Price: Low to High' },
  { value: 'price_high',  label: 'Price: High to Low' },
  { value: 'distance',    label: 'Nearest First', disabled: !userLocation },
];

// Mobile bottom sheet
{showSortSheet && (
  <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowSortSheet(false)}>
    <div className="w-full bg-white rounded-t-2xl p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
      <h3 className="font-bold text-gray-900 mb-3">Sort By</h3>
      {sortOptions.map(opt => (
        <button key={opt.value} onClick={() => { handleFilterChange({ sort: opt.value }); setShowSortSheet(false); }}
          className={`w-full flex items-center justify-between px-3 py-3 rounded-xl mb-1 text-sm font-medium
            ${filters.sort === opt.value ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-gray-700 hover:bg-gray-50'}`}
          disabled={opt.disabled}>
          {opt.label}
          {filters.sort === opt.value && <span className="material-symbols-outlined text-emerald-600 text-base">check</span>}
        </button>
      ))}
    </div>
  </div>
)}
```

#### 2D. Implement infinite scroll with `useInfiniteQuery`

Replace the current page-based `useQuery` in the services hook with `useInfiniteQuery`:

```ts
// src/lib/api/hooks/useServices.ts — new infinite version
import { useInfiniteQuery } from '@tanstack/react-query';

export const useServicesInfinite = (filters: ServicesFilters) => {
  return useInfiniteQuery({
    queryKey: ['services-infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: '12',
        ...(filters.search    && { search: filters.search }),
        ...(filters.category  && { category: filters.category }),
        ...(filters.sort      && { sort: filters.sort }),
        ...(filters.latitude  && { latitude: String(filters.latitude) }),
        ...(filters.longitude && { longitude: String(filters.longitude) }),
        ...(filters.minPrice  && { minPrice: String(filters.minPrice) }),
        ...(filters.maxPrice  && { maxPrice: String(filters.maxPrice) }),
      });
      const res = await apiClient.get(`/services?${params}`);
      return res.data; // { items, total, page, hasMore }
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });
};
```

In `ServicesClient.tsx`, replace `ServicesList` props with the infinite version and add an intersection observer sentinel:

```tsx
// Sentinel div — triggers next page load when it enters the viewport
const sentinelRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
    { threshold: 0.1 }
  );
  if (sentinelRef.current) observer.observe(sentinelRef.current);
  return () => observer.disconnect();
}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

// At the bottom of results list
<div ref={sentinelRef} className="h-px" />
{isFetchingNextPage && <LoadingSpinner />}
{!hasNextPage && allServices.length > 0 && (
  <p className="text-center text-gray-400 text-sm py-8">You've seen all services</p>
)}
```

**Important:** Reset the query with `remove()` when filters change so old pages don't persist:
```ts
useEffect(() => {
  // filters changed — start fresh from page 1
  queryClient.removeQueries({ queryKey: ['services-infinite'] });
}, [filters.search, filters.category, filters.sort, filters.latitude]);
```

#### 2E. Fix SSR hydration flash for responsive state

Remove `isMobile` / `isTablet` window-resize state. Use CSS only:

```tsx
{/* Mobile: show/hide via CSS classes, not JS state */}
<aside className={`${showMobileFilters ? 'block' : 'hidden'} lg:block lg:w-72 xl:w-80 ...`}>
```

The `lg:hidden` / `lg:block` Tailwind classes already handle responsiveness without JS. Delete the `useEffect` resize handlers entirely.

#### 2F. Green theme consistency

Remove the "Quick Tips" section at the bottom entirely — it's filler that distracts from the conversion funnel. Replace it with a single-line guest CTA:

```tsx
{!session && (
  <div className="mt-8 p-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-3">
    <p className="font-semibold">Sign up to book a service, track orders, and pay securely via M-Pesa.</p>
    <Link href="/auth/signup" className="px-5 py-2.5 bg-white text-emerald-700 rounded-xl font-bold hover:bg-emerald-50 transition-colors whitespace-nowrap">
      Create Free Account →
    </Link>
  </div>
)}
```

Update the filter sidebar header from `from-slate-50 to-gray-50` to `from-emerald-50 to-teal-50/30` to match the theme.

---

### Phase 3 — Jobs Page

#### 3A. Remove / collapse the hero

Same approach as Services. Replace the `py-28` hero with a compact inline page header:

```tsx
{/* Page header — not sticky, not a hero */}
<div className="bg-white border-b border-gray-100">
  <div className="container mx-auto px-4 py-5 sm:py-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Browse Jobs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Find projects and submit proposals</p>
      </div>
      {!session && (
        <Link href="/auth/signup"
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold">
          Sign Up to Apply →
        </Link>
      )}
    </div>
  </div>
</div>
```

This drops 224px of empty space to ~88px of purposeful content.

#### 3B. Fix the overlapping sticky bars on tablet

Unify the sticky filter experience across breakpoints:

```
[Header — sticky z-50, h-16]
[Search + Tabs bar — sticky top-16 z-40, always visible]
[Active filters indicator — not sticky, inline]
```

Remove the separate `hidden lg:block` and `lg:hidden` sticky sections. Use a single adaptive bar:

```tsx
<section className="sticky top-16 z-40 bg-white border-b border-gray-100 shadow-sm">
  <div className="container mx-auto px-4 py-3">
    {/* Row 1: Search + Category on all sizes */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
      <SearchInput value={searchInput} onChange={setSearchInput} />
      <CategorySelect value={selectedCategory} onChange={setSelectedCategory} />
    </div>
    {/* Row 2: Status tabs + Verified toggle */}
    <div className="flex items-center justify-between gap-3 overflow-x-auto">
      <StatusTabs selected={selectedStatus} onChange={setSelectedStatus} />
      <VerifiedToggle value={verifiedOnly} onChange={setVerifiedOnly} />
    </div>
  </div>
</section>
```

#### 3C. Fix "Load More" — implement real accumulated pagination

The core bug: `currentPage` increments but `useQuery` returns page N only, replacing the list. Fix by accumulating results in state:

```ts
// Option A — simple accumulated state (no library change needed)
const [allJobs, setAllJobs] = useState<Job[]>([]);

const { data, isLoading, isFetching } = useQuery({
  queryKey: ['jobs', queryParams],
  queryFn: fetchJobs,
  placeholderData: keepPreviousData,
});

// Append new page results to existing list
useEffect(() => {
  if (data?.items) {
    setAllJobs(prev =>
      currentPage === 1 ? data.items : [...prev, ...data.items]
    );
  }
}, [data, currentPage]);

// Reset when filters change
useEffect(() => {
  setAllJobs([]);
  setCurrentPage(1);
}, [searchQuery, selectedCategory, selectedStatus, verifiedOnly]);
```

Or use `useInfiniteQuery` for the same approach as Services (recommended for consistency).

**Load More button:**
```tsx
{data?.hasMore && (
  <button
    onClick={() => setCurrentPage(p => p + 1)}
    disabled={isFetching}
    className="mx-auto mt-8 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold disabled:opacity-60"
  >
    {isFetching ? <Spinner /> : <>Load More <ChevronDown className="w-4 h-4" /></>}
  </button>
)}
{!data?.hasMore && allJobs.length > 0 && (
  <p className="text-center text-gray-400 text-sm py-8 mt-4">All jobs loaded</p>
)}
```

#### 3D. Add LocationPicker to Jobs

Import and add `LocationPicker` to the sticky filter bar. Pass location to the query:

```ts
params.append('latitude', userLocation.latitude.toString());
params.append('longitude', userLocation.longitude.toString());
```

Add a `distance` sort option to the existing tabs alongside OPEN/IN_PROGRESS/COMPLETED.

#### 3E. Remove hardcoded Job Market Insights section

Replace with a real-time result count + active filters summary:

```tsx
<div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 mb-6 text-sm text-gray-600">
  <span className="font-bold text-gray-900">{data?.total ?? allJobs.length}</span> jobs found
  {selectedCategory && <Chip label={selectedCategory} onRemove={() => setSelectedCategory('')} />}
  {verifiedOnly && <Chip label="Verified clients" onRemove={() => setVerifiedOnly(false)} />}
  {userLocation && <Chip label={`Near ${userLocation.address}`} onRemove={() => setUserLocation(null)} />}
</div>
```

---

### Phase 4 — Professionals Page

#### 4A. Remove / collapse the hero

Same pattern as Services and Jobs. Replace with a compact page header + search always visible:

```tsx
{/* Compact page header — NOT a hero */}
<div className="bg-white border-b border-gray-100 sticky top-16 z-40 shadow-sm">
  <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3">
    {/* Search — always visible, not buried in filter sidebar */}
    <div className="relative flex-1">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
      <input type="text" placeholder="Search by name or skill..."
        value={searchInput} onChange={e => setSearchInput(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-emerald-500 text-sm transition-all" />
    </div>
    {/* Location picker — prominent, same style as Services */}
    <LocationPicker onLocationChange={setUserLocation} />
  </div>
</div>
```

Remove search from the filter sidebar since it now lives in the always-visible bar.

#### 4B. Add real pagination to Professionals

`useProfessionals` has no `page` param. Add it:

```ts
// useProfessionals.ts
export const useProfessionalsInfinite = (params: UseProfessionalsParams) => {
  return useInfiniteQuery({
    queryKey: ['professionals-infinite', params],
    queryFn: async ({ pageParam = 1 }) => {
      const query = new URLSearchParams({ ...params, page: String(pageParam), limit: '12' });
      const res = await apiClient.get(`/professionals?${query}`);
      return res.data; // { data, total, page, hasMore }
    },
    getNextPageParam: last => last.hasMore ? last.page + 1 : undefined,
    initialPageParam: 1,
  });
};
```

Add the same intersection-observer infinite scroll sentinel as Services.

The API route `/api/professionals` must be updated to accept and respect `page` and `limit` params if it doesn't already.

#### 4C. Fix the duplicate sort controls

Remove the desktop `<select>` sort control from the results header — it's redundant with the sidebar sort buttons. The sidebar is the single source of truth for sort. The results header only shows the result count and active filter chips:

```tsx
{/* Results header — desktop */}
<div className="hidden lg:flex items-center justify-between mb-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
  <p className="text-gray-600 text-sm">
    <span className="font-bold text-gray-900">{total}</span> professionals found
    {userLocation && <span className="text-emerald-600"> near you</span>}
  </p>
  <ActiveFilterChips filters={...} onClear={...} />
</div>
```

#### 4D. Fix "Nearest First" disabled state — make it an active CTA

When location is not set, "Nearest First" should not just be greyed out with "Set location" text. Turn it into a button that triggers location detection:

```tsx
<button
  onClick={() => {
    if (!userLocation) {
      // Trigger location detection inline
      handleDetectLocation();
    } else {
      setSortBy('distance');
    }
  }}
  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors
    ${sortBy === 'distance'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'text-gray-600 hover:bg-gray-50'}`}
>
  <span className="material-symbols-outlined text-sm">near_me</span>
  <span className="text-sm font-medium">Nearest First</span>
  {!userLocation && (
    <span className="ml-auto text-xs text-emerald-600 font-semibold underline">
      Detect location
    </span>
  )}
</button>
```

---

### Phase 5 — Shared Components & Consistency

#### 5A. Shared `<PageHeader>` component

All three listing pages (Services, Jobs, Professionals) now share the same compact header pattern. Extract it:

```
src/components/shared/
├── PageHeader.tsx          ← title, subtitle, guest CTA button
├── SearchLocationBar.tsx   ← search input + LocationPicker, sticky
├── ActiveFilterChips.tsx   ← chips showing active filters with remove buttons
├── InfiniteScrollSentinel.tsx ← intersection observer wrapper
├── EmptyState.tsx          ← consistent empty/no-results UI
└── SortBottomSheet.tsx     ← mobile sort sheet (replaces broken button)
```

#### 5B. Consistent empty states

All three pages must show the same pattern when results are empty:

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
    <span className="material-symbols-outlined text-emerald-400 text-4xl">{icon}</span>
  </div>
  <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
  <p className="text-gray-500 text-sm max-w-sm">{message}</p>
  <button onClick={onReset} className="mt-4 px-4 py-2 text-sm text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50">
    Clear filters
  </button>
</div>
```

#### 5C. Consistent loading skeleton

Replace the bare `animate-pulse h-80` skeleton divs with realistic card skeletons that match the actual card layout:

```tsx
// ServiceCardSkeleton / JobCardSkeleton / ProfessionalCardSkeleton
const CardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
    <div className="h-40 bg-gray-200" />            {/* Image area */}
    <div className="p-5 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />   {/* Title */}
      <div className="h-3 bg-gray-100 rounded w-1/2" />   {/* Category */}
      <div className="h-3 bg-gray-100 rounded w-2/3" />   {/* Location */}
      <div className="h-8 bg-gray-100 rounded-lg mt-4" /> {/* Button */}
    </div>
  </div>
);
```

#### 5D. Guest CTA strip — present on all three pages

A consistent guest-conversion strip that appears at the bottom of results, shown only when `!session`:

```tsx
const GuestCTAStrip = () => (
  <div className="mt-10 p-5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div>
      <p className="font-bold text-base">Ready to get started?</p>
      <p className="text-emerald-100 text-sm mt-0.5">Create a free account to book, apply, or post services.</p>
    </div>
    <div className="flex gap-2 flex-shrink-0">
      <Link href="/auth/signup" className="px-4 py-2.5 bg-white text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors">
        Sign Up Free
      </Link>
      <Link href="/auth/login" className="px-4 py-2.5 bg-emerald-500/40 text-white rounded-xl font-semibold text-sm hover:bg-emerald-500/60 transition-colors">
        Sign In
      </Link>
    </div>
  </div>
);
```

---

## 3. Implementation Order

Execute in this sequence to ship improvements with the lowest risk of regressions:

| Priority | Task | File(s) | Effort |
|----------|------|---------|--------|
| 🔴 P0 | Fix broken mobile Sort button (S4) | `ServicesClient.tsx` + `SortBottomSheet.tsx` | 1h |
| 🔴 P0 | Fix "Load More" accumulation bug (J3) | `JobsClient.tsx` | 1h |
| 🔴 P0 | Add Professionals pagination — useInfiniteQuery (P2) | `useProfessionals.ts`, `ProfessionalsClient.tsx` | 2h |
| 🟠 P1 | Header: guest CTAs + nav icon differentiation (H1, H2, H4) | `Header.tsx` | 1.5h |
| 🟠 P1 | Services: collapse hero → compact sticky search bar (S1, S2, S3) | `ServicesClient.tsx` | 2h |
| 🟠 P1 | Jobs: collapse hero → compact page header (J1, J2) | `JobsClient.tsx` | 1.5h |
| 🟠 P1 | Professionals: collapse hero + move search above fold (P1, P3) | `ProfessionalsClient.tsx` | 1.5h |
| 🟠 P1 | Services: useInfiniteQuery + intersection observer scroll (S5) | `ServicesClient.tsx`, `useServices.ts` | 3h |
| 🟡 P2 | LocationPicker redesign — prominent button with pulsing dot (S2) | `LocationPicker.tsx` | 1.5h |
| 🟡 P2 | Fix duplicate sort controls on Professionals (P4) | `ProfessionalsClient.tsx` | 1h |
| 🟡 P2 | "Nearest First" → active CTA when no location set (P5) | `ProfessionalsClient.tsx` | 45min |
| 🟡 P2 | Extract shared components: PageHeader, EmptyState, CardSkeleton (5A–5C) | `src/components/shared/` | 3h |
| 🟡 P2 | Fix SSR hydration flash — remove window resize JS (S8) | `ServicesClient.tsx` | 30min |
| 🟢 P3 | Add location filter to Jobs page (J4) | `JobsClient.tsx` | 1h |
| 🟢 P3 | Replace hardcoded stats (J5) with real API data | `JobsClient.tsx` | 1h |
| 🟢 P3 | Green theme consistency — filter sidebar, remove Quick Tips (S6, S7) | `ServicesClient.tsx` | 45min |
| 🟢 P3 | GuestCTAStrip on all three pages (5D) | 3 client components | 1h |
| 🟢 P3 | Mobile menu auth grouping (H3) | `Header.tsx` | 45min |
| 🟢 P3 | Audit all landing section CTAs (H5) | All `src/components/*.tsx` landing sections | 2h |

**Total estimated effort: ~26 hours**

---

## 4. Layout Reference — After Changes

### Services / Jobs / Professionals — unified viewport layout

```
┌────────────────────────────────────────────┐
│ HEADER (sticky, z-50, h-16)               │
│  Logo | Nav links | [Sign In] [Get Started]│
├────────────────────────────────────────────┤
│ SEARCH + LOCATION BAR (sticky, z-40, ~56px)│
│  [🔍 Search services...]  [📍 Set location]│
├────────────────────────────────────────────┤
│ CATEGORY PILLS (sticky, z-30, ~52px)       │
│  All · Cleaning · Plumbing · Electrical… ▼ │
├─────────────┬──────────────────────────────┤
│  FILTERS    │  ACTIVE FILTERS + RESULT COUNT│
│  SIDEBAR    │  12 services · [Nairobi ×]    │
│  (desktop)  ├──────────────────────────────┤
│  or slide   │  CARD  │  CARD  │  CARD       │
│  panel      │  CARD  │  CARD  │  CARD       │
│  (mobile)   │  CARD  │  CARD  │  CARD       │
│             │  [sentinel — triggers next pg] │
│             │  CARD  │  CARD  │  CARD       │
│             │  (loaded on scroll)            │
│             ├──────────────────────────────┤
│             │  GUEST CTA STRIP (if !session) │
├─────────────┴──────────────────────────────┤
│ FOOTER                                     │
└────────────────────────────────────────────┘
```

---

## 5. Open Questions

1. **Location on Jobs for guests:** Guests can filter by location on Services and Professionals. Should guests also be able to filter Jobs by location, or is that a logged-in feature (since applying requires an account)?

2. **Hero removal — brand impact:** The green hero sections currently serve as visual anchors that make each page feel like a distinct destination. After collapsing them, the pages will look more functional but less visually differentiated. Is a thin colored top border (like Airbnb's red/pink accent) or a category-specific illustration acceptable as a lightweight differentiator?

3. **Pagination strategy consistency:** This plan proposes `useInfiniteQuery` + intersection observer for all three pages. If the backend `/api/professionals` route doesn't yet support `page` and `limit`, that server-side change is a prerequisite. Confirm the API routes before starting Phase 4A.

4. **"Sign Up to Apply" on Jobs:** Should the "View Details" button on job cards for guests lead to the job detail page (showing the job but requiring login to apply), or should it redirect directly to sign-up? Letting guests see the job detail before asking for login is lower friction and generally converts better.