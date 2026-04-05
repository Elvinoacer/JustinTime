import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";
import ServiceCard from "./ServiceCard";
import {
  useServicesInfinite,
  ServicesFilters,
  ServiceListItem,
  ServicesResponse,
} from "@/lib/api/hooks/useServices";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";
import RadarBrowse, {
  type RadarBrowseItem,
} from "@/components/marketplace/RadarBrowse";
import { calculateBearing, calculateDistance } from "@/lib/utils/geolocation";

/** API may return `subscription` as `{ plan, isActive }` or legacy string */
function subscriptionPlanLabel(sub: unknown): string | null {
  if (sub == null) return null;
  if (typeof sub === "string") return sub === "FREE" ? null : sub;
  if (typeof sub === "object" && sub !== null && "plan" in sub) {
    const p = (sub as { plan?: string }).plan;
    return p && p !== "FREE" ? p : null;
  }
  return null;
}

interface ServicesListProps {
  filters: ServicesFilters;
  viewMode: "cards" | "radar";
  onViewModeChange: (mode: "cards" | "radar") => void;
  onPageChange?: (page: number) => void;
  onSortChange: (sort: ServicesFilters["sort"]) => void;
  onBrowseAll?: () => void;
}

const ServicesList = ({
  filters,
  viewMode,
  onViewModeChange,
  onSortChange,
  onBrowseAll,
}: ServicesListProps) => {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useServicesInfinite(filters);

  const handleSortChange = (sort: string) => {
    const allowedSorts = new Set<NonNullable<ServicesFilters["sort"]>>([
      "recommended",
      "relevance",
      "distance",
      "rating",
      "price_low",
      "price_high",
    ]);

    onSortChange(
      allowedSorts.has(sort as NonNullable<ServicesFilters["sort"]>)
        ? (sort as NonNullable<ServicesFilters["sort"]>)
        : "relevance",
    );
  };

  const services = useMemo(
    () => data?.pages.flatMap((page: ServicesResponse) => page.services) || [],
    [data?.pages],
  );
  const pagination = data?.pages[0]?.pagination;

  const radarItems = useMemo<RadarBrowseItem[]>(() => {
    if (filters.latitude == null || filters.longitude == null) return [];

    return services
      .filter(
        (service) =>
          service.provider?.latitude != null &&
          service.provider?.longitude != null,
      )
      .map((service) => {
        const lat = service.provider?.latitude as number;
        const lon = service.provider?.longitude as number;
        const distanceKm =
          service.distance ??
          calculateDistance(
            filters.latitude as number,
            filters.longitude as number,
            lat,
            lon,
          );
        const bearingDeg = calculateBearing(
          filters.latitude as number,
          filters.longitude as number,
          lat,
          lon,
        );

        return {
          id: service.id,
          href: `/services/${service.id}`,
          name: service.title,
          subtitle:
            service.provider?.name ||
            service.provider?.location ||
            "Location unknown",
          type: "service",
          typeLabel: service.category?.name || "General",
          colorKey:
            service.category?.slug || service.category?.name || "general",
          distanceKm,
          bearingDeg,
        };
      });
  }, [filters.latitude, filters.longitude, services]);

  if (isLoading) {
    return (
      <div className="flex-1">
        <div className="flex flex-col items-center justify-center py-16 sm:py-20">
          <motion.div
            className="h-12 w-12 rounded-full border-4 border-emerald-200/80 border-t-emerald-600 sm:h-14 sm:w-14"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            role="status"
            aria-label="Loading services"
          />
          <p className="mt-4 text-sm font-medium text-slate-600 sm:text-base">
            Loading services…
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1">
        <div className="flex flex-col items-center justify-center px-4 py-16 sm:py-20">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <span className="material-symbols-outlined text-2xl text-red-600">
              error
            </span>
          </div>
          <h3 className="mb-2 text-center text-lg font-bold text-slate-900 sm:text-xl">
            Couldn&apos;t load services
          </h3>
          <p className="mb-6 max-w-md text-center text-sm text-slate-600 sm:text-base">
            {error?.message || "Check your connection and try again."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[48px] rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="flex-1">
        <div className="flex flex-col items-center justify-center px-4 py-16 sm:py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <span className="material-symbols-outlined text-3xl text-slate-400">
              search_off
            </span>
          </div>
          <h3 className="mb-2 text-center text-xl font-bold text-slate-900 sm:text-2xl">
            No services match
          </h3>
          <p className="mb-8 max-w-md text-center text-sm text-slate-600 sm:text-base">
            Loosen your filters, try another category, or start fresh to see
            more listings.
          </p>
          <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                if (onBrowseAll) onBrowseAll();
                else window.location.reload();
              }}
              className="min-h-[48px] rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Reset search & filters
            </button>
            <Link
              href="/contact"
              className="flex min-h-[48px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Get help
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sortOptions = [
    { label: "Recommended for You", value: "recommended" },
    { label: "Relevance", value: "relevance" },
    { label: "Rating: High to Low", value: "rating" },
    { label: "Price: Low to High", value: "price_low" },
    { label: "Price: High to Low", value: "price_high" },
    ...(filters.latitude
      ? [{ label: "Distance: Nearest", value: "distance" }]
      : []),
  ];

  const currentSort = filters.sort || "relevance";

  return (
    <div className="flex-1 pb-24 md:pb-0">
      <header className="mb-6 flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Results
          </p>
          <h2 className="mt-1 text-pretty text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Services for you
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
            Tap a card for full details, reviews, and booking. Sort and filters
            stay in sync across desktop and mobile.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm">
            <span className="material-symbols-outlined text-[20px] text-emerald-600">
              dataset
            </span>
            <span>
              <span className="font-semibold tabular-nums text-slate-950">
                {pagination?.total ?? 0}
              </span>{" "}
              <span className="text-slate-600">total</span>
            </span>
          </div>

          <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-2 py-1.5 pl-3 shadow-sm md:flex">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sort
            </span>
            <label htmlFor="services-sort" className="sr-only">
              Sort results
            </label>
            <select
              id="services-sort"
              className="max-w-[14rem] cursor-pointer bg-transparent py-2 pr-8 text-sm font-medium text-slate-900 outline-none"
              onChange={(e) => handleSortChange(e.target.value)}
              value={currentSort}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => onViewModeChange("cards")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "cards"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("radar")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "radar"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Radar
            </button>
          </div>
        </div>
      </header>

      <p className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="material-symbols-outlined text-[18px] text-emerald-600">
          info
        </span>
        <span>
          Showing{" "}
          <strong className="font-semibold text-slate-900">
            {services.length}
          </strong>{" "}
          loaded
          {pagination?.total != null ? (
            <>
              {" "}
              of{" "}
              <strong className="font-semibold text-slate-900">
                {pagination.total}
              </strong>
            </>
          ) : null}
        </span>
      </p>

      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {services.map((service: ServiceListItem, index: number) => (
            <ServiceCard
              key={service.id}
              service={{
                id: service.id,
                name: service.title,
                category: service.category?.name || "General",
                description: service.description,
                rating: service.rating || 0,
                reviewCount: service.reviews ?? 0,
                startingPrice: service.price,
                isVerified: service.provider?.isVerified || false,
                imageUrl:
                  service.images?.[0] ||
                  service.provider?.image ||
                  "/images/placeholder.png",
                distance: service.distance,
                dynamicPricing: service.dynamicPricing,
                provider: {
                  name: service.provider?.name || "Unknown Provider",
                  image: service.provider?.image ?? undefined,
                  subscription: subscriptionPlanLabel(
                    (service.provider as { subscription?: unknown })
                      ?.subscription,
                  ),
                  verified: service.provider?.isVerified || false,
                },
              }}
              index={index}
            />
          ))}
        </div>
      ) : (
        <RadarBrowse
          title="Services radar"
          description="Visualize nearby services by exact distance and compass bearing from your current location."
          hasUserLocation={
            filters.latitude != null && filters.longitude != null
          }
          items={radarItems}
          allowedTypes={["service"]}
        />
      )}

      <InfiniteScrollSentinel
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      >
        <div className="flex items-center gap-2 font-medium text-emerald-700">
          <motion.div
            className="h-5 w-5 rounded-full border-2 border-emerald-200 border-t-emerald-600"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            aria-hidden
          />
          Loading more…
        </div>
      </InfiniteScrollSentinel>

      {!hasNextPage && services.length > 0 ? (
        <p className="mt-10 text-center text-sm text-slate-500">
          You&apos;ve reached the end of the list
        </p>
      ) : null}

      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">Questions?</p>
            <p className="mt-0.5 text-xs text-slate-600">
              Our team can help you choose a service.
            </p>
          </div>
          <Link
            href="/contact"
            className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServicesList;
