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
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
          <p className="text-gray-500">System performance and key metrics.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined text-sm">download</span>
            Export Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200">
            <span className="material-symbols-outlined text-sm">settings</span>
            Settings
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                <span className={`material-symbols-outlined ${stat.color.replace("bg-", "text-")}`}>
                  {stat.icon}
                </span>
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${stat.isPositive ? "text-emerald-600" : "text-red-600"}`}>
                <span className="material-symbols-outlined text-sm">
                  {stat.isPositive ? "trending_up" : "trending_down"}
                </span>
                {stat.change}
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Revenue Overview</h2>
            <select className="bg-gray-50 border-none text-sm font-medium text-gray-600 rounded-lg cursor-pointer focus:ring-0">
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  tickFormatter={(value) => `K${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  cursor={{ stroke: "#10B981", strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#10B981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">User Growth</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  dy={10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  cursor={{ fill: "#F3F4F6" }}
                />
                <Bar
                  dataKey="users"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">System Activity</h2>
          <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
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
            <div key={index} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${log.color}`}>
                <span className="material-symbols-outlined text-sm">{log.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{log.action}</p>
                <p className="text-xs text-gray-500">
                  by <span className="font-medium text-gray-700">{log.user}</span> ({log.role})
                </p>
              </div>
              <span className="text-xs text-gray-400">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
