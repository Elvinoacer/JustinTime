"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProviderBookings } from "@/lib/api/hooks/useProvider";

const BookingsPage = () => {
  const { data: bookingsData, isLoading: bookingsLoading, error: bookingsError } = useProviderBookings();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const bookings = bookingsData?.bookings || [];

  // Filter bookings based on search and status
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking: any) => {
      const matchesSearch =
        booking.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.client.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: bookings.length,
      Completed: bookings.filter((b: any) => b.status === "Completed").length,
      Pending: bookings.filter((b: any) => b.status === "Pending").length,
    };
  }, [bookings]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-900 text-3xl font-bold leading-tight mb-2">Bookings</h1>
        <p className="text-gray-700 text-base font-normal leading-normal">Manage and track all your service bookings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "All Bookings", count: statusCounts.all, color: "blue", icon: "calendar_month", gradient: "from-blue-500 to-blue-600" },
          { label: "Completed", count: statusCounts.Completed, color: "emerald", icon: "check_circle", gradient: "from-emerald-500 to-emerald-600" },
          { label: "Pending", count: statusCounts.Pending, color: "amber", icon: "schedule", gradient: "from-amber-500 to-amber-600" },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            className="bg-white rounded-xl shadow-md hover:shadow-lg p-6 border border-gray-200 transition-shadow"
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">{stat.label}</p>
                <p className="text-4xl font-bold text-gray-900">{stat.count}</p>
              </div>
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                <span className="material-symbols-outlined text-white text-2xl">{stat.icon}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">search</span>
            <input
              type="text"
              placeholder="Search by service or client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-500"
              aria-label="Search bookings"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "all", label: "All", icon: "list" },
              { value: "Completed", label: "Completed", icon: "check_circle" },
              { value: "Pending", label: "Pending", icon: "schedule" }
            ].map((status) => (
              <button
                key={status.value}
                onClick={() => setStatusFilter(status.value)}
                className={`px-5 py-3 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                  statusFilter === status.value
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
                aria-label={`Filter by ${status.label}`}
                aria-pressed={statusFilter === status.value}
              >
                <span className="material-symbols-outlined text-base">{status.icon}</span>
                {status.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        {bookingsLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
            <p className="text-gray-700 font-medium">Loading bookings...</p>
          </div>
        ) : bookingsError ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-600 text-4xl">error</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Bookings</h3>
            <p className="text-gray-700">Please try refreshing the page</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-gray-400 text-5xl">event_busy</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-700 text-base">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "You don't have any bookings yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" role="table" aria-label="Bookings table">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Service</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Client</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <AnimatePresence>
                  {filteredBookings.map((booking, index) => (
                    <motion.tr
                      key={booking.service + booking.date}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="hover:bg-emerald-50/50 transition-colors"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mr-3 shadow-md">
                            <span className="material-symbols-outlined text-white text-xl">construction</span>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{booking.service}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3 shadow-md">
                            <span className="material-symbols-outlined text-white text-lg">person</span>
                          </div>
                          <span className="text-sm text-gray-900 font-semibold">{booking.client}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-800 font-medium">
                          <span className="material-symbols-outlined text-gray-600 mr-2 text-lg">calendar_today</span>
                          {booking.date}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span
                          className={`px-4 py-2 inline-flex items-center gap-2 text-xs leading-5 font-bold rounded-full shadow-sm ${
                            booking.status === "Completed"
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                              : "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                          }`}
                          role="status"
                          aria-label={`Status: ${booking.status}`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {booking.status === "Completed" ? "check_circle" : "schedule"}
                          </span>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-2.5 text-gray-700 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors shadow-sm border border-gray-200"
                            aria-label={`View details for ${booking.service}`}
                            title="View Details"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          <button
                            className="p-2.5 text-gray-700 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors shadow-sm border border-gray-200"
                            aria-label={`Edit booking for ${booking.service}`}
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          {booking.status === "Pending" && (
                            <button
                              className="p-2.5 text-gray-700 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors shadow-sm border border-gray-200"
                              aria-label={`Cancel booking for ${booking.service}`}
                              title="Cancel"
                            >
                              <span className="material-symbols-outlined text-lg">cancel</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results Count */}
      {filteredBookings.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-gray-800 bg-white py-3 px-6 rounded-lg border border-gray-200 shadow-sm">
          <span className="material-symbols-outlined text-emerald-600">list_alt</span>
          Showing <span className="font-bold text-emerald-600">{filteredBookings.length}</span> of <span className="font-bold">{bookings.length}</span> booking{bookings.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
};

export default BookingsPage;
