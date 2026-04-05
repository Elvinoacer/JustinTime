"use client";
import { motion, AnimatePresence } from "framer-motion";
import CategorySelector from "@/components/CategorySelector";
import React from "react";
import { useLocation, LocationSource } from "../hooks/useLocation";
import LocationDeniedModal from "./LocationDeniedModal";
import { VALIDATION } from "@/lib/constants/validation";
import type { ClientOnboardingData } from "@/lib/onboarding/draft";

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  icon: string;
  count: number;
}

interface StepClientDetailsProps {
  clientData: ClientOnboardingData;
  setClientData: React.Dispatch<React.SetStateAction<ClientOnboardingData>>;
  clientInterests: string[];
  onInterestToggle: (id: string) => void;
  categories: Category[];
  isLoadingCategories: boolean;
  onBack: () => void;
  onNext: () => Promise<void>;
  isLoading: boolean;
  formatPhoneNumber: (input: string) => string;
  validatePhone: (phone: string) => Promise<{
    ok: boolean;
    normalizedPhone?: string;
    message?: string;
    transientError?: boolean;
  }>;
}

export default function StepClientDetails({
  clientData,
  setClientData,
  clientInterests,
  onInterestToggle,
  categories,
  isLoadingCategories,
  onBack,
  onNext,
  isLoading,
  formatPhoneNumber,
  validatePhone,
}: StepClientDetailsProps) {
  const loc = useLocation();
  const { prefillIfPermitted } = loc;
  const [showDeniedModal, setShowDeniedModal] = React.useState(false);
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [phoneWarning, setPhoneWarning] = React.useState<string | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = React.useState(false);
  const hasAutoPrefilledRef = React.useRef(false);

  const handleGetLocation = async () => {
    await loc.getLocation();
  };

  React.useEffect(() => {
    if (hasAutoPrefilledRef.current) return;
    hasAutoPrefilledRef.current = true;
    void prefillIfPermitted();
  }, [prefillIfPermitted]);

  // Sync location hook results to clientData
  React.useEffect(() => {
    if (loc.location.latitude != null && loc.location.longitude != null) {
      setClientData((prev) => ({
        ...prev,
        latitude: loc.location.latitude,
        longitude: loc.location.longitude,
        location: loc.location.address,
        address: loc.location.address,
        locationSource: loc.location.source,
        locationAccuracy: loc.location.accuracy,
      }));
    }
  }, [
    loc.location.accuracy,
    loc.location.latitude,
    loc.location.longitude,
    loc.location.address,
    loc.location.source,
    setClientData,
  ]);

  React.useEffect(() => {
    if (loc.status === "DENIED") {
      setShowDeniedModal(true);
    }
  }, [loc.status]);

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    if (phoneError) {
      setPhoneError(null);
    }
    if (phoneWarning) {
      setPhoneWarning(null);
    }
    setClientData((prev) => ({
      ...prev,
      phone: formatted,
      phoneValidated: false,
    }));
  };

  const handlePhoneBlur = async () => {
    if (!clientData.phone) {
      setPhoneError("Phone number is required");
      setPhoneWarning(null);
      setClientData((prev) => ({ ...prev, phoneValidated: false }));
      return;
    }

    setIsCheckingPhone(true);
    const result = await validatePhone(clientData.phone);

    if (result.normalizedPhone && result.normalizedPhone !== clientData.phone) {
      setClientData((prev) => ({
        ...prev,
        phone: result.normalizedPhone || prev.phone,
      }));
    }

    if (result.transientError) {
      setPhoneError(null);
      setPhoneWarning(
        result.message ||
          "We could not confirm your phone right now. You can continue and we will validate it again on submit.",
      );
      setClientData((prev) => ({ ...prev, phoneValidated: false }));
    } else if (!result.ok) {
      setPhoneError(result.message || "Unable to validate phone number");
      setPhoneWarning(null);
      setClientData((prev) => ({ ...prev, phoneValidated: false }));
    } else {
      setPhoneError(null);
      setPhoneWarning(null);
      setClientData((prev) => ({ ...prev, phoneValidated: true }));
    }

    setIsCheckingPhone(false);
  };

  const handleSubmit = async () => {
    if (!clientData.phone) {
      setPhoneError("Phone number is required");
      return;
    }

    setIsCheckingPhone(true);
    const result = await validatePhone(clientData.phone);

    if (result.normalizedPhone && result.normalizedPhone !== clientData.phone) {
      setClientData((prev) => ({
        ...prev,
        phone: result.normalizedPhone || prev.phone,
      }));
    }

    if (result.transientError) {
      setPhoneError(null);
      setPhoneWarning(
        result.message ||
          "Phone validation is temporarily unavailable. We will validate again when saving.",
      );
      setClientData((prev) => ({ ...prev, phoneValidated: false }));
    } else if (!result.ok) {
      setPhoneError(result.message || "Unable to validate phone number");
      setPhoneWarning(null);
      setClientData((prev) => ({ ...prev, phoneValidated: false }));
      setIsCheckingPhone(false);
      return;
    } else {
      setPhoneError(null);
      setPhoneWarning(null);
      setClientData((prev) => ({ ...prev, phoneValidated: true }));
    }

    setIsCheckingPhone(false);
    await onNext();
  };

  const locationSourceBadge = () => {
    if (clientData.latitude == null || clientData.longitude == null)
      return null;
    const badges: Record<
      LocationSource,
      { icon: string; label: string; color: string }
    > = {
      GPS: {
        icon: "gps_fixed",
        label: "GPS (precise)",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      },
      IP: {
        icon: "wifi",
        label: "IP (approximate)",
        color: "text-amber-700 bg-amber-50 border-amber-200",
      },
      MANUAL: {
        icon: "edit_location",
        label: "Manual",
        color: "text-blue-700 bg-blue-50 border-blue-200",
      },
    };
    const b = badges[clientData.locationSource || "MANUAL"];
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${b.color}`}
      >
        <span className="material-symbols-outlined text-xs">{b.icon}</span>
        {b.label}
      </div>
    );
  };

  return (
    <motion.div
      key="step2-client"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-4 sm:space-y-6 md:space-y-8"
    >
      <div className="text-center">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
          Contact Information
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Tell us how to reach you and where you&apos;re located.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Phone Number */}
        <div className="group">
          <label
            htmlFor="client-name"
            className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2 group-focus-within:text-emerald-600 transition-colors"
          >
            Full Name *
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400 group-focus-within:text-emerald-500 transition-colors text-sm sm:text-base">
                person
              </span>
            </span>
            <input
              id="client-name"
              type="text"
              value={clientData.name}
              onChange={(e) =>
                setClientData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium text-sm sm:text-base"
              placeholder="Your full name"
              required
            />
          </div>
        </div>

        {/* Phone Number */}
        <div className="group">
          <label
            htmlFor="client-phone"
            className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2 group-focus-within:text-emerald-600 transition-colors"
          >
            Phone Number *
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400 group-focus-within:text-emerald-500 transition-colors text-sm sm:text-base">
                call
              </span>
            </span>
            <input
              id="client-phone"
              type="tel"
              value={clientData.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={handlePhoneBlur}
              className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium text-sm sm:text-base"
              placeholder="254712345678"
              required
            />
          </div>
          {isCheckingPhone && (
            <p className="mt-1.5 text-xs text-emerald-600">
              Checking phone number...
            </p>
          )}
          {phoneError && (
            <div className="mt-1.5 flex items-center gap-2 text-xs text-red-600">
              <span>{phoneError}</span>
              <a
                href="/contact"
                className="font-semibold underline underline-offset-2 hover:text-red-700"
              >
                Contact support
              </a>
            </div>
          )}
          {phoneWarning && !phoneError && (
            <div className="mt-1.5 flex items-center gap-2 text-xs text-amber-700">
              <span>{phoneWarning}</span>
              <button
                type="button"
                onClick={handlePhoneBlur}
                className="font-semibold underline underline-offset-2 hover:text-amber-800"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Address */}
        <div className="group">
          <label
            htmlFor="client-address"
            className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2 group-focus-within:text-emerald-600 transition-colors"
          >
            Full Address *
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400 group-focus-within:text-emerald-500 transition-colors text-sm sm:text-base">
                home
              </span>
            </span>
            <input
              id="client-address"
              type="text"
              value={clientData.address}
              onChange={(e) =>
                setClientData((prev) => ({
                  ...prev,
                  address: e.target.value,
                  location: e.target.value,
                  latitude: null,
                  longitude: null,
                  locationSource: "MANUAL",
                  locationAccuracy: null,
                }))
              }
              className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium text-sm sm:text-base"
              placeholder="e.g., Westlands, Nairobi"
              required
            />
          </div>
        </div>

        {/* Location Picker */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 bg-emerald-100/50 rounded-full blur-2xl -mr-8 -mt-8 sm:-mr-16 sm:-mt-16 pointer-events-none" />
          <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4 relative z-10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 shrink-0">
              <span className="material-symbols-outlined text-sm sm:text-base">
                location_on
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
                Precise Location
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Use your current location to pre-fill your address and improve
                service matching
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGetLocation}
            disabled={loc.status === "LOADING"}
            className="w-full py-3 sm:py-3.5 px-4 bg-white border-2 border-emerald-100 text-emerald-700 rounded-lg sm:rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-sm relative z-10 text-sm sm:text-base min-h-[44px]"
          >
            {loc.status === "LOADING" ? (
              <>
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                Getting Location...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm sm:text-base">
                  my_location
                </span>
                Use my current location
              </>
            )}
          </button>

          {clientData.latitude != null && clientData.longitude != null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 sm:mt-4 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-emerald-800 bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-3 border border-emerald-100/50 shadow-sm"
            >
              <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                check_circle
              </span>
              <div className="flex-1">
                <p className="font-bold">Location Captured</p>
                <p className="text-[10px] sm:text-xs text-emerald-600/80 font-mono mt-0.5">
                  {clientData.latitude.toFixed(4)},{" "}
                  {clientData.longitude.toFixed(4)}
                </p>
              </div>
              {locationSourceBadge()}
            </motion.div>
          )}
        </div>

        {/* Service Interests */}
        <div>
          <CategorySelector
            categories={categories}
            selectedIds={clientInterests}
            onToggle={onInterestToggle}
            multiSelect={true}
            isLoading={isLoadingCategories}
            label={`What services might you need? (Optional, Max ${VALIDATION.MAX_CLIENT_INTERESTS})`}
            disabled={clientInterests.length >= VALIDATION.MAX_CLIENT_INTERESTS}
          />
        </div>

        {/* Sticky selected interests summary */}
        {clientInterests.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex flex-wrap gap-1.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] rounded-t-xl -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
            <div className="w-full flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-gray-500">Selected:</span>
              <span
                className={`text-xs font-bold ${clientInterests.length >= VALIDATION.MAX_CLIENT_INTERESTS ? "text-amber-500" : "text-gray-500"}`}
              >
                {clientInterests.length} / {VALIDATION.MAX_CLIENT_INTERESTS}
              </span>
            </div>
            {clientInterests.map((id) => {
              const cat = categories.find((c) => c.id === id);
              if (!cat) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-medium text-emerald-700"
                >
                  {cat.name}
                  <button
                    onClick={() => onInterestToggle(id)}
                    className="ml-0.5 hover:text-red-500"
                  >
                    <span className="material-symbols-outlined text-xs">
                      close
                    </span>
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 sm:pt-6 md:pt-8 border-t border-gray-100">
        <button
          onClick={onBack}
          className="text-gray-500 font-bold hover:text-gray-800 transition-colors px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:bg-gray-100 text-sm sm:text-base min-h-[44px]"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={
            isLoading ||
            isCheckingPhone ||
            !!phoneError ||
            !clientData.name.trim() ||
            !clientData.phone ||
            !clientData.address
          }
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2 text-sm sm:text-base min-h-[44px]"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="hidden sm:inline">Saving...</span>
              <span className="inline sm:hidden">Save</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Complete Setup</span>
              <span className="inline sm:hidden">Complete</span>
              <span className="material-symbols-outlined text-xs sm:text-sm">
                arrow_forward
              </span>
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showDeniedModal && (
          <LocationDeniedModal
            isOpen={true}
            onClose={() => setShowDeniedModal(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
