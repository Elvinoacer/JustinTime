'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BookingStats from '@/components/admin/BookingStats';
import BookingFiltersBar, { type BookingFilters } from '@/components/admin/BookingFiltersBar';
import EnhancedBookingsTable from '@/components/admin/BookingsTable';
import { Loader2 } from 'lucide-react';

interface BookingsClientProps {
  initialData: {
    bookings: any[];
    total: number;
    currentPage: number;
    totalPages: number;
    stats: {
      total: number;
      pending: number;
      confirmed: number;
      completed: number;
      cancelled: number;
      totalRevenue: number;
      avgBookingValue: number;
    };
  };
}

export default function BookingsClient({ initialData }: BookingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  
  const [filters, setFilters] = useState<BookingFilters>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'ALL',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    minAmount: searchParams.get('minAmount') || '',
    maxAmount: searchParams.get('maxAmount') || '',
  });

  const handleApplyFilters = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.minAmount) params.set('minAmount', filters.minAmount);
    if (filters.maxAmount) params.set('maxAmount', filters.maxAmount);
    
    router.push(`/admin/bookings?${params.toString()}`);
  };

  useEffect(() => {
    setIsLoading(false);
  }, [initialData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Bookings Management
            </h1>
            <p className="text-slate-600">
              Monitor and manage all platform bookings in real-time
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <BookingStats stats={initialData.stats} />

        {/* Filters */}
        <BookingFiltersBar
          filters={filters}
          onFilterChange={setFilters}
          onApply={handleApplyFilters}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-6 shadow-2xl flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <p className="font-medium text-slate-900">Loading bookings...</p>
            </div>
          </div>
        )}

        {/* Bookings Table */}
        <EnhancedBookingsTable
          bookings={initialData.bookings}
          total={initialData.total}
          currentPage={initialData.currentPage}
          totalPages={initialData.totalPages}
        />
      </div>
    </div>
  );
}
