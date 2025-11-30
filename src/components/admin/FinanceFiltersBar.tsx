"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  X,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface FinanceFilters {
  search: string;
  type: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
}

interface FinanceFiltersBarProps {
  filters: FinanceFilters;
  onFilterChange: (filters: FinanceFilters) => void;
  onApply: () => void;
  activeTab: string;
  onClear?: () => void;
  isMobile?: boolean;
}

export default function FinanceFiltersBar({
  filters,
  onFilterChange,
  onApply,
  activeTab,
  onClear,
  isMobile = false,
}: FinanceFiltersBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (field: keyof FinanceFilters, value: string) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleClear = () => {
    onFilterChange({
      search: "",
      type: "ALL",
      status: "ALL",
      dateFrom: "",
      dateTo: "",
      minAmount: "",
      maxAmount: "",
    });
    if (onClear) {
      onClear();
    } else {
      onApply();
    }
    setShowAdvanced(false);
  };

  const hasActiveFilters =
    filters.search ||
    filters.type !== "ALL" ||
    filters.status !== "ALL" ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.minAmount ||
    filters.maxAmount;

  if (activeTab === "overview") return null;

  // Mobile-optimized layout
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Search Bar - Full width on mobile */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === "wallets"
                ? "Search users..."
                : "Search transactions..."
            }
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onApply()}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm placeholder:text-slate-400"
          />
        </div>

        {/* Quick Actions Row */}
        <div className="flex gap-2">
          {/* Type Filter (Transactions Only) */}
          {activeTab === "transactions" && (
            <select
              value={filters.type}
              onChange={(e) => {
                handleChange("type", e.target.value);
                onApply();
              }}
              className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="WITHDRAWAL">Withdrawals</option>
              <option value="PAYMENT">Payments</option>
              <option value="REFUND">Refunds</option>
            </select>
          )}

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1 px-3 py-2.5 rounded-lg font-medium text-sm transition-all border ${
              showAdvanced
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Advanced Filters - Mobile */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      From
                    </label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleChange("dateFrom", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      To
                    </label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleChange("dateTo", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Amount Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                      <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                      Min KES
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={filters.minAmount}
                      onChange={(e) =>
                        handleChange("minAmount", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                      <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                      Max KES
                    </label>
                    <input
                      type="number"
                      placeholder="∞"
                      value={filters.maxAmount}
                      onChange={(e) =>
                        handleChange("maxAmount", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={onApply}
                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Apply
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={handleClear}
                      className="flex items-center gap-1 px-3 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors border border-red-100"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Apply/Clear when advanced filters are closed */}
        {!showAdvanced && (
          <div className="flex gap-2">
            <button
              onClick={onApply}
              className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Search
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors border border-red-100"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="space-y-4">
      {/* Main Search & Quick Filters */}
      <div className="flex flex-col xs:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 xs:left-4 top-1/2 -translate-y-1/2 w-4 xs:w-5 h-4 xs:h-5 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === "wallets"
                ? "Search by user name or email..."
                : "Search by transaction ID or user..."
            }
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onApply()}
            className="w-full pl-10 xs:pl-12 pr-4 py-2.5 xs:py-3 bg-white border border-slate-200 rounded-lg xs:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm placeholder:text-slate-400"
          />
        </div>

        {/* Type Filter (Transactions Only) */}
        {activeTab === "transactions" && (
          <select
            value={filters.type}
            onChange={(e) => {
              handleChange("type", e.target.value);
              onApply();
            }}
            className="px-3 xs:px-4 py-2.5 xs:py-3 bg-white border border-slate-200 rounded-lg xs:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-700 cursor-pointer hover:border-slate-300 min-w-[120px] xs:min-w-[140px]"
          >
            <option value="ALL">All Types</option>
            <option value="DEPOSIT">Deposits</option>
            <option value="WITHDRAWAL">Withdrawals</option>
            <option value="PAYMENT">Payments</option>
            <option value="REFUND">Refunds</option>
          </select>
        )}

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-3 xs:px-4 py-2.5 xs:py-3 rounded-lg xs:rounded-xl font-medium text-sm transition-all border ${
            showAdvanced
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 border-emerald-600"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* Apply Search */}
        <button
          onClick={onApply}
          className="px-4 xs:px-6 py-2.5 xs:py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg xs:rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
        >
          Apply
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleClear}
            className="flex items-center gap-2 px-3 xs:px-4 py-2.5 xs:py-3 bg-red-50 text-red-600 rounded-lg xs:rounded-xl font-medium text-sm hover:bg-red-100 transition-all border border-red-100 whitespace-nowrap"
          >
            <X className="w-4 h-4" />
            Clear
          </motion.button>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 xs:p-6 bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-lg xs:rounded-2xl border border-slate-200/50 shadow-sm">
              <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4">
                {/* Date From */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs xs:text-sm font-medium text-slate-700">
                    <Calendar className="w-3 xs:w-4 h-3 xs:h-4 text-emerald-600" />
                    Date From
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleChange("dateFrom", e.target.value)}
                    className="w-full px-3 xs:px-4 py-2 xs:py-2.5 bg-white border border-slate-200 rounded-lg xs:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  />
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs xs:text-sm font-medium text-slate-700">
                    <Calendar className="w-3 xs:w-4 h-3 xs:h-4 text-emerald-600" />
                    Date To
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleChange("dateTo", e.target.value)}
                    className="w-full px-3 xs:px-4 py-2 xs:py-2.5 bg-white border border-slate-200 rounded-lg xs:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  />
                </div>

                {/* Min Amount */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs xs:text-sm font-medium text-slate-700">
                    <ArrowDownRight className="w-3 xs:w-4 h-3 xs:h-4 text-emerald-600" />
                    Min Amount
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={filters.minAmount}
                    onChange={(e) => handleChange("minAmount", e.target.value)}
                    className="w-full px-3 xs:px-4 py-2 xs:py-2.5 bg-white border border-slate-200 rounded-lg xs:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  />
                </div>

                {/* Max Amount */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs xs:text-sm font-medium text-slate-700">
                    <ArrowUpRight className="w-3 xs:w-4 h-3 xs:h-4 text-emerald-600" />
                    Max Amount
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={filters.maxAmount}
                    onChange={(e) => handleChange("maxAmount", e.target.value)}
                    className="w-full px-3 xs:px-4 py-2 xs:py-2.5 bg-white border border-slate-200 rounded-lg xs:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
