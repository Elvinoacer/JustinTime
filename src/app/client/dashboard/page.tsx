"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  useClientStats, 
  useClientActivity, 
  useClientJobs 
} from "@/lib/api/hooks/useClientDashboard";
import NotificationPermissionOverlay from "@/components/NotificationPermissionOverlay";

export default function ClientDashboardPage() {
  const { data: session } = useSession();
  const { data: stats, isLoading: statsLoading } = useClientStats();
  const { data: activities, isLoading: activityLoading } = useClientActivity();
  const { data: jobs, isLoading: jobsLoading } = useClientJobs();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN": return "bg-emerald-100 text-emerald-700";
      case "IN_PROGRESS": return "bg-blue-100 text-blue-700";
      case "COMPLETED": return "bg-gray-100 text-gray-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.name?.split(" ")[0] || "Client"}!
          </h1>
          <p className="text-gray-500">Here's what's happening with your projects.</p>
        </div>
        <Link
          href="/client/post-job"
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 font-bold"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span>Post a New Job</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          // Loading Skeletons
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-32 animate-pulse" />
          ))
        ) : stats?.map((stat, index) => (
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
              {/* Change indicator removed for now as we don't have historical data yet */}
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions - Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/jobs">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 overflow-hidden cursor-pointer shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all duration-300"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <span className="material-symbols-outlined text-white text-3xl">
                    work
                  </span>
                </div>
                <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  arrow_forward
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Browse Available Jobs</h3>
              <p className="text-emerald-50 text-sm">
                Find opportunities that match your needs and connect with service providers
              </p>
            </div>
          </motion.div>
        </Link>

        <Link href="/professionals">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="group relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 overflow-hidden cursor-pointer shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all duration-300"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <span className="material-symbols-outlined text-white text-3xl">
                    person_search
                  </span>
                </div>
                <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  arrow_forward
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Find Professionals</h3>
              <p className="text-blue-50 text-sm">
                Connect with skilled service providers and hire top talent for your projects
              </p>
            </div>
          </motion.div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Jobs Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Active Jobs</h2>
            <Link href="/client/bookings" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
              View All
            </Link>
          </div>
          
          {jobsLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Job Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Proposals
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {job.title}
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5">
                          Posted {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {job._count.proposals}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        KES {job.budget?.toString() || "Negotiable"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}
                        >
                          {job.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link 
                          href={`/client/jobs/${job.id}`}
                          className="text-emerald-600 hover:text-emerald-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-gray-400 text-2xl">work_off</span>
              </div>
              <h3 className="text-gray-900 font-medium mb-1">No active jobs</h3>
              <p className="text-gray-500 text-sm mb-4">Post a job to get started!</p>
              <Link
                href="/client/post-job"
                className="inline-flex items-center gap-2 text-emerald-600 font-medium hover:text-emerald-700"
              >
                <span>Post a Job</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h2>
          
          {activityLoading ? (
             <div className="space-y-4">
               {[1, 2, 3].map(i => (
                 <div key={i} className="flex gap-4 animate-pulse">
                   <div className="w-10 h-10 bg-gray-100 rounded-full" />
                   <div className="flex-1">
                     <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                     <div className="h-3 bg-gray-100 rounded w-1/2" />
                   </div>
                 </div>
               ))}
             </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-6">
              {activities.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.color}`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {item.icon}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    <span className="text-xs text-gray-400 mt-1 block">
                      {new Date(item.time).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              <Link 
                href="/client/notifications"
                className="block w-full mt-6 py-2 text-center text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                View All Activity
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </div>

      <NotificationPermissionOverlay />
    </div>
  );
}
