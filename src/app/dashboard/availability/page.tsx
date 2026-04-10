"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { hasRole } from "@/lib/auth/roles";

interface AvailabilitySlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface Exception {
  id?: string;
  date: string | Date;
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DEFAULT_EXCEPTION_FORM = {
  date: "",
  isAvailable: false,
  startTime: "",
  endTime: "",
  reason: "",
};

export default function AvailabilityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingExceptionId, setEditingExceptionId] = useState<string | null>(
    null,
  );
  const [isMobile, setIsMobile] = useState(false);

  // New slot form
  const [newSlot, setNewSlot] = useState({
    startTime: "09:00",
    endTime: "17:00",
  });

  const [slotEditForm, setSlotEditForm] = useState({
    startTime: "09:00",
    endTime: "17:00",
    dayOfWeek: 0,
  });

  // Exception form
  const [newException, setNewException] = useState({
    ...DEFAULT_EXCEPTION_FORM,
  });

  const openNewExceptionModal = () => {
    setEditingExceptionId(null);
    setNewException({ ...DEFAULT_EXCEPTION_FORM });
    setShowExceptionModal(true);
  };

  const closeExceptionModal = () => {
    setEditingExceptionId(null);
    setNewException({ ...DEFAULT_EXCEPTION_FORM });
    setShowExceptionModal(false);
  };

  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Wait for session to load
    if (status === "loading") {
      return;
    }

    // Only redirect if session is loaded and user is not a provider
    if (status === "authenticated" && !hasRole(session?.user, "PROVIDER")) {
      router.push("/dashboard");
      return;
    }

    // Fetch availability if user is a provider
    if (status === "authenticated" && hasRole(session?.user, "PROVIDER")) {
      fetchAvailability();
    }
  }, [session, status, router]);

  const fetchAvailability = async () => {
    try {
      const response = await fetch("/api/provider/availability");
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch availability");
      }

      const data = await response.json();

      const weeklyAvailability = Array.isArray(data?.weeklyAvailability)
        ? data.weeklyAvailability
        : [];
      const availabilityExceptions = Array.isArray(data?.exceptions)
        ? data.exceptions
        : [];

      setAvailability(weeklyAvailability);
      setExceptions(availabilityExceptions);
    } catch (error) {
      console.error("[fetchAvailability]", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load availability",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addSlot = async (dayOfWeek: number) => {
    if (!newSlot.startTime || !newSlot.endTime) {
      toast.error("Please set start and end times");
      return;
    }

    if (newSlot.startTime === newSlot.endTime) {
      toast.error("Start and end time cannot be the same");
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

      toast.success("Time slot added!");
      await fetchAvailability();
      setSelectedDay(null);
      // Reset to default times
      setNewSlot({
        startTime: "09:00",
        endTime: "17:00",
      });
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete");
      }

      toast.success("Time slot removed");
      await fetchAvailability();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to remove availability",
      );
    }
  };

  const beginSlotEdit = (slot: AvailabilitySlot) => {
    if (!slot.id) return;
    setEditingSlotId(slot.id);
    setSlotEditForm({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  };

  const saveSlotEdit = async () => {
    if (!editingSlotId) return;

    if (!slotEditForm.startTime || !slotEditForm.endTime) {
      toast.error("Please set start and end times");
      return;
    }

    if (slotEditForm.startTime === slotEditForm.endTime) {
      toast.error("Start and end time cannot be the same");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/provider/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSlotId,
          dayOfWeek: slotEditForm.dayOfWeek,
          startTime: slotEditForm.startTime,
          endTime: slotEditForm.endTime,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update slot");
      }

      toast.success("Time slot updated");
      setEditingSlotId(null);
      await fetchAvailability();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update slot",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const addException = async () => {
    if (!newException.date) {
      toast.error("Please select a date");
      return;
    }

    if (
      newException.isAvailable &&
      (!newException.startTime || !newException.endTime)
    ) {
      toast.error("Please set times for available exception");
      return;
    }

    if (
      newException.isAvailable &&
      newException.startTime >= newException.endTime
    ) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/provider/availability/exceptions", {
        method: editingExceptionId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingExceptionId ? { id: editingExceptionId } : {}),
          ...newException,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to save exception");
      }

      toast.success(
        editingExceptionId ? "Exception updated!" : "Exception added!",
      );
      await fetchAvailability();
      closeExceptionModal();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save exception",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const beginExceptionEdit = (exception: Exception) => {
    if (!exception.id) return;
    const dateValue = new Date(exception.date).toISOString().split("T")[0];

    setEditingExceptionId(exception.id);
    setNewException({
      date: dateValue,
      isAvailable: exception.isAvailable,
      startTime: exception.startTime || "",
      endTime: exception.endTime || "",
      reason: exception.reason || "",
    });
    setShowExceptionModal(true);
  };

  const deleteException = async (id: string) => {
    try {
      const response = await fetch(
        `/api/provider/availability/exceptions?id=${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete");
      }

      toast.success("Exception removed");
      await fetchAvailability();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove exception",
      );
    }
  };

  const getDaySlots = (day: number) => {
    return availability.filter(
      (slot) => slot.dayOfWeek === day && slot.isActive,
    );
  };

  const getUpcomingExceptions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return exceptions
      .filter((exp) => new Date(exp.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3); // Show only 3 upcoming exceptions on mobile
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 sm:w-16 sm:h-16 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-emerald-50 py-4 sm:py-6 lg:py-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
        {/* Header */}
        <motion.div
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="mb-1 text-2xl font-bold text-gray-900 sm:text-3xl">
                Availability
              </h1>
              <p className="text-xs text-gray-600 sm:text-sm">
                Manage your weekly schedule and date exceptions
              </p>
            </div>
            <button
              type="button"
              onClick={openNewExceptionModal}
              className="flex w-full items-center justify-center gap-1.5 self-stretch rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-600 hover:to-blue-700 sm:w-auto sm:gap-2 sm:px-4 sm:shadow-md sm:self-center"
            >
              <span className="material-symbols-outlined text-sm sm:text-base">
                event_busy
              </span>
              <span className="text-xs sm:text-sm">Add Exception</span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Weekly Schedule - Main Content */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xs sm:shadow-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                Weekly Schedule
              </h2>

              <div className="space-y-2 sm:space-y-3">
                {DAYS.map((day, index) => {
                  const daySlots = getDaySlots(index);
                  const isExpanded = selectedDay === index;
                  const hasSlots = daySlots.length > 0;

                  return (
                    <motion.div
                      key={day}
                      className="bg-gray-50 hover:bg-gray-100 rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      {/* Day Header - Clickable */}
                      <div
                        className="p-3 sm:p-4 cursor-pointer"
                        onClick={() =>
                          setSelectedDay(isExpanded ? null : index)
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-base shrink-0">
                              {isMobile
                                ? day.substring(0, 2)
                                : day.substring(0, 3)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                                {day}
                              </h3>
                              <p className="text-xs text-gray-600">
                                {hasSlots
                                  ? `${daySlots.length} slot${
                                      daySlots.length > 1 ? "s" : ""
                                    }`
                                  : "Not available"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasSlots && !isExpanded && (
                              <div className="mr-2 hidden flex-wrap gap-1 sm:flex">
                                {daySlots.slice(0, 2).map((slot, i) => (
                                  <span
                                    key={i}
                                    className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 sm:text-xs"
                                  >
                                    {slot.startTime} - {slot.endTime}
                                  </span>
                                ))}
                                {daySlots.length > 2 && (
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 sm:text-xs">
                                    +{daySlots.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                            <span className="material-symbols-outlined text-gray-400 text-lg sm:text-xl transition-transform duration-200">
                              {isExpanded ? "expand_less" : "expand_more"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-200"
                          >
                            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                              {/* Existing Slots */}
                              {daySlots.length > 0 ? (
                                <div className="space-y-2">
                                  <h4 className="text-xs sm:text-sm font-semibold text-gray-700">
                                    Current Time Slots
                                  </h4>
                                  <div className="space-y-2">
                                    {daySlots.map((slot) => (
                                      <div
                                        key={slot.id}
                                        className="flex items-center justify-between p-2.5 sm:p-3 bg-white rounded-lg border border-gray-200"
                                      >
                                        {editingSlotId === slot.id ? (
                                          <div className="w-full space-y-2">
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                              <input
                                                type="time"
                                                value={slotEditForm.startTime}
                                                onChange={(e) =>
                                                  setSlotEditForm((prev) => ({
                                                    ...prev,
                                                    startTime: e.target.value,
                                                  }))
                                                }
                                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                                              />
                                              <input
                                                type="time"
                                                value={slotEditForm.endTime}
                                                onChange={(e) =>
                                                  setSlotEditForm((prev) => ({
                                                    ...prev,
                                                    endTime: e.target.value,
                                                  }))
                                                }
                                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                                              />
                                            </div>
                                            <div className="flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setEditingSlotId(null)
                                                }
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                type="button"
                                                onClick={saveSlotEdit}
                                                disabled={isSaving}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                              >
                                                Save
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="flex items-center gap-2 sm:gap-3">
                                              <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                                                schedule
                                              </span>
                                              <div>
                                                <span className="font-semibold text-gray-900 text-sm sm:text-base">
                                                  {slot.startTime} -{" "}
                                                  {slot.endTime}
                                                </span>
                                                {slot.id && (
                                                  <p className="mt-0.5 text-[10px] text-gray-500 sm:text-xs">
                                                    Use edit to adjust this slot
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                            {slot.id && (
                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    beginSlotEdit(slot)
                                                  }
                                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                  title="Edit slot"
                                                >
                                                  <span className="material-symbols-outlined text-sm sm:text-base">
                                                    edit
                                                  </span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    deleteSlot(slot.id!)
                                                  }
                                                  className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                  title="Remove slot"
                                                >
                                                  <span className="material-symbols-outlined text-sm sm:text-base">
                                                    delete
                                                  </span>
                                                </button>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  <span className="material-symbols-outlined text-3xl mb-2">
                                    schedule
                                  </span>
                                  <p className="text-sm">
                                    No time slots added for {day}
                                  </p>
                                </div>
                              )}

                              {/* Add New Slot Form */}
                              <div className="p-3 sm:p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
                                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2.5 sm:mb-3">
                                  Add New Time Slot
                                </h4>
                                <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                                  <div>
                                    <label
                                      htmlFor={`start-time-${index}`}
                                      className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
                                    >
                                      Start Time
                                    </label>
                                    <input
                                      id={`start-time-${index}`}
                                      type="time"
                                      value={newSlot.startTime}
                                      onChange={(e) =>
                                        setNewSlot({
                                          ...newSlot,
                                          startTime: e.target.value,
                                        })
                                      }
                                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                                    />
                                  </div>
                                  <div>
                                    <label
                                      htmlFor={`end-time-${index}`}
                                      className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
                                    >
                                      End Time
                                    </label>
                                    <input
                                      id={`end-time-${index}`}
                                      type="time"
                                      value={newSlot.endTime}
                                      onChange={(e) =>
                                        setNewSlot({
                                          ...newSlot,
                                          endTime: e.target.value,
                                        })
                                      }
                                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addSlot(index)}
                                  disabled={isSaving}
                                  className="w-full py-2 sm:py-2.5 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                  {isSaving ? (
                                    <span className="flex items-center justify-center gap-1.5">
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      Adding...
                                    </span>
                                  ) : (
                                    `Add Slot to ${day}`
                                  )}
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
            </div>
          </div>

          {/* Sidebar - Mobile: Below, Desktop: Right Side */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Stats Card */}
            <div className="bg-linear-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg p-4 sm:p-6 text-white">
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">
                Quick Stats
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold mb-1">
                    {DAYS.filter((_, i) => getDaySlots(i).length > 0).length}
                  </div>
                  <div className="text-[10px] opacity-90 sm:text-xs">
                    Active Days
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold mb-1">
                    {availability.length}
                  </div>
                  <div className="text-[10px] opacity-90 sm:text-xs">
                    Total Slots
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold mb-1">
                    {exceptions.length}
                  </div>
                  <div className="text-[10px] opacity-90 sm:text-xs">
                    Exceptions
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Exceptions Card */}
            <div className="bg-white rounded-xl shadow-sm sm:shadow-lg border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Upcoming Exceptions
                </h3>
                <button
                  type="button"
                  onClick={openNewExceptionModal}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add
                </button>
              </div>

              {exceptions.length === 0 ? (
                <div className="text-center py-4 sm:py-6 text-gray-500">
                  <span className="material-symbols-outlined text-3xl sm:text-4xl mb-2">
                    event_busy
                  </span>
                  <p className="text-xs sm:text-sm">No exceptions set</p>
                  <button
                    type="button"
                    onClick={openNewExceptionModal}
                    className="mt-3 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Create Your First Exception
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 sm:space-y-3">
                  {getUpcomingExceptions().map((exception) => (
                    <div
                      key={exception.id}
                      className={`p-3 rounded-lg border ${
                        exception.isAvailable
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`material-symbols-outlined text-sm sm:text-base shrink-0 ${
                              exception.isAvailable
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {exception.isAvailable
                              ? "event_available"
                              : "event_busy"}
                          </span>
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-900 text-sm truncate">
                              {new Date(exception.date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
                            {exception.reason && (
                              <p className="text-xs text-gray-600 truncate mt-0.5">
                                {exception.reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <button
                            type="button"
                            onClick={() => beginExceptionEdit(exception)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit exception"
                          >
                            <span className="material-symbols-outlined text-sm">
                              edit
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteException(exception.id!)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove exception"
                          >
                            <span className="material-symbols-outlined text-sm">
                              close
                            </span>
                          </button>
                        </div>
                      </div>
                      {exception.isAvailable && exception.startTime && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="material-symbols-outlined text-green-600 text-sm">
                            schedule
                          </span>
                          <span className="text-xs text-green-700 font-medium">
                            {exception.startTime} - {exception.endTime}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                  {exceptions.length > 3 && isMobile && (
                    <button
                      type="button"
                      onClick={openNewExceptionModal}
                      className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-2"
                    >
                      View all {exceptions.length} exceptions
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Tips Card */}
            {isMobile && (
              <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
                <div className="flex items-start gap-2 mb-2">
                  <span className="material-symbols-outlined text-blue-600 text-lg">
                    tips_and_updates
                  </span>
                  <h4 className="text-sm font-semibold text-blue-900">
                    Quick Tips
                  </h4>
                </div>
                <ul className="space-y-1.5 text-xs text-blue-800">
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-blue-500 text-sm mt-0.5">
                      check_circle
                    </span>
                    Tap any day to add/remove time slots
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-blue-500 text-sm mt-0.5">
                      check_circle
                    </span>
                    Create exceptions for holidays or special hours
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-blue-500 text-sm mt-0.5">
                      check_circle
                    </span>
                    Use two fingers to scroll table horizontally
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exception Modal */}
      <AnimatePresence>
        {showExceptionModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeExceptionModal}
          >
            <motion.div
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    {editingExceptionId
                      ? "Edit Date Exception"
                      : "Add Date Exception"}
                  </h2>
                  <button
                    type="button"
                    onClick={closeExceptionModal}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      close
                    </span>
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label
                      htmlFor="exception-date"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Date
                    </label>
                    <input
                      id="exception-date"
                      type="date"
                      value={newException.date}
                      onChange={(e) =>
                        setNewException({
                          ...newException,
                          date: e.target.value,
                        })
                      }
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <input
                      id="exception-available"
                      type="checkbox"
                      checked={newException.isAvailable}
                      onChange={(e) =>
                        setNewException({
                          ...newException,
                          isAvailable: e.target.checked,
                        })
                      }
                      className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label
                      htmlFor="exception-available"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Available on this date (with custom hours)
                    </label>
                  </div>

                  {newException.isAvailable && (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                      <div>
                        <label
                          htmlFor="exception-start-time"
                          className="block text-sm font-medium text-gray-700 mb-1.5"
                        >
                          Start Time
                        </label>
                        <input
                          id="exception-start-time"
                          type="time"
                          value={newException.startTime}
                          onChange={(e) =>
                            setNewException({
                              ...newException,
                              startTime: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="exception-end-time"
                          className="block text-sm font-medium text-gray-700 mb-1.5"
                        >
                          End Time
                        </label>
                        <input
                          id="exception-end-time"
                          type="time"
                          value={newException.endTime}
                          onChange={(e) =>
                            setNewException({
                              ...newException,
                              endTime: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="exception-reason"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Reason (Optional)
                    </label>
                    <textarea
                      id="exception-reason"
                      value={newException.reason}
                      onChange={(e) =>
                        setNewException({
                          ...newException,
                          reason: e.target.value,
                        })
                      }
                      placeholder="e.g., Holiday, Personal event, Vacation"
                      rows={3}
                      className="w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-gray-900 placeholder:text-gray-500"
                    />
                  </div>

                  <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:gap-3">
                    <button
                      type="button"
                      onClick={closeExceptionModal}
                      className="flex-1 px-4 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addException}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2.5 sm:py-3 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      {isSaving ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {editingExceptionId ? "Updating..." : "Adding..."}
                        </span>
                      ) : editingExceptionId ? (
                        "Update Exception"
                      ) : (
                        "Add Exception"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
