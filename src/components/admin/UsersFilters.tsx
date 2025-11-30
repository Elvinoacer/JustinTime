"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import {
  Search,
  X,
  Filter,
  RotateCcw,
  User,
  UserCheck,
  UserX,
  Clock,
  Shield,
  Ban,
} from "lucide-react";

interface UsersFiltersProps {
  currentRole: string;
  currentStatus: string;
  currentSearch: string;
}

export default function UsersFilters({
  currentRole,
  currentStatus,
  currentSearch,
}: UsersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [isPending, startTransition] = useTransition();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Debounced search - triggers filtering automatically after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput.trim()) {
        params.set("search", searchInput.trim());
      } else {
        params.delete("search");
      }
      params.delete("page"); // Reset to page 1

      // Only update if search value changed
      if (searchInput.trim() !== currentSearch) {
        startTransition(() => {
          router.push(`/admin/users?${params.toString()}`);
        });
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchInput, currentSearch, router, searchParams]);

  const handleRoleFilter = (role: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (role) {
      params.set("role", role);
    } else {
      params.delete("role");
    }
    params.delete("page"); // Reset to page 1
    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`);
    });
    setShowMobileFilters(false);
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    params.delete("page"); // Reset to page 1
    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`);
    });
    setShowMobileFilters(false);
  };

  const clearFilters = () => {
    setSearchInput("");
    startTransition(() => {
      router.push("/admin/users");
    });
    setShowMobileFilters(false);
  };

  const hasActiveFilters = currentSearch || currentRole || currentStatus;

  return (
    <div className="bg-white p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200 shadow-xs sm:shadow-sm space-y-3 sm:space-y-4">
      {/* Mobile Filter Toggle */}
      <div className="flex items-center justify-between lg:hidden">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
            showMobileFilters || hasActiveFilters
              ? "bg-indigo-600 text-white shadow-md"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters {hasActiveFilters && "•"}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-10 py-2.5 sm:py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isPending && (
              <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
            )}
            {searchInput && !isPending && (
              <button
                onClick={() => setSearchInput("")}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Clear Button */}
        {(currentSearch || currentRole || currentStatus) && (
          <button
            type="button"
            onClick={clearFilters}
            className="hidden lg:flex items-center gap-2 px-4 py-2.5 sm:py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Filters - Desktop */}
      <div className="hidden lg:flex flex-wrap items-center gap-3">
        {/* Role Filters */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
            Role:
          </span>
          <div className="flex items-center gap-1">
            {[
              {
                value: "",
                label: "All",
                icon: User,
                bg: "bg-slate-100",
                activeBg: "bg-slate-900",
                text: "text-slate-600",
                activeText: "text-white",
              },
              {
                value: "CLIENT",
                label: "Clients",
                icon: User,
                bg: "bg-blue-50",
                activeBg: "bg-blue-600",
                text: "text-blue-700",
                activeText: "text-white",
              },
              {
                value: "PROVIDER",
                label: "Providers",
                icon: UserCheck,
                bg: "bg-purple-50",
                activeBg: "bg-purple-600",
                text: "text-purple-700",
                activeText: "text-white",
              },
            ].map((filter) => {
              const Icon = filter.icon;
              const isActive = currentRole === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => handleRoleFilter(filter.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? `${filter.activeBg} ${filter.activeText} shadow-md ring-2 ring-opacity-20 ring-offset-1`
                      : `${filter.bg} ${filter.text} hover:opacity-80`
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-6 w-px bg-slate-300" />

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
            Status:
          </span>
          <div className="flex items-center gap-1">
            {[
              {
                value: "",
                label: "All",
                icon: User,
                bg: "bg-slate-100",
                activeBg: "bg-slate-900",
                text: "text-slate-600",
                activeText: "text-white",
              },
              {
                value: "PENDING",
                label: "Pending",
                icon: Clock,
                bg: "bg-amber-50",
                activeBg: "bg-amber-600",
                text: "text-amber-700",
                activeText: "text-white",
              },
              {
                value: "VERIFIED",
                label: "Verified",
                icon: Shield,
                bg: "bg-emerald-50",
                activeBg: "bg-emerald-600",
                text: "text-emerald-700",
                activeText: "text-white",
              },
              {
                value: "BANNED",
                label: "Banned",
                icon: Ban,
                bg: "bg-red-50",
                activeBg: "bg-red-600",
                text: "text-red-700",
                activeText: "text-white",
              },
            ].map((filter) => {
              const Icon = filter.icon;
              const isActive = currentStatus === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => handleStatusFilter(filter.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? `${filter.activeBg} ${filter.activeText} shadow-md ring-2 ring-opacity-20 ring-offset-1`
                      : `${filter.bg} ${filter.text} hover:opacity-80`
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters - Mobile */}
      <div
        className={`lg:hidden space-y-4 ${
          showMobileFilters ? "block" : "hidden"
        }`}
      >
        {/* Role Filters */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4" />
            Role
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                value: "",
                label: "All Users",
                bg: "bg-slate-100",
                activeBg: "bg-slate-900",
                text: "text-slate-600",
                activeText: "text-white",
              },
              {
                value: "CLIENT",
                label: "Clients",
                bg: "bg-blue-50",
                activeBg: "bg-blue-600",
                text: "text-blue-700",
                activeText: "text-white",
              },
              {
                value: "PROVIDER",
                label: "Providers",
                bg: "bg-purple-50",
                activeBg: "bg-purple-600",
                text: "text-purple-700",
                activeText: "text-white",
              },
            ].map((filter) => {
              const isActive = currentRole === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => handleRoleFilter(filter.value)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? `${filter.activeBg} ${filter.activeText} shadow-md`
                      : `${filter.bg} ${filter.text} hover:opacity-80`
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filters */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                value: "",
                label: "All Status",
                bg: "bg-slate-100",
                activeBg: "bg-slate-900",
                text: "text-slate-600",
                activeText: "text-white",
              },
              {
                value: "PENDING",
                label: "Pending",
                bg: "bg-amber-50",
                activeBg: "bg-amber-600",
                text: "text-amber-700",
                activeText: "text-white",
              },
              {
                value: "VERIFIED",
                label: "Verified",
                bg: "bg-emerald-50",
                activeBg: "bg-emerald-600",
                text: "text-emerald-700",
                activeText: "text-white",
              },
              {
                value: "BANNED",
                label: "Banned",
                bg: "bg-red-50",
                activeBg: "bg-red-600",
                text: "text-red-700",
                activeText: "text-white",
              },
            ].map((filter) => {
              const isActive = currentStatus === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => handleStatusFilter(filter.value)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? `${filter.activeBg} ${filter.activeText} shadow-md`
                      : `${filter.bg} ${filter.text} hover:opacity-80`
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Apply Button */}
        <button
          onClick={() => setShowMobileFilters(false)}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors"
        >
          Apply Filters
        </button>
      </div>

      {/* Active Filters Indicator - Mobile */}
      {(currentRole || currentStatus) && (
        <div className="lg:hidden flex flex-wrap gap-1.5">
          {currentRole && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              Role: {currentRole === "CLIENT" ? "Clients" : "Providers"}
              <button
                onClick={() => handleRoleFilter("")}
                className="hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {currentStatus && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
              Status: {currentStatus.toLowerCase()}
              <button
                onClick={() => handleStatusFilter("")}
                className="hover:text-amber-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
