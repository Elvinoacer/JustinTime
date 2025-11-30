"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  User,
  Briefcase,
  ArrowUpDown,
  Filter,
} from "lucide-react";

interface Booking {
  id: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  status: string;
  totalAmount: any;
  location: string | null;
  notes: string | null;
  clientPhone: string | null;
  client: { name: string | null; email: string | null };
  provider: { name: string | null; email: string | null };
  service: { title: string } | null;
}

interface EnhancedBookingsTableProps {
  bookings: Booking[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export default function EnhancedBookingsTable({
  bookings,
  total,
  currentPage,
  totalPages,
}: EnhancedBookingsTableProps) {
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return {
          bg: "bg-emerald-100",
          text: "text-emerald-700",
          border: "border-emerald-200",
          icon: CheckCircle2,
        };
      case "CONFIRMED":
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
          border: "border-blue-200",
          icon: CheckCircle2,
        };
      case "IN_PROGRESS":
        return {
          bg: "bg-purple-100",
          text: "text-purple-700",
          border: "border-purple-200",
          icon: Clock,
        };
      case "CANCELLED":
        return {
          bg: "bg-red-100",
          text: "text-red-700",
          border: "border-red-200",
          icon: XCircle,
        };
      case "DISPUTED":
        return {
          bg: "bg-orange-100",
          text: "text-orange-700",
          border: "border-orange-200",
          icon: XCircle,
        };
      default:
        return {
          bg: "bg-amber-100",
          text: "text-amber-700",
          border: "border-amber-200",
          icon: Clock,
        };
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return "--:--";
    return time.replace(/:00$/, "");
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Exporting bookings...");
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Mobile Card View Component
  const MobileBookingCard = ({
    booking,
    index,
  }: {
    booking: Booking;
    index: number;
  }) => {
    const statusConfig = getStatusColor(booking.status);
    const StatusIcon = statusConfig.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 hover:shadow-lg transition-all duration-200 cursor-pointer"
        onClick={() => setSelectedBooking(booking)}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="w-4 h-4 text-blue-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 text-sm truncate">
                {booking.service?.title || "Custom Job"}
              </p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                ID: {booking.id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border} flex-shrink-0`}
          >
            <StatusIcon className="w-3 h-3" />
            {booking.status.replace("_", " ")}
          </span>
        </div>

        {/* Client & Provider */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">Client</p>
            <p className="font-semibold text-slate-900 truncate">
              {booking.client.name || "Unknown"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">Provider</p>
            <p className="font-semibold text-slate-900 truncate">
              {booking.provider.name || "Unknown"}
            </p>
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-slate-600">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(booking.date)}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <Clock className="w-3 h-3" />
            <span>{formatTime(booking.startTime)}</span>
          </div>
        </div>

        {/* Amount & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <p className="text-lg font-bold text-slate-900">
            KES {Number(booking.totalAmount).toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBooking(booking);
              }}
              className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === booking.id ? null : booking.id);
              }}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm sm:shadow-lg border border-slate-100 sm:border-slate-100 overflow-hidden">
        {/* Table Header with Export */}
        <div className="px-3 xs:px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base xs:text-lg font-bold text-slate-900">
                All Bookings
              </h2>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                {total.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 xs:px-4 xs:py-2 bg-white border border-slate-200 rounded-lg text-xs xs:text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                <span className="hidden xs:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="block lg:hidden p-3 xs:p-4 space-y-3">
          {bookings.map((booking, index) => (
            <MobileBookingCard
              key={booking.id}
              booking={booking}
              index={index}
            />
          ))}

          {bookings.length === 0 && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-3">
                <Briefcase className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium text-sm">
                No bookings found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try adjusting your filters
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th
                  className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("service")}
                >
                  <div className="flex items-center gap-1">
                    Booking Details
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Provider
                </th>
                <th
                  className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center gap-1">
                    Date & Time
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="px-4 xl:px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("totalAmount")}
                >
                  <div className="flex items-center gap-1 justify-end">
                    Amount
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 xl:px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((booking, index) => {
                const statusConfig = getStatusColor(booking.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <motion.tr
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group hover:bg-blue-50/30 transition-all duration-200 cursor-pointer"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    {/* Booking Details */}
                    <td className="px-4 xl:px-6 py-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors flex-shrink-0">
                          <Briefcase className="w-4 h-4 text-blue-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                            {booking.service?.title || "Custom Job"}
                          </p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            ID: {booking.id.slice(-8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="px-4 xl:px-6 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {(booking.client.name || "U")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {booking.client.name || "Unknown"}
                          </p>
                          <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            {booking.client.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Provider */}
                    <td className="px-4 xl:px-6 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {(booking.provider.name || "U")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {booking.provider.name || "Unknown"}
                          </p>
                          <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            {booking.provider.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td className="px-4 xl:px-6 py-3">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900 flex items-center gap-1.5 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(booking.date)}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {formatTime(booking.startTime)}{" "}
                          {booking.endTime &&
                            `- ${formatTime(booking.endTime)}`}
                        </p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 xl:px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {booking.status.replace("_", " ")}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 xl:px-6 py-3 text-right">
                      <p className="text-base font-bold text-slate-900">
                        KES {Number(booking.totalAmount).toLocaleString()}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-4 xl:px-6 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                          }}
                          className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors group/btn"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-slate-400 group-hover/btn:text-blue-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(
                              activeMenu === booking.id ? null : booking.id
                            );
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {bookings.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                <Briefcase className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No bookings found</p>
              <p className="text-sm text-slate-400 mt-1">
                Try adjusting your filters
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-3 xs:px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 xs:gap-0">
              <p className="text-xs xs:text-sm text-slate-600 text-center xs:text-left">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {bookings.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {total.toLocaleString()}
                </span>{" "}
                bookings
              </p>

              <div className="flex items-center justify-center gap-1 xs:gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => router.push(`?page=${currentPage - 1}`)}
                  className="flex items-center gap-1 px-3 py-1.5 xs:px-4 xs:py-2 text-xs xs:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                  <span className="hidden xs:inline">Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage <= 2) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 1) {
                      pageNum = totalPages - 2 + i;
                    } else {
                      pageNum = currentPage - 1 + i;
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => router.push(`?page=${pageNum}`)}
                        className={`w-8 h-8 xs:w-10 xs:h-10 rounded-lg text-xs xs:text-sm font-medium transition-all ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => router.push(`?page=${currentPage + 1}`)}
                  className="flex items-center gap-1 px-3 py-1.5 xs:px-4 xs:py-2 text-xs xs:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <span className="hidden xs:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking Details Modal - Mobile Responsive */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 xs:p-4"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-sm xs:max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold truncate">
                      Booking Details
                    </h3>
                    <p className="text-blue-100 text-xs sm:text-sm mt-1 font-mono truncate">
                      ID: {selectedBooking.id.slice(-12).toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="p-1 sm:p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 ml-2"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Service Info */}
                <div className="bg-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                    Service
                  </p>
                  <p className="text-base sm:text-lg font-bold text-slate-900">
                    {selectedBooking.service?.title || "Custom Job"}
                  </p>
                </div>

                {/* Client & Provider */}
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-violet-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-violet-100">
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Client
                    </p>
                    <p className="font-semibold text-slate-900 text-sm sm:text-base">
                      {selectedBooking.client.name || "Unknown"}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1 mt-1">
                      <Mail className="w-3 h-3" />
                      {selectedBooking.client.email}
                    </p>
                    {selectedBooking.clientPhone && (
                      <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {selectedBooking.clientPhone}
                      </p>
                    )}
                  </div>

                  <div className="bg-cyan-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-cyan-100">
                    <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Provider
                    </p>
                    <p className="font-semibold text-slate-900 text-sm sm:text-base">
                      {selectedBooking.provider.name || "Unknown"}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1 mt-1">
                      <Mail className="w-3 h-3" />
                      {selectedBooking.provider.email}
                    </p>
                  </div>
                </div>

                {/* Date, Time & Location */}
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2 sm:space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                        Date
                      </p>
                      <p className="flex items-center gap-2 text-slate-900 font-medium text-sm sm:text-base">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        {formatDate(selectedBooking.date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                        Time
                      </p>
                      <p className="flex items-center gap-2 text-slate-900 font-medium text-sm sm:text-base">
                        <Clock className="w-4 h-4 text-blue-600" />
                        {formatTime(selectedBooking.startTime)}{" "}
                        {selectedBooking.endTime &&
                          `- ${formatTime(selectedBooking.endTime)}`}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                      Location
                    </p>
                    <p className="flex items-start gap-2 text-slate-900 text-sm sm:text-base">
                      <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span>{selectedBooking.location || "Not specified"}</span>
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {selectedBooking.notes && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                      Notes
                    </p>
                    <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200">
                      {selectedBooking.notes}
                    </p>
                  </div>
                )}

                {/* Amount & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg sm:rounded-xl border border-emerald-200">
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">
                      Total Amount
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900">
                      KES {Number(selectedBooking.totalAmount).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    {(() => {
                      const statusConfig = getStatusColor(
                        selectedBooking.status
                      );
                      const StatusIcon = statusConfig.icon;
                      return (
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold ${statusConfig.bg} ${statusConfig.text} border-2 ${statusConfig.border}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {selectedBooking.status.replace("_", " ")}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
