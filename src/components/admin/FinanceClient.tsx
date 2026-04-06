"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FinanceStats from "@/components/admin/FinanceStats";
import FinanceFiltersBar, {
  type FinanceFilters,
} from "@/components/admin/FinanceFiltersBar";
import EnhancedTransactionsTable from "@/components/admin/EnhancedTransactionsTable";
import EnhancedWalletsTable from "@/components/admin/EnhancedWalletsTable";
import {
  Loader2,
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";

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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [filters, setFilters] = useState<FinanceFilters>({
    search: searchParams.get("search") || "",
    type: searchParams.get("type") || "ALL",
    status: searchParams.get("status") || "ALL",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    minAmount: searchParams.get("minAmount") || "",
    maxAmount: searchParams.get("maxAmount") || "",
  });

  const handleApplyFilters = () => {
    setIsLoading(true);
    const params = new URLSearchParams();

    params.set("tab", activeTab);

    if (filters.search) params.set("search", filters.search);

    if (activeTab === "transactions") {
      if (filters.type && filters.type !== "ALL") {
        params.set("type", filters.type);
      }
      if (filters.status && filters.status !== "ALL") {
        params.set("status", filters.status);
      }
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.minAmount) params.set("minAmount", filters.minAmount);
      if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);
    }

    router.push(`/admin/finance?${params.toString()}`);
    setIsFiltersOpen(false);
  };

  const handleExportOverviewData = () => {
    const summary = initialData.summary;
    const rows = [
      ["Metric", "Value"],
      ["Total Revenue", String(summary.totalRevenue ?? 0)],
      ["Total Payments", String(summary.totalPayments ?? 0)],
      ["Pending Payments", String(summary.pendingPayments ?? 0)],
      ["Platform Fee", String(summary.platformFee ?? 0)],
      ["Platform Fee Percentage", String(summary.platformFeePercentage ?? 0)],
      ["Total Wallet Balance", String(summary.totalWalletBalance ?? 0)],
      [
        "Completed without Invoice",
        String(summary.reconciliation?.completedWithoutInvoice ?? 0),
      ],
      [
        "Invoice without Completion",
        String(summary.reconciliation?.invoiceWithoutCompletedBooking ?? 0),
      ],
      [
        "Paid without Invoice",
        String(summary.reconciliation?.completedPaymentWithoutInvoice ?? 0),
      ],
      [
        "Failed eTIMS + Paid",
        String(summary.reconciliation?.failedEtimsWithCompletedPayment ?? 0),
      ],
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance-overview-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleTabChange = (tab: string) => {
    setIsLoading(true);
    setActiveTab(tab);

    // Clear filters when switching tabs, but keep the tab param
    const params = new URLSearchParams();
    params.set("tab", tab);

    // Reset local filters state
    setFilters({
      search: "",
      type: "ALL",
      status: "ALL",
      dateFrom: "",
      dateTo: "",
      minAmount: "",
      maxAmount: "",
    });

    router.push(`/admin/finance?${params.toString()}`);
    setIsFiltersOpen(false);
  };

  useEffect(() => {
    setIsLoading(false);
    setActiveTab(initialData.activeTab);
  }, [initialData]);

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      shortLabel: "Overview",
    },
    {
      id: "transactions",
      label: "Transactions",
      icon: ArrowRightLeft,
      shortLabel: "Transactions",
    },
    { id: "wallets", label: "Wallets", icon: Wallet, shortLabel: "Wallets" },
  ];

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
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
      <div className="max-w-400 mx-auto p-3 xs:p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2 leading-tight">
              Finance Management
            </h1>
            <p className="text-xs xs:text-sm sm:text-base text-slate-600 leading-relaxed">
              Monitor revenue, transactions, and wallet balances
            </p>
          </div>

          {/* Mobile Filters Toggle */}
          {activeTab !== "overview" && (
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="filters-toggle lg:hidden bg-white border border-slate-300 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200 self-start xs:self-auto"
            >
              <span className="text-sm font-medium">Filters</span>
            </button>
          )}
        </div>

        {/* Tabs - Mobile Optimized */}
        <div className="flex bg-white p-1 rounded-lg sm:rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center gap-1.5 xs:gap-2 px-3 xs:px-4 sm:px-6 py-2 xs:py-2.5 text-xs xs:text-sm font-medium rounded-md sm:rounded-lg transition-all duration-200 shrink-0 min-w-0 ${
                  isActive
                    ? "text-emerald-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-emerald-50 rounded-md sm:rounded-lg border border-emerald-100 shadow-sm"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5 xs:gap-2">
                  <Icon
                    className={`w-3.5 h-3.5 xs:w-4 xs:h-4 ${
                      isActive ? "text-emerald-600" : "text-slate-400"
                    }`}
                  />
                  <span className="hidden xs:inline">{tab.label}</span>
                  <span className="xs:hidden">{tab.shortLabel}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Stats Cards */}
        {activeTab === "overview" && (
          <div className="px-1">
            <FinanceStats stats={initialData.summary} />
          </div>
        )}

        {/* Filters - Mobile Overlay / Desktop Inline */}
        {activeTab !== "overview" && (
          <div
            className={`filters-container ${
              isFiltersOpen
                ? "fixed inset-0 z-50 bg-white p-4 sm:p-6 overflow-y-auto lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:p-0"
                : "hidden lg:block"
            }`}
          >
            <div className="lg:hidden flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Finance Filters
              </h2>
              <button
                onClick={() => setIsFiltersOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Loader2 className="w-5 h-5" />
              </button>
            </div>

            <FinanceFiltersBar
              filters={filters}
              onFilterChange={setFilters}
              onApply={handleApplyFilters}
              activeTab={activeTab}
              isMobile={isFiltersOpen}
            />

            {/* Mobile Apply Button */}
            <div className="lg:hidden flex gap-3 mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={handleApplyFilters}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-lg font-semibold text-base transition-colors shadow-lg shadow-emerald-200"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl flex items-center gap-3 max-w-xs sm:max-w-sm w-full">
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 animate-spin shrink-0" />
              <p className="font-medium text-slate-900 text-sm sm:text-base">
                Loading data...
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="space-y-4 sm:space-y-6">
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Recent Transactions Card */}
                <div className="bg-white p-4 xs:p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="text-base xs:text-lg font-bold text-slate-900 mb-3 sm:mb-4">
                    Recent Transactions
                  </h3>
                  {initialData.summary.recentTransactions?.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {initialData.summary.recentTransactions
                        .slice(0, 5)
                        .map((t: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg sm:rounded-xl"
                          >
                            <div className="flex items-center gap-2 xs:gap-3 min-w-0 flex-1">
                              <div
                                className={`p-1.5 xs:p-2 rounded-lg shrink-0 ${
                                  t.type === "DEPOSIT"
                                    ? "bg-emerald-100 text-emerald-600"
                                    : t.type === "WITHDRAWAL"
                                      ? "bg-red-100 text-red-600"
                                      : "bg-blue-100 text-blue-600"
                                }`}
                              >
                                {t.type === "DEPOSIT" ? (
                                  <ArrowDownRight className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                                ) : t.type === "WITHDRAWAL" ? (
                                  <ArrowUpRight className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                                ) : (
                                  <ArrowRightLeft className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {t.type}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(t.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-slate-900 text-sm xs:text-base whitespace-nowrap ml-2">
                              {new Intl.NumberFormat("en-KE", {
                                style: "currency",
                                currency: "KES",
                              }).format(t.amount)}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm text-center py-4">
                      No recent transactions
                    </p>
                  )}

                  {/* View All Button */}
                  <button
                    onClick={() => handleTabChange("transactions")}
                    className="w-full mt-4 py-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    View All Transactions
                  </button>
                </div>

                {/* Quick Stats Card */}
                <div className="bg-white p-4 xs:p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="text-base xs:text-lg font-bold text-slate-900 mb-3 sm:mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                      onClick={() => handleTabChange("wallets")}
                      className="p-3 xs:p-4 bg-emerald-50 rounded-lg sm:rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors text-center"
                    >
                      <Wallet className="w-5 h-5 xs:w-6 xs:h-6 text-emerald-600 mx-auto mb-2" />
                      <p className="text-xs xs:text-sm font-medium text-emerald-700">
                        Wallet Balances
                      </p>
                    </button>
                    <button
                      onClick={() => handleTabChange("transactions")}
                      className="p-3 xs:p-4 bg-blue-50 rounded-lg sm:rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors text-center"
                    >
                      <ArrowRightLeft className="w-5 h-5 xs:w-6 xs:h-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-xs xs:text-sm font-medium text-blue-700">
                        All Transactions
                      </p>
                    </button>
                    <button
                      onClick={() => router.push("/admin/logs?access=FINANCE")}
                      className="p-3 xs:p-4 bg-purple-50 rounded-lg sm:rounded-xl border border-purple-100 hover:bg-purple-100 transition-colors text-center"
                    >
                      <LayoutDashboard className="w-5 h-5 xs:w-6 xs:h-6 text-purple-600 mx-auto mb-2" />
                      <p className="text-xs xs:text-sm font-medium text-purple-700">
                        Reports
                      </p>
                    </button>
                    <button
                      onClick={handleExportOverviewData}
                      className="p-3 xs:p-4 bg-orange-50 rounded-lg sm:rounded-xl border border-orange-100 hover:bg-orange-100 transition-colors text-center"
                    >
                      <ArrowUpRight className="w-5 h-5 xs:w-6 xs:h-6 text-orange-600 mx-auto mb-2" />
                      <p className="text-xs xs:text-sm font-medium text-orange-700">
                        Export Data
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 xs:p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-base xs:text-lg font-bold text-slate-900 mb-3 sm:mb-4">
                  Reconciliation Alerts
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Completed without Invoice",
                      value:
                        initialData.summary.reconciliation
                          ?.completedWithoutInvoice ?? 0,
                    },
                    {
                      label: "Invoice without Completion",
                      value:
                        initialData.summary.reconciliation
                          ?.invoiceWithoutCompletedBooking ?? 0,
                    },
                    {
                      label: "Paid without Invoice",
                      value:
                        initialData.summary.reconciliation
                          ?.completedPaymentWithoutInvoice ?? 0,
                    },
                    {
                      label: "Failed eTIMS + Paid",
                      value:
                        initialData.summary.reconciliation
                          ?.failedEtimsWithCompletedPayment ?? 0,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="text-xs text-slate-600">{item.label}</p>
                      <p
                        className={`mt-1 text-xl font-bold ${
                          item.value > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "transactions" && initialData.transactions && (
            <div className="px-1">
              <EnhancedTransactionsTable
                transactions={initialData.transactions.transactions}
                total={initialData.transactions.total}
                currentPage={initialData.transactions.currentPage}
                totalPages={initialData.transactions.totalPages}
              />
            </div>
          )}

          {activeTab === "wallets" && initialData.wallets && (
            <div className="px-1">
              <EnhancedWalletsTable
                wallets={initialData.wallets.wallets}
                total={initialData.wallets.total}
                currentPage={initialData.wallets.currentPage}
                totalPages={initialData.wallets.totalPages}
              />
            </div>
          )}
        </div>

        {/* Mobile Filters Backdrop */}
        {isFiltersOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/10 z-40" />
        )}
      </div>
    </div>
  );
}
