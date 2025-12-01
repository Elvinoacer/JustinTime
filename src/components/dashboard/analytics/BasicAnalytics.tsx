"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts";

interface BasicAnalyticsProps {
  bookings: any[];
  earnings: any[];
  reviews: any[];
}

const BasicAnalytics = ({
  bookings,
  earnings,
  reviews,
}: BasicAnalyticsProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [activeChart, setActiveChart] = useState<"bar" | "pie" | "line">("bar");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Calculate basic metrics
  const totalBookings = bookings.length;
  const totalEarnings = earnings.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0
  );
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
      : 0;

  // Calculate monthly earnings (last 6 months)
  const monthlyEarnings = Array.from({ length: 6 })
    .map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleDateString("en-US", { month: "short" });
      const monthIndex = date.getMonth();

      const monthEarnings = earnings
        .filter((e) => new Date(e.createdAt).getMonth() === monthIndex)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        name: month,
        earnings: monthEarnings,
        bookings: bookings.filter(
          (b) => new Date(b.createdAt).getMonth() === monthIndex
        ).length,
      };
    })
    .reverse();

  // Calculate booking status distribution
  const statusCounts = bookings.reduce((acc: any, booking) => {
    acc[booking.status] = (acc[booking.status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.keys(statusCounts).map((status) => ({
    name: status.charAt(0) + status.slice(1).toLowerCase(),
    value: statusCounts[status],
    color: getStatusColor(status),
  }));

  // Review distribution
  const reviewData = [5, 4, 3, 2, 1].map((rating) => ({
    name: `${rating} Star`,
    value: reviews.filter((r) => Math.round(r.rating) === rating).length,
  }));

  const stats = [
    {
      name: "Total Bookings",
      value: totalBookings,
      icon: "calendar_month",
      color: "from-blue-500 to-blue-600",
      change: "+12%",
      changeType: "increase",
      prefix: "",
    },
    {
      name: "Total Earnings",
      value: totalEarnings,
      icon: "payments",
      color: "from-emerald-500 to-emerald-600",
      change: "+8%",
      changeType: "increase",
      prefix: "$",
      format: (val: number) => val.toFixed(isMobile ? 0 : 2),
    },
    {
      name: "Avg. Rating",
      value: averageRating,
      icon: "star",
      color: "from-amber-500 to-amber-600",
      change: "+2%",
      changeType: "increase",
      prefix: "",
      format: (val: number) => val.toFixed(1),
    },
    {
      name: "Completion Rate",
      value:
        bookings.length > 0
          ? (bookings.filter((b) => b.status === "COMPLETED").length /
              bookings.length) *
            100
          : 0,
      icon: "check_circle",
      color: "from-purple-500 to-purple-600",
      change: "+5%",
      changeType: "increase",
      prefix: "",
      suffix: "%",
      format: (val: number) => val.toFixed(0),
    },
  ];

  function getStatusColor(status: string) {
    const colors: any = {
      COMPLETED: "#10b981",
      CONFIRMED: "#3b82f6",
      PENDING: "#f59e0b",
      CANCELLED: "#ef4444",
      IN_PROGRESS: "#8b5cf6",
    };
    return colors[status] || "#6b7280";
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Grid - Mobile: 2 columns, Desktop: 4 columns */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-xs hover:shadow-sm border border-gray-200 p-3 sm:p-4 transition-shadow"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-xs`}
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
            <h3 className="text-[10px] xs:text-xs text-gray-500 font-medium mb-0.5 sm:mb-1">
              {stat.name}
            </h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
              {stat.prefix}
              {stat.format ? stat.format(stat.value) : stat.value}
              {stat.suffix}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Charts Section - Mobile: Stacked, Desktop: Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Earnings Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6"
        >
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mb-4 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Revenue Overview
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Last 6 months earnings
              </p>
            </div>
            <div className="flex gap-1 bg-gray-100 p-0.5 sm:p-1 rounded-lg">
              <button
                onClick={() => setActiveChart("bar")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-colors ${
                  activeChart === "bar"
                    ? "bg-white text-emerald-600 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Bar
              </button>
              <button
                onClick={() => setActiveChart("line")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-colors ${
                  activeChart === "line"
                    ? "bg-white text-emerald-600 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Line
              </button>
            </div>
          </div>

          <div className="h-48 sm:h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              {activeChart === "bar" ? (
                <BarChart data={monthlyEarnings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
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
                      "Earnings",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      fontSize: isMobile ? "12px" : "14px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Bar
                    dataKey="earnings"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    name="Earnings"
                  />
                </BarChart>
              ) : (
                <LineChart data={monthlyEarnings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
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
                      "Earnings",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      fontSize: isMobile ? "12px" : "14px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="earnings"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Earnings"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Monthly Stats Summary */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <p className="text-xs text-emerald-700 font-medium mb-1">
                Current Month
              </p>
              <p className="text-base sm:text-lg font-bold text-emerald-700">
                $
                {monthlyEarnings[
                  monthlyEarnings.length - 1
                ]?.earnings.toLocaleString() || "0"}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs text-blue-700 font-medium mb-1">
                Avg. Monthly
              </p>
              <p className="text-base sm:text-lg font-bold text-blue-700">
                $
                {(
                  monthlyEarnings.reduce((a, b) => a + b.earnings, 0) /
                    monthlyEarnings.length || 0
                ).toFixed(0)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Bookings & Reviews - Right Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Booking Status Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6"
          >
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">
              Booking Status
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="h-48 sm:h-56 w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 30 : 40}
                      outerRadius={isMobile ? 60 : 70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [value, "Bookings"]}
                      contentStyle={{
                        borderRadius: "8px",
                        fontSize: isMobile ? "12px" : "14px",
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <Legend
                      layout={isMobile ? "horizontal" : "vertical"}
                      verticalAlign={isMobile ? "bottom" : "middle"}
                      align={isMobile ? "center" : "right"}
                      wrapperStyle={{
                        fontSize: isMobile ? "10px" : "12px",
                        paddingTop: isMobile ? "10px" : "0",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status Breakdown */}
              <div className="w-full sm:w-1/2 space-y-2 sm:space-y-3">
                {statusData.map((status, index) => (
                  <div
                    key={status.name}
                    className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-xs sm:text-sm font-medium text-gray-700">
                        {status.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-sm sm:text-base font-bold text-gray-900">
                        {status.value}
                      </span>
                      {totalBookings > 0 && (
                        <span className="text-[10px] sm:text-xs text-gray-500">
                          ({Math.round((status.value / totalBookings) * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Reviews Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6"
          >
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">
              Customer Ratings
            </h3>

            <div className="space-y-3">
              {reviewData.map((review, index) => {
                const percentage =
                  reviews.length > 0
                    ? (review.value / reviews.length) * 100
                    : 0;

                return (
                  <div key={review.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-medium text-gray-700">
                          {review.name}
                        </span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className="material-symbols-outlined text-amber-500 text-sm"
                            >
                              {i < parseInt(review.name[0])
                                ? "star"
                                : "star_border"}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm font-medium text-gray-900">
                        {review.value} ({percentage.toFixed(0)}%)
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Average Rating Card */}
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-amber-800 font-medium mb-1">
                    Average Rating
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-bold text-amber-900">
                      {averageRating.toFixed(1)}
                    </span>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-amber-600 text-sm"
                        >
                          {i < Math.floor(averageRating)
                            ? "star"
                            : i === Math.floor(averageRating) &&
                              averageRating % 1 >= 0.5
                            ? "star_half"
                            : "star_border"}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm text-amber-800 font-medium mb-1">
                    Total Reviews
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-amber-900">
                    {reviews.length}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile-Only Quick Actions */}
      {isMobile && (
        <div className="grid grid-cols-2 gap-3">
          <button className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 shadow-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Export Data
          </button>
          <button className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 shadow-sm">
            <span className="material-symbols-outlined text-sm">insights</span>
            View Trends
          </button>
        </div>
      )}
    </div>
  );
};

export default BasicAnalytics;
