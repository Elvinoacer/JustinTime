"use client";

import {
  useState,
  useEffect,
  Suspense,
  useMemo,
  useCallback,
  useRef,
  type CSSProperties,
} from "react";
import { motion } from "framer-motion";
import Filters from "@/components/Filters";
import ServicesList from "@/components/ServicesList";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LocationPicker from "@/components/LocationPicker";
import CategoryDropdown from "@/components/CategoryDropdown";
import AllCategoriesModal from "@/components/AllCategoriesModal";
import SortBottomSheet from "@/components/shared/SortBottomSheet";
import GuestCTAStrip from "@/components/shared/GuestCTAStrip";

import { useCategories, ServicesFilters } from "@/lib/api/hooks/useServices";
import { useHeroToolbarCompact } from "@/lib/hooks/useHeroToolbarCompact";
import { useScrollActionBarVisibility } from "@/lib/hooks/useScrollActionBarVisibility";
import { useSearchParams } from "next/navigation";
import { clearLocationFromStorage } from "@/lib/utils/geolocation";

function ServicesPageContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Services");
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [locationPickerKey, setLocationPickerKey] = useState(0);

  const [filters, setFilters] = useState<ServicesFilters>({
    page: 1,
    limit: 12,
    sort: "relevance",
    category: "All Services",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (categoryParam) {
      const formattedCategory =
        categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);
      setSelectedCategory(formattedCategory);
    }
  }, [categoryParam]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchQuery,
      category: selectedCategory,
      latitude: userLocation?.latitude,
      longitude: userLocation?.longitude,
      sort: userLocation
        ? "distance"
        : prev.sort === "distance"
          ? "relevance"
          : prev.sort,
      page: 1,
    }));
  }, [searchQuery, selectedCategory, userLocation]);

  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useCategories();
  const allCategories = categoriesData || [
    { name: "All Services", icon: "apps", count: 0 },
  ];

  const topCategories = allCategories
    .filter((cat) => cat.name !== "All Services")
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 8);

  const featuredCategories = [
    { name: "All Services", icon: "apps", count: 0 },
    ...topCategories,
  ];

  const activeFilterCount = [
    filters.minPrice ? 1 : 0,
    filters.maxPrice ? 1 : 0,
    filters.verified ? 1 : 0,
    filters.minRating ? 1 : 0,
    filters.category && filters.category !== "All Services" ? 1 : 0,
    filters.search ? 1 : 0,
    userLocation ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);

  const handleFilterChange = (newFilters: Partial<ServicesFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const resetToBrowseAll = useCallback(() => {
    setSearchInput("");
    setSearchQuery("");
    setSelectedCategory("All Services");
    setUserLocation(null);
    if (typeof window !== "undefined") {
      clearLocationFromStorage();
    }
    setLocationPickerKey((k) => k + 1);
    setFilters({
      page: 1,
      limit: 12,
      sort: "relevance",
      category: "All Services",
      search: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      verified: undefined,
      minRating: undefined,
      latitude: undefined,
      longitude: undefined,
    });
  }, []);

  const sortSheetOptions = useMemo(() => {
    const base = [
      { label: "Relevance", value: "relevance" },
      { label: "Rating: High to Low", value: "rating" },
      { label: "Price: Low to High", value: "price_low" },
      { label: "Price: High to Low", value: "price_high" },
    ];
    if (userLocation) {
      return [...base, { label: "Distance: Nearest", value: "distance" }];
    }
    return base;
  }, [userLocation]);

  const heroRef = useRef<HTMLElement | null>(null);
  const toolbarCompact = useHeroToolbarCompact(heroRef);
  const [mobileToolbarExpanded, setMobileToolbarExpanded] = useState(false);
  const showMobileActionBar = useScrollActionBarVisibility();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncToolbarExpansion = () => {
      setMobileToolbarExpanded(mediaQuery.matches);
    };

    syncToolbarExpansion();
    mediaQuery.addEventListener("change", syncToolbarExpansion);

    return () => {
      mediaQuery.removeEventListener("change", syncToolbarExpansion);
    };
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-slate-50">
      <Header />

      <div
        className="pt-[var(--public-header-h)]"
        style={
          {
            "--services-toolbar-h": toolbarCompact ? "6.25rem" : "9rem",
          } as CSSProperties
        }
      >
        {/* Hero */}
        <section
          ref={heroRef}
          className="relative overflow-hidden border-b border-emerald-100/60 bg-gradient-to-b from-white via-emerald-50/40 to-slate-50"
          aria-labelledby="services-page-heading"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.65]"
            aria-hidden
          >
            <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-300/35 blur-3xl" />
            <div className="absolute -right-16 top-24 h-64 w-64 rounded-full bg-sky-300/30 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-40 w-96 rounded-full bg-teal-200/25 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-10 lg:px-8 lg:pb-14">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-12">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800 shadow-sm backdrop-blur-sm sm:text-xs">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">
                    verified
                  </span>
                  Kenya marketplace
                </p>
                <h1
                  id="services-page-heading"
                  className="mt-5 text-balance text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.1]"
                >
                  Find the right professional, fast
                </h1>
                <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
                  Search by what you need, refine by budget and trust signals,
                  and compare providers in one calm, focused flow—on any device.
                </p>
                <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <span className="material-symbols-outlined text-[20px]">
                        payments
                      </span>
                    </span>
                    Clear pricing before you book
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                      <span className="material-symbols-outlined text-[20px]">
                        map
                      </span>
                    </span>
                    Optional distance sorting
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                      <span className="material-symbols-outlined text-[20px]">
                        star
                      </span>
                    </span>
                    Ratings you can scan quickly
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
                <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm sm:p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Categories
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-950 sm:text-3xl">
                    {Math.max(allCategories.length - 1, 0)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Browse or jump to one
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm sm:p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Trending
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-950 sm:text-base">
                    {topCategories[0]?.name || "Popular services"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Updated live</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-md sm:col-span-1 sm:p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/90">
                    Refinements
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums sm:text-4xl">
                    {activeFilterCount}
                  </p>
                  <p className="mt-1 text-xs text-emerald-100/90">
                    Active signals (search, filters, location)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Single sticky toolbar: search + location + categories — compacts after hero scrolls away */}
        <div
          className={`sticky z-40 border-b border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.25)] backdrop-blur-xl transition-[padding,box-shadow] duration-200 supports-[backdrop-filter]:bg-white/75 ${toolbarCompact ? "shadow-[0_4px_20px_-14px_rgba(15,23,42,0.2)]" : ""}`}
          style={{ top: "var(--public-header-h)" }}
        >
          <div
            className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${toolbarCompact ? "py-2 sm:py-2.5 lg:py-2.5" : "py-3 lg:py-4"}`}
          >
            <div
              className={`flex flex-col lg:flex-row lg:items-center lg:gap-4 ${toolbarCompact ? "gap-2" : "gap-3"}`}
            >
              <div className="relative min-w-0 flex-1">
                <label htmlFor="services-search" className="sr-only">
                  Search services
                </label>
                <span
                  className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${toolbarCompact ? "left-2.5" : "left-4"}`}
                >
                  <span
                    className={`material-symbols-outlined ${toolbarCompact ? "text-[20px]" : "text-[22px]"}`}
                  >
                    search
                  </span>
                </span>
                <input
                  id="services-search"
                  type="search"
                  autoComplete="off"
                  enterKeyHint="search"
                  placeholder="What do you need help with?"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className={`w-full rounded-2xl border border-slate-200/90 bg-slate-50/90 pr-10 text-slate-900 shadow-inner shadow-slate-200/40 outline-none ring-emerald-500/0 transition-[box-shadow,border-color,background-color,min-height,padding,font-size] placeholder:text-slate-400 focus:border-emerald-500/80 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 ${toolbarCompact ? "min-h-10 py-2 pl-9 text-sm sm:min-h-10 sm:pl-10 sm:text-sm" : "min-h-[48px] py-3 pl-12 text-base sm:min-h-[52px] sm:text-[17px]"}`}
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className={`absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 ${toolbarCompact ? "h-8 w-8" : "h-9 w-9"}`}
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      close
                    </span>
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setMobileToolbarExpanded((v) => !v)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/60 lg:hidden"
                aria-expanded={mobileToolbarExpanded}
                aria-controls="services-toolbar-advanced"
              >
                <span className="material-symbols-outlined text-[18px]">
                  tune
                </span>
                {mobileToolbarExpanded ? "Hide filters" : "Show filters"}
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch lg:w-auto lg:shrink-0 lg:items-center">
                <div
                  className={`${mobileToolbarExpanded ? "block" : "hidden"} min-w-0 flex-1 sm:[&_button]:w-auto lg:block ${toolbarCompact ? "[&_button]:min-h-10 [&_button]:w-full lg:[&_button]:min-h-10" : "[&_button]:min-h-[48px] [&_button]:w-full lg:[&_button]:min-h-[52px]"}`}
                >
                  <LocationPicker
                    key={locationPickerKey}
                    compact={toolbarCompact}
                    onLocationChange={setUserLocation}
                  />
                </div>
                <div
                  className={`hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 text-slate-600 lg:flex ${toolbarCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"}`}
                >
                  <span
                    className={`material-symbols-outlined text-emerald-600 ${toolbarCompact ? "text-[18px]" : "text-[20px]"}`}
                  >
                    tune
                  </span>
                  <span className="whitespace-nowrap font-medium">
                    {activeFilterCount} active
                  </span>
                </div>
              </div>
            </div>

            <div
              id="services-toolbar-advanced"
              className={`${mobileToolbarExpanded ? "flex" : "hidden"} flex-col border-slate-100 lg:flex lg:flex-row lg:items-center ${toolbarCompact ? "mt-2 gap-2 border-t pt-2 sm:mt-2 sm:pt-2" : "mt-3 gap-3 border-t pt-3 sm:mt-4 sm:pt-4"}`}
            >
              <div className="w-full lg:hidden">
                <CategoryDropdown
                  categories={allCategories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  compact={toolbarCompact}
                />
              </div>

              <div className="hidden min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar lg:flex">
                {isCategoriesLoading
                  ? Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={i}
                        className={`shrink-0 animate-pulse rounded-full bg-slate-100 ${toolbarCompact ? "h-8 w-24" : "h-10 w-28"}`}
                      />
                    ))
                  : featuredCategories.map((category) => (
                      <motion.button
                        key={category.name}
                        type="button"
                        className={`flex shrink-0 items-center rounded-full font-medium transition-colors ${
                          toolbarCompact
                            ? "gap-1 px-2.5 py-1.5 text-xs"
                            : "gap-2 px-4 py-2.5 text-sm"
                        } ${
                          selectedCategory === category.name
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/80"
                        }`}
                        onClick={() => setSelectedCategory(category.name)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span
                          className={`material-symbols-outlined ${toolbarCompact ? "text-[16px]" : "text-[18px]"}`}
                        >
                          {category.icon || "apps"}
                        </span>
                        <span className="max-w-[10rem] truncate sm:max-w-none sm:whitespace-nowrap">
                          {category.name}
                        </span>
                      </motion.button>
                    ))}
              </div>

              <motion.button
                type="button"
                onClick={() => setIsAllCategoriesOpen(true)}
                className={`flex w-full shrink-0 items-center justify-center gap-2 rounded-full border-2 border-emerald-200 bg-emerald-50/90 font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100/90 lg:w-auto ${toolbarCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span
                  className={`material-symbols-outlined ${toolbarCompact ? "text-[18px]" : "text-[20px]"}`}
                >
                  grid_view
                </span>
                <span className="hidden sm:inline">All categories</span>
                <span className="sm:hidden">All</span>
              </motion.button>
            </div>
          </div>
        </div>

        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-3 py-6 pb-24 sm:px-6 sm:py-10 sm:pb-10 lg:px-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
              <aside
                id="services-mobile-filters"
                className={`${
                  showMobileFilters
                    ? "fixed inset-0 z-70 flex items-end bg-slate-950/35 p-3"
                    : "hidden"
                } lg:static lg:block lg:w-80 lg:shrink-0 lg:bg-transparent lg:p-0`}
                onClick={
                  showMobileFilters
                    ? () => setShowMobileFilters(false)
                    : undefined
                }
              >
                <div
                  className={`w-full ${
                    showMobileFilters
                      ? "max-h-[75dvh] max-w-lg overflow-y-auto"
                      : ""
                  } lg:sticky lg:max-h-[calc(100vh-var(--public-header-h)-var(--services-toolbar-h)-1.5rem)] lg:overflow-y-auto lg:pb-2 lg:[scrollbar-width:thin]`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Filters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClose={() => setShowMobileFilters(false)}
                  />
                </div>
              </aside>

              <div className="flex min-h-[min(60vh,520px)] flex-1 flex-col">
                <ServicesList
                  filters={filters}
                  onPageChange={handlePageChange}
                  onSortChange={(sort) =>
                    handleFilterChange({
                      sort: sort as ServicesFilters["sort"],
                    })
                  }
                  onBrowseAll={resetToBrowseAll}
                />

                <GuestCTAStrip
                  title="Ready to book a service?"
                  description="Create an account to book trusted professionals, track requests, and pay securely with M-Pesa."
                  buttonText="Join JustInTime"
                />
              </div>
            </div>
          </div>
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
          aria-controls="services-mobile-filters"
        >
          <span className="material-symbols-outlined text-[18px]">tune</span>
          Filters
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setIsSortOpen(true)}
          className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white"
        >
          <span className="material-symbols-outlined text-[18px]">sort</span>
          Sort
        </button>
      </div>

      <Footer />

      <SortBottomSheet
        isOpen={isSortOpen}
        onClose={() => setIsSortOpen(false)}
        currentSort={filters.sort || "relevance"}
        onSortChange={(sort) =>
          handleFilterChange({ sort: sort as ServicesFilters["sort"] })
        }
        options={sortSheetOptions}
      />

      <AllCategoriesModal
        categories={allCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        isOpen={isAllCategoriesOpen}
        onClose={() => setIsAllCategoriesOpen(false)}
      />
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 pt-[var(--public-header-h)]">
          <div
            className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-600"
            role="status"
            aria-label="Loading"
          />
        </div>
      }
    >
      <ServicesPageContent />
    </Suspense>
  );
}
