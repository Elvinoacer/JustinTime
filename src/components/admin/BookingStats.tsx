"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
} from "lucide-react";

interface BookingStatsProps {
  stats: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    totalRevenue: number;
    avgBookingValue: number;
  };
}

export default function BookingStats({ stats }: BookingStatsProps) {
  const statCards = [
    {
      label: "Total Bookings",
      value: stats.total.toLocaleString(),
      icon: Calendar,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
      iconBg: "bg-blue-100",
      textColor: "text-blue-700",
    },
    {
      label: "Completed",
      value: stats.completed.toLocaleString(),
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50",
      iconBg: "bg-emerald-100",
      textColor: "text-emerald-700",
    },
    {
      label: "Pending",
      value: stats.pending.toLocaleString(),
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50",
      iconBg: "bg-amber-100",
      textColor: "text-amber-700",
    },
    {
      label: "Cancelled",
      value: stats.cancelled.toLocaleString(),
      icon: XCircle,
      gradient: "from-red-500 to-rose-500",
      bgGradient: "from-red-50 to-rose-50",
      iconBg: "bg-red-100",
      textColor: "text-red-700",
    },
    {
      label: "Total Revenue",
      value: `KES ${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      gradient: "from-violet-500 to-purple-500",
      bgGradient: "from-violet-50 to-purple-50",
      iconBg: "bg-violet-100",
      textColor: "text-violet-700",
    },
    {
      label: "Avg Booking Value",
      value: `KES ${stats.avgBookingValue.toLocaleString()}`,
      icon: TrendingUp,
      gradient: "from-indigo-500 to-blue-500",
      bgGradient: "from-indigo-50 to-blue-50",
      iconBg: "bg-indigo-100",
      textColor: "text-indigo-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-2 xs:gap-3 sm:gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative overflow-hidden rounded-lg xs:rounded-xl sm:rounded-2xl bg-gradient-to-br ${stat.bgGradient} p-3 xs:p-4 sm:p-5 lg:p-6 shadow-xs xs:shadow-sm sm:shadow-md hover:shadow-lg transition-all duration-300 group cursor-pointer border border-white/50`}
          >
            {/* Background decoration - Smaller on mobile */}
            <div
              className={`absolute top-0 right-0 w-12 h-12 xs:w-16 xs:h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br ${stat.gradient} opacity-5 rounded-full -mr-4 xs:-mr-6 sm:-mr-8 lg:-mr-12 -mt-4 xs:-mt-6 sm:-mt-8 lg:-mt-12 group-hover:scale-110 xs:group-hover:scale-125 sm:group-hover:scale-150 transition-transform duration-500`}
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
              </div>

              <div className="space-y-0.5 xs:space-y-1 sm:space-y-1">
                <p className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 group-hover:scale-102 xs:group-hover:scale-105 transition-transform duration-300 leading-tight xs:leading-normal">
                  {stat.value}
                </p>
                <p className="text-[10px] xs:text-xs sm:text-xs font-medium text-slate-600 leading-tight xs:leading-normal">
                  {stat.label}
                </p>
              </div>
            </div>

            {/* Shine effect on hover - Only on larger screens */}
            <div className="hidden xs:block absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 -translate-x-full group-hover:translate-x-full transition-all duration-1000" />
          </motion.div>
        );
      })}
    </div>
  );
}
