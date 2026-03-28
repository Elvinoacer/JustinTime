"use client";

import { useEffect, useMemo, useState } from "react";
import { useCategories } from "@/lib/api/hooks/useServices";
import { usePublicJobsInfinite } from "@/lib/api/hooks/usePublicJobs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";
import LocationPicker from "@/components/LocationPicker";
import GuestCTAStrip from "@/components/shared/GuestCTAStrip";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import JobCard from "./JobCard";
import {
  Search,
  Filter,
  CheckCircle,
  Loader2,
  ChevronDown,
  Building,
  Briefcase,
} from "lucide-react";

const STATUS_TABS = [
  { id: "OPEN", label: "Open Jobs", icon: Briefcase },
  { id: "IN_PROGRESS", label: "In Progress", icon: Loader2 },
  { id: "COMPLETED", label: "Completed", icon: CheckCircle },
] as const;

const JobsPage = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("OPEN");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
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

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      <PageHeader
        title="Find Your Next Project"
        description="Browse available jobs and submit proposals to grow your business."
      />

      <section
        className="sticky top-[64px] z-40 border-b border-gray-200 bg-white shadow-sm sm:top-[72px]"
        aria-label="Search and filters"
      >
        <div className="container mx-auto px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <label htmlFor="jobs-search" className="sr-only">
                Search jobs
              </label>
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                id="jobs-search"
                type="search"
                autoComplete="off"
                placeholder="Search jobs by title or description…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-full border-2 border-transparent bg-gray-100 py-2.5 pl-11 pr-10 text-sm text-gray-900 transition-all placeholder:text-gray-500 focus:border-emerald-500 focus:bg-white focus:outline-none sm:text-base"
              />
              {searchInput !== searchQuery ? (
                <Loader2
                  className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-emerald-500"
                  aria-hidden
                />
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative hidden min-w-[200px] lg:block">
                <Building className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Category"
                  className="w-full appearance-none rounded-full border-2 border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm text-gray-900 transition-all focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {categories
                    .filter((c) => c.id && c.id !== "all")
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>

              <LocationPicker onLocationChange={setUserLocation} />

              <button
                type="button"
                onClick={() => setShowMobileFilters((v) => !v)}
                className="flex items-center justify-center rounded-xl border-2 border-gray-200 p-2.5 text-gray-700 hover:bg-gray-50 lg:hidden"
                aria-expanded={showMobileFilters}
                aria-controls="jobs-mobile-filters"
              >
                <Filter className="h-5 w-5 text-gray-600" />
                <span className="sr-only">Filters</span>
              </button>
            </div>
          </div>

          <div className="mt-4 hidden flex-col gap-4 border-t border-gray-100 pt-3 lg:flex lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Job status">
              {STATUS_TABS.map((tab) => {
                const Icon = tab.icon;
                const selected = selectedStatus === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      selected
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedStatus(tab.id)}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setVerifiedOnly((v) => !v)}
              className={`flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 transition-colors ${
                verifiedOnly ? "bg-emerald-50" : "bg-white"
              }`}
              aria-pressed={verifiedOnly}
            >
              <span className="text-sm font-medium text-gray-800">
                Verified clients
              </span>
              <span
                className={`relative inline-flex h-4 w-8 items-center rounded-full p-0.5 transition-colors ${
                  verifiedOnly ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`h-3 w-3 rounded-full bg-white shadow transition-transform ${
                    verifiedOnly ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </section>

      {showMobileFilters ? (
        <div
          id="jobs-mobile-filters"
          className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm lg:hidden"
        >
          <div className="relative mb-4">
            <Building className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Category"
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories
                .filter((c) => c.id && c.id !== "all")
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          <div
            className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-2"
            role="tablist"
          >
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const selected = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selected
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                  onClick={() => setSelectedStatus(tab.id)}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="flex items-center gap-1 text-sm font-medium text-gray-800">
              <CheckCircle className="h-4 w-4 text-emerald-600" aria-hidden />
              Verified clients only
            </span>
            <button
              type="button"
              onClick={() => setVerifiedOnly((v) => !v)}
              className={`relative inline-flex h-6 w-10 items-center rounded-full p-1 transition-colors ${
                verifiedOnly ? "bg-emerald-500" : "bg-gray-300"
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

      <main className="container mx-auto flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {isLoading && jobs.length === 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex h-[320px] animate-pulse flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="space-y-4">
                  <div className="h-6 w-3/4 rounded bg-gray-200" />
                  <div className="h-4 w-1/4 rounded bg-gray-200" />
                  <div className="space-y-2 pt-2">
                    <div className="h-3 rounded bg-gray-200" />
                    <div className="h-3 w-5/6 rounded bg-gray-200" />
                    <div className="h-3 rounded bg-gray-200" />
                  </div>
                </div>
                <div className="flex gap-3 border-t border-gray-100 pt-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-gray-200" />
                    <div className="h-3 w-1/2 rounded bg-gray-200" />
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
            description="Try changing filters or search terms to see more results."
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
            <p className="mb-4 text-sm text-gray-600 lg:mb-6">
              Showing{" "}
              <span className="font-semibold text-gray-900">{totalLoaded}</span>{" "}
              job{totalLoaded === 1 ? "" : "s"}
              {data?.pages[0]?.pagination.total != null ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-gray-500">
                    {data.pages[0].pagination.total} total matches
                  </span>
                </>
              ) : null}
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job, index) => (
                <JobCard key={job.id} job={job} priority={index < 6} />
              ))}
            </div>
          </>
        )}

        <InfiniteScrollSentinel
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        >
          <div className="mt-4 flex items-center justify-center gap-2 py-8 font-medium text-emerald-700">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading more jobs…
          </div>
        </InfiniteScrollSentinel>

        {!hasNextPage && jobs.length > 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            You’ve reached the end of the list for these filters.
          </p>
        ) : null}

        <GuestCTAStrip
          title="Ready to find your next project?"
          description="Sign up to submit proposals, communicate with clients, and grow your professional reputation."
          buttonText="Start working"
        />
      </main>

      <Footer />
    </div>
  );
};

export default JobsPage;
