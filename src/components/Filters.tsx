"use client";
import { ServicesFilters } from "@/lib/api/hooks/useServices";
import { motion } from "framer-motion";
import { useState } from "react";

interface FiltersProps {
  filters: ServicesFilters;
  onFilterChange: (filters: Partial<ServicesFilters>) => void;
}

const Filters = ({ filters, onFilterChange }: FiltersProps) => {
  const [isExpanded, setIsExpanded] = useState({
    price: true,
    verification: true,
    rating: true,
    location: true,
  });

  const toggleSection = (section: keyof typeof isExpanded) => {
    setIsExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const resetFilters = () => {
    onFilterChange({
      minPrice: undefined,
      maxPrice: undefined,
      verified: undefined,
      minRating: undefined,
      category: "All Services",
    });
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-lg sm:text-xl">
              filter_list
            </span>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              Filters
            </h2>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs sm:text-sm text-emerald-600 font-medium hover:text-emerald-700 px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span className="hidden sm:inline">Reset All</span>
            <span className="inline sm:hidden">Reset</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[calc(100vh-200px)] sm:max-h-none overflow-y-auto">
          {/* Price Range - Two Column Layout */}
          <div className="space-y-3">
            <button
              onClick={() => toggleSection("price")}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-600 text-sm sm:text-base">
                  payments
                </span>
                <span className="text-sm sm:text-base font-bold text-gray-900">
                  Price Range
                </span>
              </div>
              <span className="material-symbols-outlined text-gray-500 text-sm sm:text-base transform transition-transform">
                {isExpanded.price ? "expand_less" : "expand_more"}
              </span>
            </button>

            {isExpanded.price && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="pt-2"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500 font-medium">
                      Min Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                        KES
                      </span>
                      <input
                        type="number"
                        value={filters.minPrice || ""}
                        onChange={(e) =>
                          onFilterChange({
                            minPrice: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500 font-medium">
                      Max Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                        KES
                      </span>
                      <input
                        type="number"
                        value={filters.maxPrice || ""}
                        onChange={(e) =>
                          onFilterChange({
                            maxPrice: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="Any"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Price Buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {[500, 1000, 2000, 5000].map((price) => (
                    <button
                      key={price}
                      onClick={() => {
                        const currentMax = filters.maxPrice || 0;
                        onFilterChange({
                          minPrice: 0,
                          maxPrice: currentMax === price ? undefined : price,
                        });
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        filters.maxPrice === price
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-medium"
                          : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      Up to KES {price.toLocaleString()}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Verified Professionals */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => toggleSection("verification")}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-600 text-sm sm:text-base">
                  verified
                </span>
                <span className="text-sm sm:text-base font-bold text-gray-900">
                  Verification
                </span>
              </div>
              <span className="material-symbols-outlined text-gray-500 text-sm sm:text-base transform transition-transform">
                {isExpanded.verification ? "expand_less" : "expand_more"}
              </span>
            </button>

            {isExpanded.verification && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="pt-2"
              >
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer group p-3 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-emerald-600 text-sm">
                          verified
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Verified Only
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Background-checked professionals
                        </p>
                      </div>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={filters.verified || false}
                        onChange={(e) =>
                          onFilterChange({ verified: e.target.checked })
                        }
                      />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </div>
                  </label>
                </div>
              </motion.div>
            )}
          </div>

          {/* Rating Filter */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => toggleSection("rating")}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-600 text-sm sm:text-base">
                  star
                </span>
                <span className="text-sm sm:text-base font-bold text-gray-900">
                  Minimum Rating
                </span>
              </div>
              <span className="material-symbols-outlined text-gray-500 text-sm sm:text-base transform transition-transform">
                {isExpanded.rating ? "expand_less" : "expand_more"}
              </span>
            </button>

            {isExpanded.rating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="pt-2"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() =>
                          onFilterChange({
                            minRating:
                              filters.minRating === rating ? undefined : rating,
                          })
                        }
                        className={`p-2 rounded-lg transition-all ${
                          filters.minRating && filters.minRating <= rating
                            ? "bg-amber-50 border border-amber-200"
                            : "bg-gray-50 border border-gray-200"
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-lg sm:text-xl"
                          style={{
                            color:
                              filters.minRating && filters.minRating <= rating
                                ? "#F59E0B"
                                : "#D1D5DB",
                            fontVariationSettings:
                              filters.minRating && filters.minRating <= rating
                                ? "'FILL' 1"
                                : "'FILL' 0",
                          }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "4+ Stars", value: 4 },
                      { label: "4.5+ Stars", value: 4.5 },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          onFilterChange({
                            minRating:
                              filters.minRating === option.value
                                ? undefined
                                : option.value,
                          })
                        }
                        className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                          filters.minRating === option.value
                            ? "bg-amber-50 border-amber-500 text-amber-700 font-medium"
                            : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Location Type Filter */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => toggleSection("location")}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-600 text-sm sm:text-base">
                  location_on
                </span>
                <span className="text-sm sm:text-base font-bold text-gray-900">
                  Service Type
                </span>
              </div>
              <span className="material-symbols-outlined text-gray-500 text-sm sm:text-base transform transition-transform">
                {isExpanded.location ? "expand_less" : "expand_more"}
              </span>
            </button>

            {isExpanded.location && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="pt-2"
              >
                <div className="space-y-2">
                  {[
                    { label: "Remote/Online", icon: "computer" },
                    { label: "On-Site", icon: "home_pin" },
                    { label: "Both", icon: "swap_horiz" },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => {
                        /* Add service type filter logic */
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left"
                    >
                      <span className="material-symbols-outlined text-gray-600 text-sm">
                        {option.icon}
                      </span>
                      <span className="text-sm text-gray-700">
                        {option.label}
                      </span>
                      <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        Soon
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Active Filters Summary */}
          {(filters.minPrice ||
            filters.maxPrice ||
            filters.verified ||
            filters.minRating) && (
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">
                  Active Filters
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {[
                    filters.minPrice ? 1 : 0,
                    filters.maxPrice ? 1 : 0,
                    filters.verified ? 1 : 0,
                    filters.minRating ? 1 : 0,
                  ].reduce((a, b) => a + b, 0)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.minPrice && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                    Min: KES {filters.minPrice.toLocaleString()}
                    <button
                      onClick={() => onFilterChange({ minPrice: undefined })}
                      className="ml-1 text-blue-500 hover:text-blue-700"
                    >
                      <span className="material-symbols-outlined text-xs">
                        close
                      </span>
                    </button>
                  </span>
                )}
                {filters.maxPrice && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                    Max: KES {filters.maxPrice.toLocaleString()}
                    <button
                      onClick={() => onFilterChange({ maxPrice: undefined })}
                      className="ml-1 text-blue-500 hover:text-blue-700"
                    >
                      <span className="material-symbols-outlined text-xs">
                        close
                      </span>
                    </button>
                  </span>
                )}
                {filters.verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-100">
                    Verified Only
                    <button
                      onClick={() => onFilterChange({ verified: undefined })}
                      className="ml-1 text-emerald-500 hover:text-emerald-700"
                    >
                      <span className="material-symbols-outlined text-xs">
                        close
                      </span>
                    </button>
                  </span>
                )}
                {filters.minRating && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-lg border border-amber-100">
                    {filters.minRating}+ Stars
                    <button
                      onClick={() => onFilterChange({ minRating: undefined })}
                      className="ml-1 text-amber-500 hover:text-amber-700"
                    >
                      <span className="material-symbols-outlined text-xs">
                        close
                      </span>
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Apply Button (Mobile) */}
        <div className="lg:hidden p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => {
              /* Close mobile filters */
            }}
            className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors text-sm shadow-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default Filters;
