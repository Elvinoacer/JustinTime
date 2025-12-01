"use client";

import React, { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfessional } from "@/lib/api/hooks/useProfessional";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Calendar } from "@/components/ui/calendar";
import { format, isBefore, startOfDay } from "date-fns";
import {
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  Calendar as CalendarIcon,
  User,
  Star,
  CheckCircle,
  Info,
  Handshake,
  CalendarClock,
  Loader2,
  Home,
  MessageSquare,
  DollarSign,
  X,
  AlertCircle,
} from "lucide-react";

function BookingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const professionalId = searchParams.get("professional");
  const serviceIdParam = searchParams.get("service");

  const { data, isLoading } = useProfessional(professionalId || "");
  const professional = data?.data;

  const [selectedService, setSelectedService] = useState<string>(
    serviceIdParam || ""
  );
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<
    Record<string, string[]>
  >({});
  const [availableSlotsPerDate, setAvailableSlotsPerDate] = useState<
    Record<string, string[]>
  >({});
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [disabledReasons, setDisabledReasons] = useState<
    Record<string, string>
  >({});
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [negotiationData, setNegotiationData] = useState({
    proposedPrice: "",
    proposedLocation: "",
    message: "",
  });
  const [showMobileDatePicker, setShowMobileDatePicker] = useState(false);

  // Fetch available slots when dates change
  useEffect(() => {
    if (selectedDates.length > 0 && selectedService && professionalId) {
      selectedDates.forEach((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        if (!availableSlotsPerDate[dateStr]) {
          fetchAvailableSlotsForDate(dateStr);
        }
      });
    }
  }, [selectedDates, selectedService, professionalId]);

  // Fetch monthly availability when professional loads
  useEffect(() => {
    if (professionalId) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      fetchMonthlyAvailability(currentMonth);
    }
  }, [professionalId]);

  const fetchMonthlyAvailability = async (month: string) => {
    try {
      const url = `/api/provider/availability/month?providerId=${professionalId}&month=${month}&serviceId=${
        selectedService || ""
      }`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setDisabledDates(data.disabledDates || []);
        setDisabledReasons(data.reasons || {});
      }
    } catch (error) {
      console.error("Error fetching monthly availability:", error);
    }
  };

  const fetchAvailableSlotsForDate = async (dateStr: string) => {
    try {
      const service = professional?.services.find(
        (s: any) => s.id === selectedService
      );
      const duration = (service as any)?.defaultDuration || 60;

      const response = await fetch(
        `/api/provider/availability/check?providerId=${professionalId}&date=${dateStr}&duration=${duration}&serviceId=${selectedService}`
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableSlotsPerDate((prev) => ({
          ...prev,
          [dateStr]: data.slots || [],
        }));
      }
    } catch (error) {
      console.error(`Error fetching slots for ${dateStr}:`, error);
    }
  };

  const handleSubmit = async (withNegotiation = false) => {
    // Check if user is logged in
    if (!session) {
      toast.error("Please sign in to book a service");
      router.push(
        `/auth/login?callbackUrl=/booking?professional=${professionalId}`
      );
      return;
    }

    if (!selectedService) {
      toast.error("Please select a service");
      return;
    }

    if (selectedDates.length === 0) {
      toast.error("Please select at least one date");
      return;
    }

    const hasTimeSlots = Object.values(selectedTimeSlots).some(
      (slots) => slots.length > 0
    );
    if (!hasTimeSlots) {
      toast.error("Please select at least one time slot");
      return;
    }

    if (!clientPhone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    if (!clientAddress.trim()) {
      toast.error("Please enter your address");
      return;
    }

    setIsSubmitting(true);

    try {
      const service = professional?.services.find(
        (s: any) => s.id === selectedService
      );
      const duration = (service as any)?.defaultDuration || 60;

      const slots = [];
      for (const [dateStr, timeSlots] of Object.entries(selectedTimeSlots)) {
        for (const startTime of timeSlots) {
          const date = selectedDates.find(
            (d) => format(d, "yyyy-MM-dd") === dateStr
          );
          if (!date) continue;

          const [hours, mins] = startTime.split(":").map(Number);
          const endMinutes = hours * 60 + mins + duration;
          const endTime = `${Math.floor(endMinutes / 60)
            .toString()
            .padStart(2, "0")}:${(endMinutes % 60)
            .toString()
            .padStart(2, "0")}`;

          slots.push({
            date: new Date(`${dateStr}T${startTime}`).toISOString(),
            startTime,
            endTime,
          });
        }
      }

      const payload = {
        professionalId,
        serviceId: selectedService,
        slots,
        location: location || undefined,
        notes,
        clientPhone: clientPhone || undefined,
        clientAddress: clientAddress || undefined,
      };

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.reason || "Failed to create booking"
        );
      }

      toast.success("Booking created successfully!", {
        description: "Redirecting to your bookings...",
      });

      setTimeout(() => {
        router.push("/client/bookings");
      }, 1500);
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create booking"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-sm">
              Loading professional details...
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!professional) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Professional Not Found
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Please select a valid professional to book.
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const selectedServiceData = professional.services.find(
    (s: any) => s.id === selectedService
  );

  // Calculate total price
  const totalSlots = Object.values(selectedTimeSlots).reduce(
    (sum, slots) => sum + slots.length,
    0
  );
  const totalPrice = totalSlots * (selectedServiceData?.price || 0);

  return (
    <>
      <Header />

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-16 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {professional.image ? (
              <img
                src={professional.image}
                alt={professional.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-emerald-200"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                {professional.name.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="font-bold text-gray-900 text-sm">
                {professional.name}
              </h3>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-semibold">
                  {professional.averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500">
                  ({professional.totalReviews})
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            {selectedServiceData && (
              <div className="text-sm font-bold text-emerald-600">
                Kes {selectedServiceData.price.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-gray-50 pt-32 lg:pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Header */}
          <motion.div
            className="mb-6 lg:mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Book a Service
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Schedule your appointment with {professional.name}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <motion.form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(false);
                }}
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {/* Select Service */}
                <div className="space-y-3">
                  <label className="block text-base sm:text-lg font-bold text-gray-900">
                    Select Service <span className="text-red-600">*</span>
                  </label>
                  <div className="space-y-3">
                    {professional.services.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        No services available
                      </p>
                    ) : (
                      professional.services.map((service: any) => (
                        <div
                          key={service.id}
                          onClick={() => setSelectedService(service.id)}
                          className={`p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all ${
                            selectedService === service.id
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-200 hover:border-emerald-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 pr-2">
                              <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
                                {service.title}
                              </h3>
                              <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">
                                {service.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                                <span className="text-emerald-600 font-bold">
                                  Kes {service.price.toLocaleString()}
                                </span>
                                <span className="text-gray-500">
                                  {service.pricingUnit}
                                </span>
                                {service.defaultDuration && (
                                  <span className="text-gray-500">
                                    · {service.defaultDuration} min
                                  </span>
                                )}
                              </div>
                            </div>
                            {selectedService === service.id && (
                              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Date Selection */}
                <div className="space-y-3">
                  <label className="block text-base sm:text-lg font-bold text-gray-900">
                    Select Date <span className="text-red-600">*</span>
                  </label>

                  {/* Mobile Date Picker Button */}
                  <button
                    type="button"
                    onClick={() => setShowMobileDatePicker(true)}
                    className="lg:hidden w-full p-4 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-emerald-400 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="w-5 h-5 text-gray-400" />
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-900">
                          {selectedDates.length > 0
                            ? `${selectedDates.length} date${
                                selectedDates.length > 1 ? "s" : ""
                              } selected`
                            : "Tap to select dates"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Select available dates
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>

                  {/* Desktop Calendar */}
                  <div className="hidden lg:block bg-white border border-gray-300 rounded-2xl shadow-sm p-6">
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(dates) => {
                        if (dates) {
                          const validDates = dates.filter((date) => {
                            const dateStr = format(date, "yyyy-MM-dd");
                            const isPast = isBefore(
                              date,
                              startOfDay(new Date())
                            );
                            const isDisabled = disabledDates.includes(dateStr);

                            if (isPast || isDisabled) {
                              const reason = isDisabled
                                ? disabledReasons[dateStr] ||
                                  "This date is not available"
                                : "Cannot select past dates";
                              toast.error(reason, {
                                description: "Please select a different date",
                              });
                              return false;
                            }
                            return true;
                          });
                          setSelectedDates(validDates);
                          if (validDates.length > 0) {
                            toast.success(
                              `${validDates.length} date${
                                validDates.length > 1 ? "s" : ""
                              } selected`
                            );
                          }
                        } else {
                          setSelectedDates([]);
                        }
                      }}
                      disabled={[
                        { before: new Date() },
                        (date) =>
                          disabledDates.includes(format(date, "yyyy-MM-dd")),
                      ]}
                      onMonthChange={(month) => {
                        const monthStr = format(month, "yyyy-MM");
                        fetchMonthlyAvailability(monthStr);
                      }}
                      className="w-full"
                      classNames={{
                        months: "w-full",
                        month: "w-full space-y-4",
                        month_caption:
                          "flex justify-center pt-1 relative items-center h-9 mb-4",
                        caption_label: "text-lg font-bold text-gray-900",
                        button_previous: "absolute left-0 h-9 w-9",
                        button_next: "absolute right-0 h-9 w-9",
                        weekdays: "flex w-full justify-between px-1",
                        weekday:
                          "text-gray-900 font-medium text-sm w-14 text-center",
                        week: "flex w-full justify-between px-1 mt-2",
                        day: "w-14",
                      }}
                      components={{
                        DayButton: ({ day, ...props }: any) => {
                          const dateStr = format(day.date, "yyyy-MM-dd");
                          const isOutside = props["data-outside"];
                          const isPast = isBefore(
                            day.date,
                            startOfDay(new Date())
                          );
                          const isInDisabledList =
                            disabledDates.includes(dateStr);
                          const isDisabled = isPast || isInDisabledList;
                          const isSelected =
                            !isDisabled &&
                            selectedDates.some(
                              (d) => format(d, "yyyy-MM-dd") === dateStr
                            );
                          const isToday =
                            day.date.toDateString() ===
                            new Date().toDateString();

                          return (
                            <button
                              {...props}
                              disabled={isDisabled}
                              className={`relative w-full h-12 text-sm font-medium rounded-full transition-all duration-200 ${
                                isDisabled
                                  ? "text-gray-400 line-through opacity-50 cursor-not-allowed bg-gray-100"
                                  : isSelected
                                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-[3px] border-emerald-700 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]"
                                  : isToday
                                  ? "bg-emerald-50 font-bold text-emerald-600 border-2 border-emerald-300"
                                  : "text-gray-900 hover:bg-gray-100"
                              } ${isOutside ? "text-gray-400" : ""}`}
                            >
                              {day.date.getDate()}
                              {isSelected && !isDisabled && (
                                <CheckCircle className="absolute -top-1 -right-1 w-4 h-4 bg-white text-emerald-600 rounded-full p-0.5 shadow-md" />
                              )}
                            </button>
                          );
                        },
                      }}
                    />
                  </div>

                  {selectedDates.length > 0 && (
                    <div className="p-3 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-sm font-bold text-emerald-900 mb-2">
                        {selectedDates.length} Date
                        {selectedDates.length > 1 ? "s" : ""} Selected
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDates.map((date, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-emerald-300 rounded-full text-xs font-medium text-emerald-700"
                          >
                            {format(date, "MMM d")}
                            <button
                              onClick={() => {
                                setSelectedDates((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                );
                              }}
                              className="ml-0.5 hover:text-emerald-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!selectedService && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 font-medium p-3 bg-amber-50 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Please select a service first to view available dates.
                    </div>
                  )}
                </div>

                {/* Time Selection */}
                {selectedDates.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden space-y-3 sm:space-y-4"
                  >
                    <label className="block text-base sm:text-lg font-bold text-gray-900">
                      Select Time Slots <span className="text-red-600">*</span>
                    </label>

                    {selectedDates.map((date) => {
                      const dateStr = format(date, "yyyy-MM-dd");
                      const slots = availableSlotsPerDate[dateStr] || [];
                      const selectedSlots = selectedTimeSlots[dateStr] || [];

                      return (
                        <div
                          key={dateStr}
                          className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                              {format(date, "EEE, MMM d")}
                            </h3>
                            <span className="text-xs sm:text-sm font-medium text-emerald-600">
                              {selectedSlots.length} slot
                              {selectedSlots.length !== 1 ? "s" : ""} selected
                            </span>
                          </div>

                          {slots.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
                              {slots.map((time: string) => {
                                const isSelected = selectedSlots.includes(time);
                                return (
                                  <button
                                    key={time}
                                    type="button"
                                    onClick={() => {
                                      setSelectedTimeSlots((prev) => {
                                        const currentSlots =
                                          prev[dateStr] || [];
                                        const newSlots = isSelected
                                          ? currentSlots.filter(
                                              (t) => t !== time
                                            )
                                          : [...currentSlots, time];
                                        return {
                                          ...prev,
                                          [dateStr]: newSlots,
                                        };
                                      });
                                    }}
                                    className={`py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-md sm:rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                                      isSelected
                                        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm"
                                        : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                                    }`}
                                  >
                                    {time}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-4 bg-gray-50 rounded-lg">
                              <Clock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-600 text-xs sm:text-sm">
                                No available slots for this date
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Summary of selected slots */}
                    {totalSlots > 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                        <h4 className="font-bold text-emerald-900 text-sm sm:text-base mb-2 flex items-center gap-1.5">
                          <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5" />
                          Selected Appointments ({totalSlots})
                        </h4>
                        <div className="space-y-1.5">
                          {Object.entries(selectedTimeSlots).map(
                            ([dateStr, slots]) => {
                              if (slots.length === 0) return null;
                              const date = selectedDates.find(
                                (d) => format(d, "yyyy-MM-dd") === dateStr
                              );
                              return (
                                <div
                                  key={dateStr}
                                  className="flex flex-wrap gap-1.5 sm:gap-2 items-center"
                                >
                                  <span className="text-xs sm:text-sm font-medium text-emerald-800 min-w-[60px] sm:min-w-[80px]">
                                    {date && format(date, "MMM d")}:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {slots.map((time) => (
                                      <span
                                        key={time}
                                        className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white border border-emerald-300 rounded text-xs font-medium text-emerald-700"
                                      >
                                        {time}
                                        <button
                                          onClick={() => {
                                            setSelectedTimeSlots((prev) => ({
                                              ...prev,
                                              [dateStr]: prev[dateStr].filter(
                                                (t) => t !== time
                                              ),
                                            }));
                                          }}
                                          className="hover:text-emerald-900 text-xs"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Location */}
                {(selectedServiceData as any)?.locationType !==
                  "PROVIDER_LOCATION" && (
                  <div className="space-y-2 sm:space-y-3">
                    <label className="block text-base sm:text-lg font-bold text-gray-900">
                      Location{" "}
                      {(selectedServiceData as any)?.locationType ===
                      "CLIENT_LOCATION"
                        ? "*"
                        : "(Optional)"}
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder={
                          (selectedServiceData as any)?.locationType ===
                          "CLIENT_LOCATION"
                            ? "Enter your location"
                            : "Specify preferred location or leave blank to negotiate"
                        }
                        className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 text-sm sm:text-base"
                        required={
                          (selectedServiceData as any)?.locationType ===
                          "CLIENT_LOCATION"
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                    Contact Information
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    {/* Phone Number */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="block text-sm font-semibold text-gray-900">
                        Phone Number <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="tel"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="+254 712 345 678"
                          className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 text-sm sm:text-base"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        We'll use this to confirm your booking
                      </p>
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="block text-sm font-semibold text-gray-900">
                        Address <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <Home className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                        <textarea
                          value={clientAddress}
                          onChange={(e) => setClientAddress(e.target.value)}
                          rows={2}
                          placeholder="Enter your full address..."
                          className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 text-sm sm:text-base resize-none"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-2 sm:space-y-3">
                  <label className="block text-base sm:text-lg font-bold text-gray-900">
                    Additional Notes (Optional)
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Any special requirements or notes for the professional..."
                      className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 text-sm sm:text-base resize-none"
                    />
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="lg:hidden space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNegotiationDialog(true)}
                      disabled={
                        isSubmitting ||
                        !selectedService ||
                        selectedDates.length === 0 ||
                        totalSlots === 0
                      }
                      className="py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <Handshake className="w-4 h-4" />
                      Negotiate
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        !selectedService ||
                        selectedDates.length === 0 ||
                        totalSlots === 0
                      }
                      className="py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-lg font-semibold text-sm hover:from-emerald-700 hover:to-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Confirm
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden lg:flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNegotiationDialog(true)}
                    disabled={
                      isSubmitting ||
                      !selectedService ||
                      selectedDates.length === 0 ||
                      totalSlots === 0
                    }
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold text-base hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Handshake className="w-5 h-5" />
                    Negotiate Terms
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !selectedService ||
                      selectedDates.length === 0 ||
                      totalSlots === 0
                    }
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-semibold text-base hover:from-emerald-700 hover:to-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Confirm Booking
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            </div>

            {/* Sidebar - Professional Info & Summary */}
            <div className="space-y-4 sm:space-y-6">
              {/* Professional Card */}
              <motion.div
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                  Professional
                </h3>
                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  {professional.image ? (
                    <img
                      src={professional.image}
                      alt={professional.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-emerald-200"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                      {professional.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-1.5">
                      {professional.name}
                      {professional.isVerified && (
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs sm:text-sm mt-0.5">
                      <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold">
                        {professional.averageRating.toFixed(1)}
                      </span>
                      <span className="text-gray-500">
                        ({professional.totalReviews} reviews)
                      </span>
                    </div>
                  </div>
                </div>
                {professional.location && (
                  <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="truncate">{professional.location}</span>
                  </div>
                )}
              </motion.div>

              {/* Booking Summary */}
              {selectedService && totalSlots > 0 && (
                <motion.div
                  className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl sm:rounded-2xl border-2 border-emerald-200 p-4 sm:p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                    Booking Summary
                  </h3>
                  <div className="space-y-2.5 sm:space-y-3">
                    <div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Service
                      </div>
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">
                        {selectedServiceData?.title}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2.5">
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                        Selected Times
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(selectedTimeSlots).map(
                          ([dateStr, slots]) => {
                            if (slots.length === 0) return null;
                            const date = selectedDates.find(
                              (d) => format(d, "yyyy-MM-dd") === dateStr
                            );
                            return (
                              <div
                                key={dateStr}
                                className="border-l-2 border-emerald-500 pl-2"
                              >
                                <div className="font-medium text-gray-900 text-xs sm:text-sm">
                                  {date && format(date, "EEE, MMM d")}
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5">
                                  {slots.length} slot
                                  {slots.length > 1 ? "s" : ""}:{" "}
                                  {slots.join(", ")}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 sm:pt-3 border-t-2 border-emerald-200">
                      <div className="text-xs sm:text-sm text-gray-600">
                        Total ({totalSlots} session{totalSlots !== 1 ? "s" : ""}
                        )
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-emerald-600">
                        Kes {totalPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Help Card */}
              <motion.div
                className="bg-blue-50 rounded-xl sm:rounded-2xl border border-blue-200 p-4 sm:p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-start gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                  <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
                      Need Help?
                    </h4>
                    <p className="text-gray-700 text-xs sm:text-sm">
                      Questions about booking? Contact support anytime.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Date Picker Modal */}
      <AnimatePresence>
        {showMobileDatePicker && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-end lg:hidden z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileDatePicker(false)}
          >
            <motion.div
              className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Select Dates</h3>
                <button
                  onClick={() => setShowMobileDatePicker(false)}
                  className="p-1"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => {
                    if (dates) {
                      const validDates = dates.filter((date) => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        const isPast = isBefore(date, startOfDay(new Date()));
                        const isDisabled = disabledDates.includes(dateStr);

                        if (isPast || isDisabled) {
                          const reason = isDisabled
                            ? disabledReasons[dateStr] ||
                              "This date is not available"
                            : "Cannot select past dates";
                          toast.error(reason, {
                            description: "Please select a different date",
                          });
                          return false;
                        }
                        return true;
                      });
                      setSelectedDates(validDates);
                      if (validDates.length > 0) {
                        setShowMobileDatePicker(false);
                        toast.success(
                          `${validDates.length} date${
                            validDates.length > 1 ? "s" : ""
                          } selected`
                        );
                      }
                    } else {
                      setSelectedDates([]);
                    }
                  }}
                  disabled={[
                    { before: new Date() },
                    (date) =>
                      disabledDates.includes(format(date, "yyyy-MM-dd")),
                  ]}
                  onMonthChange={(month) => {
                    const monthStr = format(month, "yyyy-MM");
                    fetchMonthlyAvailability(monthStr);
                  }}
                  className="w-full"
                  classNames={{
                    months: "w-full",
                    month: "w-full space-y-2",
                    month_caption:
                      "flex justify-center pt-1 relative items-center h-10 mb-2",
                    caption_label: "text-lg font-bold text-gray-900",
                    button_previous: "absolute left-0 h-10 w-10",
                    button_next: "absolute right-0 h-10 w-10",
                    weekdays: "flex w-full justify-between",
                    weekday:
                      "text-gray-900 font-medium text-xs w-12 text-center",
                    week: "flex w-full justify-between mt-1",
                    day: "w-12",
                  }}
                  components={{
                    DayButton: ({ day, ...props }: any) => {
                      const dateStr = format(day.date, "yyyy-MM-dd");
                      const isOutside = props["data-outside"];
                      const isPast = isBefore(day.date, startOfDay(new Date()));
                      const isInDisabledList = disabledDates.includes(dateStr);
                      const isDisabled = isPast || isInDisabledList;
                      const isSelected =
                        !isDisabled &&
                        selectedDates.some(
                          (d) => format(d, "yyyy-MM-dd") === dateStr
                        );

                      return (
                        <button
                          {...props}
                          disabled={isDisabled}
                          className={`relative w-full h-12 text-sm font-medium rounded-full transition-all ${
                            isDisabled
                              ? "text-gray-400 line-through opacity-50 cursor-not-allowed"
                              : isSelected
                              ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                              : "text-gray-900 hover:bg-gray-100"
                          } ${isOutside ? "text-gray-400" : ""}`}
                        >
                          {day.date.getDate()}
                          {isSelected && !isDisabled && (
                            <CheckCircle className="absolute top-1 right-1 w-3 h-3 text-white" />
                          )}
                        </button>
                      );
                    },
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Negotiation Dialog */}
      <AnimatePresence>
        {showNegotiationDialog && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNegotiationDialog(false)}
          >
            <motion.div
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Negotiate Terms
                </h2>
                <button
                  onClick={() => setShowNegotiationDialog(false)}
                  className="p-1"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
                Propose alternative pricing or location. The provider will
                review and respond.
              </p>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Proposed Price (Optional)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                      type="number"
                      value={negotiationData.proposedPrice}
                      onChange={(e) =>
                        setNegotiationData({
                          ...negotiationData,
                          proposedPrice: e.target.value,
                        })
                      }
                      placeholder={selectedServiceData?.price.toString()}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Current price: Kes{" "}
                    {selectedServiceData?.price.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Proposed Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={negotiationData.proposedLocation}
                    onChange={(e) =>
                      setNegotiationData({
                        ...negotiationData,
                        proposedLocation: e.target.value,
                      })
                    }
                    placeholder="Alternative meeting location"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Message (Optional)
                  </label>
                  <textarea
                    value={negotiationData.message}
                    onChange={(e) =>
                      setNegotiationData({
                        ...negotiationData,
                        message: e.target.value,
                      })
                    }
                    placeholder="Explain your proposed changes..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base resize-none"
                  />
                </div>

                <div className="flex gap-2 sm:gap-3 pt-2">
                  <button
                    onClick={() => setShowNegotiationDialog(false)}
                    className="flex-1 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowNegotiationDialog(false);
                      handleSubmit(true);
                    }}
                    disabled={
                      !negotiationData.proposedPrice &&
                      !negotiationData.proposedLocation
                    }
                    className="flex-1 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Proposal
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 text-sm">Loading booking page...</p>
          </div>
        </div>
      }
    >
      <BookingPageContent />
    </Suspense>
  );
}
