"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProfessionalCard from "@/components/ProfessionalCard";
import LocationPicker from "@/components/LocationPicker";
import BrowseStickyToolbar from "@/components/marketplace/BrowseStickyToolbar";
import SortBottomSheet, {
  type SortOption,
} from "@/components/shared/SortBottomSheet";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";
import GuestCTAStrip from "@/components/shared/GuestCTAStrip";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import RadarBrowse, {
  type RadarBrowseItem,
} from "@/components/marketplace/RadarBrowse";
import { useProfessionalsInfinite } from "@/lib/api/hooks/useProfessionals";
import { useHeroToolbarCompact } from "@/lib/hooks/useHeroToolbarCompact";
import { useScrollActionBarVisibility } from "@/lib/hooks/useScrollActionBarVisibility";
import { calculateBearing, calculateDistance } from "@/lib/utils/geolocation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  CheckCircle,
  ShieldCheck,
  BadgeCheck,
  Loader2,
  ArrowDownWideNarrow,
  Radar,
  LayoutGrid,
} from "lucide-react";

const SORT_OPTIONS = (
  hasLocation: boolean,
): {
  value: string;
  label: string;
  icon: string;
  disabled?: boolean;
  hint?: string;
}[] => [
  { value: "rating", label: "Highest rated", icon: "star" },
  {
    value: "distance",
    label: "Nearest first",
    icon: "near_me",
    disabled: !hasLocation,
    hint: !hasLocation ? "Set location" : undefined,
  },
  { value: "price_asc", label: "Price: low to high", icon: "trending_up" },
  { value: "price_desc", label: "Price: high to low", icon: "trending_down" },
  { value: "newest", label: "Newest first", icon: "schedule" },
];

function parseOptionalNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function ProfessionalsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const heroRef = useRef<HTMLElement>(null);
  const toolbarCompact = useHeroToolbarCompact(heroRef);
  const initialSearch =
    searchParams.get("search") ?? searchParams.get("q") ?? "";
  const initialView = searchParams.get("view") === "radar" ? "radar" : "cards";
  const initialSort = searchParams.get("sort") ?? "rating";
  const initialLocation = searchParams.get("location") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [minPrice, setMinPrice] = useState<number>(() => {
    const value = searchParams.get("minPrice");
    return value ? Number(value) : undefined;
  });
  const [maxPrice, setMaxPrice] = useState<number>(() => {
    const value = searchParams.get("maxPrice");
    return value ? Number(value) : undefined;
  });
  const [sortBy, setSortBy] = useState(initialSort);
  const [verifiedOnly, setVerifiedOnly] = useState(
    searchParams.get("verified") === "true",
  );
  const [backgroundCheckedOnly, setBackgroundCheckedOnly] = useState(
    searchParams.get("backgroundChecked") === "true",
  );
  const [certifiedOnly, setCertifiedOnly] = useState(
    searchParams.get("certified") === "true",
  );
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "radar">(initialView);
  const [mobileToolbarExpanded, setMobileToolbarExpanded] = useState(false);
  const showMobileActionBar = useScrollActionBarVisibility();
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const nextSearch =
      searchParams.get("search") ?? searchParams.get("q") ?? "";
    const nextMinPrice = parseOptionalNumber(searchParams.get("minPrice"));
    const nextMaxPrice = parseOptionalNumber(searchParams.get("maxPrice"));
    const nextSortBy = searchParams.get("sort") ?? "rating";
    const nextVerifiedOnly = searchParams.get("verified") === "true";
    const nextBackgroundCheckedOnly =
      searchParams.get("backgroundChecked") === "true";
    const nextCertifiedOnly = searchParams.get("certified") === "true";
    const nextViewMode =
      searchParams.get("view") === "radar" ? "radar" : "cards";

    if (nextSearch !== searchInput) setSearchInput(nextSearch);
    if (nextSearch !== search) setSearch(nextSearch);
    if (nextMinPrice !== minPrice) setMinPrice(nextMinPrice);
    if (nextMaxPrice !== maxPrice) setMaxPrice(nextMaxPrice);
    if (nextSortBy !== sortBy) setSortBy(nextSortBy);
    if (nextVerifiedOnly !== verifiedOnly) setVerifiedOnly(nextVerifiedOnly);
    if (nextBackgroundCheckedOnly !== backgroundCheckedOnly) {
      setBackgroundCheckedOnly(nextBackgroundCheckedOnly);
    }
    if (nextCertifiedOnly !== certifiedOnly) {
      setCertifiedOnly(nextCertifiedOnly);
    }
    if (nextViewMode !== viewMode) setViewMode(nextViewMode);
  }, [
    backgroundCheckedOnly,
    certifiedOnly,
    maxPrice,
    minPrice,
    search,
    searchInput,
    searchParams,
    sortBy,
    verifiedOnly,
    viewMode,
  ]);

  const requestLocationPicker = () => {
    setMobileToolbarExpanded(true);
    window.dispatchEvent(new Event("jit:location-picker-open"));
  };

  const filters = useMemo(
    () => ({
      search,
      minPrice,
      maxPrice,
      sortBy,
      verifiedOnly,
      backgroundCheckedOnly,
      certifiedOnly,
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
      backgroundCheckedOnly,
      certifiedOnly,
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

  const radarItems = useMemo<RadarBrowseItem[]>(() => {
    if (!userLocation) return [];

    return professionals
      .filter((pro) => pro.latitude != null && pro.longitude != null)
      .map((pro) => {
        const distanceKm =
          pro.distance ??
          calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            pro.latitude as number,
            pro.longitude as number,
          );
        const bearingDeg = calculateBearing(
          userLocation.latitude,
          userLocation.longitude,
          pro.latitude as number,
          pro.longitude as number,
        );

        return {
          id: pro.id,
          href: `/professionals/${pro.id}`,
          name: pro.name,
          subtitle: pro.location || "Location unknown",
          type: "professional",
          typeLabel: pro.title || pro.skills?.[0] || "General",
          colorKey: pro.title || pro.skills?.[0] || "general",
          distanceKm,
          bearingDeg,
        };
      });
  }, [professionals, userLocation]);

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

  const searchClasses = toolbarCompact
    ? "min-h-10 py-2 pl-9 pr-9 text-sm sm:pl-10"
    : "min-h-11 py-2.5 pl-11 pr-10 text-sm sm:min-h-12 sm:py-3 sm:pl-12 sm:text-base";

  const searchIconPad = toolbarCompact ? "left-2.5" : "left-3 sm:left-4";
  const activeMobileFilterCount =
    (minPrice != null ? 1 : 0) +
    (maxPrice != null ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (backgroundCheckedOnly ? 1 : 0) +
    (certifiedOnly ? 1 : 0) +
    (sortBy !== "rating" ? 1 : 0) +
    (userLocation ? 1 : 0);

  useEffect(() => {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (minPrice != null) {
      params.set("minPrice", String(minPrice));
    }
    if (maxPrice != null) {
      params.set("maxPrice", String(maxPrice));
    }
    if (sortBy !== "rating") {
      params.set("sort", sortBy);
    }
    if (verifiedOnly) {
      params.set("verified", "true");
    }
    if (backgroundCheckedOnly) {
      params.set("backgroundChecked", "true");
    }
    if (certifiedOnly) {
      params.set("certified", "true");
    }
    if (viewMode !== "cards") {
      params.set("view", viewMode);
    }
    if (userLocation?.address?.trim()) {
      params.set("location", userLocation.address.trim());
    } else if (initialLocation.trim() && !userLocation) {
      params.set("location", initialLocation.trim());
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [
    initialLocation,
    maxPrice,
    minPrice,
    pathname,
    router,
    search,
    sortBy,
    userLocation,
    verifiedOnly,
    backgroundCheckedOnly,
    certifiedOnly,
    viewMode,
  ]);

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
    <div className="relative flex min-h-screen flex-col bg-slate-50">
      <Header />

      <div className="pt-[var(--public-header-h)]">
        <PageHeader
          ref={heroRef}
          variant="browse"
          headingId="professionals-browse-heading"
          title="Find top professionals"
          description="Search by skills or name, refine rates and trust signals—same focused flow as services."
        />

        <BrowseStickyToolbar compact={toolbarCompact}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="professionals-search" className="sr-only">
                Search professionals
              </label>
              <Search
                className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:h-5 sm:w-5 ${searchIconPad}`}
              />
              <input
                id="professionals-search"
                type="search"
                autoComplete="off"
                enterKeyHint="search"
                placeholder="Name, skills, or bio…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={`w-full rounded-2xl border border-slate-200/90 bg-slate-50/90 text-slate-900 shadow-inner shadow-slate-200/40 outline-none ring-emerald-500/0 transition-[min-height,padding,font-size,background-color,border-color] placeholder:text-slate-400 focus:border-emerald-500/70 focus:bg-white focus:ring-4 focus:ring-emerald-500/12 ${searchClasses}`}
              />
              {searchInput !== search ? (
                <Loader2
                  className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-600 sm:h-5 sm:w-5 ${toolbarCompact ? "right-2.5" : "right-3 sm:right-4"}`}
                />
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setMobileToolbarExpanded((v) => !v)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/60 lg:hidden"
              aria-expanded={mobileToolbarExpanded}
              aria-controls="professionals-toolbar-advanced"
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
              id="professionals-toolbar-advanced"
              className={`${mobileToolbarExpanded ? "flex" : "hidden"} w-full items-center gap-2 sm:w-auto sm:justify-end lg:flex`}
            >
              <div className="min-w-0 flex-1 sm:max-w-[min(100%,13rem)] lg:max-w-[min(100%,14rem)]">
                <LocationPicker
                  compact={toolbarCompact}
                  quiet
                  initialQuery={initialLocation}
                  onLocationChange={(loc) => {
                    setUserLocation(loc);
                    if (loc) setSortBy("distance");
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowMobileFilters((v) => !v)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/50 lg:hidden"
                aria-expanded={showMobileFilters}
                aria-controls="professionals-sidebar-filters"
              >
                <Filter className="h-5 w-5 text-slate-600" />
                <span className="sr-only">Filters and sort options</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSortOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/50 lg:hidden"
              >
                <ArrowDownWideNarrow className="h-5 w-5 text-slate-600" />
                <span className="sr-only">Sort</span>
              </button>
            </div>
          </div>
        </BrowseStickyToolbar>

        <div className="mx-auto max-w-7xl flex-1 px-2.5 py-5 pb-24 sm:px-6 sm:py-7 sm:pb-10 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            <aside
              id="professionals-sidebar-filters"
              className={`${
                showMobileFilters
                  ? "fixed inset-0 z-70 flex items-end bg-slate-950/35 p-3"
                  : "hidden"
              } shrink-0 lg:static lg:block lg:w-72 lg:bg-transparent lg:p-0`}
              onClick={
                showMobileFilters
                  ? () => setShowMobileFilters(false)
                  : undefined
              }
            >
              <div
                className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ${
                  showMobileFilters
                    ? "w-full max-h-[75dvh] max-w-lg overflow-y-auto"
                    : "sticky top-[calc(var(--public-header-h)+5.25rem)]"
                }`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
                    <span className="material-symbols-outlined text-lg text-emerald-600">
                      tune
                    </span>
                    Refine
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(false)}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 lg:hidden"
                    aria-label="Close filters"
                  >
                    <span className="material-symbols-outlined text-sm">
                      close
                    </span>
                  </button>
                </div>

                <div className="custom-scrollbar max-h-[70vh] space-y-5 overflow-y-auto p-5">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Hourly rate (KES)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={minPrice ?? ""}
                        onChange={(e) =>
                          setMinPrice(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        placeholder="Min"
                        aria-label="Minimum hourly rate"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/15"
                      />
                      <input
                        type="number"
                        value={maxPrice ?? ""}
                        onChange={(e) =>
                          setMaxPrice(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        placeholder="Max"
                        aria-label="Maximum hourly rate"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/15"
                      />
                    </div>
                  </div>

                  <div className="hidden lg:block">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Sort by
                    </label>
                    <div className="space-y-1.5">
                      {SORT_OPTIONS(!!userLocation).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            if (opt.value === "distance" && !userLocation) {
                              requestLocationPicker();
                              return;
                            }
                            setSortBy(opt.value);
                          }}
                          className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                            sortBy === opt.value
                              ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-900"
                              : opt.disabled
                                ? "cursor-not-allowed border-transparent bg-slate-50 text-slate-400"
                                : "border-transparent text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="material-symbols-outlined text-base text-emerald-600">
                            {opt.icon}
                          </span>
                          <span className="min-w-0 flex-1">{opt.label}</span>
                          {opt.hint ? (
                            <span className="text-[10px] text-slate-400">
                              {opt.hint}
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Trust
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                        <div className="flex items-center gap-2 text-sm text-slate-800">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          Verified only
                        </div>
                        <button
                          type="button"
                          onClick={() => setVerifiedOnly(!verifiedOnly)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                            verifiedOnly ? "bg-emerald-600" : "bg-slate-300"
                          }`}
                          aria-pressed={verifiedOnly}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              verifiedOnly ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                        <div className="flex items-center gap-2 text-sm text-slate-800">
                          <ShieldCheck className="h-4 w-4 text-slate-700" />
                          Background checked
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setBackgroundCheckedOnly(!backgroundCheckedOnly)
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                            backgroundCheckedOnly
                              ? "bg-emerald-600"
                              : "bg-slate-300"
                          }`}
                          aria-pressed={backgroundCheckedOnly}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              backgroundCheckedOnly
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                        <div className="flex items-center gap-2 text-sm text-slate-800">
                          <BadgeCheck className="h-4 w-4 text-sky-700" />
                          Certified or licensed
                        </div>
                        <button
                          type="button"
                          onClick={() => setCertifiedOnly(!certifiedOnly)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                            certifiedOnly ? "bg-emerald-600" : "bg-slate-300"
                          }`}
                          aria-pressed={certifiedOnly}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              certifiedOnly ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/80 p-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setMinPrice(undefined);
                      setMaxPrice(undefined);
                      setSortBy("rating");
                      setVerifiedOnly(false);
                      setBackgroundCheckedOnly(false);
                      setCertifiedOnly(false);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <p className="mb-4 text-sm text-slate-600">
                {totalMatches != null ? (
                  <>
                    <span className="font-semibold text-slate-900">
                      {totalMatches.toLocaleString()}
                    </span>{" "}
                    match{totalMatches === 1 ? "" : "es"}
                    {professionals.length > 0 ? (
                      <>
                        <span className="text-slate-400"> · </span>
                        <span className="text-slate-500">
                          {professionals.length} loaded
                        </span>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-slate-900">
                      {professionals.length}
                    </span>{" "}
                    shown
                  </>
                )}
              </p>

              <div className="mb-4 flex items-center justify-end">
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
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
                    onClick={() => {
                      if (!userLocation) {
                        requestLocationPicker();
                        return;
                      }
                      setViewMode("radar");
                    }}
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

              {limitedMeta?.limited ? (
                <div
                  className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
                  role="status"
                >
                  Showing the top {limitedMeta.processed?.toLocaleString()} of{" "}
                  {limitedMeta.totalMatched?.toLocaleString()} matches. Narrow
                  search for fuller ranking.
                </div>
              ) : null}

              {isLoading && professionals.length === 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-[300px] animate-pulse rounded-2xl border border-slate-100 bg-white shadow-sm"
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                  <p className="mb-1 font-semibold text-slate-900">
                    Couldn’t load professionals
                  </p>
                  <p className="mb-4 text-sm text-slate-500">
                    Check your connection and try again.
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
                  description="Try adjusting filters or search."
                  buttonText="Reset filters"
                  onAction={() => {
                    setSearchInput("");
                    setMinPrice(undefined);
                    setMaxPrice(undefined);
                    setSortBy("rating");
                    setVerifiedOnly(false);
                    setBackgroundCheckedOnly(false);
                    setCertifiedOnly(false);
                    setViewMode("cards");
                  }}
                />
              ) : viewMode === "cards" ? (
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-5">
                  {professionals.map((pro) => (
                    <ProfessionalCard key={pro.id} professional={pro} />
                  ))}
                </div>
              ) : (
                <RadarBrowse
                  title="Professionals radar"
                  description="Browse experts around you by direction and true travel distance."
                  hasUserLocation={Boolean(userLocation)}
                  items={radarItems}
                  autoFullscreenOnMount
                />
              )}

              <InfiniteScrollSentinel
                hasNextPage={!!hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              >
                <div className="mt-4 flex items-center justify-center gap-2 py-8 text-sm font-medium text-emerald-700">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading more…
                </div>
              </InfiniteScrollSentinel>

              {!hasNextPage && professionals.length > 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  End of results for these filters.
                </p>
              ) : null}

              <GuestCTAStrip
                title="Want to join our network?"
                description="Sign up as a professional to showcase your skills and find quality jobs."
                buttonText="Join as a pro"
                signupHref="/join"
                loginHref="/auth/login?callbackUrl=/professionals"
                intent="become_provider"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed bottom-4 left-1/2 z-50 flex w-[min(94vw,24rem)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[0_14px_40px_-18px_rgba(15,23,42,0.45)] backdrop-blur-sm transition-all duration-200 lg:hidden ${
          showMobileActionBar
            ? "translate-y-0 opacity-100"
            : "translate-y-20 opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={() => setShowMobileFilters((v) => !v)}
          className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-2 text-sm font-semibold text-slate-800"
          aria-expanded={showMobileFilters}
          aria-controls="professionals-sidebar-filters"
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>
        <button
          type="button"
          onClick={() => setIsSortOpen(true)}
          className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-2 text-sm font-semibold text-slate-800"
        >
          <ArrowDownWideNarrow className="h-4 w-4" />
          Sort
        </button>
        <button
          type="button"
          onClick={() =>
            setViewMode((mode) => {
              if (mode === "cards" && !userLocation) {
                requestLocationPicker();
                return mode;
              }
              return mode === "cards" ? "radar" : "cards";
            })
          }
          className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 text-sm font-semibold text-white"
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
