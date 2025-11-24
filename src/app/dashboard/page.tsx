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
    <div className="space-y-8 pb-8" style={{ fontFamily: '"Work Sans", "Noto Sans", sans-serif' }}>
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">Dashboard</h1>
          <p className="text-gray-700 text-base mt-1">Welcome back, <span className="font-semibold">{session?.user?.name}</span>! Here's your overview.</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all shadow-md hover:shadow-lg active:transform active:scale-95">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">download</span>
          <span className="font-medium">Download Report</span>
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
              className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-all border border-gray-100 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10 group-hover:bg-opacity-20 transition-colors`}>
                  <span className={`material-symbols-outlined ${stat.color.replace("bg-", "text-")} text-2xl`} aria-hidden="true">
                    {stat.icon}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${
                    stat.isPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    {stat.isPositive ? "trending_up" : "trending_down"}
                  </span>
                  {stat.change}
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-semibold uppercase tracking-wide">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1 tracking-tight">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Earnings Chart */}
        <section className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 lg:col-span-2" aria-labelledby="earnings-heading">
          <div className="flex items-center justify-between mb-6">
            <h2 id="earnings-heading" className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600">show_chart</span>
              Earnings Overview
            </h2>
            <CustomSelect />
          </div>
          {chartLoading ? (
            <div className="h-72 flex items-center justify-center">
              <div role="status" aria-label="Loading earnings chart" className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : earningsData.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <span className="material-symbols-outlined text-4xl mb-2 text-gray-400" aria-hidden="true">bar_chart</span>
              <p className="font-medium">No earnings data yet</p>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsData} accessibilityLayer tabIndex={0} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `KES ${value}`}
                    dx={-10}
                  />
                  <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        padding: "12px",
                      }}
                      itemStyle={{ color: "#059669", fontWeight: "bold", fontSize: "14px" }}
                      formatter={(value: number) => [`KES ${value.toLocaleString()}`, "Earnings"]}
                      cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="#10B981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorEarnings)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: "#059669" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Recent Activity / Notifications */}
        <section className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col h-full" aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">notifications</span>
            Recent Activity
          </h2>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div role="status" aria-label="Loading recent activities" className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <span className="material-symbols-outlined text-3xl mb-2 text-gray-300">history</span>
                <p>No recent activity.</p>
              </div>
            ) : (
              activities.map((item: any, index: number) => (
                <div key={index} className="flex gap-4 group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color} bg-opacity-10 group-hover:bg-opacity-20 transition-colors`}>
                    <span className={`material-symbols-outlined text-sm ${item.color.replace("bg-", "text-")}`} aria-hidden="true">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{item.title}</h4>
                    <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{item.desc}</p>
                    <span className="text-xs text-gray-400 mt-1 block font-medium">{new Date(item.time).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-6 py-2.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors border border-transparent hover:border-emerald-100">
            View All Activity
          </button>
        </section>
      </div>

      {/* Recent Jobs Table */}
      <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden" aria-labelledby="jobs-heading">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 id="jobs-heading" className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-600">work</span>
            Recent Jobs
          </h2>
          <Link href="/dashboard/jobs" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1">
            View All
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Recent Jobs</caption>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Client
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Service
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {bookingsLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div role="status" aria-label="Loading recent jobs" className="inline-block w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  </td>
                </tr>
              ) : recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">work_off</span>
                      <p>No recent jobs found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentJobs.map((job: any, index: number) => (
                  <tr key={index} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {job.clientImage ? (
                          <img src={job.clientImage} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                        ) : (
                          <div aria-hidden="true" className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 border-2 border-white shadow-sm">
                            {job.client.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {job.client}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {job.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {job.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {job.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                          job.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' :
                          job.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                          'bg-gray-50 text-gray-700 border-gray-100'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-all" aria-label={`Action for ${job.client}'s job`}>
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