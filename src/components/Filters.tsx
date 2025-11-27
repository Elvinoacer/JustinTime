"use client";
import { useState } from 'react';
import CustomSelect from './CustomSelect';

import { ServicesFilters } from "@/lib/api/hooks/useServices";

interface FiltersProps {
  filters: ServicesFilters;
  onFilterChange: (filters: Partial<ServicesFilters>) => void;
}

const Filters = ({ filters, onFilterChange }: FiltersProps) => {
  return (
    <aside className="w-full md:w-64 lg:w-72 flex-shrink-0">
      <div className="sticky top-24 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Filters</h2>
          <button 
            onClick={() => onFilterChange({ 
              minPrice: undefined, 
              maxPrice: undefined, 
              verified: undefined,
              category: "All Services"
            })}
            className="text-sm text-emerald-600 font-medium hover:text-emerald-700"
          >
            Reset
          </button>
        </div>
        
        <div className="space-y-8">
          {/* Price Range */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-4">
              Price Range
            </label>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Min</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">KES</span>
                    <input
                      type="number"
                      value={filters.minPrice || ""}
                      onChange={(e) => onFilterChange({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full rounded-xl border-gray-200 pl-10 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Max</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">KES</span>
                    <input
                      type="number"
                      value={filters.maxPrice || ""}
                      onChange={(e) => onFilterChange({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full rounded-xl border-gray-200 pl-10 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                      placeholder="Any"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Verified Pros Only</span>
              <div className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={filters.verified || false}
                  onChange={(e) => onFilterChange({ verified: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Filters;