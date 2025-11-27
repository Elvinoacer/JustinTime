'use client';

import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Wallet, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface FinanceStatsProps {
  stats: {
    totalRevenue: number;
    totalPayments: number;
    pendingPayments: number;
    totalTransactions: number;
    totalWalletBalance: number;
    platformFee: number;
  };
}

export default function FinanceStats({ stats }: FinanceStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
      iconBg: 'bg-emerald-100',
      textColor: 'text-emerald-700',
      trend: '+12.5%',
      trendUp: true,
    },
    {
      label: 'Platform Fees',
      value: formatCurrency(stats.platformFee),
      icon: TrendingUp,
      gradient: 'from-blue-500 to-indigo-500',
      bgGradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-blue-100',
      textColor: 'text-blue-700',
      trend: '+8.2%',
      trendUp: true,
    },
    {
      label: 'Wallet Balances',
      value: formatCurrency(stats.totalWalletBalance),
      icon: Wallet,
      gradient: 'from-violet-500 to-purple-500',
      bgGradient: 'from-violet-50 to-purple-50',
      iconBg: 'bg-violet-100',
      textColor: 'text-violet-700',
    },
    {
      label: 'Total Payments',
      value: formatCurrency(stats.totalPayments),
      icon: CreditCard,
      gradient: 'from-orange-500 to-amber-500',
      bgGradient: 'from-orange-50 to-amber-50',
      iconBg: 'bg-orange-100',
      textColor: 'text-orange-700',
    },
    {
      label: 'Pending Payments',
      value: stats.pendingPayments.toLocaleString(),
      icon: Activity,
      gradient: 'from-rose-500 to-red-500',
      bgGradient: 'from-rose-50 to-red-50',
      iconBg: 'bg-rose-100',
      textColor: 'text-rose-700',
      pulse: stats.pendingPayments > 0,
    },
    {
      label: 'Total Transactions',
      value: stats.totalTransactions.toLocaleString(),
      icon: ArrowUpRight,
      gradient: 'from-cyan-500 to-sky-500',
      bgGradient: 'from-cyan-50 to-sky-50',
      iconBg: 'bg-cyan-100',
      textColor: 'text-cyan-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.bgGradient} p-6 shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer border border-white/50 ${
              stat.pulse ? 'animate-pulse' : ''
            }`}
          >
            {/* Background decoration */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500`} />
            
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className={`${stat.iconBg} p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
                {stat.trend && (
                  <div className={`flex items-center gap-1 text-xs font-bold ${stat.trendUp ? 'text-emerald-600' : 'text-red-600'} bg-white/50 px-2 py-1 rounded-full`}>
                    {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.trend}
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-xl font-bold text-slate-900 group-hover:scale-105 transition-transform duration-300 truncate">
                  {stat.value}
                </p>
                <p className="text-xs font-medium text-slate-600">
                  {stat.label}
                </p>
              </div>
            </div>

            {/* Shine effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 -translate-x-full group-hover:translate-x-full transition-all duration-1000" />
          </motion.div>
        );
      })}
    </div>
  );
}
