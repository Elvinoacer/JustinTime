'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, XCircle, Clock, TrendingDown, Scale } from 'lucide-react';

interface DisputeStatsProps {
  stats: {
    total: number;
    open: number;
    resolved: number;
    closed: number;
    resolutionRate: number;
    avgResolutionTime: number; // in days
  };
}

export default function DisputeStats({ stats }: DisputeStatsProps) {
  const statCards = [
    {
      label: 'Total Disputes',
      value: stats.total.toLocaleString(),
      icon: Scale,
      gradient: 'from-red-500 to-rose-500',
      bgGradient: 'from-red-50 to-rose-50',
      iconBg: 'bg-red-100',
      textColor: 'text-red-700',
    },
    {
      label: 'Open Cases',
      value: stats.open.toLocaleString(),
      icon: AlertTriangle,
      gradient: 'from-orange-500 to-amber-500',
      bgGradient: 'from-orange-50 to-amber-50',
      iconBg: 'bg-orange-100',
      textColor: 'text-orange-700',
      pulse: stats.open > 0,
    },
    {
      label: 'Resolved',
      value: stats.resolved.toLocaleString(),
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
      iconBg: 'bg-emerald-100',
      textColor: 'text-emerald-700',
    },
    {
      label: 'Closed',
      value: stats.closed.toLocaleString(),
      icon: XCircle,
      gradient: 'from-slate-500 to-gray-500',
      bgGradient: 'from-slate-50 to-gray-50',
      iconBg: 'bg-slate-100',
      textColor: 'text-slate-700',
    },
    {
      label: 'Resolution Rate',
      value: `${stats.resolutionRate}%`,
      icon: TrendingDown,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      iconBg: 'bg-blue-100',
      textColor: 'text-blue-700',
    },
    {
      label: 'Avg Resolution Time',
      value: `${stats.avgResolutionTime}d`,
      icon: Clock,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50',
      iconBg: 'bg-purple-100',
      textColor: 'text-purple-700',
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
              </div>
              
              <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-900 group-hover:scale-105 transition-transform duration-300">
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
