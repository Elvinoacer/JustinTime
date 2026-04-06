"use client";

import { useState, useMemo, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelBooking } from "@/app/actions/cancellation";
import DisputeModal from "@/components/bookings/DisputeModal";
import {
  useProviderBookings,
  useUpdateBooking,
  useDeleteBooking,
} from "@/lib/api/hooks/useProvider";
import { Calendar } from "@/components/ui/calendar";
import { Modal, ConfirmModal } from "@/components/Modal";
import apiClient from "@/lib/api/client";
import { toast } from "sonner";
import { Popover, Transition } from "@headlessui/react";

const BookingsPage = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const queryClient = useQueryClient();

  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    error: bookingsError,
  } = useProviderBookings({
    status: statusFilter === "all" ? undefined : statusFilter,
    from: dateRange?.from,
    to: dateRange?.to,
  });
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  // Modal states
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationError, setCancellationError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const getErrorMessage = (error: any, fallback: string) => {
    const zodErrors = error?.response?.data?.error;
    if (Array.isArray(zodErrors) && zodErrors[0]?.message) {
      return zodErrors[0].message;
    }

    return (
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      fallback
    );
  };

  const canCancelBooking = (status: string) =>
    status === "PENDING" || status === "CONFIRMED";

  const canDisputeBooking = (status: string) =>
    ["CONFIRMED", "IN_PROGRESS"].includes(status);

  const handleInitiateCancel = (booking: any) => {
    setSelectedBooking(booking);
    setCancellationReason("");
    setCancellationError("");
    setIsViewModalOpen(false);
    setIsCancelModalOpen(true);
  };

  const handleInitiateDispute = (booking: any) => {
    setSelectedBooking(booking);
    setIsViewModalOpen(false);
    setIsDisputeModalOpen(true);
  };

  const cancelBookingMutation = useMutation({
    mutationFn: async ({
      bookingId,
      reason,
    }: {
      bookingId: string;
      reason: string;
    }) => {
      return cancelBooking(bookingId, reason);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["provider", "bookings"] });
      const refundAmount = Number(result?.refundAmount || 0);
      if (refundAmount > 0) {
        toast.success(
          `Booking cancelled. KES ${refundAmount.toLocaleString()} refunded to client wallet.`,
        );
      } else {
        toast.success("Booking cancelled successfully");
      }

      setIsCancelModalOpen(false);
      setCancellationReason("");
      setCancellationError("");
      setSelectedBooking(null);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, "Failed to cancel booking"));
    },
  });

  const disputeBookingMutation = useMutation({
    mutationFn: async ({
      bookingId,
      reason,
    }: {
      bookingId: string;
      reason: string;
    }) => {
      const response = await apiClient.post(`/bookings/${bookingId}/dispute`, {
        reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider", "bookings"] });
      toast.success("Dispute filed successfully. Admin review has started.");
      setIsDisputeModalOpen(false);
      setIsViewModalOpen(false);
      setSelectedBooking(null);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, "Failed to file dispute"));
    },
  });

  const bookings = bookingsData?.bookings || [];

  // Filter bookings based on search
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking: any) => {
      const matchesSearch =
        booking.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.client.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [bookings, searchQuery]);

  const statusCounts = useMemo(() => {
    return {
      all: bookings.length,
      COMPLETED: bookings.filter((b: any) => b.status === "COMPLETED").length,
      AWAITING_CLIENT_CONFIRMATION: bookings.filter(
        (b: any) => b.status === "AWAITING_CLIENT_CONFIRMATION",
      ).length,
      PENDING: bookings.filter((b: any) => b.status === "PENDING").length,
      CONFIRMED: bookings.filter((b: any) => b.status === "CONFIRMED").length,
      IN_PROGRESS: bookings.filter((b: any) => b.status === "IN_PROGRESS")
        .length,
      CANCELLED: bookings.filter((b: any) => b.status === "CANCELLED").length,
    };
  }, [bookings]);

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: "bg-amber-100 text-amber-800 border-amber-200",
      CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
      IN_PROGRESS: "bg-purple-100 text-purple-800 border-purple-200",
      AWAITING_CLIENT_CONFIRMATION:
        "bg-indigo-100 text-indigo-800 border-indigo-200",
      COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
      CANCELLED: "bg-red-100 text-red-800 border-red-200",
      DISPUTED: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return (
      colors[status as keyof typeof colors] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      PENDING: "schedule",
      CONFIRMED: "check_circle",
      IN_PROGRESS: "pending",
      AWAITING_CLIENT_CONFIRMATION: "hourglass_top",
      COMPLETED: "task_alt",
      CANCELLED: "cancel",
      DISPUTED: "gavel",
    };
    return icons[status as keyof typeof icons] || "help";
  };

  return (
    <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl xs:text-2xl sm:text-3xl font-bold text-gray-900 mb-1.5 sm:mb-2">
              Bookings
            </h1>
            <p className="text-xs xs:text-xs sm:text-sm text-gray-600">
              Manage and track all your service bookings
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex gap-1 bg-white p-0.5 sm:p-1 rounded-lg shadow-sm border border-gray-200 self-start">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              aria-label="Grid view"
            >
              <span className="material-symbols-outlined text-xs sm:text-sm">
                grid_view
              </span>
              <span className="hidden xs:inline text-xs sm:text-sm font-medium">
                Grid
              </span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === "list"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              aria-label="List view"
            >
              <span className="material-symbols-outlined text-xs sm:text-sm">
                view_list
              </span>
              <span className="hidden xs:inline text-xs sm:text-sm font-medium">
                List
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Mobile: 2 columns, Desktop: 6 columns */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
        {[
          {
            label: "Total",
            count: statusCounts.all,
            value: "all",
            gradient: "from-gray-500 to-gray-600",
            icon: "calendar_month",
          },
          {
            label: "Pending",
            count: statusCounts.PENDING,
            value: "PENDING",
            gradient: "from-amber-500 to-amber-600",
            icon: "schedule",
          },
          {
            label: "Confirmed",
            count: statusCounts.CONFIRMED,
            value: "CONFIRMED",
            gradient: "from-blue-500 to-blue-600",
            icon: "check_circle",
          },
          {
            label: "In Progress",
            count: statusCounts.IN_PROGRESS,
            value: "IN_PROGRESS",
            gradient: "from-purple-500 to-purple-600",
            icon: "pending",
          },
          {
            label: "Awaiting client",
            count: statusCounts.AWAITING_CLIENT_CONFIRMATION,
            value: "AWAITING_CLIENT_CONFIRMATION",
            gradient: "from-indigo-500 to-indigo-600",
            icon: "hourglass_top",
          },
          {
            label: "Completed",
            count: statusCounts.COMPLETED,
            value: "COMPLETED",
            gradient: "from-emerald-500 to-emerald-600",
            icon: "task_alt",
          },
        ].map((stat) => (
          <motion.button
            key={stat.value}
            onClick={() => setStatusFilter(stat.value)}
            className={`bg-white rounded-lg sm:rounded-xl shadow-xs hover:shadow-sm p-3 sm:p-4 border transition-all text-left ${
              statusFilter === stat.value
                ? "border-emerald-500 ring-1 sm:ring-2 ring-emerald-200"
                : "border-gray-200"
            }`}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-linear-to-br ${stat.gradient} flex items-center justify-center shadow-xs sm:shadow-sm`}
              >
                <span className="material-symbols-outlined text-white text-sm sm:text-lg">
                  {stat.icon}
                </span>
              </div>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 mb-0.5 sm:mb-1">
              {stat.count}
            </p>
            <p className="text-[10px] xs:text-xs font-medium text-gray-600">
              {stat.label}
            </p>
          </motion.button>
        ))}
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-xs sm:shadow-sm p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm sm:text-base">
              search
            </span>
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400 placeholder:text-sm"
              aria-label="Search bookings"
            />
          </div>

          {/* Date Range Picker */}
          <Popover className="relative">
            <Popover.Button className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 text-gray-700 font-medium w-full md:w-auto justify-between md:justify-start whitespace-nowrap text-sm sm:text-base">
              <span className="material-symbols-outlined text-gray-500 text-sm sm:text-base">
                calendar_today
              </span>
              <span className="text-xs sm:text-sm truncate">
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM dd")} -{" "}
                      {format(dateRange.to, "MMM dd")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM dd, yyyy")
                  )
                ) : (
                  "All dates"
                )}
              </span>
              {dateRange?.from && (
                <span
                  className="material-symbols-outlined text-gray-400 hover:text-gray-600 text-sm sm:text-base ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateRange(undefined);
                  }}
                >
                  close
                </span>
              )}
            </Popover.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute right-0 z-10 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-2 sm:p-4 w-[calc(100vw-2rem)] max-w-sm sm:max-w-none">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  className="w-full p-0"
                />
              </Popover.Panel>
            </Transition>
          </Popover>
        </div>
      </div>

      {/* Bookings Grid/List */}
      {bookingsLoading ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-600 font-medium">
            Loading bookings...
          </p>
        </div>
      ) : bookingsError ? (
        <div className="text-center py-12 sm:py-16 px-4 bg-white rounded-xl border border-red-200">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <span className="material-symbols-outlined text-red-600 text-3xl sm:text-4xl">
              error
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">
            Error Loading Bookings
          </h3>
          <p className="text-sm text-gray-600">
            Please try refreshing the page
          </p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-16 sm:py-20 px-4 bg-white rounded-xl border border-gray-200">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <span className="material-symbols-outlined text-gray-400 text-4xl sm:text-5xl">
              event_busy
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2">
            No bookings found
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "You don't have any bookings yet"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        // Grid View - Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredBookings.map((booking: any, index: number) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="bg-white rounded-lg sm:rounded-xl shadow-xs hover:shadow-sm border border-gray-200 overflow-hidden transition-all group"
              >
                {/* Card Header with Status */}
                <div className="relative p-4 sm:p-6 pb-3 sm:pb-4 bg-linear-to-br from-gray-50 to-white">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div
                      className={`px-2.5 py-1 rounded-full text-[10px] xs:text-xs font-bold border flex items-center gap-1 ${getStatusColor(
                        booking.status,
                      )}`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        ${getStatusIcon(booking.status)}
                      </span>
                      {booking.status}
                    </div>
                    <div className="flex gap-0.5">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedBooking(booking);
                          setIsViewModalOpen(true);
                        }}
                        className="p-1.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <span className="material-symbols-outlined text-sm">
                          visibility
                        </span>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedBooking(booking);
                          setEditStatus(booking.status);
                          setEditNotes(booking.notes || "");
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-sm">
                          edit
                        </span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Client Info with Avatar */}
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-sm">
                      {booking.clientImage ? (
                        <img
                          src={booking.clientImage}
                          alt={booking.client}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        booking.client.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm sm:text-base truncate">
                        {booking.client}
                      </p>
                      <p className="text-[10px] xs:text-xs text-gray-500 truncate">
                        Client
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-6 pt-2 sm:pt-4 space-y-3 sm:space-y-4">
                  {/* Service */}
                  <div>
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5">
                        handyman
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] xs:text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">
                          Service
                        </p>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {booking.service}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div>
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-blue-600 text-sm mt-0.5">
                        schedule
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] xs:text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">
                          Date & Time
                        </p>
                        {booking.slots && booking.slots.length > 0 ? (
                          <div className="space-y-1">
                            {booking.slots
                              .slice(0, 2)
                              .map((slot: any, i: number) => (
                                <p
                                  key={i}
                                  className="text-xs sm:text-sm text-gray-900"
                                >
                                  {new Date(slot.date).toLocaleDateString(
                                    "en-US",
                                    { month: "short", day: "numeric" },
                                  )}{" "}
                                  • {slot.startTime} - {slot.endTime}
                                </p>
                              ))}
                            {booking.slots.length > 2 && (
                              <p className="text-[10px] xs:text-xs text-emerald-600 font-medium">
                                +{booking.slots.length - 2} more slots
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-900">
                            {booking.date}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="pt-3 sm:pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-gray-500 font-medium">
                        Total Amount
                      </span>
                      <span className="text-lg sm:text-xl font-bold text-emerald-600">
                        {booking.amount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                {(booking.status === "PENDING" ||
                  booking.status === "CANCELLED" ||
                  booking.status === "COMPLETED") && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    {booking.status === "PENDING" ? (
                      <button
                        onClick={() => handleInitiateCancel(booking)}
                        className="w-full p-2 sm:p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 sm:gap-2 group"
                      >
                        <span className="material-symbols-outlined text-xs sm:text-sm group-hover:scale-110 transition-transform">
                          cancel
                        </span>
                        Cancel Booking
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setIsDeleteModalOpen(true);
                        }}
                        className="w-full p-2 sm:p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 sm:gap-2 group"
                      >
                        <span className="material-symbols-outlined text-xs sm:text-sm group-hover:scale-110 transition-transform">
                          delete
                        </span>
                        Delete Booking
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[640px]">
              <thead className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th
                    scope="col"
                    className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider"
                  >
                    Client
                  </th>
                  <th
                    scope="col"
                    className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider"
                  >
                    Service
                  </th>
                  <th
                    scope="col"
                    className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 sm:px-6 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <AnimatePresence>
                  {filteredBookings.map((booking: any, index: number) => (
                    <motion.tr
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="hover:bg-emerald-50/30 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                            {booking.clientImage ? (
                              <img
                                src={booking.clientImage}
                                alt={booking.client}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              booking.client.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[80px] sm:max-w-none">
                            {booking.client}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[100px] sm:max-w-none">
                          {booking.service}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-800">
                          {booking.slots && booking.slots.length > 0 ? (
                            <div>
                              {new Date(
                                booking.slots[0].date,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                              {booking.slots.length > 1 && (
                                <span className="text-[10px] sm:text-xs text-gray-500 ml-0.5 sm:ml-1">
                                  +{booking.slots.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            booking.date
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-xs sm:text-sm font-bold text-emerald-600">
                          {booking.amount}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 inline-flex items-center gap-1 text-[10px] xs:text-xs font-bold rounded-full border ${getStatusColor(
                            booking.status,
                          )}`}
                        >
                          <span className="material-symbols-outlined text-xs">
                            ${getStatusIcon(booking.status)}
                          </span>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setIsViewModalOpen(true);
                            }}
                            className="p-1.5 sm:p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <span className="material-symbols-outlined text-sm">
                              visibility
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setEditStatus(booking.status);
                              setEditNotes(booking.notes || "");
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-sm">
                              edit
                            </span>
                          </button>
                          {booking.status === "PENDING" && (
                            <button
                              onClick={() => handleInitiateCancel(booking)}
                              className="p-1.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <span className="material-symbols-outlined text-sm">
                                cancel
                              </span>
                            </button>
                          )}
                          {(booking.status === "CANCELLED" ||
                            booking.status === "COMPLETED") && (
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-sm">
                                delete
                              </span>
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
        </div>
      )}

      {/* Results Count */}
      {filteredBookings.length > 0 && (
        <div className="mt-4 sm:mt-6 text-center">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg border border-gray-200 shadow-xs">
            <span className="material-symbols-outlined text-emerald-600 text-xs sm:text-sm">
              list_alt
            </span>
            <span className="text-xs sm:text-sm font-medium text-gray-600">
              Showing{" "}
              <span className="font-bold text-emerald-600">
                {filteredBookings.length}
              </span>{" "}
              of <span className="font-bold">{bookings.length}</span> bookings
            </span>
          </div>
        </div>
      )}

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Booking Details"
        icon="info"
      >
        {selectedBooking && (
          <div className="space-y-4 sm:space-y-6">
            {/* Client Info */}
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-md">
                {selectedBooking.clientImage ? (
                  <img
                    src={selectedBooking.clientImage}
                    alt={selectedBooking.client}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  selectedBooking.client.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base sm:text-lg">
                  {selectedBooking.client}
                </h4>
                <p className="text-xs sm:text-sm text-gray-600">Client</p>
              </div>
            </div>

            {selectedBooking.status === "DISPUTED" && (
              <div className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                This booking is in dispute. Funds remain frozen while admin
                support investigates both sides.
              </div>
            )}

            {/* Contact Information - Quick Actions */}
            {(selectedBooking.clientPhone || selectedBooking.clientAddress) && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 sm:p-4">
                <h4 className="font-bold text-blue-900 text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                  <span className="material-symbols-outlined text-sm sm:text-base">
                    contact_phone
                  </span>
                  Contact Information
                </h4>
                <div className="space-y-2 sm:space-y-3">
                  {selectedBooking.clientPhone && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-2.5 sm:p-3 rounded-lg border border-blue-200 gap-2 sm:gap-0">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-white text-sm sm:text-lg">
                            phone
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Phone
                          </p>
                          <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                            {selectedBooking.clientPhone}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 sm:gap-2">
                        <a
                          href={`tel:${selectedBooking.clientPhone}`}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 shadow-md"
                          onClick={() => toast.success("Opening phone app...")}
                        >
                          <span className="material-symbols-outlined text-xs sm:text-sm">
                            call
                          </span>
                          Call Now
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              selectedBooking.clientPhone,
                            );
                            toast.success("Phone number copied!");
                          }}
                          className="p-1.5 sm:p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                          title="Copy phone number"
                        >
                          <span className="material-symbols-outlined text-sm">
                            content_copy
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedBooking.clientAddress && (
                    <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-white text-sm sm:text-lg">
                            location_on
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5 sm:mb-1">
                            Address
                          </p>
                          <p className="text-xs sm:text-sm text-gray-900 leading-relaxed">
                            {selectedBooking.clientAddress}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                        <button
                          onClick={() => {
                            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              selectedBooking.clientAddress,
                            )}`;
                            window.open(mapsUrl, "_blank");
                            toast.success("Opening in Google Maps...");
                          }}
                          className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-md"
                        >
                          <span className="material-symbols-outlined text-xs sm:text-sm">
                            map
                          </span>
                          Open in Maps
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              selectedBooking.clientAddress,
                            );
                            toast.success("Address copied!");
                          }}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5 sm:gap-2"
                        >
                          <span className="material-symbols-outlined text-xs sm:text-sm">
                            content_copy
                          </span>
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Details Grid - Mobile: 1 column, Desktop: 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-lg">
                    handyman
                  </span>
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold tracking-wide">
                    Service
                  </p>
                </div>
                <p className="font-semibold text-gray-900 text-sm sm:text-base">
                  {selectedBooking.service}
                </p>
              </div>

              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-lg">
                    payments
                  </span>
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold tracking-wide">
                    Amount
                  </p>
                </div>
                <p className="font-semibold text-emerald-600 text-lg sm:text-xl">
                  {selectedBooking.amount}
                </p>
              </div>

              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200 sm:col-span-2">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-lg">
                    schedule
                  </span>
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold tracking-wide">
                    Date & Time
                  </p>
                </div>
                {selectedBooking.slots && selectedBooking.slots.length > 0 ? (
                  <div className="space-y-1.5 sm:space-y-2">
                    {selectedBooking.slots.map((slot: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-900 bg-white p-1.5 sm:p-2 rounded-lg"
                      >
                        <span className="material-symbols-outlined text-blue-600 text-xs sm:text-base">
                          event
                        </span>
                        {new Date(slot.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        • {slot.startTime} - {slot.endTime}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-medium text-gray-900 text-sm sm:text-base">
                    {selectedBooking.date}
                  </p>
                )}
              </div>

              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200 sm:col-span-2">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-lg">
                    flag
                  </span>
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold tracking-wide">
                    Status
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border ${getStatusColor(
                    selectedBooking.status,
                  )}`}
                >
                  <span className="material-symbols-outlined text-sm">
                    ${getStatusIcon(selectedBooking.status)}
                  </span>
                  {selectedBooking.status}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-3 sm:pt-4 border-t border-gray-200">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
              >
                Close
              </button>

              {canCancelBooking(selectedBooking.status) && (
                <button
                  onClick={() => handleInitiateCancel(selectedBooking)}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium text-sm transition-colors"
                >
                  Cancel Booking
                </button>
              )}

              {canDisputeBooking(selectedBooking.status) && (
                <button
                  onClick={() => handleInitiateDispute(selectedBooking)}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-medium text-sm transition-colors"
                >
                  File Dispute
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Booking"
        icon="warning"
      >
        <div className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                flag
              </span>
              Status
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            >
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="AWAITING_CLIENT_CONFIRMATION">
                Awaiting Client Confirmation
              </option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                notes
              </span>
              Notes
            </label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-all"
              placeholder="Add notes about this booking..."
            />
          </div>

          <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!selectedBooking) return;
                updateBooking.mutate(
                  {
                    id: selectedBooking.id,
                    data: { status: editStatus, notes: editNotes },
                  },
                  {
                    onSuccess: () => {
                      toast.success("Booking updated successfully");
                      setIsEditModalOpen(false);
                    },
                    onError: () => {
                      toast.error("Failed to update booking");
                    },
                  },
                );
              }}
              disabled={updateBooking.isPending}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 shadow-md"
            >
              {updateBooking.isPending ? (
                <>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-xs sm:text-sm">Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm sm:text-base">
                    save
                  </span>
                  <span className="text-xs sm:text-sm">Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          if (!cancelBookingMutation.isPending) {
            setIsCancelModalOpen(false);
            setCancellationError("");
          }
        }}
        title="Cancel Booking"
        icon="warning"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            A cancellation reason is required for support and refund audit
            records.
          </p>

          {selectedBooking && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">
                {selectedBooking.service}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Client: {selectedBooking.client}
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Cancellation reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              maxLength={500}
              value={cancellationReason}
              onChange={(event) => {
                setCancellationReason(event.target.value);
                if (cancellationError) setCancellationError("");
              }}
              placeholder="Explain why you are cancelling this booking."
              className={`w-full resize-none rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 ${
                cancellationError
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300 focus:ring-emerald-500"
              }`}
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <p
                className={cancellationError ? "text-red-600" : "text-gray-500"}
              >
                {cancellationError || "Minimum 5 characters"}
              </p>
              <p className="text-gray-500">{cancellationReason.length}/500</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 xs:flex-row xs:justify-end">
            <button
              type="button"
              onClick={() => {
                setIsCancelModalOpen(false);
                setCancellationError("");
              }}
              disabled={cancelBookingMutation.isPending}
              className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
            >
              Keep Booking
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedBooking) return;
                const normalizedReason = cancellationReason.trim();
                if (normalizedReason.length < 5) {
                  setCancellationError("Please provide at least 5 characters.");
                  return;
                }

                setCancellationError("");
                cancelBookingMutation.mutate({
                  bookingId: selectedBooking.id,
                  reason: normalizedReason,
                });
              }}
              disabled={cancelBookingMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {cancelBookingMutation.isPending
                ? "Cancelling..."
                : "Confirm Cancel"}
            </button>
          </div>
        </div>
      </Modal>

      <DisputeModal
        isOpen={isDisputeModalOpen}
        onClose={() => {
          if (!disputeBookingMutation.isPending) {
            setIsDisputeModalOpen(false);
          }
        }}
        onSubmit={(reason) => {
          if (!selectedBooking) return;

          disputeBookingMutation.mutate({
            bookingId: selectedBooking.id,
            reason,
          });
        }}
        isSubmitting={disputeBookingMutation.isPending}
        title="File Booking Dispute"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (!selectedBooking) return;
          deleteBooking.mutate(selectedBooking.id, {
            onSuccess: () => {
              toast.success("Booking deleted permanently");
              setIsDeleteModalOpen(false);
            },
            onError: (error: any) => {
              toast.error(
                error.response?.data?.message || "Failed to delete booking",
              );
            },
          });
        }}
        title="Delete Booking Permanently"
        description="Are you sure you want to permanently delete this booking? This action cannot be undone and will remove all booking history."
        confirmText="Yes, Delete Permanently"
        danger
        isLoading={deleteBooking.isPending}
      />
    </div>
  );
};

export default BookingsPage;
