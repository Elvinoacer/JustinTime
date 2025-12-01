"use client";

import {
  useAnalyticsOverview,
  useAnalyticsTrends,
} from "@/lib/api/hooks/useClientAnalytics";
import { motion } from "framer-motion";
import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TimeRange = "7d" | "30d" | "90d" | "all";

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export default function ClientAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    let start = new Date();

    switch (timeRange) {
      case "7d":
        start.setDate(end.getDate() - 7);
        break;
      case "30d":
        start.setDate(end.getDate() - 30);
        break;
      case "90d":
        start.setDate(end.getDate() - 90);
        break;
      case "all":
        start = new Date(2020, 0, 1); // Far back date
        break;
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [timeRange]);

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(
    startDate,
    endDate
  );
  const { data: trends, isLoading: trendsLoading } = useAnalyticsTrends(
    startDate,
    endDate,
    "day"
  );

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7D" },
    { value: "30d", label: "30D" },
    { value: "90d", label: "90D" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 pb-8 md:pb-12 px-3 md:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold md:font-extrabold text-gray-900">
            Analytics
          </h1>
          <p className="text-xs md:text-sm text-gray-600 mt-0.5 md:mt-1">
            Track your hiring performance and spending
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1 md:gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium md:font-bold transition-all whitespace-nowrap min-w-[60px] md:min-w-0 touch-manipulation ${
                timeRange === range.value
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100 active:bg-gray-200"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {overviewLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl md:rounded-2xl h-24 md:h-32 animate-pulse border border-gray-100"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Key Metrics - 2 columns on mobile */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <MetricCard
              title="Total Spent"
              value={`KES ${overview?.spending.total.toLocaleString() || 0}`}
              icon="account_balance_wallet"
              color="emerald"
            />
            <MetricCard
              title="Jobs Posted"
              value={overview?.jobs.total.toString() || "0"}
              icon="work"
              color="blue"
            />
            <MetricCard
              title="Providers Hired"
              value={overview?.providers.unique.toString() || "0"}
              icon="group"
              color="purple"
            />
            <MetricCard
              title="Completion Rate"
              value={`${overview?.jobs.completionRate || 0}%`}
              icon="check_circle"
              color="teal"
            />
          </div>

          {/* Secondary Metrics - 2 columns on mobile */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            <MetricCard
              title="Avg Job Cost"
              value={`KES ${overview?.spending.average.toLocaleString() || 0}`}
              icon="payments"
              color="amber"
              small
            />
            <MetricCard
              title="Avg Proposals/Job"
              value={overview?.jobs.avgProposals.toString() || "0"}
              icon="description"
              color="indigo"
              small
            />
            <MetricCard
              title="Avg Rating"
              value={`${overview?.providers.avgRating.toFixed(1) || 0} ⭐`}
              icon="star"
              color="yellow"
              small
              className="col-span-2 md:col-span-1" // Makes it take full width on mobile
            />
          </div>

          {/* Charts - 1 column on mobile, 2 on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Jobs Over Time */}
            <ChartCard title="Jobs Posted Over Time" icon="trending_up">
              {trendsLoading ? (
                <div className="h-48 md:h-64 animate-pulse bg-gray-100 rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trends?.jobsPosted || []}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      stroke="#6b7280"
                      minTickGap={5}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="#6b7280"
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "12px",
                        padding: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: "#10b981", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Spending Over Time */}
            <ChartCard title="Spending Trends" icon="show_chart">
              {trendsLoading ? (
                <div className="h-48 md:h-64 animate-pulse bg-gray-100 rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={trends?.spending || []}>
                    <defs>
                      <linearGradient
                        id="colorSpending"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      stroke="#6b7280"
                      minTickGap={5}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="#6b7280"
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "12px",
                        padding: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSpending)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Category Distribution */}
            <ChartCard title="Spending by Category" icon="pie_chart">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={overview?.spending.byCategory || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({
                      name,
                      percent,
                    }: {
                      name?: string | number;
                      percent?: number;
                    }) => {
                      const displayName =
                        typeof name === "string"
                          ? name.substring(0, 10) +
                            (name.length > 10 ? "..." : "")
                          : name;
                      return `${displayName}: ${((percent || 0) * 100).toFixed(
                        0
                      )}%`;
                    }}
                    outerRadius={80}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="category"
                  >
                    {overview?.spending.byCategory.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      `KES ${value?.toLocaleString()}`,
                      "Amount",
                    ]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                      padding: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Jobs by Status */}
            <ChartCard title="Jobs by Status" icon="bar_chart">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={overview?.jobs.byStatus || []}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 10 }}
                    stroke="#6b7280"
                    angle={-45}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" width={30} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                      padding: "8px",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Top Providers */}
          {overview?.providers.topProviders &&
            overview.providers.topProviders.length > 0 && (
              <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 p-4 md:p-6 shadow-sm">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-xl md:text-2xl">
                    leaderboard
                  </span>
                  <span className="text-sm md:text-base">Top Providers</span>
                </h3>
                <div className="space-y-2 md:space-y-3">
                  {overview.providers.topProviders.map((provider, index) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg md:rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-sm md:text-base flex-shrink-0">
                          #{index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-sm md:text-base truncate">
                            {provider.name}
                          </p>
                          <p className="text-xs md:text-sm text-gray-500 truncate">
                            {provider.jobsCompleted} jobs completed
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500 text-sm md:text-base">
                            ⭐
                          </span>
                          <span className="font-bold text-gray-900 text-sm md:text-base">
                            {provider.avgRating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: "emerald" | "blue" | "purple" | "teal" | "amber" | "indigo" | "yellow";
  small?: boolean;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  color,
  small,
  className = "",
}) => {
  const colorClasses = {
    emerald: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    teal: "bg-teal-100 text-teal-600",
    amber: "bg-amber-100 text-amber-600",
    indigo: "bg-indigo-100 text-indigo-600",
    yellow: "bg-yellow-100 text-yellow-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl md:rounded-2xl border border-gray-100 p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      <div className="flex items-center gap-3 md:gap-4">
        <div
          className={`p-2 md:p-3 rounded-lg md:rounded-xl ${colorClasses[color]} flex-shrink-0`}
        >
          <span className="material-symbols-outlined text-xl md:text-2xl">
            {icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-gray-500 font-medium mb-1 truncate">
            {title}
          </p>
          <p
            className={`font-bold md:font-extrabold text-gray-900 truncate ${
              small ? "text-base md:text-xl" : "text-lg md:text-2xl"
            }`}
          >
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// Chart Card Component
interface ChartCardProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, icon, children }) => {
  return (
    <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 p-4 md:p-6 shadow-sm">
      <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-emerald-600 text-lg md:text-xl">
          {icon}
        </span>
        <span className="text-sm md:text-base">{title}</span>
      </h3>
      {children}
    </div>
  );
};
