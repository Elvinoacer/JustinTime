import { useState, useEffect } from "react";

export interface BookingNegotiationData {
  proposedPrice: string;
  proposedLocation: string;
  message: string;
}

export interface BookingState {
  serviceId: string;
  selectedDates: Date[];
  timeSlots: Record<string, string[]>;
  location: string;
  notes: string;
  clientPhone: string;
  clientAddress: string;
  promoCode: string;
  appliedPromo: string;
  promoDiscount: number;
  negotiationData: BookingNegotiationData;
}

const STORAGE_KEY = "jit_booking_draft";
const LEGACY_STORAGE_KEY = "justintime_booking_draft";

const EMPTY_NEGOTIATION_DATA: BookingNegotiationData = {
  proposedPrice: "",
  proposedLocation: "",
  message: "",
};

export function useBookingFormState(professionalId: string | null) {
  // Initialize state
  const [serviceId, setServiceId] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [timeSlots, setTimeSlots] = useState<Record<string, string[]>>({});
  const [location, setLocation] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [clientAddress, setClientAddress] = useState<string>("");
  const [promoCode, setPromoCode] = useState<string>("");
  const [appliedPromo, setAppliedPromo] = useState<string>("");
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [negotiationData, setNegotiationData] =
    useState<BookingNegotiationData>(EMPTY_NEGOTIATION_DATA);

  const [isInitialized, setIsInitialized] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    if (!professionalId || isInitialized) return;

    try {
      const stored =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(LEGACY_STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        // Only load if it's for the same professional
        if (parsed.professionalId === professionalId) {
          if (parsed.serviceId) setServiceId(parsed.serviceId);
          if (parsed.location) setLocation(parsed.location);
          if (parsed.notes) setNotes(parsed.notes);
          if (parsed.clientPhone) setClientPhone(parsed.clientPhone);
          if (parsed.clientAddress) setClientAddress(parsed.clientAddress);
          if (parsed.promoCode) setPromoCode(parsed.promoCode);
          if (parsed.appliedPromo) setAppliedPromo(parsed.appliedPromo);
          if (typeof parsed.promoDiscount === "number") {
            setPromoDiscount(parsed.promoDiscount);
          }
          if (parsed.timeSlots) setTimeSlots(parsed.timeSlots);

          if (
            parsed.negotiationData &&
            typeof parsed.negotiationData === "object"
          ) {
            setNegotiationData({
              proposedPrice:
                typeof parsed.negotiationData.proposedPrice === "string"
                  ? parsed.negotiationData.proposedPrice
                  : "",
              proposedLocation:
                typeof parsed.negotiationData.proposedLocation === "string"
                  ? parsed.negotiationData.proposedLocation
                  : "",
              message:
                typeof parsed.negotiationData.message === "string"
                  ? parsed.negotiationData.message
                  : "",
            });
          }

          if (parsed.selectedDates && Array.isArray(parsed.selectedDates)) {
            // Convert string dates back to Date objects
            const dates = parsed.selectedDates.map((d: string) => new Date(d));
            setSelectedDates(dates);
          }
        } else {
          // Different professional, clear old draft
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("Failed to load booking draft", error);
    } finally {
      setIsInitialized(true);
    }
  }, [professionalId, isInitialized]);

  // Save to local storage whenever state changes (if initialized)
  useEffect(() => {
    if (!isInitialized || !professionalId) return;

    try {
      const draft = {
        professionalId,
        serviceId,
        selectedDates: selectedDates.map((d) => d.toISOString()),
        timeSlots,
        location,
        notes,
        clientPhone,
        clientAddress,
        promoCode,
        appliedPromo,
        promoDiscount,
        negotiationData,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error("Failed to save booking draft", error);
    }
  }, [
    isInitialized,
    professionalId,
    serviceId,
    selectedDates,
    timeSlots,
    location,
    notes,
    clientPhone,
    clientAddress,
    promoCode,
    appliedPromo,
    promoDiscount,
    negotiationData,
  ]);

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setServiceId("");
    setSelectedDates([]);
    setTimeSlots({});
    setLocation("");
    setNotes("");
    setClientPhone("");
    setClientAddress("");
    setPromoCode("");
    setAppliedPromo("");
    setPromoDiscount(0);
    setNegotiationData(EMPTY_NEGOTIATION_DATA);
  };

  return {
    state: {
      serviceId,
      selectedDates,
      timeSlots,
      location,
      notes,
      clientPhone,
      clientAddress,
      promoCode,
      appliedPromo,
      promoDiscount,
      negotiationData,
    },
    setters: {
      setServiceId,
      setSelectedDates,
      setTimeSlots,
      setLocation,
      setNotes,
      setClientPhone,
      setClientAddress,
      setPromoCode,
      setAppliedPromo,
      setPromoDiscount,
      setNegotiationData,
    },
    actions: {
      clearDraft,
    },
    isInitialized,
  };
}
