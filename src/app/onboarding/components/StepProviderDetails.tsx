"use client";

import { motion, AnimatePresence } from "framer-motion";
import React from "react";
import { useLocation, LocationSource } from "../hooks/useLocation";
import LocationDeniedModal from "./LocationDeniedModal";
import { VALIDATION } from "@/lib/constants/validation";
import { isValidKenyanPhone } from "@/lib/utils/phone";

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  icon: string;
  count: number;
}

interface ProviderData {
  businessName: string;
  primaryCategoryId: string;
  skills: string[];
  location: string;
  latitude: number | null;
  longitude: number | null;
  locationSource?: LocationSource;
  locationAccuracy?: number | null;
  bio: string;
  phone: string;
  hourlyRate: string;
  phoneValidated: boolean;
}

interface StepProviderDetailsProps {
  providerData: ProviderData;
  setProviderData: React.Dispatch<React.SetStateAction<ProviderData>>;
  prefilledFields?: {
    businessName?: boolean;
    phone?: boolean;
    location?: boolean;
  };
  categories: Category[];
  isLoadingCategories: boolean;
  onBack: () => void;
  onNext: () => Promise<void>;
  formatPhoneNumber: (input: string) => string;
  validatePhone: (phone: string) => Promise<{
    ok: boolean;
    normalizedPhone?: string;
    message?: string;
    transientError?: boolean;
  }>;
}

const MIN_PROVIDER_BIO_LENGTH = 80;
const MAX_PROVIDER_BIO_LENGTH = 300;

function rateGuidanceForCategory(categoryName?: string): string {
  const value = (categoryName || "").toLowerCase();

  if (value.includes("plumb")) {
    return "Most plumbing providers charge KES 800-2,500/hr on JustInTime.";
  }
  if (value.includes("electric")) {
    return "Most electrical providers charge KES 1,000-3,000/hr on JustInTime.";
  }
  if (value.includes("clean")) {
    return "Most cleaning providers charge KES 500-1,500/hr on JustInTime.";
  }
  if (value.includes("carp") || value.includes("wood")) {
    return "Most carpentry providers charge KES 900-2,800/hr on JustInTime.";
  }
  if (value.includes("paint")) {
    return "Most painting providers charge KES 700-2,200/hr on JustInTime.";
  }

  return "Most providers charge KES 500-2,500/hr on JustInTime.";
}

function getCategoryScopedSkills(
  categories: Category[],
  primaryCategoryId: string,
): Category[] {
  const ranked = [...categories].sort((a, b) => b.count - a.count);
  if (!primaryCategoryId) {
    return ranked.slice(0, 12);
  }

  const primary = categories.find((cat) => cat.id === primaryCategoryId);
  if (!primary) {
    return ranked.slice(0, 12);
  }

  const rawTokens = `${primary.name} ${primary.slug}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);

  const related = ranked.filter((cat) => {
    if (cat.id === primary.id) return false;
    const haystack = `${cat.name} ${cat.slug}`.toLowerCase();
    return rawTokens.some((token) => haystack.includes(token));
  });

  const seen = new Set<string>([primary.id]);
  const scoped: Category[] = [primary];

  for (const candidate of related) {
    if (!seen.has(candidate.id)) {
      scoped.push(candidate);
      seen.add(candidate.id);
    }
    if (scoped.length >= 12) {
      return scoped;
    }
  }

  for (const candidate of ranked) {
    if (!seen.has(candidate.id)) {
      scoped.push(candidate);
      seen.add(candidate.id);
    }
    if (scoped.length >= 12) {
      return scoped;
    }
  }

  return scoped;
}

export default function StepProviderDetails({
  providerData,
  setProviderData,
  prefilledFields,
  categories,
  isLoadingCategories,
  onBack,
  onNext,
  formatPhoneNumber,
  validatePhone,
}: StepProviderDetailsProps) {
  const loc = useLocation();
  const { prefillIfPermitted } = loc;
  const [showDeniedModal, setShowDeniedModal] = React.useState(false);
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [phoneWarning, setPhoneWarning] = React.useState<string | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = React.useState(false);
  const [businessEdited, setBusinessEdited] = React.useState(false);
  const [phoneEdited, setPhoneEdited] = React.useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] =
    React.useState(false);
  const [categorySearch, setCategorySearch] = React.useState("");
  const hasAutoPrefilledRef = React.useRef(false);
  const categoryDropdownRef = React.useRef<HTMLDivElement | null>(null);

  const selectedPrimaryCategory = categories.find(
    (cat) => cat.id === providerData.primaryCategoryId,
  );
  const skillOptions = React.useMemo(
    () => getCategoryScopedSkills(categories, providerData.primaryCategoryId),
    [categories, providerData.primaryCategoryId],
  );
  const sortedCategories = React.useMemo(
    () => [...categories].sort((a, b) => b.count - a.count),
    [categories],
  );
  const filteredCategories = React.useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) {
      return sortedCategories;
    }

    return sortedCategories.filter((category) => {
      const haystack = `${category.name} ${category.slug}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [categorySearch, sortedCategories]);
  const dropdownCategories = React.useMemo(() => {
    if (filteredCategories.length === 0) {
      return filteredCategories;
    }

    const selectedByOrder = providerData.skills
      .map((skillId) =>
        filteredCategories.find((category) => category.id === skillId),
      )
      .filter((category): category is Category => Boolean(category));

    const selectedIds = new Set(selectedByOrder.map((category) => category.id));
    const unselected = filteredCategories.filter(
      (category) => !selectedIds.has(category.id),
    );

    return [...selectedByOrder, ...unselected];
  }, [filteredCategories, providerData.skills]);

  const isPhoneLocallyValid = isValidKenyanPhone(providerData.phone);
  const showPhoneValid =
    providerData.phone.trim().length > 0 && isPhoneLocallyValid && !phoneError;

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
      setProviderData((prev) => ({
        ...prev,
        latitude: loc.location.latitude,
        longitude: loc.location.longitude,
        location: loc.location.address,
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
    setProviderData,
  ]);

  React.useEffect(() => {
    if (loc.status === "DENIED") setShowDeniedModal(true);
  }, [loc.status]);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleSkillToggle = (skillId: string) => {
    setProviderData((prev) => {
      const isSelected = prev.skills.includes(skillId);
      if (!isSelected && prev.skills.length >= VALIDATION.MAX_PROVIDER_SKILLS) {
        return prev;
      }

      const nextSkills = isSelected
        ? prev.skills.filter((id) => id !== skillId)
        : [...prev.skills, skillId];

      return {
        ...prev,
        skills: nextSkills,
        primaryCategoryId: isSelected
          ? prev.primaryCategoryId === skillId
            ? nextSkills[0] || ""
            : prev.primaryCategoryId
          : prev.primaryCategoryId || skillId,
      };
    });
  };

  const handlePrimaryCategoryChange = (primaryCategoryId: string) => {
    setProviderData((prev) => {
      const nextSkills = primaryCategoryId
        ? prev.skills.includes(primaryCategoryId)
          ? prev.skills
          : [primaryCategoryId, ...prev.skills].slice(
              0,
              VALIDATION.MAX_PROVIDER_SKILLS,
            )
        : prev.skills;

      return {
        ...prev,
        primaryCategoryId,
        skills: nextSkills,
      };
    });
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    if (phoneError) {
      setPhoneError(null);
    }
    if (phoneWarning) {
      setPhoneWarning(null);
    }
    setProviderData((prev) => ({
      ...prev,
      phone: formatted,
      phoneValidated: false,
    }));
  };

  const handlePhoneBlur = async () => {
    if (!providerData.phone) {
      setPhoneError("Phone number is required");
      setPhoneWarning(null);
      setProviderData((prev) => ({ ...prev, phoneValidated: false }));
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

    if (result.transientError) {
      setPhoneError(null);
      setPhoneWarning(
        result.message ||
          "We could not confirm your phone right now. You can continue and we will validate again on submit.",
      );
      setProviderData((prev) => ({ ...prev, phoneValidated: false }));
    } else if (!result.ok) {
      setPhoneError(result.message || "Unable to validate phone number");
      setPhoneWarning(null);
      setProviderData((prev) => ({ ...prev, phoneValidated: false }));
    } else {
      setPhoneError(null);
      setPhoneWarning(null);
      setProviderData((prev) => ({ ...prev, phoneValidated: true }));
    }

    setIsCheckingPhone(false);
  };

  const handleSubmit = async () => {
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

    if (result.transientError) {
      setPhoneError(null);
      setPhoneWarning(
        result.message ||
          "Phone validation is temporarily unavailable. We will validate again when saving.",
      );
      setProviderData((prev) => ({ ...prev, phoneValidated: false }));
    } else if (!result.ok) {
      setPhoneError(result.message || "Unable to validate phone number");
      setPhoneWarning(null);
      setProviderData((prev) => ({ ...prev, phoneValidated: false }));
      setIsCheckingPhone(false);
      return;
    } else {
      setPhoneError(null);
      setPhoneWarning(null);
      setProviderData((prev) => ({ ...prev, phoneValidated: true }));
    }

    setIsCheckingPhone(false);
    await onNext();
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
    const b = badges[providerData.locationSource || "MANUAL"];
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${b.color}`}
      >
        <span className="material-symbols-outlined text-xs">{b.icon}</span>
        {b.label}
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
          Your profile
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Add your services and contact details. This takes about 2 minutes.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Section A
            </p>
            <h3 className="mt-1 text-base sm:text-lg font-bold text-gray-900">
              Your work
            </h3>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div className="group">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="provider-business-name"
                  className="block text-xs sm:text-sm font-bold text-gray-700 group-focus-within:text-emerald-600 transition-colors"
                >
                  Business Name *
                </label>
                {prefilledFields?.businessName && providerData.businessName ? (
                  <span className="text-[11px] font-medium text-gray-500">
                    Pre-filled • Edit
                  </span>
                ) : null}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-sm sm:text-base">
                    storefront
                  </span>
                </span>
                <input
                  id="provider-business-name"
                  type="text"
                  value={providerData.businessName}
                  onChange={(e) => {
                    setBusinessEdited(true);
                    setProviderData((prev) => ({
                      ...prev,
                      businessName: e.target.value,
                    }));
                  }}
                  className={`w-full rounded-lg sm:rounded-xl border-2 py-3 sm:py-4 pl-9 sm:pl-11 pr-3 sm:pr-4 text-sm sm:text-base font-medium text-gray-900 placeholder-gray-400 transition-all duration-300 ${
                    prefilledFields?.businessName &&
                    providerData.businessName &&
                    !businessEdited
                      ? "bg-gray-100 border-gray-200 focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10"
                      : "bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10"
                  }`}
                  placeholder="Your business or professional name"
                  required
                />
              </div>
            </div>

            <div className="group">
              <div ref={categoryDropdownRef}>
                <label
                  htmlFor="provider-primary-category"
                  className="mb-1.5 block text-xs sm:text-sm font-bold text-gray-700 group-focus-within:text-emerald-600 transition-colors"
                >
                  Service Categories *
                </label>
                <button
                  id="provider-primary-category"
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen((isOpen) => !isOpen)}
                  className="flex min-h-[44px] w-full items-center justify-between rounded-lg sm:rounded-xl bg-gray-50 border-2 border-transparent px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-medium text-gray-900 transition-all duration-300 hover:bg-gray-100 focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10"
                  aria-expanded={isCategoryDropdownOpen}
                  aria-haspopup="listbox"
                >
                  <span className="truncate text-left">
                    {providerData.skills.length > 0
                      ? `${providerData.skills.length} selected${selectedPrimaryCategory ? ` • Primary: ${selectedPrimaryCategory.name}` : ""}`
                      : "Select one or more services"}
                  </span>
                  <span className="material-symbols-outlined text-base text-gray-500">
                    {isCategoryDropdownOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>

                <p className="mt-1.5 text-xs text-gray-500">
                  Pick multiple categories before closing. The first selected
                  category becomes primary automatically.
                </p>

                <AnimatePresence>
                  {isCategoryDropdownOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                    >
                      <div className="border-b border-gray-100 px-3 py-2.5">
                        <input
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder="Search categories"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                        />
                      </div>

                      <div className="max-h-64 overflow-y-auto p-2">
                        {isLoadingCategories ? (
                          <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <div
                                key={index}
                                className="h-10 rounded-lg bg-gray-100 animate-pulse"
                              />
                            ))}
                          </div>
                        ) : dropdownCategories.length > 0 ? (
                          dropdownCategories.map((category) => {
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
                                onClick={() => handleSkillToggle(category.id)}
                                disabled={isDisabled}
                                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                  isSelected
                                    ? "bg-emerald-50 text-emerald-800"
                                    : isDisabled
                                      ? "cursor-not-allowed text-gray-400"
                                      : "hover:bg-gray-50 text-gray-700"
                                }`}
                              >
                                <span className="truncate">
                                  {category.name}
                                </span>
                                <span className="material-symbols-outlined text-base">
                                  {isSelected
                                    ? "check_box"
                                    : "check_box_outline_blank"}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <p className="px-2 py-3 text-sm text-gray-500">
                            No categories match your search.
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setProviderData((prev) => ({
                              ...prev,
                              primaryCategoryId: "",
                              skills: [],
                            }));
                            setCategorySearch("");
                          }}
                          disabled={providerData.skills.length === 0}
                          className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCategoryDropdownOpen(false);
                            setCategorySearch("");
                          }}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Done
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {providerData.skills.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {providerData.skills.map((skillId) => {
                      const category = categories.find(
                        (cat) => cat.id === skillId,
                      );
                      if (!category) return null;
                      const isPrimary =
                        providerData.primaryCategoryId === skillId;

                      return (
                        <button
                          key={skillId}
                          type="button"
                          onClick={() => handlePrimaryCategoryChange(skillId)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            isPrimary
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-gray-50 text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
                          }`}
                        >
                          <span>{category.name}</span>
                          <span className="text-[10px] uppercase tracking-wide">
                            {isPrimary ? "Primary" : "Set primary"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs sm:text-sm font-bold text-gray-700">
                  Skills (3-5 recommended)
                </p>
                <p
                  className={`text-xs font-semibold ${
                    providerData.skills.length >= VALIDATION.MAX_PROVIDER_SKILLS
                      ? "text-amber-700"
                      : "text-gray-500"
                  }`}
                >
                  {providerData.skills.length} /{" "}
                  {VALIDATION.MAX_PROVIDER_SKILLS}
                </p>
              </div>
              {isLoadingCategories ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-11 rounded-lg bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {skillOptions.map((category) => {
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
                        onClick={() => handleSkillToggle(category.id)}
                        disabled={isDisabled}
                        className={`flex min-h-[44px] items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-600 text-white"
                            : isDisabled
                              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                              : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:text-emerald-700"
                        }`}
                      >
                        <span className="truncate">{category.name}</span>
                        <span className="material-symbols-outlined text-sm">
                          {isSelected ? "check" : "add"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {!providerData.primaryCategoryId ? (
                <p className="mt-2 text-xs text-amber-700">
                  Pick your primary category first to get focused skill
                  suggestions.
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="hourlyRate"
                className="mb-1.5 block text-xs sm:text-sm font-bold text-gray-700"
              >
                KES per hour *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-sm sm:text-base">
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
                  className="w-full rounded-lg sm:rounded-xl bg-gray-50 border-2 border-transparent py-3 sm:py-4 pl-9 sm:pl-11 pr-3 sm:pr-4 text-sm sm:text-base font-medium text-gray-900 placeholder-gray-400 transition-all duration-300 focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="e.g., 1500"
                  min="0"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {rateGuidanceForCategory(selectedPrimaryCategory?.name)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Section B
            </p>
            <h3 className="mt-1 text-base sm:text-lg font-bold text-gray-900">
              Your contact
            </h3>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div className="group">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="provider-phone"
                  className="block text-xs sm:text-sm font-bold text-gray-700 group-focus-within:text-emerald-600 transition-colors"
                >
                  Phone Number *
                </label>
                {prefilledFields?.phone && providerData.phone ? (
                  <span className="text-[11px] font-medium text-gray-500">
                    Pre-filled • Edit
                  </span>
                ) : null}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-sm sm:text-base">
                    call
                  </span>
                </span>
                <input
                  id="provider-phone"
                  type="tel"
                  value={providerData.phone}
                  onChange={(e) => {
                    setPhoneEdited(true);
                    handlePhoneChange(e.target.value);
                  }}
                  onBlur={handlePhoneBlur}
                  className={`w-full rounded-lg sm:rounded-xl border-2 py-3 sm:py-4 pl-9 sm:pl-11 pr-10 sm:pr-12 text-sm sm:text-base font-medium text-gray-900 placeholder-gray-400 transition-all duration-300 ${
                    prefilledFields?.phone && providerData.phone && !phoneEdited
                      ? "bg-gray-100 border-gray-200 focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10"
                      : "bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10"
                  }`}
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

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-medium text-blue-800">
                  Auto-detect your service location
                </p>
                {locationSourceBadge()}
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={loc.status === "LOADING"}
                className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition-all duration-300 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loc.status === "LOADING" ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
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

              <div className="mt-3">
                <label
                  htmlFor="provider-location"
                  className="mb-1.5 block text-xs sm:text-sm font-bold text-gray-700"
                >
                  Service location *
                </label>
                <input
                  id="provider-location"
                  type="text"
                  value={providerData.location}
                  onChange={(e) => {
                    const value = e.target.value;
                    setProviderData((prev) => ({
                      ...prev,
                      location: value,
                      latitude: null,
                      longitude: null,
                      locationSource: "MANUAL",
                      locationAccuracy: null,
                    }));
                    loc.setManualAddress(value);
                  }}
                  className="w-full rounded-lg sm:rounded-xl border border-blue-100 bg-white py-3 sm:py-4 px-3 sm:px-4 text-sm sm:text-base font-medium text-gray-900 placeholder-gray-400 transition-all duration-300 focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="e.g., Westlands, Nairobi"
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="bio"
                  className="block text-xs sm:text-sm font-bold text-gray-700"
                >
                  Professional Bio *
                </label>
                <span
                  className={`text-xs font-semibold ${
                    providerData.bio.length < MIN_PROVIDER_BIO_LENGTH
                      ? "text-amber-700"
                      : providerData.bio.length > MAX_PROVIDER_BIO_LENGTH
                        ? "text-red-600"
                        : "text-gray-500"
                  }`}
                >
                  {providerData.bio.length} / {MAX_PROVIDER_BIO_LENGTH}
                </span>
              </div>
              <textarea
                id="bio"
                rows={4}
                maxLength={MAX_PROVIDER_BIO_LENGTH}
                value={providerData.bio}
                onChange={(e) =>
                  setProviderData((prev) => ({ ...prev, bio: e.target.value }))
                }
                className="w-full resize-none rounded-lg sm:rounded-xl border-2 border-transparent bg-gray-50 px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-medium text-gray-900 placeholder-gray-400 transition-all duration-300 focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Hi, I'm James - licensed electrician with 8 years of experience in Nairobi. I handle wiring, installations, and emergency call-outs. Available weekdays."
                required
              />
              {providerData.bio.length < MIN_PROVIDER_BIO_LENGTH ? (
                <p className="mt-1.5 text-xs text-amber-700">
                  Add at least {MIN_PROVIDER_BIO_LENGTH} characters so clients
                  can trust your profile quickly.
                </p>
              ) : null}
            </div>
          </div>
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
            !providerData.businessName.trim() ||
            !providerData.primaryCategoryId ||
            providerData.skills.length < 1 ||
            providerData.skills.length > VALIDATION.MAX_PROVIDER_SKILLS ||
            isCheckingPhone ||
            !!phoneError ||
            !providerData.phone ||
            !providerData.hourlyRate ||
            !providerData.bio.trim() ||
            providerData.bio.length < MIN_PROVIDER_BIO_LENGTH ||
            providerData.bio.length > MAX_PROVIDER_BIO_LENGTH ||
            !providerData.location
          }
          className="min-h-[44px] rounded-lg sm:rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm sm:text-base font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2"
        >
          <span className="hidden sm:inline">Continue to identity check</span>
          <span className="inline sm:hidden">Continue</span>
          <span className="material-symbols-outlined text-xs sm:text-sm">
            arrow_forward
          </span>
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
