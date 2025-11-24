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
        <h1 className="text-gray-800 text-3xl font-bold leading-tight mb-2">Bookings</h1>
        <p className="text-gray-500 text-sm font-normal leading-normal">Manage and track all your service bookings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "All Bookings", count: statusCounts.all, color: "blue" },
          { label: "Completed", count: statusCounts.Completed, color: "green" },
          { label: "Pending", count: statusCounts.Pending, color: "yellow" },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.count}</p>
              </div>
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  stat.color === "blue"
                    ? "bg-blue-100"
                    : stat.color === "green"
                    ? "bg-green-100"
                    : "bg-yellow-100"
                }`}
              >
                <span className={`material-symbols-outlined ${
                  stat.color === "blue"
                    ? "text-blue-600"
                    : stat.color === "green"
                    ? "text-green-600"
                    : "text-yellow-600"
                }`}
                >
                  {stat.color === "blue"
                    ? "calendar_month"
                    : stat.color === "green"
                    ? "check_circle"
                    : "schedule"}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              placeholder="Search by service or client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              aria-label="Search bookings"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {["all", "Completed", "Pending"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  statusFilter === status
                    ? "bg-primary-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                aria-label={`Filter by ${status}`}
                aria-pressed={statusFilter === status}
              >
                {status === "all" ? "All" : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        {bookingsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : bookingsError ? (
          <div className="text-center py-8 text-red-600">Error loading bookings.</div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-gray-400 text-4xl">event_busy</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500 text-sm">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "You don't have any bookings yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" role="table" aria-label="Bookings table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {filteredBookings.map((booking, index) => (
                    <motion.tr
                      key={booking.service + booking.date}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="material-symbols-outlined text-primary-600">construction</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{booking.service}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                            <span className="material-symbols-outlined text-gray-600 text-sm">person</span>
                          </div>
                          <span className="text-sm text-gray-700 font-medium">{booking.client}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="material-symbols-outlined text-gray-400 mr-1 text-sm">calendar_today</span>
                          {booking.date}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1.5 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${
                            booking.status === "Completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                          role="status"
                          aria-label={`Status: ${booking.status}`}
                        >
                          <span className="material-symbols-outlined text-xs">
                            {booking.status === "Completed" ? "check_circle" : "schedule"}
                          </span>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            aria-label={`View details for ${booking.service}`}
                            title="View Details"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                          </button>
                          <button
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            aria-label={`Edit booking for ${booking.service}`}
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          {booking.status === "Pending" && (
                            <button
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label={`Cancel booking for ${booking.service}`}
                              title="Cancel"
                            >
                              <span className="material-symbols-outlined text-sm">cancel</span>
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
        <div className="mt-4 text-sm text-gray-500 text-center">
          Showing {filteredBookings.length} of {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
};

export default BookingsPage;
