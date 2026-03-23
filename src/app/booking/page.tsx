"use client";

import React, { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfessional } from "@/lib/api/hooks/useProfessional";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Loader2, ChevronLeft, Handshake, CheckCircle, ChevronRight, User } from "lucide-react";
import { useBookingFormState } from "./hooks/useBookingFormState";

import BookingServiceSelection from "./components/BookingServiceSelection";
import BookingDateTimeSelection from "./components/BookingDateTimeSelection";
import BookingLocationDetails from "./components/BookingLocationDetails";
import BookingSummarySidebar from "./components/BookingSummarySidebar";
import BookingNegotiationDialog from "./components/BookingNegotiationDialog";

function BookingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const professionalId = searchParams.get("professional");
  const serviceIdParam = searchParams.get("service");

  const { data, isLoading } = useProfessional(professionalId || "");
  const professional = data?.data;

  const { state, setters, actions, isInitialized } = useBookingFormState(professionalId);
  
  // Destructure state for easier access
  const {
    serviceId: selectedService,
    selectedDates,
    timeSlots: selectedTimeSlots,
    location,
    notes,
    clientPhone,
    clientAddress,
    promoCode
  } = state;

  const {
    setServiceId: setSelectedService,
    setSelectedDates,
    setTimeSlots: setSelectedTimeSlots,
    setLocation,
    setNotes,
    setClientPhone,
    setClientAddress,
    setPromoCode
  } = setters;

  // Additional component states
  const [currentStep, setCurrentStep] = useState(1);
  const [availableSlotsPerDate, setAvailableSlotsPerDate] = useState<Record<string, string[]>>({});
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [disabledReasons, setDisabledReasons] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [negotiationData, setNegotiationData] = useState({
    proposedPrice: "",
    proposedLocation: "",
    message: "",
  });
  const [showMobileDatePicker, setShowMobileDatePicker] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState("");

  // Set initial service from URL if provided and not already set by draft
  useEffect(() => {
    if (serviceIdParam && isInitialized && !selectedService) {
      setSelectedService(serviceIdParam);
    }
  }, [serviceIdParam, isInitialized, selectedService, setSelectedService]);

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
      const url = `/api/provider/availability/month?providerId=${professionalId}&month=${month}&serviceId=${selectedService || ""}`;
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
      const service = professional?.services.find((s: any) => s.id === selectedService);
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

  const totalSlots = Object.values(selectedTimeSlots).reduce((sum, slots) => sum + slots.length, 0);
  const selectedServiceData = professional?.services.find((s: any) => s.id === selectedService);

  const canProceedToStep2 = selectedService && selectedDates.length > 0 && totalSlots > 0;
  const canProceedToStep3 = clientPhone.trim() && clientAddress.trim() && 
    ((selectedServiceData as any)?.locationType !== "CLIENT_LOCATION" || location.trim());

  const handleNextStep = () => {
    if (currentStep === 1 && !canProceedToStep2) {
      toast.error("Please select a service, date, and time slot.");
      return;
    }
    if (currentStep === 2 && !canProceedToStep3) {
      toast.error("Please fill in all required contact and location fields.");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLoginRedirect = () => {
    router.push(`/auth/login?callbackUrl=/booking?professional=${professionalId}`);
  };

  const handleSubmit = async (withNegotiation = false) => {
    if (!session) {
      toast.error("Please sign in to book a service");
      handleLoginRedirect();
      return;
    }

    setIsSubmitting(true);

    try {
      const service = professional?.services.find((s: any) => s.id === selectedService);
      const duration = (service as any)?.defaultDuration || 60;

      const slots = [];
      for (const [dateStr, timeSlots] of Object.entries(selectedTimeSlots)) {
        for (const startTime of timeSlots) {
          const date = selectedDates.find((d) => format(d, "yyyy-MM-dd") === dateStr);
          if (!date) continue;
          const [hours, mins] = startTime.split(":").map(Number);
          const endMinutes = hours * 60 + mins + duration;
          const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;
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
        notes: withNegotiation && negotiationData.message ? `[Negotiation]: ${negotiationData.message}\n${notes}` : notes,
        clientPhone: clientPhone || undefined,
        clientAddress: clientAddress || undefined,
        promoCode: appliedPromo || undefined,
        negotiation: withNegotiation ? {
           proposedPrice: negotiationData.proposedPrice ? parseFloat(negotiationData.proposedPrice) : undefined,
           proposedLocation: negotiationData.proposedLocation || undefined
        } : undefined
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

      toast.success(withNegotiation ? "Negotiation proposal sent!" : "Booking created successfully!", {
        description: "Redirecting to your bookings...",
      });
      
      actions.clearDraft();

      setTimeout(() => {
        router.push("/client/bookings");
      }, 1500);
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !isInitialized) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-sm">Loading professional details...</p>
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

  return (
    <>
      <Header />
      
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-16 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="flex flex-col">
                 <span className="text-xs text-gray-500 font-medium">Step {currentStep} of 3</span>
                 <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                     <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(currentStep / 3) * 100}%` }} />
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

      <div className="min-h-screen bg-gray-50 pt-32 lg:pt-24 pb-24 lg:pb-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          
          {/* Header */}
          <motion.div
            className="mb-6 lg:mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                    Book a Service
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base">
                    Schedule your appointment with {professional.name}
                    </p>
                </div>
                
                {/* Desktop Progress Tracker */}
                <div className="hidden lg:flex items-center gap-2">
                    {[1, 2, 3].map((step) => (
                        <div key={step} className="flex items-center">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${currentStep >= step ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {step}
                            </div>
                            {step < 3 && <div className={`w-12 h-1 ${currentStep > step ? 'bg-emerald-600' : 'bg-gray-200'}`} />}
                        </div>
                    ))}
                </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Main Form Area */}
            <div className="lg:col-span-2">
              <motion.div
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                    {currentStep === 1 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                            <h2 className="text-xl font-bold border-b pb-2">Activity & Availability</h2>
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
                                setShowMobileDatePicker={setShowMobileDatePicker}
                                fetchMonthlyAvailability={fetchMonthlyAvailability}
                                totalSlots={totalSlots}
                            />
                        </motion.div>
                    )}

                    {currentStep === 2 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                            <h2 className="text-xl font-bold border-b pb-2">Location & Details</h2>
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
                        </motion.div>
                    )}

                    {currentStep === 3 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                            <h2 className="text-xl font-bold border-b pb-2">Review & Confirm</h2>
                            
                            {status === "unauthenticated" ? (
                                <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-4">
                                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                                        <User className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Sign in required</h3>
                                    <p className="text-gray-600 max-w-sm mx-auto">
                                        You need to have an account and be signed in to confirm your booking. Your progress has been saved.
                                    </p>
                                    <button
                                        onClick={handleLoginRedirect}
                                        className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                                    >
                                        Continue to Sign In
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                     <p className="text-gray-600">Please review your booking summary on the right. Once everything looks good, you may confirm your booking or propose alternative terms.</p>
                                     
                                     <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                                         <button
                                            type="button"
                                            onClick={() => setShowNegotiationDialog(true)}
                                            disabled={isSubmitting}
                                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold text-base hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                         >
                                            <Handshake className="w-5 h-5" />
                                            Negotiate Terms
                                         </button>
                                         <button
                                            type="button"
                                            onClick={() => handleSubmit(false)}
                                            disabled={isSubmitting}
                                            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-semibold text-base hover:from-emerald-700 hover:to-teal-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                         >
                                            {isSubmitting ? (
                                                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                                            ) : (
                                                <><CheckCircle className="w-5 h-5" /> Confirm Booking</>
                                            )}
                                         </button>
                                     </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="pt-6 mt-6 border-t border-gray-100 flex justify-between items-center">
                        {currentStep > 1 ? (
                            <button
                                onClick={handlePrevStep}
                                className="px-4 py-2 flex items-center gap-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                            >
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                        ) : <div />}
                        
                        {currentStep < 3 && (
                            <button
                                onClick={handleNextStep}
                                disabled={currentStep === 1 ? !canProceedToStep2 : !canProceedToStep3}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-1.5 font-bold transition-colors"
                            >
                                Continue <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="lg:block hidden">
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
            
            {/* Mobile Bottom Sheet Summary (Visible on Step 3) */}
            {currentStep === 3 && (
                <div className="lg:hidden mt-4">
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
            )}
          </div>
        </div>
      </div>

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
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 text-sm">Loading booking page...</p>
          </div>
        </div>
    }>
      <BookingPageContent />
    </Suspense>
  );
}
