"use client";

import { motion, AnimatePresence } from "framer-motion";
import CategorySelector from "@/components/CategorySelector";
import React from "react";
import { useLocation, LocationSource } from "../hooks/useLocation";
import LocationDeniedModal from "./LocationDeniedModal";
import { VALIDATION } from "@/lib/constants/validation";
import { isValidKenyanPhone } from "@/lib/utils/phone";
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
  prefilledFields?: {
    name?: boolean;
  };
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
  prefilledFields,
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
  const [nameEdited, setNameEdited] = React.useState(false);
  const [interestsExpanded, setInterestsExpanded] = React.useState(false);
  const hasAutoPrefilledRef = React.useRef(false);

  const isPhoneLocallyValid = isValidKenyanPhone(clientData.phone);
  const showPhoneValid =
    clientData.phone.trim().length > 0 && isPhoneLocallyValid && !phoneError;

  const handleGetLocation = async () => {
    await loc.getLocation();
  };

  React.useEffect(() => {
    if (hasAutoPrefilledRef.current) return;
    hasAutoPrefilledRef.current = true;
    void prefillIfPermitted();
  }, [prefillIfPermitted]);

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

  React.useEffect(() => {
    if (clientInterests.length > 0) {
      setInterestsExpanded(true);
    }
  }, [clientInterests.length]);

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
          "We could not confirm your phone right now. You can continue and we will validate again on submit.",
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
        label: "Location detected",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      },
      IP: {
        icon: "wifi",
        label: "Approximate location detected",
        color: "text-amber-700 bg-amber-50 border-amber-200",
      },
      MANUAL: {
        icon: "edit_location",
        label: "Manual location",
        color: "text-blue-700 bg-blue-50 border-blue-200",
      },
    };
    const b = badges[clientData.locationSource || "MANUAL"];
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${b.color}`}
      >
        <span className="material-symbols-outlined text-xs">{b.icon}</span>
        {b.label}
      </div>
    );
  };

  const selectedInterestNames = clientInterests
    .map((id) => categories.find((cat) => cat.id === id)?.name)
    .filter((value): value is string => Boolean(value));

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
          Quick setup
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          This should take under a minute.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Section A
            </p>
            <h3 className="mt-1 text-base sm:text-lg font-bold text-gray-900">
              Contact and location
            </h3>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="group">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="client-name"
                  className="block text-xs sm:text-sm font-bold text-gray-700 group-focus-within:text-emerald-600 transition-colors"
                >
                  Full Name *
                </label>
                {prefilledFields?.name && clientData.name ? (
                  <span className="text-[11px] font-medium text-gray-500">
                    Pre-filled • Edit
                  </span>
                ) : null}
              </div>
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
                  onChange={(e) => {
                    setNameEdited(true);
                    setClientData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }));
                  }}
                  className={`w-full rounded-lg sm:rounded-xl border-2 py-3 sm:py-4 pl-9 sm:pl-11 pr-3 sm:pr-4 text-sm sm:text-base font-medium text-gray-900 placeholder-gray-400 transition-all duration-300 ${
                    prefilledFields?.name && clientData.name && !nameEdited
                      ? "bg-gray-100 border-gray-200 focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10"
                      : "bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10"
                  }`}
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>

            <div className="group">
              <label
                htmlFor="client-phone"
                className="mb-1.5 block text-xs sm:text-sm font-bold text-gray-700 group-focus-within:text-emerald-600 transition-colors"
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
                  className="w-full rounded-lg sm:rounded-xl bg-gray-50 border-2 border-transparent py-3 sm:py-4 pl-9 sm:pl-11 pr-10 sm:pr-12 text-sm sm:text-base font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300"
                  placeholder="254712345678"
                  required
                />
                {showPhoneValid ? (
                  <span className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-emerald-600">
                    <span className="material-symbols-outlined text-base">
                      check_circle
                    </span>
                  </span>
                ) : null}
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

            <div className="group">
              <label
                htmlFor="client-address"
                className="mb-1.5 block text-xs sm:text-sm font-bold text-gray-700 group-focus-within:text-emerald-600 transition-colors"
              >
                Location / Address *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 group-focus-within:text-emerald-500 transition-colors text-sm sm:text-base">
                    location_on
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
                  className="w-full rounded-lg sm:rounded-xl bg-gray-50 border-2 border-transparent py-3 sm:py-4 pl-9 sm:pl-11 pr-3 sm:pr-4 text-sm sm:text-base font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300"
                  placeholder="e.g., Westlands, Nairobi"
                  required
                />
              </div>
              {locationSourceBadge() ? (
                <div className="mt-2">{locationSourceBadge()}</div>
              ) : null}
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-medium text-emerald-800">
                  Let us detect your location automatically
                </p>
                {clientData.locationSource === "GPS" ||
                clientData.locationSource === "IP" ? (
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Location detected
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={loc.status === "LOADING"}
                className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 transition-all duration-300 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loc.status === "LOADING" ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
                    Detecting location...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">
                      my_location
                    </span>
                    Detect my location
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
          <button
            type="button"
            onClick={() => setInterestsExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Optional
              </p>
              <h3 className="mt-1 text-base sm:text-lg font-bold text-gray-900">
                Service interests
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Helps us show more relevant providers.
              </p>
            </div>
            <span className="material-symbols-outlined text-gray-500">
              {interestsExpanded ? "expand_less" : "expand_more"}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {interestsExpanded ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-4">
                  <CategorySelector
                    categories={categories}
                    selectedIds={clientInterests}
                    onToggle={onInterestToggle}
                    multiSelect={true}
                    isLoading={isLoadingCategories}
                    label={`What services do you need? (Max ${VALIDATION.MAX_CLIENT_INTERESTS})`}
                    disabled={
                      clientInterests.length >= VALIDATION.MAX_CLIENT_INTERESTS
                    }
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {selectedInterestNames.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {selectedInterestNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <div className="flex justify-between items-center border-t border-gray-100 pt-4 sm:pt-6 md:pt-8">
        <button
          onClick={onBack}
          className="min-h-[44px] rounded-lg sm:rounded-xl px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-sm sm:text-base font-bold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
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
          className="min-h-[44px] rounded-lg sm:rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm sm:text-base font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="hidden sm:inline">Saving...</span>
              <span className="inline sm:hidden">Save</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Complete setup</span>
              <span className="inline sm:hidden">Complete</span>
              <span className="material-symbols-outlined text-xs sm:text-sm">
                arrow_forward
              </span>
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showDeniedModal ? (
          <LocationDeniedModal
            isOpen={true}
            onClose={() => setShowDeniedModal(false)}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
