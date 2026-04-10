"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useProviderRequests,
  useAcceptBooking,
  useRejectBooking,
} from "@/lib/api/hooks/useBookings";
import { toast } from "sonner";

const tabs = ["pending", "confirmed", "cancelled", "all"];

const tabLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Accepted",
  cancelled: "Rejected",
  all: "All",
};

const statusConfig: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  PENDING: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  CONFIRMED: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "Accepted",
  },
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
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "";
    return timeString;
  };

  return (
    <div className="space-y-4 p-2 pb-[max(1rem,env(safe-area-inset-bottom))] md:space-y-6 md:p-0">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Booking Requests
          </h1>
          <div className="flex items-center gap-1.5 text-xs md:text-sm text-gray-600">
            <span className="material-symbols-outlined text-xs md:text-sm">
              info
            </span>
            <span className="hidden xs:inline">
              Direct booking requests from clients
            </span>
            <span className="xs:hidden">Direct requests</span>
          </div>
        </div>

        {/* Tabs - Mobile Optimized */}
        <div className="-mx-1 flex gap-1 overflow-x-auto overscroll-contain px-1 pb-1">
          {tabs.map((tab) => (
            <button type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap min-w-20 ${
                activeTab === tab
                  ? "bg-gray-900 text-white shadow-sm md:shadow-md"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Grid - Two Columns on Large Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        {isLoading ? (
          <div className="col-span-1 lg:col-span-2 flex items-center justify-center py-12 md:py-16">
            <div className="w-10 h-10 md:w-12 md:h-12 border-3 md:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="col-span-1 lg:col-span-2 bg-white rounded-xl md:rounded-2xl border border-gray-100 p-6 md:p-12 text-center">
            <span className="material-symbols-outlined text-gray-300 text-4xl md:text-6xl mb-3 md:mb-4">
              calendar_today
            </span>
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1 md:mb-2">
              No {tabLabels[activeTab]}
            </h3>
            <p className="text-xs md:text-sm text-gray-600 max-w-md mx-auto">
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
                className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-xs md:shadow-sm border border-gray-100 hover:shadow-sm md:hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-4">
                  {/* Service Info - Compact Layout */}
                  <div className="flex gap-3">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 overflow-hidden">
                      {request.service?.images &&
                      request.service.images.length > 0 ? (
                        <img
                          src={request.service.images[0]}
                          alt={request.service.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-lg md:text-2xl">
                          cleaning_services
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm md:text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                        {request.service?.title || "Service Booking"}
                      </h3>
                      <div className="space-y-0.5 md:space-y-1 text-xs md:text-sm text-gray-600">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <span className="material-symbols-outlined text-xs md:text-sm">
                            person
                          </span>
                          <span className="font-medium truncate">
                            {request.client?.name || "Client"}
                          </span>
                        </div>
                        {request.location && (
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <span className="material-symbols-outlined text-xs md:text-sm">
                              location_on
                            </span>
                            <span className="line-clamp-1">
                              {request.location}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <span className="material-symbols-outlined text-xs md:text-sm">
                            calendar_today
                          </span>
                          <span>{formatDate(request.date)}</span>
                        </div>
                        {(request.startTime || request.endTime) && (
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <span className="material-symbols-outlined text-xs md:text-sm">
                              schedule
                            </span>
                            <span className="text-xs md:text-sm">
                              {formatTime(request.startTime)}
                              {request.endTime &&
                                ` - ${formatTime(request.endTime)}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {request.notes && (
                    <div className="mt-1 p-2 md:p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs md:text-sm text-gray-700 line-clamp-2 md:line-clamp-3">
                        <span className="font-semibold">Note:</span>{" "}
                        {request.notes}
                      </p>
                    </div>
                  )}

                  {/* Price and Actions - Mobile Optimized */}
                  <div className="flex flex-col gap-2 md:gap-3">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-xs md:text-sm text-gray-500">
                          Total Amount
                        </p>
                        <p className="text-lg md:text-2xl font-bold text-gray-900">
                          KES {Number(request.totalAmount).toLocaleString()}
                        </p>
                        {request.proposedPrice &&
                          Number(request.proposedPrice) !==
                            Number(request.totalAmount) && (
                            <p className="text-xs text-amber-600 mt-0.5">
                              Proposed: KES{" "}
                              {Number(request.proposedPrice).toLocaleString()}
                            </p>
                          )}
                      </div>
                      <span
                        className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-xs font-medium ${
                          statusConfig[request.status]?.bg
                        } ${statusConfig[request.status]?.text}`}
                      >
                        {statusConfig[request.status]?.label}
                      </span>
                    </div>

                    {request.status === "PENDING" && (
                      <div className="flex gap-2 w-full">
                        <button type="button"
                          onClick={() => handleAccept(request.id)}
                          disabled={acceptBooking.isPending}
                          className="flex-1 px-3 py-2 md:px-4 md:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs md:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          {acceptBooking.isPending ? (
                            <>
                              <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              <span className="text-xs">...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-xs md:text-sm">
                                check
                              </span>
                              <span>Accept</span>
                            </>
                          )}
                        </button>
                        <button type="button"
                          onClick={() => handleRejectClick(request)}
                          disabled={rejectBooking.isPending}
                          className="flex-1 px-3 py-2 md:px-4 md:py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs md:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs md:text-sm">
                            close
                          </span>
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

      {/* Reject Modal - Mobile Optimized */}
      <AnimatePresence>
        {showRejectModal && selectedRequest && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 md:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              className="bg-white rounded-xl md:rounded-2xl shadow-xl md:shadow-2xl max-w-md w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">
                  Reject Booking
                </h2>
                <button type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined text-base md:text-lg">
                    close
                  </span>
                </button>
              </div>

              <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">
                Are you sure you want to reject this booking from{" "}
                <span className="font-semibold">
                  {selectedRequest.client?.name}
                </span>
                ?
              </p>

              <div className="mb-4 md:mb-6">
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm md:text-base"
                  placeholder="e.g., Not available at that time, conflicting schedule..."
                />
              </div>

              <div className="flex gap-2 md:gap-3">
                <button type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2.5 md:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm md:text-base"
                >
                  Cancel
                </button>
                <button type="button"
                  onClick={handleRejectConfirm}
                  disabled={rejectBooking.isPending}
                  className="flex-1 py-2.5 md:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 md:gap-2"
                >
                  {rejectBooking.isPending ? (
                    <>
                      <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span className="text-xs md:text-sm">Rejecting...</span>
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
