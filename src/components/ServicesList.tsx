import { motion } from "framer-motion";
import ServiceCard from "./ServiceCard";
import {
  useServicesInfinite,
  ServicesFilters,
  Service,
  ServicesResponse,
} from "@/lib/api/hooks/useServices";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";

interface ServicesListProps {
  filters: ServicesFilters;
  onPageChange?: (page: number) => void;
  onSortChange: (sort: ServicesFilters["sort"]) => void;
}

const ServicesList = ({
  filters,
  onSortChange,
}: ServicesListProps) => {
  // Fetch services from API
  const { 
    data, 
    isLoading, 
    isError, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useServicesInfinite(filters);

  // Handle sort change
  const handleSortChange = (sort: string) => {
    const sortMap: Record<string, ServicesFilters["sort"]> = {
      Relevance: "relevance",
      "Distance: Nearest": "distance",
      "Rating: High to Low": "rating",
      "Price: Low to High": "price_low",
      "Price: High to Low": "price_high",
    };
    onSortChange(sortMap[sort] || "relevance");
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex-1">
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20">
          <motion.div
            className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-3 sm:border-4 border-emerald-200 border-t-emerald-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="mt-3 sm:mt-4 text-gray-600 font-medium text-sm sm:text-base">
            Loading services...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="flex-1">
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 px-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-red-100 flex items-center justify-center mb-3 sm:mb-4">
            <span className="material-symbols-outlined text-red-600 text-xl sm:text-2xl md:text-3xl">
              error
            </span>
          </div>
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 text-center">
            Failed to Load Services
          </h3>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base text-center">
            {error?.message || "Something went wrong"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-emerald-600 text-white rounded-lg sm:rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm sm:text-base"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const services = data?.pages.flatMap((page: ServicesResponse) => page.services) || [];
  const pagination = data?.pages[0]?.pagination;

  // Empty State
  if (services.length === 0) {
    return (
      <div className="flex-1">
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 px-4">
          <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full bg-gray-100 flex items-center justify-center mb-3 sm:mb-4">
            <span className="material-symbols-outlined text-gray-400 text-2xl sm:text-3xl md:text-4xl">
              search_off
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 text-center">
            No Services Found
          </h3>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base text-center max-w-md mx-auto">
            Try adjusting your filters or search criteria
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                // Reset filters logic
                onSortChange("relevance");
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
            >
              Clear Filters
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors text-sm"
            >
              Browse All
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sort options for mobile
  const sortOptions = [
    { label: "Relevance", value: "relevance" },
    { label: "Rating: High to Low", value: "rating" },
    { label: "Price: Low to High", value: "price_low" },
    { label: "Price: High to Low", value: "price_high" },
    ...(filters.latitude
      ? [{ label: "Distance: Nearest", value: "distance" }]
      : []),
  ];

  // Get current sort label
  const currentSortLabel =
    sortOptions.find((opt) => opt.value === filters.sort)?.label || "Relevance";

  return (
    <div className="flex-1">
      <div className="mb-6 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <span className="material-symbols-outlined text-sm">bolt</span>
              Curated results
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
              Available services tailored to your current filters
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              Compare trusted providers faster with clearer prices, ratings, and
              location-aware sorting.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <span className="material-symbols-outlined text-base text-emerald-600">
                dataset
              </span>
              <span>
                <strong className="text-gray-950">{pagination?.total || 0}</strong> results
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Sort
              </span>
              <div className="hidden md:block">
                <select
                  className="bg-transparent pr-6 text-sm font-medium text-gray-900 outline-none"
                  onChange={(e) => handleSortChange(e.target.value)}
                  value={currentSortLabel}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <span className="md:hidden text-sm font-medium text-gray-900">
                {currentSortLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
          <span className="material-symbols-outlined text-emerald-600 text-sm">
            info
          </span>
          <span>
            Showing <strong className="text-gray-900">{services.length}</strong>{" "}
            of{" "}
            <strong className="text-gray-900">{pagination?.total || 0}</strong>{" "}
            results
          </span>
        </div>

        <div className="hidden items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm sm:flex">
          <button className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            Grid View
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
        {services.map((service: Service, index: number) => (
          <ServiceCard
            key={service.id}
            service={{
              id: service.id,
              name: service.title,
              category: service.category?.name || "General",
              description: service.description,
              rating: service.rating || 0,
              reviewCount: service.provider?.reviewCount || 0,
              startingPrice: service.price,
              isVerified: service.provider?.profile?.isVerified || false,
              imageUrl:
                service.images?.[0] ||
                service.provider?.image ||
                "/images/placeholder.png",
              distance: service.distance,
              provider: {
                name: service.provider?.name || "Unknown Provider",
                image: service.provider?.image,
                subscription: service.provider?.subscription,
                verified: service.provider?.profile?.isVerified || false,
              },
            }}
            index={index}
          />
        ))}
      </div>

      {/* Load More via Infinite Scroll Sentinel */}
      <InfiniteScrollSentinel
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      >
        <div className="flex items-center gap-2 text-emerald-600 font-medium">
          <motion.div
            className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          Loading more services...
        </div>
      </InfiniteScrollSentinel>

      {/* End of list message */}
      {!hasNextPage && services.length > 0 && (
        <div className="mt-8 text-center text-gray-500 text-sm">
          You&apos;ve seen all available services
        </div>
      )}

      {/* Mobile CTA */}
      <div className="lg:hidden mt-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-bold text-sm">Need Help?</p>
            <p className="text-emerald-100 text-xs mt-0.5">
              Contact our support team
            </p>
          </div>
          <button className="px-4 py-2 bg-white text-emerald-700 rounded-lg font-bold hover:bg-emerald-50 transition-colors text-xs">
            Get Help
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServicesList;
