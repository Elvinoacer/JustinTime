import { motion } from "framer-motion";
import ServiceCard from "./ServiceCard";
import { useServices, ServicesFilters } from "@/lib/api/hooks/useServices";
import { useState } from "react";

interface ServicesListProps {
  filters: ServicesFilters;
  onPageChange: (page: number) => void;
  onSortChange: (sort: any) => void;
}

const ServicesList = ({
  filters,
  onPageChange,
  onSortChange,
}: ServicesListProps) => {
  // Fetch services from API
  const { data, isLoading, isError, error } = useServices(filters);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

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
    setShowSortDropdown(false);
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

  const services = data?.services || [];
  const pagination = data?.pagination;

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
      {/* Header - Two Column Layout */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 sm:mb-6 md:mb-8 gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            Available <span className="text-emerald-600">Services</span>
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Discover top-rated professionals
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between md:justify-end gap-2">
          <span className="text-xs sm:text-sm font-medium text-gray-600 hidden sm:inline">
            Sort:
          </span>

          {/* Mobile Sort Dropdown */}
          <div className="relative md:hidden">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">sort</span>
              <span className="truncate max-w-[100px]">{currentSortLabel}</span>
              <span className="material-symbols-outlined text-sm">
                {showSortDropdown ? "expand_less" : "expand_more"}
              </span>
            </button>

            {showSortDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1"
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.label)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                      filters.sort === option.value
                        ? "text-emerald-600 bg-emerald-50"
                        : "text-gray-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Desktop Sort Select */}
          <div className="hidden md:block">
            <select
              className="rounded-lg md:rounded-xl border-gray-200 bg-white py-2 md:py-2.5 pl-3 md:pl-4 pr-8 md:pr-10 text-sm font-medium text-gray-900 shadow-sm focus:border-emerald-500 focus:ring-1 md:focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
        </div>
      </div>

      {/* Results Count and View Toggle */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
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

        {/* View Toggle (Grid/List) - Optional */}
        <div className="hidden sm:flex items-center gap-1">
          <button className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
            <span className="material-symbols-outlined text-sm">grid_view</span>
          </button>
          <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <span className="material-symbols-outlined text-sm">view_list</span>
          </button>
        </div>
      </div>

      {/* Services Grid - Improved Responsive Layout */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {services.map((service: any, index: number) => (
          <ServiceCard
            key={service.id}
            service={{
              id: service.id,
              name: service.title,
              category: service.category?.name || "General",
              description: service.description,
              rating: service.rating,
              reviews: service.reviews,
              startingPrice: service.price,
              isVerified: service.provider?.isVerified || false,
              imageUrl:
                service.images?.[0] ||
                service.provider?.image ||
                "/images/placeholder.png",
              distance: service.distance,
              provider: {
                name: service.provider?.name || "Unknown Provider",
                image: service.provider?.image,
              },
            }}
            index={index}
          />
        ))}
      </div>

      {/* Load More Button */}
      {pagination && pagination.page < pagination.totalPages && (
        <div className="mt-8 sm:mt-12 md:mt-16 flex justify-center">
          <motion.button
            onClick={() => onPageChange((pagination.page || 1) + 1)}
            className="group flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl sm:rounded-2xl hover:bg-gradient-to-r hover:from-emerald-500 hover:to-green-600 hover:text-white hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-lg active:scale-[0.98] text-sm sm:text-base"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Load More Services</span>
            <motion.span
              className="material-symbols-outlined text-sm sm:text-base"
              animate={{ y: [0, 2, 0] }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut",
              }}
            >
              expand_more
            </motion.span>
          </motion.button>
        </div>
      )}

      {/* Pagination Info */}
      {pagination && (
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            Page{" "}
            <span className="font-medium text-gray-700">{pagination.page}</span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">
              {pagination.totalPages}
            </span>
          </p>

          {/* Pagination Controls - Mobile */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() =>
                  onPageChange(Math.max(1, (pagination.page || 1) - 1))
                }
                disabled={pagination.page === 1}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">
                  chevron_left
                </span>
                Prev
              </button>

              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(3, pagination.totalPages) },
                  (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                          pagination.page === pageNum
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}

                {pagination.totalPages > 3 && (
                  <>
                    <span className="text-gray-400">...</span>
                    <button
                      onClick={() => onPageChange(pagination.totalPages)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        pagination.page === pagination.totalPages
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {pagination.totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() =>
                  onPageChange(
                    Math.min(pagination.totalPages, (pagination.page || 1) + 1)
                  )
                }
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                Next
                <span className="material-symbols-outlined text-sm">
                  chevron_right
                </span>
              </button>
            </div>
          )}
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
