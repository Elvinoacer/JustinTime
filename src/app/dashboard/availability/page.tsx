"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AvailabilitySlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface Exception {
  id?: string;
  date: Date;
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showExceptionModal, setShowExceptionModal] = useState(false);

  // New slot form
  const [newSlot, setNewSlot] = useState({
    startTime: "09:00",
    endTime: "17:00",
  });

  // Exception form
  const [newException, setNewException] = useState({
    date: "",
    isAvailable: false,
    startTime: "",
    endTime: "",
    reason: "",
  });

  useEffect(() => {
    // Wait for session to load
    if (status === "loading") {
      return;
    }

    // Only redirect if session is loaded and user is not a provider
    if (status === "authenticated" && session?.user?.role !== "PROVIDER") {
      router.push("/dashboard");
      return;
    }

    // Fetch availability if user is a provider
    if (status === "authenticated" && session?.user?.role === "PROVIDER") {
      fetchAvailability();
    }
  }, [session, status, router]);

  const fetchAvailability = async () => {
    try {
      const response = await fetch("/api/provider/availability");
      const data = await response.json();
      setAvailability(data.weeklyAvailability || []);
      setExceptions(data.exceptions || []);
    } catch (error) {
      toast.error("Failed to load availability");
    } finally {
      setIsLoading(false);
    }
  };

  const addSlot = async (dayOfWeek: number) => {
    if (!newSlot.startTime || !newSlot.endTime) {
      toast.error("Please set start and end times");
      return;
    }

    if (newSlot.startTime >= newSlot.endTime) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/provider/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: [
            {
              dayOfWeek,
              startTime: newSlot.startTime,
              endTime: newSlot.endTime,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("Failed to add slot");

      toast.success("Availability added!");
      fetchAvailability();
      setSelectedDay(null);
    } catch (error) {
      toast.error("Failed to add availability");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSlot = async (id: string) => {
    try {
      const response = await fetch(`/api/provider/availability?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Availability removed");
      fetchAvailability();
    } catch (error) {
      toast.error("Failed to remove availability");
    }
  };

  const addException = async () => {
    if (!newException.date) {
      toast.error("Please select a date");
      return;
    }

    if (newException.isAvailable && (!newException.startTime || !newException.endTime)) {
      toast.error("Please set times for available exception");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/provider/availability/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newException),
      });

      if (!response.ok) throw new Error("Failed to add exception");

      toast.success("Exception added!");
      fetchAvailability();
      setShowExceptionModal(false);
      setNewException({
        date: "",
        isAvailable: false,
        startTime: "",
        endTime: "",
        reason: "",
      });
    } catch (error) {
      toast.error("Failed to add exception");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteException = async (id: string) => {
    try {
      const response = await fetch(`/api/provider/availability/exceptions?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Exception removed");
      fetchAvailability();
    } catch (error) {
      toast.error("Failed to remove exception");
    }
  };

  const getDaySlots = (day: number) => {
    return availability.filter((slot) => slot.dayOfWeek === day && slot.isActive);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Availability Schedule</h1>
          <p className="text-gray-600">Manage your weekly schedule and date exceptions</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Weekly Schedule */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Weekly Schedule</h2>
              <button
                onClick={() => setShowExceptionModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-xl">event_busy</span>
                Add Exception
              </button>
            </div>

            {DAYS.map((day, index) => {
              const daySlots = getDaySlots(index);
              const isExpanded = selectedDay === index;

              return (
                <motion.div
                  key={day}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedDay(isExpanded ? null : index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold">
                          {day.substring(0, 3)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{day}</h3>
                          <p className="text-sm text-gray-600">
                            {daySlots.length === 0
                              ? "Not available"
                              : `${daySlots.length} slot${daySlots.length > 1 ? "s" : ""}`}
                          </p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-gray-400">
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                    </div>

                    {daySlots.length > 0 && !isExpanded && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {daySlots.map((slot) => (
                          <div
                            key={slot.id}
                            className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold"
                          >
                            {slot.startTime} - {slot.endTime}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-100"
                      >
                        <div className="p-6 bg-gray-50 space-y-4">
                          {/* Existing Slots */}
                          {daySlots.map((slot) => (
                            <div
                              key={slot.id}
                              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-emerald-600">
                                  schedule
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                              </div>
                              <button
                                onClick={() => deleteSlot(slot.id!)}
                                className="text-red-600 hover:text-red-700 transition-colors"
                              >
                                <span className="material-symbols-outlined">delete</span>
                              </button>
                            </div>
                          ))}

                          {/* Add New Slot */}
                          <div className="p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
                            <h4 className="font-semibold text-gray-900 mb-3">Add New Time Slot</h4>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label htmlFor={`start-time-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                  Start Time
                                </label>
                                <input
                                  id={`start-time-${index}`}
                                  type="time"
                                  value={newSlot.startTime}
                                  onChange={(e) =>
                                    setNewSlot({ ...newSlot, startTime: e.target.value })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                                />
                              </div>
                              <div>
                                <label htmlFor={`end-time-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                  End Time
                                </label>
                                <input
                                  id={`end-time-${index}`}
                                  type="time"
                                  value={newSlot.endTime}
                                  onChange={(e) =>
                                    setNewSlot({ ...newSlot, endTime: e.target.value })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => addSlot(index)}
                              disabled={isSaving}
                              className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50"
                            >
                              {isSaving ? "Adding..." : "Add Slot"}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Exceptions Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Date Exceptions</h2>
              <p className="text-sm text-gray-600 mb-4">
                Block specific dates or set special hours
              </p>

              {exceptions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="material-symbols-outlined text-5xl mb-2">event_busy</span>
                  <p>No exceptions set</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exceptions.map((exception) => (
                    <div
                      key={exception.id}
                      className={`p-4 rounded-lg border-2 ${
                        exception.isAvailable
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`material-symbols-outlined ${
                              exception.isAvailable ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {exception.isAvailable ? "event_available" : "event_busy"}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {new Date(exception.date).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteException(exception.id!)}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                      {exception.reason && (
                        <p className="text-sm text-gray-700">{exception.reason}</p>
                      )}
                      {exception.isAvailable && exception.startTime && (
                        <p className="text-sm text-green-700 font-medium mt-1">
                          {exception.startTime} - {exception.endTime}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Active Days</span>
                  <span className="text-2xl font-bold">
                    {DAYS.filter((_, i) => getDaySlots(i).length > 0).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Slots</span>
                  <span className="text-2xl font-bold">{availability.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Exceptions</span>
                  <span className="text-2xl font-bold">{exceptions.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exception Modal */}
      <AnimatePresence>
        {showExceptionModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowExceptionModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Date Exception</h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="exception-date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    id="exception-date"
                    type="date"
                    value={newException.date}
                    onChange={(e) => setNewException({ ...newException, date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="exception-available" className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="exception-available"
                      type="checkbox"
                      checked={newException.isAvailable}
                      onChange={(e) =>
                        setNewException({ ...newException, isAvailable: e.target.checked })
                      }
                      className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Available on this date (with custom hours)
                    </span>
                  </label>
                </div>

                {newException.isAvailable && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="exception-start-time" className="block text-sm font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <input
                        id="exception-start-time"
                        type="time"
                        value={newException.startTime}
                        onChange={(e) =>
                          setNewException({ ...newException, startTime: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="exception-end-time" className="block text-sm font-medium text-gray-700 mb-1">
                        End Time
                      </label>
                      <input
                        id="exception-end-time"
                        type="time"
                        value={newException.endTime}
                        onChange={(e) =>
                          setNewException({ ...newException, endTime: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="exception-reason" className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (Optional)
                  </label>
                  <textarea
                    id="exception-reason"
                    value={newException.reason}
                    onChange={(e) => setNewException({ ...newException, reason: e.target.value })}
                    placeholder="e.g., Holiday, Personal event"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowExceptionModal(false)}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addException}
                    disabled={isSaving}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {isSaving ? "Adding..." : "Add Exception"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
