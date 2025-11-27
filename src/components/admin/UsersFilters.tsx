'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';

interface UsersFiltersProps {
  currentRole: string;
  currentStatus: string;
  currentSearch: string;
}

export default function UsersFilters({ currentRole, currentStatus, currentSearch }: UsersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [isPending, startTransition] = useTransition();

  // Debounced search - triggers filtering automatically after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput.trim()) {
        params.set('search', searchInput.trim());
      } else {
        params.delete('search');
      }
      params.delete('page'); // Reset to page 1
      
      // Only update if search value changed
      if (searchInput.trim() !== currentSearch) {
        startTransition(() => {
          router.push(`/admin/users?${params.toString()}`);
        });
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleRoleFilter = (role: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (role) {
      params.set('role', role);
    } else {
      params.delete('role');
    }
    params.delete('page'); // Reset to page 1
    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`);
    });
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    params.delete('page'); // Reset to page 1
    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    startTransition(() => {
      router.push('/admin/users');
    });
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
            search
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email... (realtime)"
            className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isPending && (
              <div className="w-4 h-4 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
            )}
            {searchInput && !isPending && (
              <button
                onClick={() => setSearchInput('')}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            )}
          </div>
        </div>
        {(currentSearch || currentRole || currentStatus) && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">filter_alt_off</span>
            Clear All
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Role:</span>
          <button
            onClick={() => handleRoleFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !currentRole 
                ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-900 ring-offset-1' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleRoleFilter('CLIENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentRole === 'CLIENT' 
                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-1' 
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Clients
          </button>
          <button
            onClick={() => handleRoleFilter('PROVIDER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentRole === 'PROVIDER' 
                ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-600 ring-offset-1' 
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Providers
          </button>
        </div>

        <div className="h-8 w-px bg-slate-300" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Status:</span>
          <button
            onClick={() => handleStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !currentStatus 
                ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-900 ring-offset-1' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentStatus === 'PENDING' 
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-600 ring-offset-1' 
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => handleStatusFilter('VERIFIED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentStatus === 'VERIFIED' 
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600 ring-offset-1' 
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Verified
          </button>
          <button
            onClick={() => handleStatusFilter('BANNED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentStatus === 'BANNED' 
                ? 'bg-red-600 text-white shadow-md ring-2 ring-red-600 ring-offset-1' 
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Banned
          </button>
        </div>
      </div>
    </div>
  );
}
