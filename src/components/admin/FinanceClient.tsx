'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FinanceStats from '@/components/admin/FinanceStats';
import FinanceFiltersBar, { type FinanceFilters } from '@/components/admin/FinanceFiltersBar';
import EnhancedTransactionsTable from '@/components/admin/EnhancedTransactionsTable';
import EnhancedWalletsTable from '@/components/admin/EnhancedWalletsTable';
import { Loader2, LayoutDashboard, ArrowRightLeft, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

interface FinanceClientProps {
  initialData: {
    summary: any;
    transactions: any;
    wallets: any;
    activeTab: string;
  };
}

export default function FinanceClient({ initialData }: FinanceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialData.activeTab);
  
  const [filters, setFilters] = useState<FinanceFilters>({
    search: searchParams.get('search') || '',
    type: searchParams.get('type') || 'ALL',
    status: searchParams.get('status') || 'ALL',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    minAmount: searchParams.get('minAmount') || '',
    maxAmount: searchParams.get('maxAmount') || '',
  });

  const handleApplyFilters = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    
    params.set('tab', activeTab);
    
    if (filters.search) params.set('search', filters.search);
    if (filters.type && filters.type !== 'ALL') params.set('type', filters.type);
    if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.minAmount) params.set('minAmount', filters.minAmount);
    if (filters.maxAmount) params.set('maxAmount', filters.maxAmount);
    
    router.push(`/admin/finance?${params.toString()}`);
  };

  const handleTabChange = (tab: string) => {
    setIsLoading(true);
    setActiveTab(tab);
    
    // Clear filters when switching tabs, but keep the tab param
    const params = new URLSearchParams();
    params.set('tab', tab);
    
    // Reset local filters state
    setFilters({
      search: '',
      type: 'ALL',
      status: 'ALL',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
    });

    router.push(`/admin/finance?${params.toString()}`);
  };

  useEffect(() => {
    setIsLoading(false);
    setActiveTab(initialData.activeTab);
  }, [initialData]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
    { id: 'wallets', label: 'Wallets', icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Finance Management
            </h1>
            <p className="text-slate-600">
              Monitor revenue, transactions, and wallet balances
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white p-1 rounded-xl border border-slate-200 w-fit shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'text-emerald-700' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-emerald-50 rounded-lg border border-emerald-100 shadow-sm"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stats Cards (Always visible or only on overview? Let's keep them on overview for now, or maybe small summary on others) */}
        {activeTab === 'overview' && (
          <FinanceStats stats={initialData.summary} />
        )}

        {/* Filters */}
        {activeTab !== 'overview' && (
          <FinanceFiltersBar
            filters={filters}
            onFilterChange={setFilters}
            onApply={handleApplyFilters}
            activeTab={activeTab}
          />
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-6 shadow-2xl flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              <p className="font-medium text-slate-900">Loading data...</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* We can add charts here later */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Transactions</h3>
                {initialData.summary.recentTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {initialData.summary.recentTransactions.map((t: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            t.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-600' :
                            t.type === 'WITHDRAWAL' ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {t.type === 'DEPOSIT' ? <ArrowDownRight className="w-4 h-4" /> :
                             t.type === 'WITHDRAWAL' ? <ArrowUpRight className="w-4 h-4" /> :
                             <ArrowRightLeft className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{t.type}</p>
                            <p className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className="font-bold text-slate-900">
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No recent transactions</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'transactions' && initialData.transactions && (
            <EnhancedTransactionsTable
              transactions={initialData.transactions.transactions}
              total={initialData.transactions.total}
              currentPage={initialData.transactions.currentPage}
              totalPages={initialData.transactions.totalPages}
            />
          )}

          {activeTab === 'wallets' && initialData.wallets && (
            <EnhancedWalletsTable
              wallets={initialData.wallets.wallets}
              total={initialData.wallets.total}
              currentPage={initialData.wallets.currentPage}
              totalPages={initialData.wallets.totalPages}
            />
          )}
        </div>
      </div>
    </div>
  );
}
