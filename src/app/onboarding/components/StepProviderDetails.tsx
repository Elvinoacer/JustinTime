"use client";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";
import { useLocation, LocationSource } from "../hooks/useLocation";
import LocationDeniedModal from "./LocationDeniedModal";
import { VALIDATION } from "@/lib/constants/validation";

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  icon: string;
  count: number;
}

interface ProviderData {
  skills: string[];
  location: string;
  latitude: number | null;
  longitude: number | null;
  bio: string;
  phone: string;
  hourlyRate: string;
}

interface StepProviderDetailsProps {
  providerData: ProviderData;
  setProviderData: React.Dispatch<React.SetStateAction<ProviderData>>;
  categories: Category[];
  isLoadingCategories: boolean;
  onBack: () => void;
  onNext: () => void;
  formatPhoneNumber: (input: string) => string;
  validatePhone: (phone: string) => Promise<{
    ok: boolean;
    normalizedPhone?: string;
    message?: string;
  }>;
}

export default function StepProviderDetails({
  providerData,
  setProviderData,
  categories,
  onBack,
  onNext,
  formatPhoneNumber,
  validatePhone,
}: StepProviderDetailsProps) {
  const loc = useLocation();
  const { prefillIfPermitted } = loc;
  const [showDeniedModal, setShowDeniedModal] = React.useState(false);
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = React.useState(false);
  const [serviceSearch, setServiceSearch] = React.useState("");
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] =
    React.useState(false);
  const hasAutoPrefilledRef = React.useRef(false);
  const servicePickerRef = React.useRef<HTMLDivElement | null>(null);

  const handleGetLocation = async () => {
    await loc.getLocation();
  };

  React.useEffect(() => {
    if (hasAutoPrefilledRef.current) return;
    hasAutoPrefilledRef.current = true;
    void prefillIfPermitted();
  }, [prefillIfPermitted]);

  // Sync location hook results to providerData
  React.useEffect(() => {
    if (loc.location.latitude != null && loc.location.longitude != null) {
      setProviderData((prev) => ({
        ...prev,
        latitude: loc.location.latitude,
        longitude: loc.location.longitude,
        location: loc.location.address,
      }));
    }
  }, [
    loc.location.latitude,
    loc.location.longitude,
    loc.location.address,
    setProviderData,
  ]);

  React.useEffect(() => {
    if (loc.status === "DENIED") setShowDeniedModal(true);
  }, [loc.status]);

  const handleSkillToggle = (skillId: string) => {
    setProviderData((prev) => {
      const isSelected = prev.skills.includes(skillId);
      if (!isSelected && prev.skills.length >= VALIDATION.MAX_PROVIDER_SKILLS) {
        return prev;
      }
      return {
        ...prev,
        skills: isSelected
          ? prev.skills.filter((id) => id !== skillId)
          : [...prev.skills, skillId],
      };
    });
  };

  const matchingCategories = React.useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query),
    );
  }, [categories, serviceSearch]);

  const popularCategories = React.useMemo(
    () => [...categories].sort((a, b) => b.count - a.count).slice(0, 8),
    [categories],
  );

  const selectableMatches = React.useMemo(
    () => matchingCategories.slice(0, 8),
    [matchingCategories],
  );

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        servicePickerRef.current &&
        !servicePickerRef.current.contains(event.target as Node)
      ) {
        setIsServiceDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    if (phoneError) {
      setPhoneError(null);
    }
    setProviderData((prev) => ({ ...prev, phone: formatted }));
  };

  const handlePhoneBlur = async () => {
    if (!providerData.phone) {
      setPhoneError("Phone number is required");
      return;
    }

    setIsCheckingPhone(true);
    const result = await validatePhone(providerData.phone);

    if (
      result.normalizedPhone &&
      result.normalizedPhone !== providerData.phone
    ) {
      setProviderData((prev) => ({
        ...prev,
        phone: result.normalizedPhone || prev.phone,
      }));
    }

    if (!result.ok) {
      setPhoneError(result.message || "Unable to validate phone number");
    } else {
      setPhoneError(null);
    }

    setIsCheckingPhone(false);
  };

  const locationSourceBadge = () => {
    if (providerData.latitude == null || providerData.longitude == null)
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
    const b = badges[loc.location.source];
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${b.color}`}
      >
        <span className="material-symbols-outlined text-xs">{b.icon}</span>
        {b.label}
      </div>
    );
  };

  const renderServiceVisual = (category: Category) => {
    if (category.image) {
      return (
        <img
          src={category.image}
          alt=""
          className="h-10 w-10 rounded-xl object-cover"
        />
      );
    }

    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <span className="material-symbols-outlined text-lg">
          {category.icon}
        </span>
      </div>
    );
  };

  return (
    <motion.div
      key="step2-provider"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-4 sm:space-y-6 md:space-y-8"
    >
      <div className="text-center">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
          Build your provider profile
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          We&apos;ll help clients understand what you offer, where you work, and
          how to reach you.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
              <span className="material-symbols-outlined">category</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Step 2 of 4
              </p>
              <h3 className="mt-1 text-base sm:text-lg font-bold text-gray-900">
                What services do you offer?
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Search or pick from popular services below. Choose up to{" "}
                {VALIDATION.MAX_PROVIDER_SKILLS} so clients know exactly what to
                book you for.
              </p>
            </div>
          </div>

          {providerData.skills.length > 0 && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 sm:p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                    verified
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-gray-700">
                    Selected services
                  </span>
                </div>
                <span
                  className={`text-xs font-medium ${providerData.skills.length >= VALIDATION.MAX_PROVIDER_SKILLS ? "text-amber-600" : "text-gray-500"}`}
                >
                  {providerData.skills.length} /{" "}
                  {VALIDATION.MAX_PROVIDER_SKILLS}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {providerData.skills.map((skillId) => {
                  const category = categories.find((cat) => cat.id === skillId);
                  if (!category) return null;
                  return (
                    <div
                      key={skillId}
                      className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-emerald-200 rounded-md sm:rounded-lg shadow-sm group hover:shadow-md transition-all duration-200"
                    >
                      <span className="material-symbols-outlined text-emerald-600 text-xs sm:text-sm">
                        {category.icon}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-gray-700">
                        {category.name}
                      </span>
                      <button
                        onClick={() => handleSkillToggle(skillId)}
                        className="ml-1 p-0.5 hover:bg-red-50 rounded-full transition-colors"
                        aria-label={`Remove ${category.name}`}
                      >
                        <span className="material-symbols-outlined text-gray-400 hover:text-red-500 text-xs sm:text-sm">
                          close
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative mt-4" ref={servicePickerRef}>
            <label
              htmlFor="provider-service-search"
              className="mb-2 block text-xs sm:text-sm font-bold text-gray-700"
            >
              Search and select services
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <span className="material-symbols-outlined text-sm">
                  search
                </span>
              </span>
              <input
                id="provider-service-search"
                type="text"
                value={serviceSearch}
                onChange={(e) => {
                  setServiceSearch(e.target.value);
                  setIsServiceDropdownOpen(true);
                }}
                onFocus={() => setIsServiceDropdownOpen(true)}
                placeholder="Search services, then choose from the dropdown"
                className="w-full rounded-xl border border-emerald-200 bg-white py-3 pl-10 pr-12 text-sm text-gray-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setIsServiceDropdownOpen((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition hover:text-emerald-600"
                aria-label="Toggle services dropdown"
              >
                <span className="material-symbols-outlined text-base">
                  {isServiceDropdownOpen ? "expand_less" : "expand_more"}
                </span>
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
              <p className="text-gray-500">
                Typing only filters suggestions. A service is added only after
                you tap it in the dropdown.
              </p>
              <p
                className={`shrink-0 font-semibold ${
                  providerData.skills.length >= VALIDATION.MAX_PROVIDER_SKILLS
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {providerData.skills.length} / {VALIDATION.MAX_PROVIDER_SKILLS}{" "}
                selected
              </p>
            </div>

            <AnimatePresence>
              {isServiceDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_18px_50px_rgba(16,185,129,0.12)]"
                >
                  <div className="border-b border-gray-100 bg-emerald-50/60 px-4 py-3 text-xs text-gray-600">
                    Choose from suggested services below. Free text is not saved
                    unless you explicitly select an option.
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {selectableMatches.length > 0 ? (
                      selectableMatches.map((category) => {
                        const isSelected = providerData.skills.includes(
                          category.id,
                        );
                        const isDisabled =
                          providerData.skills.length >=
                            VALIDATION.MAX_PROVIDER_SKILLS && !isSelected;

                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              handleSkillToggle(category.id);
                              setServiceSearch("");
                              if (
                                !isSelected &&
                                providerData.skills.length + 1 >=
                                  VALIDATION.MAX_PROVIDER_SKILLS
                              ) {
                                setIsServiceDropdownOpen(false);
                              }
                            }}
                            disabled={isDisabled}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                              isSelected
                                ? "bg-emerald-50 text-emerald-900"
                                : isDisabled
                                  ? "cursor-not-allowed opacity-50"
                                  : "hover:bg-gray-50"
                            }`}
                          >
                            {renderServiceVisual(category)}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {category.name}
                              </p>
                              <p className="truncate text-xs text-gray-500">
                                Tap to {isSelected ? "remove" : "select"} this
                                service
                              </p>
                            </div>
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : isDisabled
                                    ? "border-gray-200 bg-gray-100 text-gray-300"
                                    : "border-gray-200 bg-white text-emerald-600"
                              }`}
                            >
                              <span className="material-symbols-outlined text-base">
                                {isSelected ? "check" : "add"}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center text-sm text-gray-500">
                        No matching services found. Try a broader search term or
                        use the popular options below.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Popular services
              </p>
              <p className="text-xs text-gray-500">
                {providerData.skills.length === 0
                  ? "Start with the ones you do most often."
                  : `${VALIDATION.MAX_PROVIDER_SKILLS - providerData.skills.length} slot${VALIDATION.MAX_PROVIDER_SKILLS - providerData.skills.length === 1 ? "" : "s"} left`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularCategories.map((category) => {
                const isSelected = providerData.skills.includes(category.id);
                const isDisabled =
                  providerData.skills.length >=
                    VALIDATION.MAX_PROVIDER_SKILLS && !isSelected;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleSkillToggle(category.id)}
                    disabled={isDisabled}
                    className={`inline-flex min-h-[52px] items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-600 text-white shadow-sm shadow-emerald-500/20"
                        : isDisabled
                          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                          : "border-white bg-white text-gray-700 shadow-sm hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700"
                    }`}
                  >
                    {renderServiceVisual(category)}
                    <span className="max-w-[160px] truncate">
                      {category.name}
                    </span>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                        isSelected
                          ? "border-white/30 bg-white/15 text-white"
                          : isDisabled
                            ? "border-gray-200 bg-white text-gray-300"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isSelected ? "check" : "add"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Phone Number */}
        <div className="group">
          <label
            htmlFor="provider-phone"
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
              id="provider-phone"
              type="tel"
              value={providerData.phone}
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
                href="/support"
                className="font-semibold underline underline-offset-2 hover:text-red-700"
              >
                Contact support
              </a>
            </div>
          )}
        </div>

        {/* Hourly Rate */}
        <div className="group">
          <label
            htmlFor="hourlyRate"
            className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2 group-focus-within:text-emerald-600 transition-colors"
          >
            Hourly Rate (KES) *
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400 group-focus-within:text-emerald-500 transition-colors text-sm sm:text-base">
                payments
              </span>
            </span>
            <input
              id="hourlyRate"
              type="number"
              value={providerData.hourlyRate}
              onChange={(e) =>
                setProviderData((prev) => ({
                  ...prev,
                  hourlyRate: e.target.value,
                }))
              }
              className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium text-sm sm:text-base"
              placeholder="e.g., 1500"
              min="0"
              required
            />
          </div>
        </div>

        {/* Bio */}
        <div className="group">
          <div className="flex justify-between items-end mb-1 sm:mb-2">
            <label
              htmlFor="bio"
              className="block text-xs sm:text-sm font-bold text-gray-700 group-focus-within:text-emerald-600 transition-colors"
            >
              Professional Bio *
            </label>
            <span
              className={`text-xs ${providerData.bio.length > VALIDATION.MAX_BIO_LENGTH ? "text-red-500 font-medium" : "text-gray-400"}`}
            >
              {providerData.bio.length} / {VALIDATION.MAX_BIO_LENGTH}
            </span>
          </div>
          <textarea
            id="bio"
            rows={3}
            maxLength={VALIDATION.MAX_BIO_LENGTH}
            value={providerData.bio}
            onChange={(e) =>
              setProviderData((prev) => ({ ...prev, bio: e.target.value }))
            }
            className={`w-full px-3 sm:px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gray-50 border-2 focus:bg-white focus:ring-2 sm:focus:ring-4 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium resize-none text-sm sm:text-base ${
              providerData.bio.length === 0
                ? "border-amber-300 focus:border-amber-500 focus:ring-amber-500/10"
                : "border-transparent focus:border-emerald-500 focus:ring-emerald-500/10"
            }`}
            placeholder="Tell clients about your experience and skills (up to 600 characters)"
            required
          />
          {providerData.bio.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              Professional bio is required.
            </p>
          )}
        </div>

        <div className="relative rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-4 sm:p-6 shadow-sm">
          <div className="absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 bg-emerald-100/50 rounded-full blur-2xl -mr-8 -mt-8 sm:-mr-16 sm:-mt-16 pointer-events-none" />
          <div className="relative z-10 flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-600 shrink-0">
              <span className="material-symbols-outlined text-sm sm:text-base">
                my_location
              </span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                Location
              </p>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
                We can fill this in for you
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Use your current location for faster setup. You can edit the
                result before you continue.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGetLocation}
            disabled={loc.status === "LOADING"}
            className="relative z-10 w-full py-3 sm:py-3.5 px-4 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-sm text-sm sm:text-base min-h-[48px]"
          >
            {loc.status === "LOADING" ? (
              <>
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Finding your location...
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

          <div className="mt-4 group">
            <label
              htmlFor="provider-location"
              className="mb-2 block text-xs sm:text-sm font-bold text-gray-700"
            >
              Service location *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400 group-focus-within:text-emerald-500 transition-colors text-sm sm:text-base">
                  location_on
                </span>
              </span>
              <input
                id="provider-location"
                type="text"
                value={providerData.location}
                onChange={(e) => {
                  const value = e.target.value;
                  setProviderData((prev) => ({
                    ...prev,
                    location: value,
                  }));
                  loc.setManualAddress(value);
                }}
                className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-white border border-blue-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium text-sm sm:text-base"
                placeholder="Your area will appear here"
                required
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Why we ask: clients use this to find nearby providers and request
              the right service area.
            </p>
          </div>

          {providerData.latitude != null && providerData.longitude != null && (
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
                  {providerData.latitude.toFixed(4)},{" "}
                  {providerData.longitude.toFixed(4)}
                </p>
              </div>
              {locationSourceBadge()}
            </motion.div>
          )}

          {!providerData.location && loc.status !== "LOADING" && (
            <div className="mt-3 rounded-xl border border-dashed border-blue-200 bg-white/70 px-4 py-3 text-xs sm:text-sm text-gray-600">
              Location not filled yet. Use the button above for the fastest
              setup, or type your service area manually.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 sm:pt-6 md:pt-8 border-t border-gray-100">
        <button
          onClick={onBack}
          className="text-gray-500 font-bold hover:text-gray-800 transition-colors px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:bg-gray-100 text-sm sm:text-base min-h-[44px]"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={
            providerData.skills.length === 0 ||
            providerData.skills.length > VALIDATION.MAX_PROVIDER_SKILLS ||
            isCheckingPhone ||
            !!phoneError ||
            !providerData.phone ||
            !providerData.hourlyRate ||
            !providerData.bio.trim() ||
            providerData.bio.length > VALIDATION.MAX_BIO_LENGTH ||
            !providerData.location
          }
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2 text-sm sm:text-base min-h-[44px]"
        >
          <span className="hidden sm:inline">Continue to verification</span>
          <span className="inline sm:hidden">Next</span>
          <span className="material-symbols-outlined text-xs sm:text-sm">
            arrow_forward
          </span>
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
