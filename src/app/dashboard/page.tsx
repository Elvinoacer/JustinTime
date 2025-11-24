"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { useProviderStats, useProviderEarningsChart, useProviderActivities, useProviderBookings } from "@/lib/api/hooks/useProvider";
import CustomSelect from "@/components/CustomSelect";

const DashboardPage = () => {
  const { data: session } = useSession();
  const { data: statsData, isLoading: statsLoading } = useProviderStats();
  const { data: chartData, isLoading: chartLoading } = useProviderEarningsChart();
  const { data: activitiesData, isLoading: activitiesLoading } = useProviderActivities();
  const { data: bookingsData, isLoading: bookingsLoading } = useProviderBookings();

  const stats = statsData?.stats || [];
  const earningsData = chartData?.data || [];
  const activities = activitiesData?.activities || [];
  const recentJobs = bookingsData?.bookings || [];

  return (
    <div className="space-y-8" style={{ fontFamily: '"Work Sans", "Noto Sans", sans-serif' }}>
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-700">Welcome back, {session?.user?.name}! Here's your overview.</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">download</span>
          <span>Download Report</span>
        </button>
      </header>

      {/* Stats Grid */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                  <span className={`material-symbols-outlined ${stat.color.replace("bg-", "text-")}`} aria-hidden="true">
                    {stat.icon}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${
                    stat.isPositive ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    {stat.isPositive ? "trending_up" : "trending_down"}
                  </span>
                  {stat.change}
                </div>
              </div>
              <h3 className="text-gray-700 text-sm font-medium">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Earnings Chart */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2" aria-labelledby="earnings-heading">
          <div className="flex items-center justify-between mb-6">
            <h2 id="earnings-heading" className="text-lg font-bold text-gray-900">Earnings Overview</h2>
            <CustomSelect />
          </div>
          {chartLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div role="status" aria-label="Loading earnings chart" className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : earningsData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-700">
              <span className="material-symbols-outlined text-4xl mb-2" aria-hidden="true">show_chart</span>
              <p>No earnings data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={earningsData} accessibilityLayer tabIndex={0}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#4b5563" />
                <YAxis stroke="#4b5563" />
                <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    itemStyle={{ color: "#065f46", fontWeight: "bold" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="#10B981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorEarnings)"
                  />
                </AreaChart>
              </ResponsiveContainer>
          )}
        </section>

        {/* Recent Activity / Notifications */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100" aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-6">
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div role="status" aria-label="Loading recent activities" className="w-6 h-6 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <p className="text-gray-700 text-center py-4">No recent activity.</p>
            ) : (
              activities.map((item: any, index: number) => (
                <div key={index} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.color}`}>
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                    <p className="text-sm text-gray-700 mt-0.5">{item.desc}</p>
                    <span className="text-sm text-gray-600 mt-1 block">{new Date(item.time).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-6 py-2 text-sm font-medium text-emerald-800 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors">
            View All Activity
          </button>
        </section>
      </div>

      {/* Recent Jobs Table */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" aria-labelledby="jobs-heading">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 id="jobs-heading" className="text-lg font-bold text-gray-900">Recent Jobs</h2>
          <Link href="/dashboard/jobs" className="text-sm font-medium text-emerald-800 hover:text-emerald-900">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Recent Jobs</caption>
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Client
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Service
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {bookingsLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div role="status" aria-label="Loading recent jobs" className="inline-block w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  </td>
                </tr>
              ) : recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No recent jobs found.
                  </td>
                </tr>
              ) : (
                recentJobs.map((job: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {job.clientImage ? (
                          <img src={job.clientImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div aria-hidden="true" className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                            {job.client.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {job.client}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {job.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {job.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {job.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${job.statusColor}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-gray-600 hover:text-gray-900" aria-label={`Action for ${job.client}'s job`}>
                        <span className="material-symbols-outlined" aria-hidden="true">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;