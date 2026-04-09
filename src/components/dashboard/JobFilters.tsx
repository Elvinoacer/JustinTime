"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type DashboardFilters = {
  search: string;
  category: string;
  location: string;
  budgetMin: string;
  budgetMax: string;
  status: string;
};

interface JobFiltersProps {
  filters: DashboardFilters;
  onFilterChange: (filters: DashboardFilters) => void;
  categories?: Array<{ id: string; name: string; slug: string }>;
  isMobile?: boolean;
  mobileMode?: "accordion" | "sheet";
}

const JobFilters: React.FC<JobFiltersProps> = ({
  filters,
  onFilterChange,
  categories = [],
  isMobile = false,
  mobileMode = "accordion",
}) => {
  const isSheetMode = isMobile && mobileMode === "sheet";
  const [isExpanded, setIsExpanded] = useState(!isMobile || isSheetMode);

  useEffect(() => {
    setIsExpanded(!isMobile || isSheetMode);
  }, [isMobile, isSheetMode]);

  const handleChange = (key: string, value: string) => {
    onFilterChange({ ...filters, [key]: value } as DashboardFilters);
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

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(
        ([key, value]) => value && key !== "status",
      ).length,
    [filters],
  );

  const showFiltersPanel = !isMobile || isExpanded || isSheetMode;

  const budgetRangeLabel =
    filters.budgetMin && filters.budgetMax
      ? `KES ${filters.budgetMin} - ${filters.budgetMax}`
      : filters.budgetMin
        ? `From KES ${filters.budgetMin}`
        : filters.budgetMax
          ? `Up to KES ${filters.budgetMax}`
          : "";

  const statusOptions = [
    { value: "", label: "All" },
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
  ];

  const filterContent = (
    <div
      className={`${isMobile ? "p-4 space-y-4" : "p-6 space-y-6"} ${
        isMobile && !isSheetMode ? "border-t border-gray-100" : ""
      }`}
    >
      {/* Search */}
      <div className="space-y-2">
        <label
          htmlFor="search-jobs"
          className={`block ${isMobile ? "text-xs font-medium" : "text-sm font-semibold"} text-gray-700`}
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
            placeholder="Search by title, keyword, or client"
            className={`w-full ${isMobile ? "pl-9 pr-3 py-2.5 text-sm" : "pl-10 pr-4 py-2.5 text-sm"} border border-gray-300 ${
              isMobile ? "rounded-lg" : "rounded-xl"
            } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all`}
          />
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label
          htmlFor="category-filter"
          className={`block ${isMobile ? "text-xs font-medium" : "text-sm font-semibold"} text-gray-700`}
        >
          Category
        </label>
        <select
          id="category-filter"
          value={filters.category}
          onChange={(e) => handleChange("category", e.target.value)}
          className={`w-full ${isMobile ? "px-3 py-2.5 text-sm" : "px-4 py-2.5 text-sm"} border border-gray-300 ${
            isMobile ? "rounded-lg" : "rounded-xl"
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
      <div className="space-y-2">
        <label
          htmlFor="location-filter"
          className={`block ${isMobile ? "text-xs font-medium" : "text-sm font-semibold"} text-gray-700`}
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
            placeholder="City or area"
            className={`w-full ${isMobile ? "pl-9 pr-3 py-2.5 text-sm" : "pl-10 pr-4 py-2.5 text-sm"} border border-gray-300 ${
              isMobile ? "rounded-lg" : "rounded-xl"
            } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all`}
          />
        </div>
      </div>

      {/* Budget Range */}
      <div className="space-y-2">
        <label
          className={`block ${isMobile ? "text-xs font-medium" : "text-sm font-semibold"} text-gray-700`}
        >
          Budget Range (KES)
        </label>
        <div
          className={`grid ${isMobile ? "grid-cols-2 gap-2" : "grid-cols-2 gap-3"}`}
        >
          <div className="relative">
            <input
              type="number"
              value={filters.budgetMin}
              onChange={(e) => handleChange("budgetMin", e.target.value)}
              placeholder="Min"
              className={`w-full ${isMobile ? "px-3 py-2.5 text-sm" : "px-4 py-2.5 text-sm"} border border-gray-300 ${
                isMobile ? "rounded-lg" : "rounded-xl"
              } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all`}
              min="0"
            />
          </div>
          <div className="relative">
            <input
              type="number"
              value={filters.budgetMax}
              onChange={(e) => handleChange("budgetMax", e.target.value)}
              placeholder="Max"
              className={`w-full ${isMobile ? "px-3 py-2.5 text-sm" : "px-4 py-2.5 text-sm"} border border-gray-300 ${
                isMobile ? "rounded-lg" : "rounded-xl"
              } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all`}
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <p
          className={`block ${isMobile ? "text-xs font-medium" : "text-sm font-semibold"} text-gray-700`}
        >
          Status
        </p>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => {
            const active = option.value === filters.status;
            return (
              <button
                key={option.value || "all"}
                type="button"
                onClick={() => handleChange("status", option.value)}
                className={`px-3 py-2 rounded-full text-xs font-semibold transition-colors border ${
                  active
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                }`}
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      {!isSheetMode && (
        <div className={`flex ${isMobile ? "flex-col gap-2" : "gap-2"} pt-2`}>
          {isMobile && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="w-full py-2.5 text-xs bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
            >
              Done
            </button>
          )}

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className={`${isMobile ? "w-full py-2.5 text-xs" : "w-full py-2.5 text-sm"} bg-gray-100 text-gray-700 ${
                isMobile ? "rounded-lg" : "rounded-xl"
              } font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5`}
            >
              <span className="material-symbols-outlined text-base">close</span>
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Active Filters</p>
          <div className="flex flex-wrap gap-1.5">
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium">
                Search: {filters.search.length > 18 ? `${filters.search.slice(0, 18)}...` : filters.search}
                <button
                  type="button"
                  onClick={() => handleChange("search", "")}
                  className="ml-1 hover:text-emerald-900"
                  aria-label="Remove search filter"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </span>
            )}
            {filters.category && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium">
                Category
                <button
                  type="button"
                  onClick={() => handleChange("category", "")}
                  className="ml-1 hover:text-emerald-900"
                  aria-label="Remove category filter"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </span>
            )}
            {filters.location && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium">
                Location: {filters.location.length > 16 ? `${filters.location.slice(0, 16)}...` : filters.location}
                <button
                  type="button"
                  onClick={() => handleChange("location", "")}
                  className="ml-1 hover:text-emerald-900"
                  aria-label="Remove location filter"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </span>
            )}
            {(filters.budgetMin || filters.budgetMax) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium">
                {budgetRangeLabel}
                <button
                  type="button"
                  onClick={() => {
                    onFilterChange({
                      ...filters,
                      budgetMin: "",
                      budgetMax: "",
                    });
                  }}
                  className="ml-1 hover:text-emerald-900"
                  aria-label="Remove budget filter"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium">
                Status: {filters.status.replace("_", " ")}
                <button
                  type="button"
                  onClick={() => handleChange("status", "")}
                  className="ml-1 hover:text-emerald-900"
                  aria-label="Remove status filter"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`bg-white/95 backdrop-blur ${
        isSheetMode
          ? "rounded-none border-0 shadow-none"
          : isMobile
            ? "rounded-xl shadow-lg border border-emerald-100"
            : "rounded-2xl shadow-sm border border-gray-200"
      } overflow-hidden`}
    >
      {/* Mobile Toggle */}
      {isMobile && !isSheetMode && (
        <button
          className="w-full p-4 flex items-center justify-between text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls="filter-content"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-emerald-700">
              tune
            </span>
            <span className="text-base">Filters</span>
            {activeFilterCount > 0 && (
              <span className="text-xs px-2 py-0.5 bg-emerald-600 text-white font-bold rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <span
            className={`material-symbols-outlined text-xl transition-transform duration-300 ${
              isExpanded ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            expand_more
          </span>
        </button>
      )}

      {/* Filters Content */}
      {!isMobile || isSheetMode ? (
        showFiltersPanel ? (
          <div id="filter-content" className="block">
            {filterContent}
          </div>
        ) : null
      ) : (
        <AnimatePresence initial={false}>
          {showFiltersPanel && (
            <motion.div
              id="filter-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="block"
            >
              {filterContent}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default JobFilters;
