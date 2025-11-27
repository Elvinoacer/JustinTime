'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DisputeStats from '@/components/admin/DisputeStats';
import DisputeFiltersBar, { type DisputeFilters } from '@/components/admin/DisputeFiltersBar';
import EnhancedDisputesTable from '@/components/admin/DisputesTable';
import { Loader2 } from 'lucide-react';

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
  
  const [filters, setFilters] = useState<DisputeFilters>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'ALL',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    creatorRole: searchParams.get('creatorRole') || 'ALL',
  });

  const handleApplyFilters = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.creatorRole && filters.creatorRole !== 'ALL') params.set('creatorRole', filters.creatorRole);
    
    router.push(`/admin/disputes?${params.toString()}`);
  };

  useEffect(() => {
    setIsLoading(false);
  }, [initialData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/30 to-orange-50/20">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Disputes Management
            </h1>
            <p className="text-slate-600">
              Review and resolve platform disputes efficiently
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <DisputeStats stats={initialData.stats} />

        {/* Filters */}
        <DisputeFiltersBar
          filters={filters}
          onFilterChange={setFilters}
          onApply={handleApplyFilters}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-6 shadow-2xl flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
              <p className="font-medium text-slate-900">Loading disputes...</p>
            </div>
          </div>
        )}

        {/* Disputes Table */}
        <EnhancedDisputesTable
          disputes={initialData.disputes}
          total={initialData.total}
          currentPage={initialData.currentPage}
          totalPages={initialData.totalPages}
        />
      </div>
    </div>
  );
}
