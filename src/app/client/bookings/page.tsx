"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { motion } from "framer-motion";

interface Booking {
  id: string;
  date: string;
  status: string;
  totalAmount: number;
  job: {
    id: string;
    title: string;
    category: {
      name: string;
    };
  };
  provider: {
    id: string;
    name: string;
    image: string | null;
  };
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  DISPUTED: "bg-orange-100 text-orange-800",
};

export default function ClientBookingsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const response = await apiClient.get("/bookings");
      return response.data;
    },
  });

  const bookings = data?.items || [];

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <p className="mt-2 text-gray-600">View and manage your service bookings</p>
      </div>

      {isLoading ? (
        <div className="bg-white shadow-sm rounded-2xl p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Loading your bookings...</p>
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white shadow-sm rounded-2xl p-12">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">event_busy</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-600">When you hire professionals, your bookings will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-100">
          <ul className="divide-y divide-gray-100">
            {bookings.map((booking: Booking, index: number) => (
              <motion.li
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="px-6 py-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        {booking.provider.image ? (
                          <img
                            src={booking.provider.image}
                            alt={booking.provider.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-emerald-600 text-2xl">person</span>
                        )}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">{booking.job.title}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {booking.job.category.name} • {booking.provider.name}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
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
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">payments</span>
                            KES {booking.totalAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          statusColors[booking.status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {booking.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      View Details
                    </button>
                    {booking.status === "CONFIRMED" && (
                      <button className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">cancel</span>
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
