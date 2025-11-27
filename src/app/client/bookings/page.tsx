"use client";
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "@/components/Modal";
import { toast } from "sonner";

interface Booking {
  id: string;
  date: string;
  status: string;
  totalAmount: number;
  notes?: string;
  location?: string;
  clientPhone?: string;
  clientAddress?: string;
  job?: {
    id: string;
    title: string;
    category: {
      name: string;
    };
  };
  service?: {
    id: string;
    title: string;
    price: number;
  };
  provider: {
    id: string;
    name: string;
    image: string | null;
    email?: string;
  };
  slots?: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
  }[];
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-300",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-300",
  IN_PROGRESS: "bg-purple-100 text-purple-800 border-purple-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
  DISPUTED: "bg-orange-100 text-orange-800 border-orange-300",
};

const statusIcons: Record<string, string> = {
  PENDING: "schedule",
  CONFIRMED: "check_circle",
  IN_PROGRESS: "pending",
  COMPLETED: "task_alt",
  CANCELLED: "cancel",
  DISPUTED: "gavel",
};

export default function ClientBookingsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["client-bookings"],
    queryFn: async () => {
      const response = await apiClient.get("/bookings");
      return response.data;
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiClient.patch(`/bookings/${bookingId}`, {
        status: "CANCELLED",
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-bookings"] });
      toast.success("Booking cancelled successfully");
      setIsCancelModalOpen(false);
      setSelectedBooking(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to cancel booking");
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiClient.delete(`/bookings/${bookingId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-bookings"] });
      toast.success("Booking deleted permanently");
      setIsDeleteModalOpen(false);
      setSelectedBooking(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete booking");
    },
  });

  const bookings = data?.items || [];

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking: Booking) => {
      const matchesSearch =
        booking.provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (booking.job?.title || booking.service?.title || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  const statusCounts = useMemo(() => {
    return bookings.reduce((acc: Record<string, number>, booking: Booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {});
  }, [bookings]);

  const handleCancelBooking = () => {
    if (selectedBooking) {
      cancelBookingMutation.mutate(selectedBooking.id);
    }
  };

  const handleDeleteBooking = () => {
    if (selectedBooking) {
      deleteBookingMutation.mutate(selectedBooking.id);
    }
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          Error loading bookings. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">My Bookings</h1>
        <p className="mt-2 text-gray-600">View and manage your service bookings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <button
          onClick={() => setStatusFilter("all")}
          className={`p-4 rounded-xl border-2 transition-all ${
            statusFilter === "all"
              ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200"
              : "bg-white border-gray-200 hover:border-emerald-300"
          }`}
        >
          <div className="text-2xl font-bold text-gray-900">{bookings.length}</div>
          <div className="text-sm text-gray-600">All Bookings</div>
        </button>
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`p-4 rounded-xl border-2 transition-all ${
              statusFilter === status
                ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200"
                : "bg-white border-gray-200 hover:border-emerald-300"
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{count as number}</div>
            <div className="text-xs text-gray-600">{status.replace("_", " ")}</div>
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              search
            </span>
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="bg-white shadow-sm rounded-2xl p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Loading your bookings...</p>
          </div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white shadow-sm rounded-2xl p-12">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">event_busy</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || statusFilter !== "all" ? "No matching bookings" : "No bookings yet"}
            </h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "When you hire professionals, your bookings will appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-100">
          <ul className="divide-y divide-gray-100">
            <AnimatePresence>
              {filteredBookings.map((booking: Booking, index: number) => (
                <motion.li
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <div className="px-6 py-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                          {booking.provider.image ? (
                            <img
                              src={booking.provider.image}
                              alt={booking.provider.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-white text-2xl">person</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-gray-900">
                            {booking.job?.title || booking.service?.title || "Service Booking"}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {booking.job?.category.name || "Service"} • {booking.provider.name}
                          </p>
                          <div className="mt-2 text-sm text-gray-500">
                            {booking.slots && booking.slots.length > 0 ? (
                              <div className="space-y-1">
                                <p className="font-medium text-emerald-700 mb-1">
                                  {booking.slots.length} Session{booking.slots.length !== 1 ? "s" : ""}:
                                </p>
                                {booking.slots.slice(0, 2).map((slot) => (
                                  <div key={slot.id} className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">event</span>
                                    {new Date(slot.date).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                    <span className="text-gray-300">|</span>
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    {slot.startTime} - {slot.endTime}
                                  </div>
                                ))}
                                {booking.slots.length > 2 && (
                                  <p className="text-xs text-gray-500 ml-5">
                                    +{booking.slots.length - 2} more session{booking.slots.length - 2 !== 1 ? "s" : ""}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">schedule</span>
                                {new Date(booking.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}{" "}
                                at{" "}
                                {new Date(booking.date).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                            <div className="flex items-center gap-1 mt-2">
                              <span className="material-symbols-outlined text-sm">payments</span>
                              <span className="font-semibold text-emerald-600">
                                KES {booking.totalAmount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span
                          className={`px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-full border-2 ${
                            statusColors[booking.status] || "bg-gray-100 text-gray-800 border-gray-300"
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {statusIcons[booking.status] || "info"}
                          </span>
                          {booking.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setIsViewModalOpen(true);
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        View Details
                      </button>
                      {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setIsCancelModalOpen(true);
                          }}
                          className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          Cancel
                        </button>
                      )}
                      {(booking.status === "CANCELLED" || booking.status === "COMPLETED") && (
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setIsDeleteModalOpen(true);
                          }}
                          className="px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {/* View Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Booking Details"
        icon="info"
      >
        {selectedBooking && (
          <div className="space-y-6">
            {/* Provider Info */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {selectedBooking.provider.image ? (
                  <img
                    src={selectedBooking.provider.image}
                    alt={selectedBooking.provider.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  selectedBooking.provider.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{selectedBooking.provider.name}</h4>
                <p className="text-sm text-gray-600">Service Provider</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">handyman</span>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Service</p>
                </div>
                <p className="font-semibold text-gray-900">
                  {selectedBooking.job?.title || selectedBooking.service?.title}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">payments</span>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Amount</p>
                </div>
                <p className="font-semibold text-emerald-600 text-xl">
                  KES {selectedBooking.totalAmount.toLocaleString()}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 sm:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">schedule</span>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Date & Time</p>
                </div>
                {selectedBooking.slots && selectedBooking.slots.length > 0 ? (
                  <div className="space-y-2">
                    {selectedBooking.slots.map((slot: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-900 bg-white p-2 rounded-lg">
                        <span className="material-symbols-outlined text-blue-600 text-base">event</span>
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
                  <p className="font-medium text-gray-900">{selectedBooking.date}</p>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 sm:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">flag</span>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Status</p>
                </div>
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border-2 ${
                    statusColors[selectedBooking.status]
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {statusIcons[selectedBooking.status]}
                  </span>
                  {selectedBooking.status}
                </span>
              </div>

              {selectedBooking.location && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 sm:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-emerald-600 text-lg">location_on</span>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Location</p>
                  </div>
                  <p className="text-sm text-gray-900">{selectedBooking.location}</p>
                </div>
              )}

              {selectedBooking.notes && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 sm:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-emerald-600 text-lg">note</span>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Notes</p>
                  </div>
                  <p className="text-sm text-gray-900">{selectedBooking.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => !cancelBookingMutation.isPending && setIsCancelModalOpen(false)}
        title="Cancel Booking"
        icon="warning"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to cancel this booking? This action cannot be undone.
          </p>
          {selectedBooking && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="font-semibold text-gray-900">
                {selectedBooking.job?.title || selectedBooking.service?.title}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Provider: {selectedBooking.provider.name}
              </p>
              <p className="text-sm text-gray-600">
                Amount: KES {selectedBooking.totalAmount.toLocaleString()}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsCancelModalOpen(false)}
              disabled={cancelBookingMutation.isPending}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Keep Booking
            </button>
            <button
              onClick={handleCancelBooking}
              disabled={cancelBookingMutation.isPending}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {cancelBookingMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  Yes, Cancel Booking
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !deleteBookingMutation.isPending && setIsDeleteModalOpen(false)}
        title="Delete Booking Permanently"
        icon="danger"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined">warning</span>
              Warning: This action is permanent!
            </p>
          </div>
          <p className="text-gray-700">
            Are you sure you want to permanently delete this booking? This will remove all booking history and cannot be undone.
          </p>
          {selectedBooking && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="font-semibold text-gray-900">
                {selectedBooking.job?.title || selectedBooking.service?.title}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Provider: {selectedBooking.provider.name}
              </p>
              <p className="text-sm text-gray-600">
                Amount: KES {selectedBooking.totalAmount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                Status: <span className="font-semibold">{selectedBooking.status}</span>
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteBookingMutation.isPending}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Keep Booking
            </button>
            <button
              onClick={handleDeleteBooking}
              disabled={deleteBookingMutation.isPending}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {deleteBookingMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Yes, Delete Permanently
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
