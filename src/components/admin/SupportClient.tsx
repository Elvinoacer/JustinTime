"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SupportStats from "@/components/admin/SupportStats";
import SupportFiltersBar, {
  type SupportFilters,
} from "@/components/admin/SupportFiltersBar";
import EnhancedSupportTicketsTable from "@/components/admin/SupportTicketsTable";
import { Loader2, Menu, X } from "lucide-react";

interface SupportClientProps {
  initialData: {
    tickets: any[];
    total: number;
    currentPage: number;
    totalPages: number;
    stats: {
      total: number;
      open: number;
      inProgress: number;
      resolved: number;
      urgent: number;
      avgResponseTime: number;
    };
  };
}

export default function SupportClient({ initialData }: SupportClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [filters, setFilters] = useState<SupportFilters>({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "ALL",
    priority: searchParams.get("priority") || "ALL",
    category: searchParams.get("category") || "ALL",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
  });

  const handleApplyFilters = () => {
    setIsLoading(true);
    const params = new URLSearchParams();

    if (filters.search) params.set("search", filters.search);
    if (filters.status && filters.status !== "ALL")
      params.set("status", filters.status);
    if (filters.priority && filters.priority !== "ALL")
      params.set("priority", filters.priority);
    if (filters.category && filters.category !== "ALL")
      params.set("category", filters.category);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);

    router.push(`/admin/support?${params.toString()}`);
    setIsFiltersOpen(false);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: "ALL",
      priority: "ALL",
      category: "ALL",
      dateFrom: "",
      dateTo: "",
    });
    router.push("/admin/support");
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
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      <div className="max-w-400 mx-auto p-3 xs:p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2 leading-tight">
              Support Center
            </h1>
            <p className="text-xs xs:text-sm sm:text-base text-slate-600 leading-relaxed">
              Manage user inquiries and support tickets efficiently
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
          <SupportStats stats={initialData.stats} />
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
              Support Filters
            </h2>
            <button
              onClick={() => setIsFiltersOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <SupportFiltersBar
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
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-semibold text-base transition-colors shadow-lg shadow-indigo-200"
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
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 animate-spin shrink-0" />
              <p className="font-medium text-slate-900 text-sm sm:text-base">
                Loading tickets...
              </p>
            </div>
          </div>
        )}

        {/* Tickets Table */}
        <div className="px-1">
          <EnhancedSupportTicketsTable
            tickets={initialData.tickets}
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
