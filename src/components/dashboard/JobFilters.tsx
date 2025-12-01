"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface JobFiltersProps {
  filters: {
    search: string;
    category: string;
    location: string;
    budgetMin: string;
    budgetMax: string;
    status: string;
  };
  onFilterChange: (filters: any) => void;
  categories?: Array<{ id: string; name: string; slug: string }>;
  isMobile?: boolean;
}

const JobFilters: React.FC<JobFiltersProps> = ({
  filters,
  onFilterChange,
  categories = [],
  isMobile = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  // Client-side detection for screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    // Initial check
    checkScreenSize();

    // Add resize listener
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Auto-collapse filters on mobile when screen resizes to desktop
  useEffect(() => {
    if (isLargeScreen) {
      setIsExpanded(true);
    }
  }, [isLargeScreen]);

  const handleChange = (key: string, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: "",
      category: "",
      location: "",
      budgetMin: "",
      budgetMax: "",
      status: "",
    });
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value && key !== "status"
  ).length;

  return (
    <div
      className={`bg-white ${
        isMobile
          ? "rounded-lg shadow-sm"
          : "rounded-xl lg:rounded-2xl shadow-sm border border-gray-100"
      } overflow-hidden`}
    >
      {/* Mobile Toggle */}
      <button
        className={`${
          isMobile ? "w-full p-3" : "lg:hidden w-full p-4"
        } flex items-center justify-between text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors`}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="filter-content"
      >
        <div className="flex items-center gap-2">
          <span
            className={`material-symbols-outlined ${
              isMobile ? "text-lg" : "text-xl"
            }`}
          >
            filter_list
          </span>
          <span className={isMobile ? "text-sm" : "text-base"}>Filters</span>
          {activeFilterCount > 0 && (
            <span
              className={`${
                isMobile ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-0.5"
              } bg-emerald-500 text-white font-bold rounded-full`}
            >
              {activeFilterCount}
            </span>
          )}
        </div>
        <span
          className={`material-symbols-outlined ${
            isMobile ? "text-lg" : "text-xl"
          } transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {/* Filters Content */}
      <AnimatePresence initial={false}>
        {(isExpanded || isLargeScreen) && (
          <motion.div
            id="filter-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:block"
          >
            <div
              className={`${
                isMobile ? "p-3 space-y-3" : "p-4 lg:p-6 space-y-4 lg:space-y-6"
              } border-t lg:border-t-0 border-gray-100`}
            >
              {/* Search */}
              <div className="space-y-1 lg:space-y-2">
                <label
                  htmlFor="search-jobs"
                  className={`block ${
                    isMobile ? "text-xs font-medium" : "text-sm font-semibold"
                  } text-gray-700`}
                >
                  Search
                </label>
                <div className="relative">
                  <span
                    className={`absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 ${
                      isMobile ? "text-base" : "text-lg lg:text-xl"
                    }`}
                  >
                    search
                  </span>
                  <input
                    id="search-jobs"
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleChange("search", e.target.value)}
                    placeholder="Search jobs..."
                    className={`w-full ${
                      isMobile
                        ? "pl-9 pr-3 py-2 text-sm"
                        : "pl-10 pr-4 py-2.5 text-sm"
                    } border border-gray-300 ${
                      isMobile ? "rounded-lg" : "rounded-lg lg:rounded-xl"
                    } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all`}
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1 lg:space-y-2">
                <label
                  htmlFor="category-filter"
                  className={`block ${
                    isMobile ? "text-xs font-medium" : "text-sm font-semibold"
                  } text-gray-700`}
                >
                  Category
                </label>
                <select
                  id="category-filter"
                  value={filters.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className={`w-full ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-sm"
                  } border border-gray-300 ${
                    isMobile ? "rounded-lg" : "rounded-lg lg:rounded-xl"
                  } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all appearance-none bg-white`}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="space-y-1 lg:space-y-2">
                <label
                  htmlFor="location-filter"
                  className={`block ${
                    isMobile ? "text-xs font-medium" : "text-sm font-semibold"
                  } text-gray-700`}
                >
                  Location
                </label>
                <div className="relative">
                  <span
                    className={`absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 ${
                      isMobile ? "text-base" : "text-lg lg:text-xl"
                    }`}
                  >
                    location_on
                  </span>
                  <input
                    id="location-filter"
                    type="text"
                    value={filters.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="Enter location..."
                    className={`w-full ${
                      isMobile
                        ? "pl-9 pr-3 py-2 text-sm"
                        : "pl-10 pr-4 py-2.5 text-sm"
                    } border border-gray-300 ${
                      isMobile ? "rounded-lg" : "rounded-lg lg:rounded-xl"
                    } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all`}
                  />
                </div>
              </div>

              {/* Budget Range */}
              <div className="space-y-1 lg:space-y-2">
                <label
                  className={`block ${
                    isMobile ? "text-xs font-medium" : "text-sm font-semibold"
                  } text-gray-700`}
                >
                  Budget Range (KES)
                </label>
                <div
                  className={`grid ${
                    isMobile ? "grid-cols-2 gap-2" : "grid-cols-2 gap-3"
                  }`}
                >
                  <div className="relative">
                    <input
                      type="number"
                      value={filters.budgetMin}
                      onChange={(e) =>
                        handleChange("budgetMin", e.target.value)
                      }
                      placeholder="Min"
                      className={`w-full ${
                        isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-sm"
                      } border border-gray-300 ${
                        isMobile ? "rounded-lg" : "rounded-lg lg:rounded-xl"
                      } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all`}
                      min="0"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={filters.budgetMax}
                      onChange={(e) =>
                        handleChange("budgetMax", e.target.value)
                      }
                      placeholder="Max"
                      className={`w-full ${
                        isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-sm"
                      } border border-gray-300 ${
                        isMobile ? "rounded-lg" : "rounded-lg lg:rounded-xl"
                      } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all`}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1 lg:space-y-2">
                <label
                  htmlFor="status-filter"
                  className={`block ${
                    isMobile ? "text-xs font-medium" : "text-sm font-semibold"
                  } text-gray-700`}
                >
                  Status
                </label>
                <select
                  id="status-filter"
                  value={filters.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className={`w-full ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-sm"
                  } border border-gray-300 ${
                    isMobile ? "rounded-lg" : "rounded-lg lg:rounded-xl"
                  } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all appearance-none bg-white`}
                >
                  <option value="">All Status</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div
                className={`flex ${
                  isMobile
                    ? "flex-col gap-2 pt-2"
                    : "flex-col lg:flex-row gap-3 lg:gap-2"
                } pt-2 lg:pt-4`}
              >
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className={`${
                      isMobile
                        ? "w-full py-2.5 text-xs"
                        : "w-full lg:flex-1 py-2.5 text-sm"
                    } bg-gray-100 text-gray-700 ${
                      isMobile ? "rounded-lg" : "rounded-lg lg:rounded-xl"
                    } font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 lg:gap-2`}
                  >
                    <span className="material-symbols-outlined text-base lg:text-lg">
                      close
                    </span>
                    Clear Filters
                  </button>
                )}

                {/* Apply/Update Button for better UX */}
                <button
                  onClick={() => {
                    // Trigger filter update
                    if (isMobile) {
                      setIsExpanded(false);
                    }
                  }}
                  className={`${
                    isMobile
                      ? "w-full py-2.5 text-xs"
                      : "w-full lg:flex-1 py-2.5 text-sm"
                  } bg-emerald-600 text-white ${
                    isMobile ? "rounded-lg" : "rounded-lg lg:rounded-xl"
                  } font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 lg:gap-2 shadow-sm hover:shadow-md`}
                >
                  <span className="material-symbols-outlined text-base lg:text-lg">
                    check
                  </span>
                  {isMobile ? "Apply" : "Update Filters"}
                </button>
              </div>

              {/* Active Filters Summary - Mobile Only */}
              {isMobile && activeFilterCount > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Active Filters:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {filters.search && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium">
                        Search: "{filters.search.substring(0, 10)}..."
                        <button
                          onClick={() => handleChange("search", "")}
                          className="ml-1 hover:text-emerald-900"
                          aria-label="Remove search filter"
                        >
                          <span className="material-symbols-outlined text-xs">
                            close
                          </span>
                        </button>
                      </span>
                    )}
                    {filters.category && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium">
                        Category
                        <button
                          onClick={() => handleChange("category", "")}
                          className="ml-1 hover:text-emerald-900"
                          aria-label="Remove category filter"
                        >
                          <span className="material-symbols-outlined text-xs">
                            close
                          </span>
                        </button>
                      </span>
                    )}
                    {filters.location && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium">
                        Location: {filters.location.substring(0, 8)}...
                        <button
                          onClick={() => handleChange("location", "")}
                          className="ml-1 hover:text-emerald-900"
                          aria-label="Remove location filter"
                        >
                          <span className="material-symbols-outlined text-xs">
                            close
                          </span>
                        </button>
                      </span>
                    )}
                    {(filters.budgetMin || filters.budgetMax) && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium">
                        Budget
                        <button
                          onClick={() => {
                            handleChange("budgetMin", "");
                            handleChange("budgetMax", "");
                          }}
                          className="ml-1 hover:text-emerald-900"
                          aria-label="Remove budget filter"
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobFilters;
