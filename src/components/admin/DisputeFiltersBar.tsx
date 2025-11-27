'use client';

import { useState } from 'react';
import { Search, Filter, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DisputeFilters {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  creatorRole: string;
}

interface DisputeFiltersBarProps {
  filters: DisputeFilters;
  onFilterChange: (filters: DisputeFilters) => void;
  onApply: () => void;
}

export default function DisputeFiltersBar({ filters, onFilterChange, onApply }: DisputeFiltersBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (field: keyof DisputeFilters, value: string) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleClear = () => {
    onFilterChange({
      search: '',
      status: 'ALL',
      dateFrom: '',
      dateTo: '',
      creatorRole: 'ALL',
    });
    onApply();
  };

  const hasActiveFilters = filters.search || filters.status !== 'ALL' || filters.dateFrom || filters.dateTo || filters.creatorRole !== 'ALL';

  return (
    <div className="space-y-4">
      {/* Main Search & Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by dispute ID, reason, parties, or booking..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onApply()}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm placeholder:text-slate-400"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => {
            handleChange('status', e.target.value);
            onApply();
          }}
          className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium text-slate-700 cursor-pointer hover:border-slate-300"
        >
          <option value="ALL">All Status</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${
            showAdvanced
              ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>

        {/* Apply Search */}
        <button
          onClick={onApply}
          className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Apply
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium text-sm hover:bg-red-100 transition-all border border-red-100"
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
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-gradient-to-br from-slate-50 to-red-50/30 rounded-2xl border border-slate-200/50 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date From */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Calendar className="w-4 h-4 text-red-600" />
                    Date From
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleChange('dateFrom', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
                  />
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Calendar className="w-4 h-4 text-red-600" />
                    Date To
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleChange('dateTo', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
                  />
                </div>

                {/* Creator Role */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Complainant Role
                  </label>
                  <select
                    value={filters.creatorRole}
                    onChange={(e) => handleChange('creatorRole', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm cursor-pointer"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="CLIENT">Client</option>
                    <option value="PROVIDER">Provider</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
