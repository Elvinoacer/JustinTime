'use client';

import { motion } from 'framer-motion';
import { Headphones, AlertCircle, Clock, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';

interface SupportStatsProps {
  stats: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    urgent: number;
    avgResponseTime: number; // in hours
  };
}

export default function SupportStats({ stats }: SupportStatsProps) {
  const statCards = [
    {
      label: 'Total Tickets',
      value: stats.total.toLocaleString(),
      icon: Headphones,
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-indigo-50 to-purple-50',
      iconBg: 'bg-indigo-100',
      textColor: 'text-indigo-700',
    },
    {
      label: 'Open',
      value: stats.open.toLocaleString(),
      icon: AlertCircle,
      gradient: 'from-yellow-500 to-amber-500',
      bgGradient: 'from-yellow-50 to-amber-50',
      iconBg: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      pulse: stats.open > 0,
    },
    {
      label: 'In Progress',
      value: stats.inProgress.toLocaleString(),
      icon: Clock,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      iconBg: 'bg-blue-100',
      textColor: 'text-blue-700',
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
      label: 'Urgent',
      value: stats.urgent.toLocaleString(),
      icon: AlertTriangle,
      gradient: 'from-red-500 to-rose-500',
      bgGradient: 'from-red-50 to-rose-50',
      iconBg: 'bg-red-100',
      textColor: 'text-red-700',
      pulse: stats.urgent > 0,
    },
    {
      label: 'Avg Response Time',
      value: `${stats.avgResponseTime}h`,
      icon: Zap,
      gradient: 'from-violet-500 to-purple-500',
      bgGradient: 'from-violet-50 to-purple-50',
      iconBg: 'bg-violet-100',
      textColor: 'text-violet-700',
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
