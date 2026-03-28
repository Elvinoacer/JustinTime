"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProfessionalCard from "@/components/ProfessionalCard";
import LocationPicker from "@/components/LocationPicker";
import SortBottomSheet, {
  type SortOption,
} from "@/components/shared/SortBottomSheet";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";
import GuestCTAStrip from "@/components/shared/GuestCTAStrip";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { useProfessionalsInfinite } from "@/lib/api/hooks/useProfessionals";
import { useEffect, useMemo, useState } from "react";
import { Search, Filter, CheckCircle, Loader2 } from "lucide-react";

const SORT_OPTIONS = (
  hasLocation: boolean,
): { value: string; label: string; icon: string; disabled?: boolean; hint?: string }[] => [
  { value: "rating", label: "Highest rated", icon: "star" },
  {
    value: "distance",
    label: "Nearest first",
    icon: "near_me",
    disabled: !hasLocation,
    hint: !hasLocation ? "Set your location to enable" : undefined,
  },
  { value: "price_asc", label: "Price: low to high", icon: "trending_up" },
  { value: "price_desc", label: "Price: high to low", icon: "trending_down" },
  { value: "newest", label: "Newest first", icon: "schedule" },
];

export default function ProfessionalsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState<number>();
  const [maxPrice, setMaxPrice] = useState<number>();
  const [sortBy, setSortBy] = useState("rating");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo(
    () => ({
      search,
      minPrice,
      maxPrice,
      sortBy,
      verifiedOnly,
      latitude: userLocation?.latitude,
      longitude: userLocation?.longitude,
      limit: 12,
    }),
    [
      search,
      minPrice,
      maxPrice,
      sortBy,
      verifiedOnly,
      userLocation?.latitude,
      userLocation?.longitude,
    ],
  );

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProfessionalsInfinite(filters);

  const professionals = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data?.pages],
  );

  const totalMatches = data?.pages[0]?.pagination.total;
  const limitedMeta = data?.pages[0]?.meta;

  const mobileSortOptions: SortOption[] = useMemo(
    () =>
      SORT_OPTIONS(!!userLocation).map((o) => ({
        label: o.label,
        value: o.value,
        disabled: o.disabled,
        hint: o.hint,
      })),
    [userLocation],
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <PageHeader
        title="Find top professionals"
        description="Connect with verified experts ready to help you succeed."
      />

      <section
        className="sticky top-[64px] z-40 border-b border-gray-200 bg-white shadow-sm sm:top-[72px]"
        aria-label="Search and location"
      >
        <div className="container mx-auto px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full flex-1">
              <label htmlFor="professionals-search" className="sr-only">
                Search professionals
              </label>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="professionals-search"
                type="search"
                autoComplete="off"
                placeholder="Search by name, bio, or skill…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-full border-2 border-transparent bg-gray-100 py-2.5 pl-11 pr-10 text-sm text-gray-900 transition-all placeholder:text-gray-500 focus:border-emerald-500 focus:bg-white focus:outline-none sm:text-base"
              />
              {searchInput !== search ? (
                <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-emerald-500" />
              ) : null}
            </div>
            <div className="flex w-full gap-2 lg:w-auto lg:shrink-0">
              <LocationPicker
                onLocationChange={(loc) => {
                  setUserLocation(loc);
                  if (loc) setSortBy("distance");
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto flex max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => setShowMobileFilters((v) => !v)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm"
          >
            <Filter className="h-4 w-4 text-gray-600" />
            Filters
          </button>
          <button
            type="button"
            onClick={() => setIsSortOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">sort</span>
            Sort
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
          <aside
            className={`${showMobileFilters ? "block" : "hidden"} shrink-0 lg:block lg:w-72`}
          >
            <div className="sticky top-[150px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <span className="material-symbols-outlined text-emerald-600">
                    tune
                  </span>
                  Refine search
                </h2>
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 lg:hidden"
                  aria-label="Close filters"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="custom-scrollbar max-h-[70vh] space-y-6 overflow-y-auto p-6">
                <div>
                  <label className="mb-3 block text-sm font-semibold text-gray-900">
                    Hourly rate (KES)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">
                        Min
                      </span>
                      <input
                        type="number"
                        value={minPrice ?? ""}
                        onChange={(e) =>
                          setMinPrice(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        placeholder="0"
                        className="w-full rounded-xl border-2 border-gray-200 bg-white py-2.5 pl-12 pr-3 text-sm text-gray-900 transition-colors focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">
                        Max
                      </span>
                      <input
                        type="number"
                        value={maxPrice ?? ""}
                        onChange={(e) =>
                          setMaxPrice(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        placeholder="Any"
                        className="w-full rounded-xl border-2 border-gray-200 bg-white py-2.5 pl-12 pr-3 text-sm text-gray-900 transition-colors focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <label className="mb-3 block text-sm font-semibold text-gray-900">
                    Sort by
                  </label>
                  <div className="space-y-2">
                    {SORT_OPTIONS(!!userLocation).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => !opt.disabled && setSortBy(opt.value)}
                        className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                          sortBy === opt.value
                            ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-800"
                            : opt.disabled
                              ? "cursor-not-allowed border-transparent bg-gray-50 text-gray-400"
                              : "border-transparent bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${
                            sortBy === opt.value ? "text-emerald-600" : ""
                          }`}
                        >
                          {opt.icon}
                        </span>
                        <span className="min-w-0 flex-1">{opt.label}</span>
                        {opt.hint ? (
                          <span className="text-[10px] uppercase tracking-wider text-gray-400">
                            {opt.hint}
                          </span>
                        ) : null}
                        {sortBy === opt.value ? (
                          <span className="material-symbols-outlined text-sm text-emerald-600">
                            check_circle
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold text-gray-900">
                    Trust &amp; safety
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-gray-900">
                        Verified only
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVerifiedOnly(!verifiedOnly)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none ${
                        verifiedOnly ? "bg-emerald-600" : "bg-gray-300"
                      }`}
                      aria-pressed={verifiedOnly}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          verifiedOnly ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setMinPrice(undefined);
                    setMaxPrice(undefined);
                    setSortBy("rating");
                    setVerifiedOnly(false);
                  }}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Reset filters
                </button>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-4 hidden items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:flex">
              <p className="text-sm text-gray-600">
                {totalMatches != null ? (
                  <>
                    <span className="font-semibold text-gray-900">
                      {totalMatches.toLocaleString()}
                    </span>{" "}
                    professional{totalMatches === 1 ? "" : "s"} match your
                    filters
                    {professionals.length > 0 ? (
                      <>
                        {" "}
                        ·{" "}
                        <span className="text-gray-500">
                          showing {professionals.length} loaded
                        </span>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    Showing{" "}
                    <span className="font-semibold text-gray-900">
                      {professionals.length}
                    </span>
                  </>
                )}
              </p>
            </div>

            {limitedMeta?.limited ? (
              <div
                className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                role="status"
              >
                Results capped for performance: ranking the top{" "}
                {limitedMeta.processed?.toLocaleString()} of{" "}
                {limitedMeta.totalMatched?.toLocaleString()} matches. Narrow
                your search for more precise browsing.
              </div>
            ) : null}

            {isLoading && professionals.length === 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-[330px] animate-pulse rounded-2xl border border-gray-100 bg-white shadow-sm"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <span className="material-symbols-outlined mb-4 text-4xl text-red-500">
                  error
                </span>
                <p className="mb-2 font-bold text-gray-900">Something went wrong</p>
                <p className="mb-4 text-sm text-gray-500">
                  We couldn’t load professionals. Check your connection and try
                  again.
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Retry
                </button>
              </div>
            ) : professionals.length === 0 ? (
              <EmptyState
                title="No professionals found"
                description="Try adjusting filters or search to see more results."
                buttonText="Reset filters"
                onAction={() => {
                  setSearchInput("");
                  setMinPrice(undefined);
                  setMaxPrice(undefined);
                  setSortBy("rating");
                  setVerifiedOnly(false);
                }}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                {professionals.map((pro) => (
                  <ProfessionalCard key={pro.id} professional={pro} />
                ))}
              </div>
            )}

            <InfiniteScrollSentinel
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            >
              <div className="mt-4 flex items-center justify-center gap-2 py-8 font-medium text-emerald-700">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading more…
              </div>
            </InfiniteScrollSentinel>

            {!hasNextPage && professionals.length > 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                You’ve reached the end of the list for these filters.
              </p>
            ) : null}

            <GuestCTAStrip
              title="Want to join our network?"
              description="Sign up as a professional to showcase your skills and find quality jobs."
              buttonText="Join as a pro"
            />
          </div>
        </div>
      </div>

      <Footer />

      <SortBottomSheet
        isOpen={isSortOpen}
        onClose={() => setIsSortOpen(false)}
        currentSort={sortBy}
        onSortChange={setSortBy}
        options={mobileSortOptions}
      />
    </div>
  );
}
