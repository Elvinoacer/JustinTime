"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useCallback } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  useProfessional,
  type ProfessionalDetail,
} from "@/lib/api/hooks/useProfessional";
import { calculateBookingBreakdown, formatCurrency } from "@/lib/financials";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  CalendarClock,
  CheckCircle,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Handshake,
  LayoutList,
  Loader2,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import { useBookingFormState } from "./hooks/useBookingFormState";

import BookingServiceSelection from "./components/BookingServiceSelection";
import BookingDateTimeSelection from "./components/BookingDateTimeSelection";
import BookingLocationDetails from "./components/BookingLocationDetails";
import BookingSummarySidebar from "./components/BookingSummarySidebar";
import BookingNegotiationDialog from "./components/BookingNegotiationDialog";

type BookingService = ProfessionalDetail["services"][number];

const STEPS = [
  {
    step: 1,
    title: "Service & schedule",
    description: "Pick what you need and when you want it done.",
  },
  {
    step: 2,
    title: "Location & contact",
    description: "Add the details the professional needs to prepare.",
  },
  {
    step: 3,
    title: "Review & confirm",
    description: "Double-check the request and submit it.",
  },
  {
    step: 4,
    title: "Negotiate (optional)",
    description: "Propose adjustments before you submit.",
  },
];

function getLocationLabel(locationType?: string | null) {
  switch (locationType) {
    case "CLIENT_LOCATION":
      return "At your location";
    case "PROVIDER_LOCATION":
      return "At provider location";
    case "REMOTE":
      return "Remote";
    case "NEGOTIABLE":
      return "Location negotiable";
    default:
      return "Flexible location";
  }
}

function BookingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const professionalId = searchParams.get("professional");
  const serviceIdParam = searchParams.get("service");

  const { data, isLoading } = useProfessional(professionalId || "");
  const professional = data?.data;

  const { state, setters, actions, isInitialized } =
    useBookingFormState(professionalId);

  const {
    serviceId: selectedService,
    selectedDates,
    timeSlots: selectedTimeSlots,
    location,
    notes,
    clientPhone,
    clientAddress,
    promoCode,
    appliedPromo,
    promoDiscount,
    negotiationData,
  } = state;

  const {
    setServiceId: setSelectedService,
    setSelectedDates,
    setTimeSlots: setSelectedTimeSlots,
    setLocation,
    setNotes,
    setClientPhone,
    setClientAddress,
    setPromoCode,
    setAppliedPromo,
    setPromoDiscount,
    setNegotiationData,
  } = setters;

  const [currentStep, setCurrentStep] = useState(1);
  const [availableSlotsPerDate, setAvailableSlotsPerDate] = useState<
    Record<string, string[]>
  >({});
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [disabledReasons, setDisabledReasons] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [showMobileSummaryDetails, setShowMobileSummaryDetails] =
    useState(false);

  useEffect(() => {
    if (serviceIdParam && isInitialized && !selectedService) {
      setSelectedService(serviceIdParam);
    }
  }, [serviceIdParam, isInitialized, selectedService, setSelectedService]);

  const selectedServiceData = useMemo<BookingService | undefined>(
    () =>
      professional?.services.find((service) => service.id === selectedService),
    [professional?.services, selectedService],
  );

  const totalSlots = useMemo(
    () =>
      Object.values(selectedTimeSlots).reduce(
        (sum, slots) => sum + slots.length,
        0,
      ),
    [selectedTimeSlots],
  );

  const totalMinutes =
    totalSlots * (selectedServiceData?.defaultDuration || 60);
  const baseAmount = totalSlots * Number(selectedServiceData?.price || 0);
  const breakdown = calculateBookingBreakdown(baseAmount, promoDiscount);
  const yearsActive = professional
    ? Math.max(
        1,
        new Date().getFullYear() -
          new Date(professional.memberSince).getFullYear(),
      )
    : 0;

  const canProceedToStep2 =
    Boolean(selectedService) && selectedDates.length > 0 && totalSlots > 0;
  const canProceedToStep3 =
    clientPhone.trim().length > 0 &&
    clientAddress.trim().length > 0 &&
    (selectedServiceData?.locationType !== "CLIENT_LOCATION" ||
      location.trim().length > 0);

  const mobileProgress = (currentStep / STEPS.length) * 100;
  const isMobileContinueDisabled =
    currentStep === 1
      ? !canProceedToStep2
      : currentStep === 2
        ? !canProceedToStep3
        : false;
  const mobileContinueLabel =
    currentStep === 1
      ? "Continue to details"
      : currentStep === 2
        ? "Review booking"
        : "Continue";

  const mobileDisabledHint = useMemo(() => {
    if (!isMobileContinueDisabled) return "";

    if (currentStep === 1) {
      return "Select a service, at least one date, and one time slot to continue.";
    }

    if (
      selectedServiceData?.locationType === "CLIENT_LOCATION" &&
      location.trim().length === 0
    ) {
      return "Add the service location to continue.";
    }

    return "Add your phone number and address to continue.";
  }, [
    currentStep,
    isMobileContinueDisabled,
    selectedServiceData?.locationType,
    location,
  ]);

  const heroStats = [
    {
      label: "Rating",
      value: professional ? professional.averageRating.toFixed(1) : "0.0",
      hint: professional
        ? `${professional.totalReviews} reviews`
        : "No reviews yet",
    },
    {
      label: "Completed jobs",
      value: professional ? String(professional.completedJobs) : "0",
      hint: "Completed on JustInTime",
    },
    {
      label: "Years active",
      value: String(yearsActive),
      hint: "Based on member since date",
    },
  ];

  const bookingInsights = useMemo(() => {
    const items: string[] = [];

    if (selectedServiceData) {
      items.push(
        `${getLocationLabel(selectedServiceData.locationType)} for ${selectedServiceData.title}.`,
      );
    }
    if (totalSlots > 0) {
      items.push(
        `You have selected ${totalSlots} slot${
          totalSlots > 1 ? "s" : ""
        } totaling ${
          totalMinutes >= 60
            ? `${(totalMinutes / 60).toFixed(totalMinutes % 60 === 0 ? 0 : 1)} hours`
            : `${totalMinutes} minutes`
        }.`,
      );
    }
    if (baseAmount > 0) {
      items.push(
        `Current estimate is ${formatCurrency(
          breakdown.totalAmount,
        )}, including taxes and the Happiness Pledge.`,
      );
    }

    return items;
  }, [
    selectedServiceData,
    totalSlots,
    totalMinutes,
    baseAmount,
    breakdown.totalAmount,
  ]);

  const fetchMonthlyAvailability = useCallback(
    async (month: string) => {
      try {
        const url = `/api/provider/availability/month?providerId=${professionalId}&month=${month}&serviceId=${selectedService || ""}`;
        const response = await fetch(url);

        if (response.ok) {
          const availability = await response.json();
          setDisabledDates(availability.disabledDates || []);
          setDisabledReasons(availability.reasons || {});
        }
      } catch (error) {
        console.error("Error fetching monthly availability:", error);
      }
    },
    [professionalId, selectedService],
  );

  const fetchAvailableSlotsForDate = useCallback(
    async (dateStr: string) => {
      try {
        const duration = selectedServiceData?.defaultDuration || 60;
        const response = await fetch(
          `/api/provider/availability/check?providerId=${professionalId}&date=${dateStr}&duration=${duration}&serviceId=${selectedService}`,
        );

        if (response.ok) {
          const result = await response.json();
          setAvailableSlotsPerDate((prev) => ({
            ...prev,
            [dateStr]: result.slots || [],
          }));
        }
      } catch (error) {
        console.error(`Error fetching slots for ${dateStr}:`, error);
      }
    },
    [professionalId, selectedService, selectedServiceData?.defaultDuration],
  );

  useEffect(() => {
    if (selectedDates.length > 0 && selectedService && professionalId) {
      selectedDates.forEach((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        if (!availableSlotsPerDate[dateStr]) {
          void fetchAvailableSlotsForDate(dateStr);
        }
      });
    }
  }, [
    selectedDates,
    selectedService,
    professionalId,
    availableSlotsPerDate,
    fetchAvailableSlotsForDate,
  ]);

  useEffect(() => {
    if (professionalId) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      void fetchMonthlyAvailability(currentMonth);
    }
  }, [professionalId, fetchMonthlyAvailability]);

  useEffect(() => {
    setShowMobileSummaryDetails(false);
  }, [currentStep]);

  const handleNextStep = () => {
    if (currentStep === 1 && !canProceedToStep2) {
      toast.error("Choose a service, date, and time slot first.");
      return;
    }

    if (currentStep === 2 && !canProceedToStep3) {
      toast.error("Add your contact and location details to continue.");
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStepChipClick = (step: number) => {
    if (step >= currentStep) return;
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLoginRedirect = () => {
    router.push(
      `/auth/login?callbackUrl=/booking?professional=${professionalId}${serviceIdParam ? `&service=${serviceIdParam}` : ""}`,
    );
  };

  const handleSubmit = async (withNegotiation = false) => {
    if (!session) {
      toast.error("Please sign in to book a service");
      handleLoginRedirect();
      return;
    }

    setIsSubmitting(true);

    try {
      const duration = selectedServiceData?.defaultDuration || 60;

      const slots = [];
      for (const [dateStr, timeSlots] of Object.entries(selectedTimeSlots)) {
        for (const startTime of timeSlots) {
          const date = selectedDates.find(
            (selectedDate) => format(selectedDate, "yyyy-MM-dd") === dateStr,
          );
          if (!date) continue;

          const [hours, mins] = startTime.split(":").map(Number);
          const endMinutes = hours * 60 + mins + duration;
          const endTime = `${Math.floor(endMinutes / 60)
            .toString()
            .padStart(
              2,
              "0",
            )}:${(endMinutes % 60).toString().padStart(2, "0")}`;

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
        notes:
          withNegotiation && negotiationData.message
            ? `[Negotiation]: ${negotiationData.message}\n${notes}`
            : notes,
        clientPhone: clientPhone || undefined,
        clientAddress: clientAddress || undefined,
        promoCode: appliedPromo || undefined,
        negotiation: withNegotiation
          ? {
              proposedPrice: negotiationData.proposedPrice
                ? parseFloat(negotiationData.proposedPrice)
                : undefined,
              proposedLocation: negotiationData.proposedLocation || undefined,
            }
          : undefined,
      };

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const isSlotConflict =
          response.status === 409 && result?.code === "BOOKING_SLOT_CONFLICT";

        if (isSlotConflict) {
          setSelectedTimeSlots({});
          setCurrentStep(1);
          toast.error(
            "One or more selected slots are no longer available. Please choose new times.",
          );
          return;
        }

        throw new Error(
          result.error || result.reason || "Failed to create booking",
        );
      }

      toast.success(
        withNegotiation
          ? "Negotiation proposal sent"
          : "Booking created successfully",
        {
          description: "Redirecting to your bookings...",
        },
      );

      actions.clearDraft();

      setTimeout(() => {
        router.push("/client/bookings");
      }, 1500);
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create booking",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !isInitialized) {
    return (
      <>
        <Header />
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pt-[var(--public-header-h)]">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-emerald-600" />
            <p className="text-sm text-slate-600">Loading booking details...</p>
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
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pt-[var(--public-header-h)]">
          <div className="max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <User className="mx-auto mb-4 h-16 w-16 text-slate-300" />
            <h1 className="text-2xl font-bold text-slate-950">
              Professional Not Found
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Please return and select a valid professional before booking.
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <div className="min-h-screen bg-slate-50 pb-40 pt-[var(--public-header-h)] sm:pb-28 lg:pb-12">
        <section className="relative overflow-hidden border-b border-emerald-100/70 bg-gradient-to-b from-white via-emerald-50/55 to-slate-50">
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-300/35 blur-3xl" />
            <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-48 w-96 rounded-full bg-teal-200/30 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:items-start"
            >
              <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:p-7">
                <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800">
                  <CalendarClock className="h-4 w-4" />
                  Guided booking
                </p>
                <h1 className="mt-4 text-balance text-[1.65rem] font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Book with {professional.name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  Choose the service, reserve the right time slots, and send one
                  clean request with your location and notes. The provider gets
                  notified as soon as you confirm.
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2.5 sm:mt-6 sm:gap-3">
                  {heroStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-base font-bold text-slate-950 sm:text-xl">
                        {stat.value}
                      </p>
                      <p className="mt-1 hidden text-xs text-slate-500 sm:block">
                        {stat.hint}
                      </p>
                    </div>
                  ))}
                </div>

                {bookingInsights.length > 0 ? (
                  <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-4">
                    <p className="text-sm font-bold text-emerald-900">
                      Helpful booking info
                    </p>
                    <div className="mt-3 space-y-2">
                      {bookingInsights.map((item, index) => (
                        <div
                          key={`${item}-${index}`}
                          className="flex items-start gap-2 text-sm text-emerald-900"
                        >
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="hidden rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      Booking progress
                    </p>
                    <p className="text-sm text-slate-600">
                      Step {currentStep} of {STEPS.length}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {STEPS.map((step) => {
                    const isActive = step.step === currentStep;
                    const isComplete = currentStep > step.step;

                    return (
                      <div
                        key={step.step}
                        className={`rounded-2xl border px-4 py-3 transition-colors ${
                          isActive
                            ? "border-emerald-200 bg-emerald-50"
                            : isComplete
                              ? "border-slate-200 bg-slate-50"
                              : "border-slate-100 bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                              isComplete || isActive
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {step.step}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              {step.title}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
          <div className="sticky top-[calc(var(--public-header-h)+0.6rem)] z-30 mb-4 rounded-[1.35rem] border border-emerald-200/80 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4 lg:hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Step {currentStep} of {STEPS.length}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-slate-900 sm:text-sm">
                  {STEPS[currentStep - 1]?.title}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden min-[380px]:inline">Saved draft</span>
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${mobileProgress}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
              {STEPS.map((step) => {
                const isActive = currentStep === step.step;
                const isComplete = currentStep > step.step;
                const canNavigate = step.step < currentStep;

                return (
                  <button
                    type="button"
                    key={step.step}
                    onClick={() => handleStepChipClick(step.step)}
                    disabled={!canNavigate}
                    aria-current={isActive ? "step" : undefined}
                    className={`rounded-lg px-1.5 py-1.5 text-center text-[10px] font-semibold transition-colors min-[400px]:rounded-xl min-[400px]:px-2 min-[400px]:py-2 min-[400px]:text-[11px] ${
                      isComplete
                        ? "bg-emerald-100 text-emerald-800"
                        : isActive
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-500"
                    } ${canNavigate ? "hover:bg-emerald-200" : "cursor-default"}`}
                  >
                    {step.step}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2">
              <div className="mb-4 space-y-3 overflow-x-hidden lg:hidden">
                <div className="rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Booking snapshot
                      </p>
                      <p className="mt-1 text-[13px] font-semibold text-slate-950 sm:text-sm">
                        {selectedServiceData?.title ||
                          "Choose a service to begin"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setShowMobileSummaryDetails((previous) => !previous)
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 sm:px-3 sm:py-1.5 sm:text-xs"
                    >
                      <LayoutList className="h-3.5 w-3.5" />
                      {showMobileSummaryDetails
                        ? "Hide details"
                        : "View details"}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
                    <div className="rounded-xl bg-slate-50 px-2.5 py-1.5 sm:px-3 sm:py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Service
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-900 sm:text-xs">
                        {selectedServiceData ? "Selected" : "Pending"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-2.5 py-1.5 sm:px-3 sm:py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Time
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-900 sm:text-xs">
                        {totalSlots > 0
                          ? `${totalSlots} slot${totalSlots > 1 ? "s" : ""}`
                          : "Pending"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-2.5 py-1.5 sm:px-3 sm:py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Estimate
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-900 sm:text-xs">
                        {baseAmount > 0
                          ? formatCurrency(breakdown.totalAmount)
                          : "--"}
                      </p>
                    </div>
                  </div>
                </div>

                {showMobileSummaryDetails ? (
                  <div className="max-w-full overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
                    <BookingSummarySidebar
                      professional={professional}
                      selectedServiceData={selectedServiceData}
                      selectedDates={selectedDates}
                      selectedTimeSlots={selectedTimeSlots}
                      totalSlots={totalSlots}
                      promoCode={promoCode}
                      setPromoCode={setPromoCode}
                      appliedPromo={appliedPromo}
                      setAppliedPromo={setAppliedPromo}
                      promoDiscount={promoDiscount}
                      setPromoDiscount={setPromoDiscount}
                      isApplyingPromo={isApplyingPromo}
                      setIsApplyingPromo={setIsApplyingPromo}
                      promoError={promoError}
                      setPromoError={setPromoError}
                    />
                  </div>
                ) : null}
              </div>

              <motion.div
                className="space-y-6 rounded-[1.5rem] border border-slate-200/80 bg-white p-3.5 shadow-sm sm:rounded-[2rem] sm:p-7"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {currentStep === 1 ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-2xl">
                        Service & availability
                      </h2>
                      <p className="mt-2 text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
                        Start by selecting the service, then choose the dates
                        and time slots that work best for you.
                      </p>
                    </div>

                    <BookingServiceSelection
                      professional={professional}
                      selectedService={selectedService}
                      setSelectedService={setSelectedService}
                    />

                    <BookingDateTimeSelection
                      selectedService={selectedService}
                      selectedDates={selectedDates}
                      setSelectedDates={setSelectedDates}
                      selectedTimeSlots={selectedTimeSlots}
                      setSelectedTimeSlots={setSelectedTimeSlots}
                      availableSlotsPerDate={availableSlotsPerDate}
                      disabledDates={disabledDates}
                      disabledReasons={disabledReasons}
                      fetchMonthlyAvailability={fetchMonthlyAvailability}
                      totalSlots={totalSlots}
                    />
                  </div>
                ) : null}

                {currentStep === 2 ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-2xl">
                        Location & booking details
                      </h2>
                      <p className="mt-2 text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
                        Add the information the professional needs to confirm
                        the request and arrive prepared.
                      </p>
                    </div>

                    <BookingLocationDetails
                      selectedServiceData={selectedServiceData}
                      location={location}
                      setLocation={setLocation}
                      clientPhone={clientPhone}
                      setClientPhone={setClientPhone}
                      clientAddress={clientAddress}
                      setClientAddress={setClientAddress}
                      notes={notes}
                      setNotes={setNotes}
                    />
                  </div>
                ) : null}

                {currentStep === 3 ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-2xl">
                        Review & confirm
                      </h2>
                      <p className="mt-2 text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
                        Review your summary (right side on desktop, snapshot on
                        mobile). If everything looks good, confirm the request.
                        If you need adjustments, continue to the negotiation
                        step.
                      </p>
                    </div>

                    {status === "unauthenticated" ? (
                      <div className="rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4 text-center sm:p-6">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                          <User className="h-8 w-8" />
                        </div>
                        <h3 className="mt-3 text-base font-bold text-slate-950 sm:mt-4 sm:text-lg">
                          Sign in to finish your booking
                        </h3>
                        <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
                          Your booking draft is already saved. Sign in and
                          return to submit it without losing progress.
                        </p>
                        <button
                          onClick={handleLoginRedirect}
                          className="mt-4 rounded-2xl bg-sky-600 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-sky-700 sm:mt-5 sm:px-6 sm:py-3 sm:text-sm"
                        >
                          Continue to sign in
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-3.5 text-[13px] leading-5 text-slate-600 sm:p-4 sm:text-sm sm:leading-6">
                          Confirming creates a pending booking request and
                          notifies the professional immediately.
                        </div>

                        <div className="hidden gap-3 sm:grid sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(4)}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
                          >
                            <Handshake className="h-4 w-4" />
                            Go to negotiation
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSubmit(false)}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Confirm booking
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {currentStep === 4 ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-2xl">
                        Negotiate (optional)
                      </h2>
                      <p className="mt-2 text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
                        Send a proposal if you want to adjust the price,
                        location, or notes before the booking is submitted.
                      </p>
                    </div>

                    {status === "unauthenticated" ? (
                      <div className="rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4 text-center sm:p-6">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                          <User className="h-8 w-8" />
                        </div>
                        <h3 className="mt-3 text-base font-bold text-slate-950 sm:mt-4 sm:text-lg">
                          Sign in to continue negotiation
                        </h3>
                        <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
                          Your booking draft is saved. Sign in and continue from
                          this step.
                        </p>
                        <button
                          onClick={handleLoginRedirect}
                          className="mt-4 rounded-2xl bg-sky-600 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-sky-700 sm:mt-5 sm:px-6 sm:py-3 sm:text-sm"
                        >
                          Continue to sign in
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-3.5 text-[13px] leading-5 text-slate-600 sm:p-4 sm:text-sm sm:leading-6">
                          Open the negotiation form to share your preferred
                          price or location details. You can return to review
                          anytime.
                        </div>

                        <div className="hidden gap-3 sm:grid sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(3)}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Back to review
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNegotiationDialog(true)}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
                          >
                            <Handshake className="h-4 w-4" />
                            Open negotiation form
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="hidden items-center justify-between border-t border-slate-100 pt-6 lg:flex">
                  {currentStep > 1 ? (
                    <button
                      onClick={handlePrevStep}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {currentStep < 3 ? (
                    <button
                      onClick={handleNextStep}
                      disabled={
                        currentStep === 1
                          ? !canProceedToStep2
                          : !canProceedToStep3
                      }
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </motion.div>
            </div>

            <div className="hidden space-y-6 lg:block">
              <BookingSummarySidebar
                professional={professional}
                selectedServiceData={selectedServiceData}
                selectedDates={selectedDates}
                selectedTimeSlots={selectedTimeSlots}
                totalSlots={totalSlots}
                promoCode={promoCode}
                setPromoCode={setPromoCode}
                appliedPromo={appliedPromo}
                setAppliedPromo={setAppliedPromo}
                promoDiscount={promoDiscount}
                setPromoDiscount={setPromoDiscount}
                isApplyingPromo={isApplyingPromo}
                setIsApplyingPromo={setIsApplyingPromo}
                promoError={promoError}
                setPromoError={setPromoError}
              />

              {selectedServiceData ? (
                <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-950">
                    Quick facts
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-sm text-slate-600">
                        Location mode
                      </span>
                      <span className="text-right text-sm font-semibold text-slate-950">
                        {getLocationLabel(selectedServiceData.locationType)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-sm text-slate-600">
                        Time selected
                      </span>
                      <span className="text-right text-sm font-semibold text-slate-950">
                        {totalSlots > 0
                          ? totalMinutes >= 60
                            ? `${(totalMinutes / 60).toFixed(
                                totalMinutes % 60 === 0 ? 0 : 1,
                              )} hrs`
                            : `${totalMinutes} mins`
                          : "Not selected yet"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-sm text-slate-600">
                        Estimated total
                      </span>
                      <span className="text-right text-sm font-semibold text-slate-950">
                        {baseAmount > 0
                          ? formatCurrency(breakdown.totalAmount)
                          : "Select slots first"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {currentStep < 3 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="mx-auto max-w-7xl px-3 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-2.5 sm:px-4 sm:pt-3">
            <div className="mb-2.5 flex flex-col gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between sm:mb-3 sm:px-3 sm:py-2">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <Clock3 className="h-4 w-4 text-emerald-600" />
                {totalSlots > 0
                  ? `${totalSlots} slot${totalSlots > 1 ? "s" : ""} selected`
                  : "No slots selected yet"}
              </div>
              <div className="inline-flex items-center gap-1 text-[13px] font-bold text-slate-950 sm:text-sm">
                <Wallet className="h-4 w-4 text-emerald-600" />
                {baseAmount > 0
                  ? formatCurrency(breakdown.totalAmount)
                  : "Select to estimate"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-3.5 text-[13px] font-semibold text-slate-700 sm:h-12 sm:px-4 sm:text-sm"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleNextStep}
                disabled={isMobileContinueDisabled}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:h-12 sm:px-5 sm:text-sm"
              >
                {mobileContinueLabel}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {isMobileContinueDisabled ? (
              <p className="mt-1.5 text-[11px] text-amber-700 sm:mt-2 sm:text-xs">
                {mobileDisabledHint}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {currentStep === 3 && status !== "unauthenticated" ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="mx-auto max-w-7xl px-3 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-2.5 sm:px-4 sm:pt-3">
            <div className="mb-2.5 flex flex-col gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between sm:mb-3 sm:px-3 sm:py-2">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <Clock3 className="h-4 w-4 text-emerald-600" />
                {totalSlots > 0
                  ? `${totalSlots} slot${totalSlots > 1 ? "s" : ""} selected`
                  : "No slots selected yet"}
              </div>
              <div className="inline-flex items-center gap-1 text-[13px] font-bold text-slate-950 sm:text-sm">
                <Wallet className="h-4 w-4 text-emerald-600" />
                {baseAmount > 0
                  ? formatCurrency(breakdown.totalAmount)
                  : "Select to estimate"}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50 sm:h-12 sm:text-sm"
              >
                <Handshake className="h-4 w-4" />
                Go to negotiate
              </button>

              <button
                type="button"
                onClick={() => void handleSubmit(false)}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 sm:h-12 sm:text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {currentStep === 4 && status !== "unauthenticated" ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="mx-auto max-w-7xl px-3 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-2.5 sm:px-4 sm:pt-3">
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:h-12 sm:text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to review
              </button>

              <button
                type="button"
                onClick={() => setShowNegotiationDialog(true)}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50 sm:h-12 sm:text-sm"
              >
                <Handshake className="h-4 w-4" />
                Open form
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BookingNegotiationDialog
        showNegotiationDialog={showNegotiationDialog}
        setShowNegotiationDialog={setShowNegotiationDialog}
        negotiationData={negotiationData}
        setNegotiationData={setNegotiationData}
        selectedServiceData={selectedServiceData}
        handleSubmit={handleSubmit}
      />

      <Footer />
    </>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm text-slate-600">Loading booking page...</p>
          </div>
        </div>
      }
    >
      <BookingPageContent />
    </Suspense>
  );
}
