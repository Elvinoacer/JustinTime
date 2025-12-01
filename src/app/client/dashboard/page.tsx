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

export default function ClientDashboardPage() {
  const { data: session } = useSession();
  const { data: stats, isLoading: statsLoading } = useClientStats();
  const { data: activities, isLoading: activityLoading } = useClientActivity();
  const { data: jobs, isLoading: jobsLoading } = useClientJobs();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "COMPLETED":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "CANCELLED":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 pb-6 md:pb-8 lg:pb-10 px-3 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            Welcome back, {session?.user?.name?.split(" ")[0] || "Client"}!
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 mt-0.5">
            Here's what's happening with your projects.
          </p>
        </div>
        <Link
          href="/client/post-job"
          className="flex items-center justify-center gap-1.5 md:gap-2 bg-emerald-600 text-white px-4 py-2 md:px-5 md:py-2.5 lg:px-6 lg:py-3 rounded-lg md:rounded-xl hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-lg shadow-emerald-200 font-medium md:font-bold text-sm md:text-base touch-manipulation mt-2 sm:mt-0 w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-base md:text-lg">
            add
          </span>
          <span>Post a New Job</span>
        </Link>
      </div>

      {/* Stats Grid - 2 columns on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {statsLoading
          ? // Loading Skeletons
            Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="bg-white p-4 md:p-5 lg:p-6 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 h-20 md:h-28 lg:h-32 animate-pulse"
                />
              ))
          : stats?.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white p-4 md:p-5 lg:p-6 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2 md:mb-3 lg:mb-4">
                  <div
                    className={`p-2 md:p-2.5 lg:p-3 rounded-lg md:rounded-xl ${stat.color} bg-opacity-10`}
                  >
                    <span
                      className={`material-symbols-outlined text-lg md:text-xl lg:text-2xl ${stat.color.replace(
                        "bg-",
                        "text-"
                      )}`}
                    >
                      {stat.icon}
                    </span>
                  </div>
                </div>
                <h3 className="text-xs md:text-sm text-gray-500 font-medium truncate">
                  {stat.title}
                </h3>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mt-0.5 truncate">
                  {stat.value}
                </p>
              </motion.div>
            ))}
      </div>

      {/* Quick Actions - Navigation Cards - Stack on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <Link href="/jobs">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl md:rounded-2xl p-5 md:p-6 lg:p-8 overflow-hidden cursor-pointer shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all duration-300 touch-manipulation"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-2.5 lg:p-3 bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl">
                  <span className="material-symbols-outlined text-white text-xl md:text-2xl lg:text-3xl">
                    work
                  </span>
                </div>
                <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg md:text-xl">
                  arrow_forward
                </span>
              </div>
              <h3 className="text-base md:text-lg lg:text-xl font-bold text-white mb-1 md:mb-2">
                Browse Available Jobs
              </h3>
              <p className="text-emerald-50 text-xs md:text-sm">
                Find opportunities that match your needs and connect with
                service providers
              </p>
            </div>
          </motion.div>
        </Link>

        <Link href="/professionals">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl md:rounded-2xl p-5 md:p-6 lg:p-8 overflow-hidden cursor-pointer shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all duration-300 touch-manipulation"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-2.5 lg:p-3 bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl">
                  <span className="material-symbols-outlined text-white text-xl md:text-2xl lg:text-3xl">
                    person_search
                  </span>
                </div>
                <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg md:text-xl">
                  arrow_forward
                </span>
              </div>
              <h3 className="text-base md:text-lg lg:text-xl font-bold text-white mb-1 md:mb-2">
                Find Professionals
              </h3>
              <p className="text-blue-50 text-xs md:text-sm">
                Connect with skilled service providers and hire top talent for
                your projects
              </p>
            </div>
          </motion.div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        {/* Active Jobs Table */}
        <div className="lg:col-span-2 bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 md:p-5 lg:p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold text-gray-900">
              Active Jobs
            </h2>
            <Link
              href="/client/bookings"
              className="text-xs md:text-sm font-medium text-emerald-600 hover:text-emerald-700 touch-manipulation"
            >
              View All
            </Link>
          </div>

          {jobsLoading ? (
            <div className="p-4 md:p-6 space-y-3 md:space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 md:h-14 lg:h-16 bg-gray-50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 md:px-4 md:py-4 text-left text-[10px] xs:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Job Title
                        </th>
                        <th className="px-3 py-3 md:px-4 md:py-4 text-left text-[10px] xs:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Proposals
                        </th>
                        <th className="px-3 py-3 md:px-4 md:py-4 text-left text-[10px] xs:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Budget
                        </th>
                        <th className="px-3 py-3 md:px-4 md:py-4 text-left text-[10px] xs:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 py-3 md:px-4 md:py-4 text-right text-[10px] xs:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {jobs.map((job) => (
                        <tr
                          key={job.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-3 py-3 md:px-4 md:py-4 whitespace-nowrap">
                            <span className="text-xs md:text-sm font-medium text-gray-900 truncate block max-w-[120px] sm:max-w-[150px] md:max-w-[200px]">
                              {job.title}
                            </span>
                            <span className="block text-[10px] md:text-xs text-gray-500 mt-0.5">
                              {new Date(job.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-3 md:px-4 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-600">
                            {job._count.proposals}
                          </td>
                          <td className="px-3 py-3 md:px-4 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                            {job.budget
                              ? `KES ${job.budget.toString()}`
                              : "Negotiable"}
                          </td>
                          <td className="px-3 py-3 md:px-4 md:py-4 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs font-medium border ${getStatusColor(
                                job.status
                              )} whitespace-nowrap`}
                            >
                              {job.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-3 py-3 md:px-4 md:py-4 whitespace-nowrap text-right text-xs md:text-sm font-medium">
                            <Link
                              href={`/client/jobs/${job.id}`}
                              className="text-emerald-600 hover:text-emerald-900 touch-manipulation"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 md:p-8 lg:p-12 text-center">
              <div className="bg-gray-50 w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <span className="material-symbols-outlined text-gray-400 text-xl md:text-2xl">
                  work_off
                </span>
              </div>
              <h3 className="text-gray-900 font-medium text-sm md:text-base mb-1">
                No active jobs
              </h3>
              <p className="text-gray-500 text-xs md:text-sm mb-3 md:mb-4">
                Post a job to get started!
              </p>
              <Link
                href="/client/post-job"
                className="inline-flex items-center gap-1.5 md:gap-2 text-emerald-600 font-medium hover:text-emerald-700 touch-manipulation text-sm md:text-base"
              >
                <span>Post a Job</span>
                <span className="material-symbols-outlined text-base md:text-lg">
                  arrow_forward
                </span>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-4 md:p-5 lg:p-6 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 h-fit">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-bold text-gray-900">
              Recent Activity
            </h2>
            <Link
              href="/client/notifications"
              className="text-xs md:text-sm text-emerald-600 hover:text-emerald-700 touch-manipulation"
            >
              View All
            </Link>
          </div>

          {activityLoading ? (
            <div className="space-y-3 md:space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 md:gap-4 animate-pulse">
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-gray-100 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 md:h-4 bg-gray-100 rounded w-3/4 mb-1 md:mb-2" />
                    <div className="h-2 md:h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-4 md:space-y-6">
              {activities.map((item, index) => (
                <div key={index} className="flex gap-3 md:gap-4">
                  <div
                    className={`w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.color}`}
                  >
                    <span className="material-symbols-outlined text-xs md:text-sm">
                      {item.icon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs md:text-sm font-bold text-gray-900 truncate">
                      {item.title}
                    </h4>
                    <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {item.desc}
                    </p>
                    <span className="text-[10px] md:text-xs text-gray-400 mt-1 block">
                      {new Date(item.time).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 md:py-6 lg:py-8">
              <div className="bg-gray-50 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-gray-400 text-xl md:text-2xl">
                  notifications_off
                </span>
              </div>
              <p className="text-gray-500 text-xs md:text-sm">
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
