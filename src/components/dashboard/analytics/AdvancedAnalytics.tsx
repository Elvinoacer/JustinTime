"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Prisma } from "@/generated/prisma/client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AdvancedAnalyticsProps {
  bookings: Array<{
    status?: string;
    createdAt?: string | Date;
    clientId?: string;
    service?:
      | {
          title?: string | null;
        }
      | string
      | null;
    amount?: number | string | Prisma.Decimal | null;
    totalAmount?: number | string | Prisma.Decimal | null;
    netAmount?: number | string | Prisma.Decimal | null;
    review?: {
      rating?: number | null;
    } | null;
    rating?: number | null;
  }>;
  earnings: Array<{ amount: number; createdAt: string | Date }>;
  reviews: Array<{
    rating?: number | string | null;
  }>;
  monthlyRevenue?: Array<{
    monthKey: string;
    month: string;
    earnings: number;
    bookings: number;
  }>;
  dailyEarnings?: Array<{
    name: string;
    dayKey: string;
    earnings: number;
  }>;
  monthlyGrowthRate?: number;
  retentionRate?: number;
  customerSatisfaction?: number;
  timeDistribution?: Array<{
    time: string;
    bookings: number;
    color: string;
  }>;
  servicePerformance?: Array<{
    name: string;
    bookings: number;
    revenue: number;
    rating: number;
  }>;
  peerBenchmark?: {
    peerCount: number;
    averagePeerEarnings: number;
    averagePeerRating: number;
    earningsPercentile: number;
    ratingPercentile: number;
  };
}

const AdvancedAnalytics = ({
  bookings,
  earnings,
  reviews,
  monthlyRevenue,
  dailyEarnings,
  monthlyGrowthRate,
  retentionRate,
  customerSatisfaction,
  timeDistribution,
  servicePerformance,
  peerBenchmark,
}: AdvancedAnalyticsProps) => {
  type ActiveView = "overview" | "performance" | "growth";
  type ResolvedServicePerformanceItem = {
    name: string;
    bookings: number;
    revenue: number;
    rating: number;
    color: string;
  };

  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("overview");

  const viewTabs: Array<{ id: ActiveView; label: string; icon: string }> = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "performance", label: "Performance", icon: "trending_up" },
    { id: "growth", label: "Growth", icon: "show_chart" },
  ];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Calculate advanced metrics
  const totalEarnings = earnings.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0,
  );

  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const fallbackMonthlyRevenue = (() => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const rows = Array.from({ length: 12 }, (_, idx) => {
      const offset = 11 - idx;
      const reference = new Date(Date.UTC(year, month - offset, 15, 12, 0, 0));
      const monthKey = `${reference.getUTCFullYear()}-${String(reference.getUTCMonth() + 1).padStart(2, "0")}`;
      return {
        monthKey,
        month: reference.toLocaleDateString("en-US", {
          month: "short",
          timeZone: "Africa/Nairobi",
        }),
        earnings: 0,
        bookings: 0,
      };
    });

    const map = new Map(rows.map((row) => [row.monthKey, row]));
    for (const earning of earnings) {
      const date = new Date(earning.createdAt);
      if (Number.isNaN(date.getTime())) continue;
      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      const row = map.get(monthKey);
      if (!row) continue;
      row.earnings += Number(earning.amount || 0);
      row.bookings += 1;
    }

    return rows;
  })();

  const resolvedMonthlyRevenue =
    Array.isArray(monthlyRevenue) && monthlyRevenue.length > 0
      ? monthlyRevenue
      : fallbackMonthlyRevenue;

  const resolvedMonthlyGrowthRate =
    typeof monthlyGrowthRate === "number"
      ? monthlyGrowthRate
      : (() => {
          const current =
            resolvedMonthlyRevenue[resolvedMonthlyRevenue.length - 1]
              ?.earnings || 0;
          const previous =
            resolvedMonthlyRevenue[resolvedMonthlyRevenue.length - 2]
              ?.earnings || 0;
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / Math.abs(previous)) * 100;
        })();

  const uniqueClients = new Set(
    completedBookings
      .map((booking) => booking.clientId)
      .filter((clientId): clientId is string => Boolean(clientId)),
  );
  const returningClientsCount = (() => {
    const map = new Map<string, number>();
    for (const booking of completedBookings) {
      if (!booking.clientId) continue;
      map.set(booking.clientId, (map.get(booking.clientId) || 0) + 1);
    }
    return Array.from(map.values()).filter((count) => count > 1).length;
  })();

  const resolvedRetentionRate =
    typeof retentionRate === "number"
      ? retentionRate
      : uniqueClients.size > 0
        ? (returningClientsCount / uniqueClients.size) * 100
        : 0;

  const resolvedCustomerSatisfaction =
    typeof customerSatisfaction === "number"
      ? customerSatisfaction
      : reviews.length > 0
        ? (reviews.reduce(
            (sum, review) => sum + Number(review.rating || 0),
            0,
          ) /
            reviews.length) *
          20
        : 0;

  const resolvedRetentionData = [
    {
      name: "Returning",
      value: Math.round(resolvedRetentionRate),
      fill: "#10b981",
    },
    {
      name: "New",
      value: Math.max(0, 100 - Math.round(resolvedRetentionRate)),
      fill: "#e5e7eb",
    },
  ];

  const resolvedTimeDistribution =
    Array.isArray(timeDistribution) && timeDistribution.length > 0
      ? timeDistribution
      : [
          { time: "6-9 AM", bookings: 0, color: "#3b82f6" },
          { time: "9-12 PM", bookings: 0, color: "#8b5cf6" },
          { time: "12-3 PM", bookings: 0, color: "#f59e0b" },
          { time: "3-6 PM", bookings: 0, color: "#ef4444" },
          { time: "6-9 PM", bookings: 0, color: "#10b981" },
        ];

  const resolvedServicePerformance: ResolvedServicePerformanceItem[] =
    Array.isArray(servicePerformance) && servicePerformance.length > 0
      ? servicePerformance.map((service) => ({
          ...service,
          color: getServiceColor(service.name),
        }))
      : completedBookings
          .reduce<
            Array<
              ResolvedServicePerformanceItem & {
                ratingTotal: number;
                ratingCount: number;
              }
            >
          >((acc, booking) => {
            const serviceName =
              (typeof booking.service === "object" && booking.service
                ? booking.service.title
                : typeof booking.service === "string"
                  ? booking.service
                  : null) || "Unknown Service";
            const existing = acc.find((item) => item.name === serviceName);
            const bookingAmount = Number(
              booking.netAmount ?? booking.totalAmount ?? booking.amount ?? 0,
            );
            const bookingRating =
              typeof booking.review?.rating === "number"
                ? booking.review.rating
                : typeof booking.rating === "number"
                  ? booking.rating
                  : null;

            if (existing) {
              existing.bookings += 1;
              existing.revenue += bookingAmount;
              if (bookingRating != null) {
                existing.ratingTotal += bookingRating;
                existing.ratingCount += 1;
                existing.rating = existing.ratingTotal / existing.ratingCount;
              }
            } else {
              acc.push({
                name: serviceName,
                bookings: 1,
                revenue: bookingAmount,
                rating: bookingRating ?? 0,
                ratingTotal: bookingRating ?? 0,
                ratingCount: bookingRating != null ? 1 : 0,
                color: getServiceColor(serviceName),
              });
            }

            return acc;
          }, [])
          .map((item) => ({
            name: item.name,
            bookings: item.bookings,
            revenue: item.revenue,
            rating:
              item.ratingCount > 0
                ? item.ratingTotal / item.ratingCount
                : resolvedCustomerSatisfaction / 20,
            color: item.color,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

  const resolvedDailyEarnings =
    Array.isArray(dailyEarnings) && dailyEarnings.length > 0
      ? dailyEarnings
      : [];
  const recentSevenDayEarnings = resolvedDailyEarnings.reduce(
    (sum, row) => sum + Number(row.earnings || 0),
    0,
  );

  const averageBookingValue =
    completedBookings.length > 0 ? totalEarnings / completedBookings.length : 0;

  function getServiceColor(serviceName: string) {
    const colors = [
      "#3b82f6",
      "#8b5cf6",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#ec4899",
    ];
    const index =
      Math.abs(serviceName.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) %
      colors.length;
    return colors[index];
  }

  const advancedStats = [
    {
      name: "Monthly Growth",
      value: `${resolvedMonthlyGrowthRate.toFixed(1)}%`,
      icon: "trending_up",
      color: "from-emerald-500 to-emerald-600",
      change: resolvedMonthlyGrowthRate >= 0 ? "Uptrend" : "Downtrend",
      changeType: resolvedMonthlyGrowthRate >= 0 ? "increase" : "decrease",
    },
    {
      name: "Retention Rate",
      value: `${resolvedRetentionRate.toFixed(1)}%`,
      icon: "repeat",
      color: "from-blue-500 to-blue-600",
      change: `${returningClientsCount} repeat clients`,
      changeType: "neutral",
    },
    {
      name: "Customer Satisfaction",
      value: `${resolvedCustomerSatisfaction.toFixed(1)}%`,
      icon: "sentiment_satisfied",
      color: "from-purple-500 to-purple-600",
      change: `${reviews.length} reviews`,
      changeType: "neutral",
    },
    {
      name: "Avg. Completed Booking",
      value: `$${averageBookingValue.toFixed(0)}`,
      icon: "payments",
      color: "from-amber-500 to-amber-600",
      change: `${completedBookings.length} completed`,
      changeType: "neutral",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-2 sm:mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500 text-xl sm:text-2xl">
            workspace_premium
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Advanced Insights
          </h2>
        </div>
        <span className="px-3 py-1 bg-linear-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-sm">
          Pro Features
        </span>
      </div>

      {/* View Toggle - Mobile: Scrollable, Desktop: Normal */}
      <div className="flex overflow-x-auto hide-scrollbar pb-1">
        <div className="flex gap-1 bg-gray-100 p-0.5 sm:p-1 rounded-lg">
          {viewTabs.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap ${
                activeView === view.id
                  ? "bg-white text-emerald-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {view.icon}
              </span>
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Stats Grid */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {advancedStats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-xs hover:shadow-sm border border-gray-200 p-3 sm:p-4"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-start justify-between mb-2">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-linear-to-br ${stat.color} flex items-center justify-center shadow-xs`}
              >
                <span className="material-symbols-outlined text-white text-sm sm:text-lg">
                  {stat.icon}
                </span>
              </div>
              <span
                className={`text-[10px] xs:text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  stat.changeType === "increase"
                    ? "bg-emerald-50 text-emerald-700"
                    : stat.changeType === "decrease"
                      ? "bg-red-50 text-red-700"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {stat.change}
              </span>
            </div>
            <h3 className="text-[10px] xs:text-xs text-gray-500 font-medium mb-1">
              {stat.name}
            </h3>
            <p className="text-lg sm:text-xl font-bold text-gray-900">
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Revenue Growth Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6"
        >
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mb-4 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Revenue Growth
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                12-month revenue trend
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-500">
                Year-over-year
              </span>
              <span className="text-sm sm:text-base font-bold text-emerald-600">
                {`${resolvedMonthlyGrowthRate.toFixed(1)}%`}
              </span>
            </div>
          </div>

          {resolvedDailyEarnings.length > 0 ? (
            <p className="text-xs text-gray-500 -mt-3 mb-3">
              Last 7 days earnings: ${recentSevenDayEarnings.toLocaleString()}
            </p>
          ) : null}

          <div className="h-48 sm:h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resolvedMonthlyRevenue.slice(-6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  fontSize={isMobile ? 10 : 12}
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  fontSize={isMobile ? 10 : 12}
                  tick={{ fill: "#6b7280" }}
                  tickFormatter={(value) =>
                    `$${isMobile ? value / 1000 + "K" : value}`
                  }
                />
                <Tooltip
                  formatter={(value) => [
                    `$${Number(value).toLocaleString()}`,
                    "Revenue",
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    fontSize: isMobile ? "12px" : "14px",
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  fill="url(#colorRevenue)"
                  fillOpacity={0.3}
                  stroke="#10b981"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Growth Metrics */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              {
                label: "Last Month",
                value: `$${
                  resolvedMonthlyRevenue[
                    resolvedMonthlyRevenue.length - 1
                  ]?.earnings.toLocaleString() || "0"
                }`,
              },
              {
                label: "Avg. Growth",
                value: `${resolvedMonthlyGrowthRate.toFixed(1)}%`,
                color: "text-emerald-600",
              },
              {
                label: "Peak Month",
                value: `$${Math.max(
                  ...resolvedMonthlyRevenue.map((m) => m.earnings),
                ).toLocaleString()}`,
              },
            ].map((metric, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{metric.label}</p>
                <p
                  className={`text-sm font-bold ${
                    metric.color || "text-gray-900"
                  }`}
                >
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Customer Retention & Popular Times */}
        <div className="space-y-4 sm:space-y-6">
          {/* Customer Retention */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6"
          >
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
              Customer Retention
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="h-48 sm:h-40 w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={resolvedRetentionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 30 : 40}
                      outerRadius={isMobile ? 60 : 70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {resolvedRetentionData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Customers"]}
                      contentStyle={{
                        borderRadius: "8px",
                        fontSize: isMobile ? "12px" : "14px",
                        border: "1px solid #e5e7eb",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full sm:w-1/2 space-y-3">
                <div className="space-y-2">
                  {resolvedRetentionData.map((data) => (
                    <div
                      key={data.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: data.fill }}
                        />
                        <span className="text-xs sm:text-sm font-medium text-gray-700">
                          {data.name}
                        </span>
                      </div>
                      <span className="text-sm sm:text-base font-bold text-gray-900">
                        {data.value}%
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-500">Repeat Purchase Rate</span>
                    <span className="font-bold text-emerald-600">
                      {`${resolvedRetentionRate.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm mt-1">
                    <span className="text-gray-500">Avg. Lifetime Value</span>
                    <span className="font-bold text-emerald-600">
                      $
                      {uniqueClients.size > 0
                        ? (totalEarnings / uniqueClients.size).toFixed(0)
                        : "0"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Peak Hours */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Peak Booking Times
              </h3>
              <span className="text-xs font-medium text-gray-500">
                Most popular hours
              </span>
            </div>

            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resolvedTimeDistribution}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    fontSize={isMobile ? 9 : 11}
                    tick={{ fill: "#6b7280" }}
                  />
                  <YAxis
                    fontSize={isMobile ? 9 : 11}
                    tick={{ fill: "#6b7280" }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} bookings`, "Count"]}
                    contentStyle={{
                      borderRadius: "8px",
                      fontSize: isMobile ? "12px" : "14px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Bar dataKey="bookings" radius={[4, 4, 0, 0]}>
                    {resolvedTimeDistribution.map((entry) => (
                      <Cell key={entry.time} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {resolvedTimeDistribution.map((time, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className="w-3 h-3 rounded-full mb-1"
                    style={{ backgroundColor: time.color }}
                  />
                  <span className="text-[10px] sm:text-xs text-gray-600">
                    {time.time}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Service Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6"
      >
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              Top Performing Services
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              By revenue and bookings
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors">
              Revenue
            </button>
            <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors">
              Bookings
            </button>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {resolvedServicePerformance
            .slice(0, isMobile ? 3 : 5)
            .map((service) => (
              <div key={service.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: service.color }}
                    />
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {service.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="text-xs sm:text-sm text-gray-500">
                      ${service.revenue.toLocaleString()}
                    </span>
                    <span className="text-xs sm:text-sm text-amber-600 font-medium">
                      {service.rating.toFixed(1)} ★
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                    style={{
                      width: `${
                        (service.revenue /
                          Math.max(
                            ...resolvedServicePerformance.map((s) => s.revenue),
                          )) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{service.bookings} bookings</span>
                  <span>
                    {totalEarnings > 0
                      ? `${((service.revenue / totalEarnings) * 100).toFixed(0)}% of revenue`
                      : "0% of revenue"}
                  </span>
                </div>
              </div>
            ))}
        </div>

        {resolvedServicePerformance.length > 3 && isMobile && (
          <button className="w-full text-center text-xs text-emerald-600 hover:text-emerald-700 font-medium py-3 mt-2">
            Show all {resolvedServicePerformance.length} services
          </button>
        )}
      </motion.div>

      {peerBenchmark && peerBenchmark.peerCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              Peer Benchmark
            </h3>
            <span className="text-xs text-gray-500">
              {peerBenchmark.peerCount} comparable providers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Earnings Percentile</p>
              <p className="text-lg font-bold text-emerald-800">
                {peerBenchmark.earningsPercentile.toFixed(0)}th
              </p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs text-blue-700">Rating Percentile</p>
              <p className="text-lg font-bold text-blue-800">
                {peerBenchmark.ratingPercentile.toFixed(0)}th
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600">Peer Avg Earnings</p>
              <p className="text-lg font-bold text-slate-800">
                ${peerBenchmark.averagePeerEarnings.toFixed(0)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600">Peer Avg Rating</p>
              <p className="text-lg font-bold text-slate-800">
                {peerBenchmark.averagePeerRating.toFixed(2)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mobile-Only Pro Features */}
      {isMobile && (
        <div className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-blue-600">
              stars
            </span>
            <h4 className="text-sm font-bold text-blue-900">
              Pro Features Enabled
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-500 text-sm">
                check_circle
              </span>
              <span className="text-xs text-blue-800">Revenue Predictions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-500 text-sm">
                check_circle
              </span>
              <span className="text-xs text-blue-800">Customer Insights</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-500 text-sm">
                check_circle
              </span>
              <span className="text-xs text-blue-800">Peak Time Analysis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-500 text-sm">
                check_circle
              </span>
              <span className="text-xs text-blue-800">Service Analytics</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalytics;
