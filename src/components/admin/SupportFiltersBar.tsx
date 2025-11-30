"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  X,
  Calendar,
  AlertTriangle,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface SupportFilters {
  search: string;
  status: string;
  priority: string;
  category: string;
  dateFrom: string;
  dateTo: string;
}

interface SupportFiltersBarProps {
  filters: SupportFilters;
  onFilterChange: (filters: SupportFilters) => void;
  onApply: () => void;
}

export default function SupportFiltersBar({
  filters,
  onFilterChange,
  onApply,
}: SupportFiltersBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const handleChange = (field: keyof SupportFilters, value: string) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleClear = () => {
    onFilterChange({
      search: "",
      status: "ALL",
      priority: "ALL",
      category: "ALL",
      dateFrom: "",
      dateTo: "",
    });
    onApply();
    setShowMobileFilters(false);
  };

  const hasActiveFilters =
    filters.search ||
    filters.status !== "ALL" ||
    filters.priority !== "ALL" ||
    filters.category !== "ALL" ||
    filters.dateFrom ||
    filters.dateTo;

  const applyFilters = () => {
    onApply();
    setShowMobileFilters(false);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Mobile Filter Toggle */}
      <div className="block lg:hidden">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className={`flex items-center justify-between w-full px-4 py-3 rounded-xl font-medium text-sm transition-all ${
            showMobileFilters
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
              : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>Filters {hasActiveFilters && "•"}</span>
          </div>
          {showMobileFilters ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Search & Quick Filters */}
      <div
        className={`${
          showMobileFilters ? "block" : "hidden lg:flex"
        } flex-col lg:flex-row gap-2 sm:gap-3`}
      >
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm placeholder:text-slate-400"
          />
        </div>

        {/* Status Filter - Hidden on mobile in favor of advanced filters */}
        <div className="hidden sm:block">
          <select
            value={filters.status}
            onChange={(e) => {
              handleChange("status", e.target.value);
              onApply();
            }}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 cursor-pointer hover:border-slate-300"
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        {/* Desktop Advanced Filters Toggle */}
        <div className="hidden lg:block">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium text-sm transition-all ${
              showAdvanced
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={applyFilters}
            className="flex-1 lg:flex-none px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg sm:rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Apply
          </button>

          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleClear}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-red-50 text-red-600 rounded-lg sm:rounded-xl font-medium text-sm hover:bg-red-100 transition-all border border-red-100"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Clear</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {(showAdvanced || showMobileFilters) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl sm:rounded-2xl border border-slate-200/50 shadow-sm">
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Status Filter - Mobile only */}
                <div className="block sm:hidden">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <AlertTriangle className="w-4 h-4 text-blue-500" />
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm cursor-pointer"
                  >
                    <option value="ALL">All Status</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                    Priority
                  </label>
                  <select
                    value={filters.priority}
                    onChange={(e) => handleChange("priority", e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm cursor-pointer"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm cursor-pointer"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="Account">Account</option>
                    <option value="Payments">Payments</option>
                    <option value="Technical">Technical</option>
                    <option value="Bookings">Bookings</option>
                    <option value="General">General</option>
                  </select>
                </div>

                {/* Date From */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                    Date From
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleChange("dateFrom", e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  />
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                    Date To
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleChange("dateTo", e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Mobile Apply/Clear Buttons */}
              <div className="flex gap-3 mt-4 sm:hidden">
                <button
                  onClick={applyFilters}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200 transition-all"
                >
                  Clear
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Indicator - Mobile */}
      {hasActiveFilters && (
        <div className="block lg:hidden">
          <div className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
            Filters active • Tap to view
          </div>
        </div>
      )}
    </div>
  );
}
