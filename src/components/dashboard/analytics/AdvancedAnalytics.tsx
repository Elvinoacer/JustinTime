"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
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
  bookings: any[];
  earnings: any[];
  reviews: any[];
}

const AdvancedAnalytics = ({
  bookings,
  earnings,
  reviews,
}: AdvancedAnalyticsProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState<
    "overview" | "performance" | "growth"
  >("overview");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Calculate advanced metrics
  const totalEarnings = earnings.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0
  );
  const monthlyGrowthRate = 18.5; // Mock data
  const retentionRate = 75; // Mock data
  const customerSatisfaction = 92; // Mock data

  // Service performance data
  const servicePerformance = bookings
    .reduce((acc: any[], booking) => {
      const serviceName = booking.service || "Unknown Service";
      const existing = acc.find((item) => item.name === serviceName);

      if (existing) {
        existing.bookings += 1;
        existing.revenue += Number(booking.amount || 0);
        existing.rating =
          (existing.rating * (existing.bookings - 1) + (booking.rating || 4)) /
          existing.bookings;
      } else {
        acc.push({
          name: serviceName,
          bookings: 1,
          revenue: Number(booking.amount || 0),
          rating: booking.rating || 4,
          color: getServiceColor(serviceName),
        });
      }

      return acc;
    }, [])
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Revenue trend data (last 12 months)
  const monthlyRevenue = Array.from({ length: 12 }).map((_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const monthIndex = date.getMonth();

    const monthEarnings = earnings
      .filter((e) => new Date(e.createdAt).getMonth() === monthIndex)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const growth =
      i > 0
        ? ((monthEarnings - monthlyRevenue[i - 1]?.earnings || 0) /
            (monthlyRevenue[i - 1]?.earnings || 1)) *
          100
        : 0;

    return {
      month,
      earnings: monthEarnings,
      growth: Math.round(growth),
      bookings: bookings.filter(
        (b) => new Date(b.createdAt).getMonth() === monthIndex
      ).length,
    };
  });

  // Customer retention data
  const retentionData = [
    { name: "Returning", value: 75, fill: "#10b981" },
    { name: "New", value: 25, fill: "#e5e7eb" },
  ];

  // Time of day popularity
  const timeDistribution = [
    { time: "6-9 AM", bookings: 15, color: "#3b82f6" },
    { time: "9-12 PM", bookings: 45, color: "#8b5cf6" },
    { time: "12-3 PM", bookings: 60, color: "#f59e0b" },
    { time: "3-6 PM", bookings: 40, color: "#ef4444" },
    { time: "6-9 PM", bookings: 20, color: "#10b981" },
  ];

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
      value: `${monthlyGrowthRate}%`,
      icon: "trending_up",
      color: "from-emerald-500 to-emerald-600",
      change: "+5.2%",
      changeType: "increase",
    },
    {
      name: "Retention Rate",
      value: `${retentionRate}%`,
      icon: "repeat",
      color: "from-blue-500 to-blue-600",
      change: "+3.1%",
      changeType: "increase",
    },
    {
      name: "Customer Satisfaction",
      value: `${customerSatisfaction}%`,
      icon: "sentiment_satisfied",
      color: "from-purple-500 to-purple-600",
      change: "+1.8%",
      changeType: "increase",
    },
    {
      name: "Avg. Booking Value",
      value: `$${(totalEarnings / Math.max(bookings.length, 1)).toFixed(0)}`,
      icon: "payments",
      color: "from-amber-500 to-amber-600",
      change: "+7.3%",
      changeType: "increase",
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
        <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-sm">
          Pro Features
        </span>
      </div>

      {/* View Toggle - Mobile: Scrollable, Desktop: Normal */}
      <div className="flex overflow-x-auto hide-scrollbar pb-1">
        <div className="flex gap-1 bg-gray-100 p-0.5 sm:p-1 rounded-lg">
          {[
            { id: "overview", label: "Overview", icon: "dashboard" },
            { id: "performance", label: "Performance", icon: "trending_up" },
            { id: "growth", label: "Growth", icon: "show_chart" },
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
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
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-xs`}
              >
                <span className="material-symbols-outlined text-white text-sm sm:text-lg">
                  {stat.icon}
                </span>
              </div>
              <span
                className={`text-[10px] xs:text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  stat.changeType === "increase"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
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
                +18.5%
              </span>
            </div>
          </div>

          <div className="h-48 sm:h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenue.slice(-6)}>
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
                  monthlyRevenue[
                    monthlyRevenue.length - 1
                  ]?.earnings.toLocaleString() || "0"
                }`,
              },
              {
                label: "Avg. Growth",
                value: `${monthlyGrowthRate}%`,
                color: "text-emerald-600",
              },
              {
                label: "Peak Month",
                value: `$${Math.max(
                  ...monthlyRevenue.map((m) => m.earnings)
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
                      data={retentionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 30 : 40}
                      outerRadius={isMobile ? 60 : 70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {retentionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
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
                  {retentionData.map((data, index) => (
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
                    <span className="font-bold text-emerald-600">42%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm mt-1">
                    <span className="text-gray-500">Avg. Lifetime Value</span>
                    <span className="font-bold text-emerald-600">$2,450</span>
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
                <BarChart data={timeDistribution}>
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
                    {timeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {timeDistribution.map((time, i) => (
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
          {servicePerformance
            .slice(0, isMobile ? 3 : 5)
            .map((service, index) => (
              <div key={service.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
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
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                    style={{
                      width: `${
                        (service.revenue /
                          Math.max(
                            ...servicePerformance.map((s) => s.revenue)
                          )) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{service.bookings} bookings</span>
                  <span>
                    {((service.revenue / totalEarnings) * 100).toFixed(0)}% of
                    revenue
                  </span>
                </div>
              </div>
            ))}
        </div>

        {servicePerformance.length > 3 && isMobile && (
          <button className="w-full text-center text-xs text-emerald-600 hover:text-emerald-700 font-medium py-3 mt-2">
            Show all {servicePerformance.length} services
          </button>
        )}
      </motion.div>

      {/* Mobile-Only Pro Features */}
      {isMobile && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
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
