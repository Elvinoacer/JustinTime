'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SupportStats from '@/components/admin/SupportStats';
import SupportFiltersBar, { type SupportFilters } from '@/components/admin/SupportFiltersBar';
import EnhancedSupportTicketsTable from '@/components/admin/SupportTicketsTable';
import { Loader2 } from 'lucide-react';

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
  
  const [filters, setFilters] = useState<SupportFilters>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'ALL',
    priority: searchParams.get('priority') || 'ALL',
    category: searchParams.get('category') || 'ALL',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  });

  const handleApplyFilters = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);
    if (filters.priority && filters.priority !== 'ALL') params.set('priority', filters.priority);
    if (filters.category && filters.category !== 'ALL') params.set('category', filters.category);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    
    router.push(`/admin/support?${params.toString()}`);
  };

  useEffect(() => {
    setIsLoading(false);
  }, [initialData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Support Center
            </h1>
            <p className="text-slate-600">
              Manage user inquiries and support tickets efficiently
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <SupportStats stats={initialData.stats} />

        {/* Filters */}
        <SupportFiltersBar
          filters={filters}
          onFilterChange={setFilters}
          onApply={handleApplyFilters}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-6 shadow-2xl flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <p className="font-medium text-slate-900">Loading tickets...</p>
            </div>
          </div>
        )}

        {/* Tickets Table */}
        <EnhancedSupportTicketsTable
          tickets={initialData.tickets}
          total={initialData.total}
          currentPage={initialData.currentPage}
          totalPages={initialData.totalPages}
        />
      </div>
    </div>
  );
}
