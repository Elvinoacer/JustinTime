"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProviderRequests, useAcceptBooking, useRejectBooking } from "@/lib/api/hooks/useBookings";
import { toast } from "sonner";

const tabs = ["pending", "confirmed", "cancelled", "all"];

const tabLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Accepted",
  cancelled: "Rejected",
  all: "All Requests",
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  CONFIRMED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Accepted" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  COMPLETED: { bg: "bg-blue-100", text: "text-blue-700", label: "Completed" },
};

export default function JobRequestsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useProviderRequests(activeTab, 1);
  const acceptBooking = useAcceptBooking();
  const rejectBooking = useRejectBooking();

  const requests = data?.items || [];

  const handleAccept = async (bookingId: string) => {
    if (confirm("Are you sure you want to accept this booking?")) {
      try {
        await acceptBooking.mutateAsync(bookingId);
        toast.success("Booking accepted successfully!");
      } catch (error: any) {
        toast.error(error.response?.data || "Failed to accept booking");
      }
    }
  };

  const handleRejectClick = (request: any) => {
    setSelectedRequest(request);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest) return;

    try {
      await rejectBooking.mutateAsync({
        bookingId: selectedRequest.id,
        reason: rejectReason || undefined,
      });
      toast.success("Booking rejected");
      setShowRejectModal(false);
      setSelectedRequest(null);
    } catch (error: any) {
      toast.error(error.response?.data || "Failed to reject booking");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "";
    return timeString;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Booking Requests</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="material-symbols-outlined text-sm">info</span>
          <span>Direct booking requests from clients</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab
                ? "bg-gray-900 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <span className="material-symbols-outlined text-gray-300 text-6xl mb-4">calendar_today</span>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No {tabLabels[activeTab]}
            </h3>
            <p className="text-gray-600">
              {activeTab === "pending"
                ? "No new booking requests at the moment"
                : activeTab === "confirmed"
                ? "No accepted bookings yet"
                : activeTab === "cancelled"
                ? "No rejected requests"
                : "No booking requests found"}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {requests.map((request: any) => (
              <motion.div
                key={request.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Service Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0 overflow-hidden">
                      {request.service?.images && request.service.images.length > 0 ? (
                        <img
                          src={request.service.images[0]}
                          alt={request.service.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-2xl">cleaning_services</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {request.service?.title || "Service Booking"}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">person</span>
                          <span className="font-medium">{request.client?.name || "Client"}</span>
                        </div>
                        {request.location && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            <span>{request.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">calendar_today</span>
                          <span>{formatDate(request.date)}</span>
                        </div>
                        {(request.startTime || request.endTime) && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            <span>
                              {formatTime(request.startTime)}
                              {request.endTime && ` - ${formatTime(request.endTime)}`}
                            </span>
                          </div>
                        )}
                      </div>
                      {request.notes && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold">Note:</span> {request.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price and Actions */}
                  <div className="flex flex-col items-end gap-3 min-w-[160px]">
                    <div className="text-right">
                      <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                      <p className="text-2xl font-bold text-gray-900">
                        KES {Number(request.totalAmount).toLocaleString()}
                      </p>
                      {request.proposedPrice && Number(request.proposedPrice) !== Number(request.totalAmount) && (
                        <p className="text-xs text-amber-600 mt-1">
                          Proposed: KES {Number(request.proposedPrice).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusConfig[request.status]?.bg
                      } ${statusConfig[request.status]?.text}`}
                    >
                      {statusConfig[request.status]?.label}
                    </span>

                    {request.status === "PENDING" && (
                      <div className="flex gap-2 w-full">
                        <button
                          onClick={() => handleAccept(request.id)}
                          disabled={acceptBooking.isPending}
                          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          {acceptBooking.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              <span>...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">check</span>
                              <span>Accept</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRejectClick(request)}
                          disabled={rejectBooking.isPending}
                          className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedRequest && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Reject Booking</h2>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                Are you sure you want to reject this booking from{" "}
                <span className="font-semibold">{selectedRequest.client?.name}</span>?
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  placeholder="e.g., Not available at that time, conflicting schedule..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={rejectBooking.isPending}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {rejectBooking.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    "Reject Booking"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
