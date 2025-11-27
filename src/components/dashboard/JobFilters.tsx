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
}

const JobFilters: React.FC<JobFiltersProps> = ({
  filters,
  onFilterChange,
  categories = [],
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
      status: "OPEN",
    });
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value && key !== "status"
  ).length;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
      {/* Mobile Toggle */}
      <button
        className="lg:hidden w-full p-4 flex items-center justify-between text-left font-semibold text-gray-900"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined">filter_list</span>
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <span
          className={`material-symbols-outlined transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Filters Content */}
      <AnimatePresence initial={false}>
        {(isExpanded || isLargeScreen) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:block"
          >
            <div className="p-6 space-y-4 border-t lg:border-t-0 border-gray-100">
              {/* Search */}
              <div>
                <label
                  htmlFor="search-jobs"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Search
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-xl">
                    search
                  </span>
                  <input
                    id="search-jobs"
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleChange("search", e.target.value)}
                    placeholder="Search by title or description..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="category-filter"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Category
                </label>
                <select
                  id="category-filter"
                  value={filters.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
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
              <div>
                <label
                  htmlFor="location-filter"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Location
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-xl">
                    location_on
                  </span>
                  <input
                    id="location-filter"
                    type="text"
                    value={filters.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="Enter location..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>

              {/* Budget Range */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Budget Range (KES)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={filters.budgetMin}
                    onChange={(e) => handleChange("budgetMin", e.target.value)}
                    placeholder="Min"
                    className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                  <input
                    type="number"
                    value={filters.budgetMax}
                    onChange={(e) => handleChange("budgetMax", e.target.value)}
                    placeholder="Max"
                    className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label
                  htmlFor="status-filter"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Status
                </label>
                <select
                  id="status-filter"
                  value={filters.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">
                    close
                  </span>
                  Clear All Filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobFilters;
