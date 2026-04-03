"use client";

import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface FinanceStatsProps {
  stats: {
    totalRevenue: number;
    totalPayments: number;
    pendingPayments: number;
    totalTransactions: number;
    totalWalletBalance: number;
    platformFee: number;
    totalInvoices?: number;
    failedInvoices?: number;
    pendingInvoiceSubmissions?: number;
    taxCoverage?: number;
  };
}

export default function FinanceStats({ stats }: FinanceStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const statCards = [
    {
      label: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      compactValue: `KES ${formatCompactNumber(stats.totalRevenue)}`,
      icon: DollarSign,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50",
      iconBg: "bg-emerald-100",
      textColor: "text-emerald-700",
      trend: "+12.5%",
      trendUp: true,
    },
    {
      label: "Platform Fees",
      value: formatCurrency(stats.platformFee),
      compactValue: `KES ${formatCompactNumber(stats.platformFee)}`,
      icon: TrendingUp,
      gradient: "from-blue-500 to-indigo-500",
      bgGradient: "from-blue-50 to-indigo-50",
      iconBg: "bg-blue-100",
      textColor: "text-blue-700",
      trend: "+8.2%",
      trendUp: true,
    },
    {
      label: "Wallet Balances",
      value: formatCurrency(stats.totalWalletBalance),
      compactValue: `KES ${formatCompactNumber(stats.totalWalletBalance)}`,
      icon: Wallet,
      gradient: "from-violet-500 to-purple-500",
      bgGradient: "from-violet-50 to-purple-50",
      iconBg: "bg-violet-100",
      textColor: "text-violet-700",
    },
    {
      label: "Total Payments",
      value: formatCurrency(stats.totalPayments),
      compactValue: `KES ${formatCompactNumber(stats.totalPayments)}`,
      icon: CreditCard,
      gradient: "from-orange-500 to-amber-500",
      bgGradient: "from-orange-50 to-amber-50",
      iconBg: "bg-orange-100",
      textColor: "text-orange-700",
    },
    {
      label: "Pending Payments",
      value: stats.pendingPayments.toLocaleString(),
      compactValue: formatCompactNumber(stats.pendingPayments),
      icon: Activity,
      gradient: "from-rose-500 to-red-500",
      bgGradient: "from-rose-50 to-red-50",
      iconBg: "bg-rose-100",
      textColor: "text-rose-700",
      pulse: stats.pendingPayments > 0,
    },
    {
      label: "Total Transactions",
      value: stats.totalTransactions.toLocaleString(),
      compactValue: formatCompactNumber(stats.totalTransactions),
      icon: ArrowUpRight,
      gradient: "from-cyan-500 to-sky-500",
      bgGradient: "from-cyan-50 to-sky-50",
      iconBg: "bg-cyan-100",
      textColor: "text-cyan-700",
    },
    {
      label: "Failed eTIMS",
      value: (stats.failedInvoices || 0).toLocaleString(),
      compactValue: formatCompactNumber(stats.failedInvoices || 0),
      icon: Activity,
      gradient: "from-red-500 to-rose-500",
      bgGradient: "from-red-50 to-rose-50",
      iconBg: "bg-red-100",
      textColor: "text-red-700",
      pulse: (stats.failedInvoices || 0) > 0,
    },
    {
      label: "Pending eTIMS",
      value: (stats.pendingInvoiceSubmissions || 0).toLocaleString(),
      compactValue: formatCompactNumber(stats.pendingInvoiceSubmissions || 0),
      icon: CreditCard,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50",
      iconBg: "bg-amber-100",
      textColor: "text-amber-700",
      pulse: (stats.pendingInvoiceSubmissions || 0) > 0,
    },
    {
      label: "KRA Coverage",
      value: `${Math.round(stats.taxCoverage || 0)}%`,
      compactValue: `${Math.round(stats.taxCoverage || 0)}%`,
      icon: TrendingUp,
      gradient: "from-teal-500 to-emerald-500",
      bgGradient: "from-teal-50 to-emerald-50",
      iconBg: "bg-teal-100",
      textColor: "text-teal-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 xs:gap-3 sm:gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative overflow-hidden rounded-lg xs:rounded-xl sm:rounded-2xl bg-linear-to-br ${
              stat.bgGradient
            } p-3 xs:p-4 sm:p-5 lg:p-6 shadow-xs xs:shadow-sm sm:shadow-md hover:shadow-lg transition-all duration-300 group cursor-pointer border border-white/50 ${
              stat.pulse ? "animate-pulse" : ""
            }`}
          >
            {/* Background decoration - Smaller on mobile */}
            <div
              className={`absolute top-0 right-0 w-12 h-12 xs:w-16 xs:h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-linear-to-br ${stat.gradient} opacity-5 rounded-full -mr-4 xs:-mr-6 sm:-mr-8 lg:-mr-12 -mt-4 xs:-mt-6 sm:-mt-8 lg:-mt-12 group-hover:scale-110 xs:group-hover:scale-125 sm:group-hover:scale-150 transition-transform duration-500`}
            />

            <div className="relative">
              <div className="flex items-start justify-between mb-2 xs:mb-3 sm:mb-3 lg:mb-3">
                <div
                  className={`${stat.iconBg} p-1.5 xs:p-2 sm:p-2.5 rounded-lg xs:rounded-xl group-hover:scale-105 xs:group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon
                    className={`w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 ${stat.textColor}`}
                  />
                </div>
                {stat.trend && (
                  <div
                    className={`hidden xs:flex items-center gap-1 text-[10px] xs:text-xs font-bold ${
                      stat.trendUp ? "text-emerald-600" : "text-red-600"
                    } bg-white/50 px-1.5 xs:px-2 py-0.5 xs:py-1 rounded-full shrink-0`}
                  >
                    {stat.trendUp ? (
                      <ArrowUpRight className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                    ) : (
                      <ArrowDownRight className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                    )}
                    {stat.trend}
                  </div>
                )}
              </div>

              <div className="space-y-0.5 xs:space-y-1 sm:space-y-1">
                {/* Full value on larger screens, compact on mobile */}
                <p className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 group-hover:scale-102 xs:group-hover:scale-105 transition-transform duration-300 leading-tight xs:leading-normal truncate">
                  <span className="hidden xs:inline">{stat.value}</span>
                  <span className="xs:hidden">{stat.compactValue}</span>
                </p>
                <p className="text-[10px] xs:text-xs sm:text-xs font-medium text-slate-600 leading-tight xs:leading-normal">
                  {stat.label}
                </p>
              </div>

              {/* Mobile trend indicator */}
              {stat.trend && (
                <div className="xs:hidden flex items-center gap-0.5 mt-1">
                  <span
                    className={`text-[10px] font-bold ${
                      stat.trendUp ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {stat.trend}
                  </span>
                  {stat.trendUp ? (
                    <ArrowUpRight className="w-2.5 h-2.5 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="w-2.5 h-2.5 text-red-600" />
                  )}
                </div>
              )}
            </div>

            {/* Shine effect on hover - Only on larger screens */}
            <div className="hidden xs:block absolute inset-0 bg-linear-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 -translate-x-full group-hover:translate-x-full transition-all duration-1000" />
          </motion.div>
        );
      })}
    </div>
  );
}
