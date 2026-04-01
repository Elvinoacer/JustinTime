"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCategories } from "@/lib/api/hooks/useServices";
import { usePublicJobsInfinite } from "@/lib/api/hooks/usePublicJobs";
import { useHeroToolbarCompact } from "@/lib/hooks/useHeroToolbarCompact";
import { useScrollActionBarVisibility } from "@/lib/hooks/useScrollActionBarVisibility";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";
import LocationPicker from "@/components/LocationPicker";
import BrowseStickyToolbar from "@/components/marketplace/BrowseStickyToolbar";
import GuestCTAStrip from "@/components/shared/GuestCTAStrip";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import RadarBrowse, {
  type RadarBrowseItem,
} from "@/components/marketplace/RadarBrowse";
import JobCard from "./JobCard";
import { calculateBearing, calculateDistance } from "@/lib/utils/geolocation";
import {
  Search,
  Filter,
  CheckCircle,
  Loader2,
  ChevronDown,
  Building,
  Briefcase,
  Radar,
  LayoutGrid,
} from "lucide-react";

const STATUS_TABS = [
  { id: "OPEN", label: "Open", icon: Briefcase },
  { id: "IN_PROGRESS", label: "In progress", icon: Loader2 },
  { id: "COMPLETED", label: "Completed", icon: CheckCircle },
] as const;

const JobsPage = () => {
  const heroRef = useRef<HTMLElement>(null);
  const toolbarCompact = useHeroToolbarCompact(heroRef);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("OPEN");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "radar">("cards");
  const [mobileToolbarExpanded, setMobileToolbarExpanded] = useState(true);
  const showMobileActionBar = useScrollActionBarVisibility();
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];

  const filters = useMemo(
    () => ({
      status: selectedStatus,
      search: searchQuery || undefined,
      category: selectedCategory || undefined,
      verifiedOnly,
      latitude: userLocation?.latitude,
      longitude: userLocation?.longitude,
      pageSize: 12,
    }),
    [
      selectedStatus,
      searchQuery,
      selectedCategory,
      verifiedOnly,
      userLocation?.latitude,
      userLocation?.longitude,
    ],
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePublicJobsInfinite(filters);

  const jobs = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data?.pages],
  );

  const totalLoaded = jobs.length;

  const radarItems = useMemo<RadarBrowseItem[]>(() => {
    if (!userLocation) return [];

    return jobs
      .filter((job) => job.latitude != null && job.longitude != null)
      .map((job) => {
        const distanceKm =
          job.distanceKm ??
          calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            job.latitude as number,
            job.longitude as number,
          );
        const bearingDeg = calculateBearing(
          userLocation.latitude,
          userLocation.longitude,
          job.latitude as number,
          job.longitude as number,
        );
        return {
          id: job.id,
          href: `/jobs/${job.id}`,
          name: job.title,
          subtitle: job.location ?? job.client?.name ?? "Location unknown",
          type: "job",
          typeLabel: job.category?.name ?? "General",
          colorKey: job.category?.slug ?? job.category?.name ?? "general",
          distanceKm,
          bearingDeg,
        };
      });
  }, [jobs, userLocation]);

  const searchInputClasses = toolbarCompact
    ? "min-h-10 py-2 pl-9 pr-9 text-sm sm:pl-10"
    : "min-h-11 py-2.5 pl-11 pr-10 text-sm sm:min-h-12 sm:py-3 sm:pl-12 sm:text-base";

  const iconPad = toolbarCompact ? "left-2.5" : "left-3 sm:left-4";
  const activeMobileFilterCount =
    (selectedStatus !== "OPEN" ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (userLocation ? 1 : 0);

  useEffect(() => {
    setMobileToolbarExpanded(!toolbarCompact);
  }, [toolbarCompact]);

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50">
      <Header />

      <div className="pt-[var(--public-header-h)]">
        <PageHeader
          ref={heroRef}
          variant="browse"
          headingId="jobs-browse-heading"
          title="Find your next project"
          description="Browse jobs, filter by what matters, and send proposals when you’re ready—all in one calm layout."
        />

        <BrowseStickyToolbar
          compact={toolbarCompact}
          footer={
            <div
              className={`${mobileToolbarExpanded ? "flex" : "hidden"} flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 lg:flex`}
            >
              <div
                className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]"
                role="tablist"
                aria-label="Job status"
              >
                {STATUS_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const selected = selectedStatus === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:py-2 sm:text-sm ${
                        selected
                          ? "border-emerald-500/80 bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/60"
                      }`}
                      onClick={() => setSelectedStatus(tab.id)}
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setVerifiedOnly((v) => !v)}
                className={`hidden shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm lg:flex ${
                  verifiedOnly
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                aria-pressed={verifiedOnly}
              >
                <CheckCircle
                  className="h-3.5 w-3.5 text-emerald-600"
                  aria-hidden
                />
                Verified clients
              </button>
              <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm lg:flex">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    viewMode === "cards"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("radar")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    viewMode === "radar"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Radar className="h-3.5 w-3.5" />
                  Radar
                </button>
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="jobs-search" className="sr-only">
                Search jobs
              </label>
              <Search
                className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:h-5 sm:w-5 ${iconPad}`}
                aria-hidden
              />
              <input
                id="jobs-search"
                type="search"
                autoComplete="off"
                enterKeyHint="search"
                placeholder="Search by title or description…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={`w-full rounded-2xl border border-slate-200/90 bg-slate-50/90 text-slate-900 shadow-inner shadow-slate-200/40 outline-none ring-emerald-500/0 transition-[min-height,padding,font-size,background-color,border-color] placeholder:text-slate-400 focus:border-emerald-500/70 focus:bg-white focus:ring-4 focus:ring-emerald-500/12 ${searchInputClasses}`}
              />
              {searchInput !== searchQuery ? (
                <Loader2
                  className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-600 sm:h-5 sm:w-5 ${toolbarCompact ? "right-2.5" : "right-3 sm:right-4"}`}
                  aria-hidden
                />
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setMobileToolbarExpanded((v) => !v)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/60 lg:hidden"
              aria-expanded={mobileToolbarExpanded}
              aria-controls="jobs-toolbar-advanced"
            >
              <Filter className="h-4 w-4 text-slate-600" />
              {mobileToolbarExpanded ? "Hide controls" : "Show controls"}
              {activeMobileFilterCount > 0 ? (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  {activeMobileFilterCount}
                </span>
              ) : null}
            </button>

            <div
              id="jobs-toolbar-advanced"
              className={`${mobileToolbarExpanded ? "flex" : "hidden"} w-full min-w-0 items-center gap-2 sm:w-auto sm:shrink-0 lg:flex`}
            >
              <div className="relative hidden min-w-[8.5rem] flex-1 sm:flex-initial lg:block lg:min-w-[11rem]">
                <Building className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-3 sm:h-5 sm:w-5" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Category"
                  className={`w-full cursor-pointer appearance-none rounded-2xl border border-slate-200/90 bg-slate-50/90 py-2.5 pl-9 pr-8 text-sm text-slate-900 shadow-inner shadow-slate-200/40 outline-none transition-[background-color,border-color] focus:border-emerald-500/70 focus:bg-white focus:ring-4 focus:ring-emerald-500/12 lg:min-h-12 lg:py-3 lg:pl-10 ${
                    toolbarCompact
                      ? "min-h-10 py-2 pl-8 text-xs sm:text-sm"
                      : ""
                  }`}
                >
                  <option value="">All categories</option>
                  {categories
                    .filter((c) => c.id && c.id !== "all")
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="min-w-0 flex-1 sm:flex-initial sm:max-w-[min(100%,13rem)] lg:max-w-[min(100%,14rem)]">
                <LocationPicker
                  compact={toolbarCompact}
                  quiet
                  onLocationChange={setUserLocation}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowMobileFilters((v) => !v)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/50 lg:hidden"
                aria-expanded={showMobileFilters}
                aria-controls="jobs-mobile-filters"
              >
                <Filter className="h-5 w-5 text-slate-600" />
                <span className="sr-only">More filters</span>
              </button>
            </div>
          </div>
        </BrowseStickyToolbar>

        {showMobileFilters ? (
          <div
            id="jobs-mobile-filters"
            className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden"
          >
            <div className="relative mb-3">
              <Building className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Category"
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All categories</option>
                {categories
                  .filter((c) => c.id && c.id !== "all")
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                <CheckCircle className="h-4 w-4 text-emerald-600" aria-hidden />
                Verified clients only
              </span>
              <button
                type="button"
                onClick={() => setVerifiedOnly((v) => !v)}
                className={`relative inline-flex h-6 w-10 items-center rounded-full p-1 transition-colors ${
                  verifiedOnly ? "bg-emerald-500" : "bg-slate-300"
                }`}
                aria-pressed={verifiedOnly}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    verifiedOnly ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        ) : null}

        <main className="mx-auto max-w-7xl flex-1 px-2.5 py-5 pb-24 sm:px-6 sm:py-8 sm:pb-10 lg:px-8 lg:py-10">
          {isLoading && jobs.length === 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex h-[320px] animate-pulse flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
                >
                  <div className="space-y-4">
                    <div className="h-6 w-3/4 rounded bg-slate-200" />
                    <div className="h-4 w-1/4 rounded bg-slate-200" />
                    <div className="space-y-2 pt-2">
                      <div className="h-3 rounded bg-slate-200" />
                      <div className="h-3 w-5/6 rounded bg-slate-200" />
                      <div className="h-3 rounded bg-slate-200" />
                    </div>
                  </div>
                  <div className="flex gap-3 border-t border-slate-100 pt-4">
                    <div className="h-10 w-10 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 rounded bg-slate-200" />
                      <div className="h-3 w-1/2 rounded bg-slate-200" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              title="Something went wrong"
              description="We couldn’t load jobs. Check your connection and try again."
              buttonText="Retry"
              onAction={() => void refetch()}
            />
          ) : jobs.length === 0 ? (
            <EmptyState
              title="No jobs found"
              description="Try changing filters or search to see more results."
              buttonText="Clear all filters"
              onAction={() => {
                setSearchInput("");
                setSearchQuery("");
                setSelectedCategory("");
                setVerifiedOnly(false);
                setSelectedStatus("OPEN");
              }}
            />
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600 lg:mb-6">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {totalLoaded}
                </span>{" "}
                job{totalLoaded === 1 ? "" : "s"}
                {data?.pages[0]?.pagination.total != null ? (
                  <>
                    {" "}
                    <span className="text-slate-400">·</span>{" "}
                    <span className="text-slate-500">
                      {data.pages[0].pagination.total} matches
                    </span>
                  </>
                ) : null}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-5">
                {viewMode === "cards"
                  ? jobs.map((job, index) => (
                      <JobCard key={job.id} job={job} priority={index < 6} />
                    ))
                  : null}
              </div>
              {viewMode === "radar" ? (
                <RadarBrowse
                  title="Jobs radar"
                  description="Scan opportunities by true distance and direction from where you are now."
                  hasUserLocation={Boolean(userLocation)}
                  items={radarItems}
                  autoFullscreenOnMount
                />
              ) : null}
            </>
          )}

          <InfiniteScrollSentinel
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          >
            <div className="mt-4 flex items-center justify-center gap-2 py-8 text-sm font-medium text-emerald-700">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Loading more…
            </div>
          </InfiniteScrollSentinel>

          {!hasNextPage && jobs.length > 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              End of results for these filters.
            </p>
          ) : null}

          <GuestCTAStrip
            title="Ready to find your next project?"
            description="Sign up to submit proposals, communicate with clients, and grow your professional reputation."
            buttonText="Start working"
          />
        </main>
      </div>

      <div
        className={`fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,22rem)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[0_14px_40px_-18px_rgba(15,23,42,0.45)] backdrop-blur-sm transition-all duration-200 lg:hidden ${
          showMobileActionBar
            ? "translate-y-0 opacity-100"
            : "translate-y-20 opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={() => setShowMobileFilters((v) => !v)}
          className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-800"
          aria-expanded={showMobileFilters}
          aria-controls="jobs-mobile-filters"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeMobileFilterCount > 0 ? (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
              {activeMobileFilterCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() =>
            setViewMode((mode) => (mode === "cards" ? "radar" : "cards"))
          }
          className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white"
        >
          {viewMode === "cards" ? (
            <Radar className="h-4 w-4" />
          ) : (
            <LayoutGrid className="h-4 w-4" />
          )}
          {viewMode === "cards" ? "Radar" : "Cards"}
        </button>
      </div>

      <Footer />
    </div>
  );
};

export default JobsPage;
