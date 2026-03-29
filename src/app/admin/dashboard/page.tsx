"use client";
import React from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const revenueData = [
  { name: "Jan", amount: 4000 },
  { name: "Feb", amount: 3000 },
  { name: "Mar", amount: 5000 },
  { name: "Apr", amount: 4780 },
  { name: "May", amount: 6890 },
  { name: "Jun", amount: 8390 },
];

const userGrowthData = [
  { name: "Mon", users: 20 },
  { name: "Tue", users: 35 },
  { name: "Wed", users: 45 },
  { name: "Thu", users: 30 },
  { name: "Fri", users: 55 },
  { name: "Sat", users: 40 },
  { name: "Sun", users: 25 },
];

const stats = [
  {
    title: "Total Revenue",
    value: "KES 1.2M",
    change: "+15%",
    isPositive: true,
    icon: "payments",
    color: "bg-emerald-500",
  },
  {
    title: "Total Users",
    value: "2,543",
    change: "+8%",
    isPositive: true,
    icon: "group",
    color: "bg-blue-500",
  },
  {
    title: "Active Jobs",
    value: "156",
    change: "+12%",
    isPositive: true,
    icon: "work",
    color: "bg-purple-500",
  },
  {
    title: "Pending Verifications",
    value: "24",
    change: "-5%",
    isPositive: false,
    icon: "verified_user",
    color: "bg-amber-500",
  },
];

export default function AdminDashboardPage() {
  const [chartsReady, setChartsReady] = React.useState(false);

  React.useEffect(() => {
    setChartsReady(true);
  }, []);

  return (
    <div className="space-y-4 xs:space-y-6 sm:space-y-8 p-3 xs:p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 xs:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl xs:text-2xl font-bold text-gray-900 leading-tight">
            Admin Overview
          </h1>
          <p className="text-xs xs:text-sm text-gray-500 mt-1">
            System performance and key metrics
          </p>
        </div>
        <div className="flex gap-2 xs:gap-3 self-stretch xs:self-auto">
          <button className="flex items-center gap-1 xs:gap-2 px-3 xs:px-4 py-2 bg-white border border-gray-200 rounded-lg xs:rounded-xl text-xs xs:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-1 xs:flex-none justify-center">
            <span className="material-symbols-outlined text-xs xs:text-sm">
              download
            </span>
            <span className="hidden xs:inline">Export</span>
          </button>
          <button className="flex items-center gap-1 xs:gap-2 px-3 xs:px-4 py-2 bg-gray-900 text-white rounded-lg xs:rounded-xl text-xs xs:text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm xs:shadow-lg shadow-gray-200 flex-1 xs:flex-none justify-center">
            <span className="material-symbols-outlined text-xs xs:text-sm">
              settings
            </span>
            <span className="hidden xs:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-3 xs:p-4 sm:p-6 rounded-xl xs:rounded-2xl shadow-xs xs:shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-2 xs:mb-3 sm:mb-4">
              <div
                className={`p-2 xs:p-3 rounded-lg xs:rounded-xl ${stat.color} bg-opacity-10`}
              >
                <span
                  className={`material-symbols-outlined text-sm xs:text-base ${stat.color.replace(
                    "bg-",
                    "text-",
                  )}`}
                >
                  {stat.icon}
                </span>
              </div>
              <div
                className={`flex items-center gap-1 text-xs xs:text-sm font-medium ${
                  stat.isPositive ? "text-emerald-600" : "text-red-600"
                }`}
              >
                <span className="material-symbols-outlined text-xs xs:text-sm">
                  {stat.isPositive ? "trending_up" : "trending_down"}
                </span>
                {stat.change}
              </div>
            </div>
            <h3 className="text-gray-500 text-xs xs:text-sm font-medium truncate">
              {stat.title}
            </h3>
            <p className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 xs:mt-1 truncate">
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xs:gap-6 sm:gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-4 xs:p-5 sm:p-6 rounded-xl xs:rounded-2xl shadow-xs xs:shadow-sm border border-gray-100">
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between mb-4 xs:mb-5 sm:mb-6 gap-2 xs:gap-0">
            <h2 className="text-base xs:text-lg font-bold text-gray-900">
              Revenue Overview
            </h2>
            <select className="bg-gray-50 border-none text-xs xs:text-sm font-medium text-gray-600 rounded-lg cursor-pointer focus:ring-0 w-full xs:w-auto max-w-[140px]">
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[200px] xs:h-[250px] sm:h-[300px] w-full">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F3F4F6"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9CA3AF", fontSize: 10 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9CA3AF", fontSize: 10 }}
                    tickFormatter={(value) => `K${value / 1000}k`}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      fontSize: "12px",
                    }}
                    cursor={{ stroke: "#10B981", strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full rounded-lg bg-gray-50" />
            )}
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="bg-white p-4 xs:p-5 sm:p-6 rounded-xl xs:rounded-2xl shadow-xs xs:shadow-sm border border-gray-100">
          <h2 className="text-base xs:text-lg font-bold text-gray-900 mb-4 xs:mb-5 sm:mb-6">
            User Growth
          </h2>
          <div className="h-[200px] xs:h-[250px] sm:h-[300px] w-full">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userGrowthData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F3F4F6"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9CA3AF", fontSize: 10 }}
                    dy={8}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      fontSize: "12px",
                    }}
                    cursor={{ fill: "#F3F4F6" }}
                  />
                  <Bar
                    dataKey="users"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full rounded-lg bg-gray-50" />
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl xs:rounded-2xl shadow-xs xs:shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 xs:p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base xs:text-lg font-bold text-gray-900">
            System Activity
          </h2>
          <button className="text-xs xs:text-sm font-medium text-emerald-600 hover:text-emerald-700 whitespace-nowrap">
            View All Logs
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            {
              action: "New User Registration",
              user: "Alice Wambui",
              role: "Client",
              time: "2 mins ago",
              icon: "person_add",
              color: "bg-blue-100 text-blue-600",
            },
            {
              action: "Job Posted",
              user: "John Doe",
              role: "Client",
              time: "15 mins ago",
              icon: "post_add",
              color: "bg-emerald-100 text-emerald-600",
            },
            {
              action: "Verification Request",
              user: "Mike Johnson",
              role: "Provider",
              time: "1 hour ago",
              icon: "verified_user",
              color: "bg-amber-100 text-amber-600",
            },
            {
              action: "Payment Processed",
              user: "System",
              role: "Admin",
              time: "3 hours ago",
              icon: "payments",
              color: "bg-purple-100 text-purple-600",
            },
          ].map((log, index) => (
            <div
              key={index}
              className="p-3 xs:p-4 flex items-center gap-3 xs:gap-4 hover:bg-gray-50 transition-colors"
            >
              <div
                className={`w-8 h-8 xs:w-10 xs:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${log.color}`}
              >
                <span className="material-symbols-outlined text-xs xs:text-sm">
                  {log.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs xs:text-sm font-medium text-gray-900 truncate">
                  {log.action}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  by{" "}
                  <span className="font-medium text-gray-700">{log.user}</span>{" "}
                  ({log.role})
                </p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                {log.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions - Mobile Only */}
      <div className="lg:hidden bg-white rounded-xl shadow-xs border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined text-sm">add</span>
            New User
          </button>
          <button className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined text-sm">analytics</span>
            Reports
          </button>
          <button className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined text-sm">
              notifications
            </span>
            Alerts
          </button>
          <button className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined text-sm">
              support_agent
            </span>
            Support
          </button>
        </div>
      </div>
    </div>
  );
}
