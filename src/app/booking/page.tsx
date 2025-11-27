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
import { format } from "date-fns";

function BookingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const professionalId = searchParams.get("professional");
  const serviceIdParam = searchParams.get("service");

  const { data, isLoading } = useProfessional(professionalId || "");
  const professional = data?.data;

  const [selectedService, setSelectedService] = useState<string>(serviceIdParam || "");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, string[]>>({});
  const [availableSlotsPerDate, setAvailableSlotsPerDate] = useState<Record<string, string[]>>({});
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

  // Note: We don't redirect unauthenticated users here because:
  // 1. The booking page is public and should be viewable
  // 2. Users need to see service details before deciding to sign in
  // 3. The backend API will handle authentication when they try to submit

  // Fetch available slots when dates change
  useEffect(() => {
    if (selectedDates.length > 0 && selectedService && professionalId) {
      selectedDates.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd'); // FIXED: Use format instead of toISOString()
        if (!availableSlotsPerDate[dateStr]) {
          fetchAvailableSlotsForDate(dateStr);
        }
      });
    }
  }, [selectedDates, selectedService, professionalId]);

  // Fetch monthly availability when professional loads
  useEffect(() => {
    console.log('🔄 useEffect triggered - professionalId:', professionalId);
    if (professionalId) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      console.log('✅ Fetching availability for month:', currentMonth);
      fetchMonthlyAvailability(currentMonth);
    } else {
      console.log('❌ No professionalId - skipping fetch');
    }
  }, [professionalId]);

  const fetchMonthlyAvailability = async (month: string) => {
    try {
      const url = `/api/provider/availability/month?providerId=${professionalId}&month=${month}&serviceId=${selectedService || ''}`;
      console.log('🔍 Fetching monthly availability:', url);
      
      const response = await fetch(url);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Monthly availability data received:');
        console.log('   - weeklySchedule:', data.weeklySchedule);
        console.log('   - disabledDates:', data.disabledDates);
        console.log('   - reasons:', data.reasons);
        console.log('   - Full data:', JSON.stringify(data, null, 2));
        
        setDisabledDates(data.disabledDates || []);
        setDisabledReasons(data.reasons || {});
        
        console.log('🔒 State updated with', data.disabledDates?.length || 0, 'disabled dates');
      } else {
        const errorData = await response.json();
        console.error('❌ API error:', errorData);
      }
    } catch (error) {
      console.error("❌ Error fetching monthly availability:", error);
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
        setAvailableSlotsPerDate(prev => ({
          ...prev,
          [dateStr]: data.slots || []
        }));
      }
    } catch (error) {
      console.error(`Error fetching slots for ${dateStr}:`, error);
    }
  };


  const handleSubmit = async (withNegotiation = false) => {
    // Check if user is logged in before allowing booking
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

    // Check if at least one time slot is selected
    const hasTimeSlots = Object.values(selectedTimeSlots).some(slots => slots.length > 0);
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
      // Get service for duration calculation
      const service = professional?.services.find(
        (s: any) => s.id === selectedService
      );
      const duration = (service as any)?.defaultDuration || 60;

      // Build array of slots
      const slots = [];
      for (const [dateStr, timeSlots] of Object.entries(selectedTimeSlots)) {
        for (const startTime of timeSlots) {
          // Find the corresponding Date object
          const date = selectedDates.find(d => format(d, 'yyyy-MM-dd') === dateStr);
          if (!date) continue;

          // Calculate end time
          const [hours, mins] = startTime.split(":").map(Number);
          const endMinutes = hours * 60 + mins + duration;
          const endTime = `${Math.floor(endMinutes / 60)
            .toString()
            .padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

          slots.push({
            date: new Date(`${dateStr}T${startTime}`).toISOString(),
            startTime,
            endTime,
          });
        }
      }

      console.log(`📝 Creating booking with ${slots.length} slots...`);

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
        throw new Error(result.error || result.reason || "Failed to create booking");
      }

      toast.success("Booking created successfully!", {
        description: "Redirecting to your bookings..."
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
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
            <span className="material-symbols-outlined text-gray-300 text-8xl mb-6">
              person_off
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Professional Not Found
            </h1>
            <p className="text-gray-600">
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

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  // Get maximum date (3 months from now)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Book a Service
            </h1>
            <p className="text-gray-600">
              Schedule your appointment with {professional.name}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <motion.form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(false);
                }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {/* Select Service */}
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    Select Service *
                  </label>
                  <div className="grid gap-4">
                    {professional.services.length === 0 ? (
                      <p className="text-gray-500">No services available</p>
                    ) : (
                      professional.services.map((service: any) => (
                        <div
                          key={service.id}
                          onClick={() => setSelectedService(service.id)}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedService === service.id
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-200 hover:border-emerald-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 mb-1">
                                {service.title}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                {service.description}
                              </p>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-emerald-600 font-bold text-lg">
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
                              <span className="material-symbols-outlined text-emerald-600 text-3xl">
                                check_circle
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                {/* Date Selection */}
                <div className="space-y-4">
                  <label
                    htmlFor="date-picker"
                    className="block text-lg font-bold text-gray-900"
                  >
                    Select Date <span className="text-red-600">*</span>
                  </label>

                  <div className="bg-white border border-gray-300 rounded-2xl shadow-sm p-6">
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(dates) => {
                        console.log('📅 onSelect called with dates:', dates);
                        if (dates) {
                          // Filter out disabled dates
                          const validDates = dates.filter((date) => {
                            // Use format to get local date string (timezone-safe)
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                            const isDisabled = disabledDates.includes(dateStr);
                            
                            console.log(`   Checking ${dateStr}:`, { isPast, isDisabled, isValid: !isPast && !isDisabled });
                            
                            if (isPast || isDisabled) {
                              const reason = isDisabled 
                                ? disabledReasons[dateStr] || "This date is not available"
                                : "Cannot select past dates";
                              console.log(`   ❌ Rejected ${dateStr}:`, reason);
                              toast.error(reason, {
                                description: "Please select a different date",
                              });
                              return false;
                            }
                            return true;
                          });
                          
                          console.log('✅ Valid dates after filter:', validDates);
                          setSelectedDates(validDates);
                          if (validDates.length > 0) {
                            toast.success(`${validDates.length} date${validDates.length > 1 ? 's' : ''} selected`);
                          }
                        } else {
                          setSelectedDates([]);
                        }
                      }}
                      disabled={[
                        { before: new Date() }, // Disable past dates
                        (date) => {
                          const dateStr = date.toISOString().split("T")[0];
                          const isDisabled = disabledDates.includes(dateStr);
                          if (dateStr === "2025-11-27") {
                            console.log('🔍 Checking 2025-11-27:', {
                              dateStr,
                              isDisabled,
                              disabledDatesArray: disabledDates,
                              includes: disabledDates.includes(dateStr)
                            });
                          }
                          return isDisabled;
                        },
                      ]}
                      onDayClick={(day, modifiers) => {
                        if (modifiers.disabled) {
                          const dateStr = day.toISOString().split("T")[0];
                          const reason = disabledReasons[dateStr] || "This date is not available";
                          toast.error(reason, {
                            description: "Please select a different date",
                          });
                        }
                      }}
                      onMonthChange={(month) => {
                        const monthStr = format(month, "yyyy-MM");
                        fetchMonthlyAvailability(monthStr);
                      }}
                      modifiers={{
                        booked: (date) =>
                          disabledDates.includes(
                            date.toISOString().split("T")[0]
                          ),
                      }}
                      modifiersClassNames={{
                        booked: "line-through text-gray-400 opacity-50",
                      }}
                      className="w-full"
                      classNames={{
                        months: "w-full",
                        month: "w-full space-y-6",
                        month_caption: "flex justify-center pt-1 relative items-center h-10 mb-6",
                        caption_label: "text-2xl font-bold text-gray-900",
                        button_previous: "absolute left-0 h-10 w-10",
                        button_next: "absolute right-0 h-10 w-10",
                        weekdays: "flex w-full justify-between px-2",
                        weekday: "text-gray-900 font-bold text-base w-14 text-center",
        week: "flex w-full justify-between px-2 mt-3",
                        day: "w-14",
                      }}
                      components={{
                        DayButton: ({ day, ...props }: any) => {
                          // Use format for timezone-safe date string
                          const dateStr = format(day.date, 'yyyy-MM-dd');
                          const isOutside = props["data-outside"];
                          
                          // MANUALLY check if disabled
                          const isPast = day.date < new Date(new Date().setHours(0, 0, 0, 0));
                          const isInDisabledList = disabledDates.includes(dateStr);
                          const isDisabled = isPast || isInDisabledList;
                          
                          // Don't show as selected if disabled
                          const isSelected = !isDisabled && selectedDates.some(
                            (d) => format(d, 'yyyy-MM-dd') === dateStr
                          );
                          const isToday = day.date.toDateString() === new Date().toDateString();
                          
                          if (dateStr === "2025-11-27") {
                            console.log('🎨 Rendering 2025-11-27:', {
                              dateStr,
                              isPast,
                              isInDisabledList,
                              isDisabled,
                              isSelected,
                              disabledDatesLength: disabledDates.length
                            });
                          }
                          
                          return (
                            <button
                              {...props}
                              disabled={isDisabled}
                              className={`relative w-full h-14 text-base font-semibold rounded-full transition-all duration-200 ${
                                isDisabled
                                  ? "text-gray-400 line-through opacity-50 cursor-not-allowed bg-gray-100"
                                  : isSelected
                                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-[3px] border-emerald-700 shadow-[0_0_0_4px_rgba(16,185,129,0.2)] hover:scale-105"
                                  : isToday
                                  ? "bg-emerald-50 font-bold text-emerald-600 border-2 border-emerald-300 hover:scale-105"
                                  : "text-gray-900 hover:bg-gray-100 hover:scale-105"
                              } ${
                                isOutside ? "text-gray-400" : ""
                              }`}
                            >
                              {day.date.getDate()}
                              {isSelected && !isDisabled && (
                                <span className="absolute -top-1 -right-1 material-symbols-outlined text-base bg-white text-emerald-600 rounded-full p-0.5 shadow-md">
                                  check_circle
                                </span>
                              )}
                            </button>
                          );
                        },
                      }}
                      footer={
                        selectedDates.length > 0 ? (
                          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <p className="text-sm font-bold text-emerald-900 mb-2">
                              {selectedDates.length} Date{selectedDates.length > 1 ? 's' : ''} Selected
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {selectedDates.map((date, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-emerald-300 rounded-full text-xs font-medium text-emerald-700"
                                >
                                  {format(date, "MMM d")}
                                  <button
                                    onClick={() => {
                                      setSelectedDates(prev => prev.filter((_, i) => i !== idx));
                                    }}
                                    className="ml-1 hover:text-emerald-900"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null
                      }
                    />
                  </div>

                  {!selectedService && (
                    <p
                      className="text-sm text-amber-700 font-medium flex items-center gap-2"
                      role="status"
                    >
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Please select a service first to view available dates.
                    </p>
                  )}
                </div>

                {/* Time Selection - Multiple Dates & Slots */}
                {selectedDates.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden space-y-4"
                  >
                    <label className="block text-lg font-bold text-gray-900">
                      Select Time Slots <span className="text-red-600">*</span>
                    </label>

                    {selectedDates.map((date) => {
                      const dateStr = format(date, 'yyyy-MM-dd'); // FIXED: Use format instead of toISOString()
                      const slots = availableSlotsPerDate[dateStr] || [];
                      const selectedSlots = selectedTimeSlots[dateStr] || [];

                      return (
                        <div
                          key={dateStr}
                          className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">
                              {format(date, "EEEE, MMMM d, yyyy")}
                            </h3>
                            <span className="text-sm font-medium text-emerald-600">
                              {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
                            </span>
                          </div>

                          {slots.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {slots.map((time: string) => {
                                const isSelected = selectedSlots.includes(time);
                                return (
                                  <button
                                    key={time}
                                    type="button"
                                    onClick={() => {
                                      setSelectedTimeSlots((prev) => {
                                        const currentSlots = prev[dateStr] || [];
                                        const newSlots = isSelected
                                          ? currentSlots.filter((t) => t !== time)
                                          : [...currentSlots, time];
                                        return {
                                          ...prev,
                                          [dateStr]: newSlots,
                                        };
                                      });
                                    }}
                                    className={`py-2.5 px-3 rounded-lg font-semibold text-sm transition-all ${
                                      isSelected
                                        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md ring-2 ring-emerald-300"
                                        : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-emerald-300"
                                    }`}
                                  >
                                    {time}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-gray-50 rounded-lg">
                              <span className="material-symbols-outlined text-gray-400 text-4xl">
                                event_busy
                              </span>
                              <p className="text-gray-600 text-sm mt-2">
                                No available slots for this date
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Summary of all selected slots */}
                    {Object.entries(selectedTimeSlots).some(([_, slots]) => slots.length > 0) && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <h4 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined">calendar_month</span>
                          Selected Appointments
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(selectedTimeSlots).map(([dateStr, slots]) => {
                            if (slots.length === 0) return null;
                            const date = selectedDates.find(d => d.toISOString().split("T")[0] === dateStr);
                            return (
                              <div key={dateStr} className="flex flex-wrap gap-2 items-start">
                                <span className="text-sm font-medium text-emerald-800 min-w-[140px]">
                                  {date && format(date, "MMM d, yyyy")}:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {slots.map((time) => (
                                    <span
                                      key={time}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-emerald-300 rounded text-xs font-medium text-emerald-700"
                                    >
                                      {time}
                                      <button
                                        onClick={() => {
                                          setSelectedTimeSlots((prev) => ({
                                            ...prev,
                                            [dateStr]: prev[dateStr].filter((t) => t !== time),
                                          }));
                                        }}
                                        className="hover:text-emerald-900"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Location */}
                {(selectedServiceData as any)?.locationType !== "PROVIDER_LOCATION" && (
                  <div>
                    <label
                      htmlFor="location"
                      className="block text-lg font-bold text-gray-900 mb-3"
                    >
                      Location{" "}
                      {(selectedServiceData as any)?.locationType === "CLIENT_LOCATION"
                        ? "*"
                        : "(Optional)"}
                    </label>
                    <input
                      type="text"
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={
                        (selectedServiceData as any)?.locationType === "CLIENT_LOCATION"
                          ? "Enter your location"
                          : "Specify preferred location or leave blank to negotiate"
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                      required={
                        (selectedServiceData as any)?.locationType === "CLIENT_LOCATION"
                      }
                    />
                  </div>
                )}

                {/* Contact Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600">contact_phone</span>
                    Contact Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Phone Number */}
                    <div>
                      <label
                        htmlFor="clientPhone"
                        className="block text-sm font-semibold text-gray-900 mb-2"
                      >
                        Phone Number <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          phone
                        </span>
                        <input
                          type="tel"
                          id="clientPhone"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="e.g., +254 712 345 678"
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        We'll use this to confirm your booking
                      </p>
                    </div>

                    {/* Address */}
                    <div>
                      <label
                        htmlFor="clientAddress"
                        className="block text-sm font-semibold text-gray-900 mb-2"
                      >
                        Address <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">
                          location_on
                        </span>
                        <textarea
                          id="clientAddress"
                          value={clientAddress}
                          onChange={(e) => setClientAddress(e.target.value)}
                          rows={3}
                          placeholder="Enter your full address..."
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 resize-none"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label
                    htmlFor="notes"
                    className="block text-lg font-bold text-gray-900 mb-3"
                  >
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Any special requirements or notes for the professional..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNegotiationDialog(true)}
                    disabled={
                      isSubmitting ||
                      !selectedService ||
                      selectedDates.length === 0 ||
                      !Object.values(selectedTimeSlots).some(slots => slots.length > 0)
                    }
                    className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">handshake</span>
                    Negotiate Terms
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !selectedService ||
                      selectedDates.length === 0 ||
                      !Object.values(selectedTimeSlots).some(slots => slots.length > 0)
                    }
                    className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-bold text-lg hover:from-emerald-700 hover:to-teal-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">
                          event_available
                        </span>
                        Confirm Booking
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            </div>

            {/* Sidebar - Professional Info & Summary */}
            <div className="space-y-6">
              {/* Professional Card */}
              <motion.div
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Professional
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  {professional.image ? (
                    <img
                      src={professional.image}
                      alt={professional.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-emerald-200"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                      {professional.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      {professional.name}
                      {professional.isVerified && (
                        <span className="material-symbols-outlined text-emerald-600 text-lg">
                          verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm mt-1">
                      <span className="material-symbols-outlined text-yellow-500 text-base">
                        star
                      </span>
                      <span className="font-semibold">
                        {professional.averageRating.toFixed(1)}
                      </span>
                      <span className="text-gray-500">
                        ({professional.totalReviews})
                      </span>
                    </div>
                  </div>
                </div>
                {professional.location && (
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <span className="material-symbols-outlined text-base">
                      location_on
                    </span>
                    {professional.location}
                  </div>
                )}
              </motion.div>

              {/* Booking Summary */}
              {selectedService && (
                <motion.div
                  className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200 p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Booking Summary
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-600">Service</div>
                      <div className="font-semibold text-gray-900">
                        {selectedServiceData?.title}
                      </div>
                    </div>
                    {/* TODO: Update summary to show all selected dates/times */}
                    {selectedDates.length > 0 && Object.values(selectedTimeSlots).some(slots => slots.length > 0) && (
                      <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                        <h3 className="font-bold text-gray-900 text-lg">
                          Booking Summary
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(selectedTimeSlots).map(([dateStr, slots]) => {
                            if (slots.length === 0) return null;
                            const date = selectedDates.find(d => d.toISOString().split("T")[0] === dateStr);
                            return (
                              <div key={dateStr} className="border-l-4 border-emerald-500 pl-3">
                                <div className="font-medium text-gray-900">
                                  {date && format(date, "EEEE, MMMM d, yyyy")}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {slots.length} time slot{slots.length > 1 ? 's' : ''}: {slots.join(', ')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="pt-3 border-t-2 border-emerald-200">
                      <div className="text-sm text-gray-600">Total ({Object.values(selectedTimeSlots).reduce((sum, slots) => sum + slots.length, 0)} session{Object.values(selectedTimeSlots).reduce((sum, slots) => sum + slots.length, 0) !== 1 ? 's' : ''})</div>
                      <div className="text-2xl font-bold text-emerald-600">
                        Kes {((selectedServiceData?.price || 0) * Object.values(selectedTimeSlots).reduce((sum, slots) => sum + slots.length, 0)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Help Card */}
              <motion.div
                className="bg-blue-50 rounded-2xl border border-blue-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="material-symbols-outlined text-blue-600 text-2xl">
                    info
                  </span>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Need Help?</h4>
                    <p className="text-sm text-gray-700">
                      If you have any questions about the booking process,
                      please contact support.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

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
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Negotiate Terms
              </h2>
              <p className="text-gray-600 mb-6">
                Propose alternative pricing or location. The provider will
                review and respond.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proposed Price (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      Kes
                    </span>
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
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Current price: Kes{" "}
                    {selectedServiceData?.price.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowNegotiationDialog(false)}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
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
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>}>
      <BookingPageContent />
    </Suspense>
  );
}
