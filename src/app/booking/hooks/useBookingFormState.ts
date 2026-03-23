import { useState, useEffect } from "react";
import { format } from "date-fns";

export interface BookingState {
  serviceId: string;
  selectedDates: Date[];
  timeSlots: Record<string, string[]>;
  location: string;
  notes: string;
  clientPhone: string;
  clientAddress: string;
  promoCode: string;
}

const STORAGE_KEY = "justintime_booking_draft";

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

  const [isInitialized, setIsInitialized] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    if (!professionalId || isInitialized) return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
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
          if (parsed.timeSlots) setTimeSlots(parsed.timeSlots);
          
          if (parsed.selectedDates && Array.isArray(parsed.selectedDates)) {
            // Convert string dates back to Date objects
            const dates = parsed.selectedDates.map((d: string) => new Date(d));
            setSelectedDates(dates);
          }
        } else {
          // Different professional, clear old draft
          localStorage.removeItem(STORAGE_KEY);
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
        selectedDates: selectedDates.map(d => d.toISOString()),
        timeSlots,
        location,
        notes,
        clientPhone,
        clientAddress,
        promoCode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
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
    promoCode
  ]);

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setServiceId("");
    setSelectedDates([]);
    setTimeSlots({});
    setLocation("");
    setNotes("");
    setClientPhone("");
    setClientAddress("");
    setPromoCode("");
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
    },
    actions: {
      clearDraft
    },
    isInitialized
  };
}
