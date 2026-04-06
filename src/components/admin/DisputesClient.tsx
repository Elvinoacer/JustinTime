"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DisputeStats from "@/components/admin/DisputeStats";
import DisputeFiltersBar, {
  type DisputeFilters,
} from "@/components/admin/DisputeFiltersBar";
import EnhancedDisputesTable from "@/components/admin/DisputesTable";
import { Loader2, Menu, X } from "lucide-react";

interface DisputesClientProps {
  initialData: {
    disputes: any[];
    total: number;
    currentPage: number;
    totalPages: number;
    stats: {
      total: number;
      open: number;
      resolved: number;
      closed: number;
      resolutionRate: number;
      avgResolutionTime: number;
    };
  };
}

export default function DisputesClient({ initialData }: DisputesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [filters, setFilters] = useState<DisputeFilters>({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "ALL",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    creatorRole: searchParams.get("creatorRole") || "ALL",
  });

  const handleApplyFilters = () => {
    setIsLoading(true);
    const params = new URLSearchParams();

    if (filters.search) params.set("search", filters.search);
    if (filters.status && filters.status !== "ALL")
      params.set("status", filters.status);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.creatorRole && filters.creatorRole !== "ALL")
      params.set("creatorRole", filters.creatorRole);

    router.push(`/admin/disputes?${params.toString()}`);
    setIsFiltersOpen(false);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: "ALL",
      dateFrom: "",
      dateTo: "",
      creatorRole: "ALL",
    });
    router.push("/admin/disputes");
    setIsFiltersOpen(false);
  };

  useEffect(() => {
    setIsLoading(false);
  }, [initialData]);

  // Close filters when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        isFiltersOpen &&
        !target.closest(".filters-container") &&
        !target.closest(".filters-toggle")
      ) {
        setIsFiltersOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isFiltersOpen]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-red-50/30 to-orange-50/20">
      <div className="max-w-400 mx-auto p-3 xs:p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2 leading-tight">
              Disputes Management
            </h1>
            <p className="text-xs xs:text-sm sm:text-base text-slate-600 leading-relaxed">
              Review and resolve platform disputes efficiently
            </p>
          </div>

          {/* Mobile Filters Toggle */}
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="filters-toggle lg:hidden bg-white border border-slate-300 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200 self-start xs:self-auto"
          >
            {isFiltersOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">Filters</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="px-1">
          <DisputeStats stats={initialData.stats} />
        </div>

        {/* Filters - Mobile Overlay / Desktop Inline */}
        <div
          className={`filters-container ${
            isFiltersOpen
              ? "fixed inset-0 z-50 bg-white p-4 sm:p-6 overflow-y-auto lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:p-0"
              : "hidden lg:block"
          }`}
        >
          <div className="lg:hidden flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Dispute Filters
            </h2>
            <button
              onClick={() => setIsFiltersOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <DisputeFiltersBar
            filters={filters}
            onFilterChange={setFilters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            isMobile={isFiltersOpen}
          />

          {/* Mobile Apply/Clear Buttons */}
          <div className="lg:hidden flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={handleApplyFilters}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-semibold text-base transition-colors shadow-lg shadow-red-200"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="flex-1 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 py-3 px-4 rounded-lg font-semibold text-base transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl flex items-center gap-3 max-w-xs sm:max-w-sm w-full">
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 animate-spin shrink-0" />
              <p className="font-medium text-slate-900 text-sm sm:text-base">
                Loading disputes...
              </p>
            </div>
          </div>
        )}

        {/* Disputes Table */}
        <div className="px-1">
          <EnhancedDisputesTable
            disputes={initialData.disputes}
            total={initialData.total}
            currentPage={initialData.currentPage}
            totalPages={initialData.totalPages}
          />
        </div>

        {/* Mobile Filters Backdrop */}
        {isFiltersOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/10 z-40" />
        )}
      </div>
    </div>
  );
}
