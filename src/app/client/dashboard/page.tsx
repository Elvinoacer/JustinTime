"use client";
import NotificationPermissionOverlay from "@/components/NotificationPermissionOverlay";
import {
  useClientActivity,
  useClientJobs,
  useClientStats,
} from "@/lib/api/hooks/useClientDashboard";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function ClientDashboardPage() {
  const { data: session } = useSession();
  const { data: stats, isLoading: statsLoading } = useClientStats();
  const { data: activities, isLoading: activityLoading } = useClientActivity();
  const { data: jobs, isLoading: jobsLoading } = useClientJobs();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" };
      case "IN_PROGRESS":
        return { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" };
      case "COMPLETED":
        return { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", dot: "bg-gray-500" };
      case "CANCELLED":
        return { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", dot: "bg-gray-500" };
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-5 md:space-y-6 lg:space-y-8 pb-6 md:pb-8 lg:pb-10 px-3 md:px-0">
      {/* Hero Header */}
      <motion.div 
        className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 text-white relative overflow-hidden"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 md:w-48 md:h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
          <div>
            <motion.h1 
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {getTimeOfDay()}, {session?.user?.name?.split(" ")[0] || "Client"}! 👋
            </motion.h1>
            <motion.p 
              className="text-emerald-100 text-sm sm:text-base max-w-md"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Here's what's happening with your projects today.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/client/post-job"
              className="flex items-center justify-center gap-2 bg-white text-emerald-700 px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl hover:bg-emerald-50 transition-colors shadow-lg shadow-emerald-900/20 font-bold text-sm sm:text-base w-full lg:w-auto"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              <span>Post a New Job</span>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Grid - Enhanced Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
        {statsLoading
          ? Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="bg-white p-4 md:p-5 lg:p-6 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 h-24 md:h-32 lg:h-36 animate-pulse"
                />
              ))
          : stats?.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="bg-white p-4 md:p-5 lg:p-6 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-emerald-100 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`p-2.5 md:p-3 rounded-xl ${stat.color} bg-opacity-15 group-hover:scale-110 transition-transform`}
                  >
                    <span
                      className={`material-symbols-outlined text-lg md:text-xl ${stat.color.replace(
                        "bg-",
                        "text-"
                      )}`}
                    >
                      {stat.icon}
                    </span>
                  </div>
                </div>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-0.5">
                  {stat.value}
                </p>
                <h3 className="text-xs md:text-sm text-gray-500 font-medium">
                  {stat.title}
                </h3>
              </motion.div>
            ))}
      </div>

      {/* Quick Actions - Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        <Link href="/jobs">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl md:rounded-2xl p-5 md:p-6 overflow-hidden cursor-pointer shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:shadow-emerald-300/50 transition-all duration-300 hover:-translate-y-1"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <span className="material-symbols-outlined text-white text-xl md:text-2xl">
                    work_history
                  </span>
                </div>
                <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-lg">
                  arrow_forward
                </span>
              </div>
              <h3 className="text-base md:text-lg font-bold text-white mb-1">
                Browse Jobs
              </h3>
              <p className="text-emerald-50 text-xs md:text-sm line-clamp-2">
                Find opportunities matching your needs
              </p>
            </div>
          </motion.div>
        </Link>

        <Link href="/professionals">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="group relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl md:rounded-2xl p-5 md:p-6 overflow-hidden cursor-pointer shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/50 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <span className="material-symbols-outlined text-white text-xl md:text-2xl">
                    person_search
                  </span>
                </div>
                <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-lg">
                  arrow_forward
                </span>
              </div>
              <h3 className="text-base md:text-lg font-bold text-white mb-1">
                Find Professionals
              </h3>
              <p className="text-blue-50 text-xs md:text-sm line-clamp-2">
                Connect with skilled service providers
              </p>
            </div>
          </motion.div>
        </Link>

        <Link href="/services">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group relative bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl md:rounded-2xl p-5 md:p-6 overflow-hidden cursor-pointer shadow-lg shadow-purple-200/50 hover:shadow-xl hover:shadow-purple-300/50 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <span className="material-symbols-outlined text-white text-xl md:text-2xl">
                    home_repair_service
                  </span>
                </div>
                <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-lg">
                  arrow_forward
                </span>
              </div>
              <h3 className="text-base md:text-lg font-bold text-white mb-1">
                Explore Services
              </h3>
              <p className="text-purple-50 text-xs md:text-sm line-clamp-2">
                Discover services near your location
              </p>
            </div>
          </motion.div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Active Jobs - Enhanced Cards */}
        <div className="lg:col-span-2 bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 md:p-5 lg:p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-lg md:text-xl">assignment</span>
                Active Jobs
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">Manage your ongoing projects</p>
            </div>
            <Link
              href="/client/bookings"
              className="text-xs md:text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>View All</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Link>
          </div>

          {jobsLoading ? (
            <div className="p-4 md:p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 md:h-24 bg-gray-50 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="p-3 md:p-4 lg:p-5 space-y-3">
              {jobs.slice(0, 4).map((job, index) => {
                const statusStyle = getStatusColor(job.status);
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            {job.status.replace("_", " ")}
                          </span>
                          {job._count.proposals > 0 && (
                            <span className="text-[10px] text-gray-500">
                              {job._count.proposals} proposals
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                          {job.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">payments</span>
                            {job.budget ? `KES ${job.budget.toLocaleString()}` : "Negotiable"}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            {new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/client/jobs/${job.id}`}
                        className="flex-shrink-0 p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 md:p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-gray-400 text-2xl">
                  work_off
                </span>
              </div>
              <h3 className="text-gray-900 font-semibold text-base mb-1">
                No active jobs
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Post your first job to get started!
              </p>
              <Link
                href="/client/post-job"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span>Post a Job</span>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
          <div className="p-4 md:p-5 lg:p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg md:text-xl">notifications_active</span>
                Recent Activity
              </h2>
            </div>
            <Link
              href="/client/notifications"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View All
            </Link>
          </div>

          {activityLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="p-3 md:p-4 space-y-1">
              {activities.slice(0, 5).map((item, index) => (
                <motion.div 
                  key={index} 
                  className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${item.color}`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {item.icon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {item.desc}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {new Date(item.time).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-gray-400 text-xl">
                  notifications_off
                </span>
              </div>
              <p className="text-gray-500 text-sm">
                No recent activity
              </p>
            </div>
          )}
        </div>
      </div>

      <NotificationPermissionOverlay />
    </div>
  );
}
