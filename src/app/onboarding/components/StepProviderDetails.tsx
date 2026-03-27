"use client";
import { motion, AnimatePresence } from "framer-motion";
import CategorySelector from "@/components/CategorySelector";
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
}

export default function StepProviderDetails({
  providerData,
  setProviderData,
  categories,
  isLoadingCategories,
  onBack,
  onNext,
  formatPhoneNumber,
}: StepProviderDetailsProps) {
  const loc = useLocation();
  const [showDeniedModal, setShowDeniedModal] = React.useState(false);

  const handleGetLocation = async () => {
    await loc.getLocation("provider");
  };

  // Sync location hook results to providerData
  React.useEffect(() => {
    if (loc.location.latitude && loc.location.longitude) {
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

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setProviderData((prev) => ({ ...prev, phone: formatted }));
  };

  const locationSourceBadge = () => {
    if (!providerData.latitude) return null;
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
          Set Up Your Professional Profile
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Provide complete information to attract more clients.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Skills Selection */}
        <div>
          {/* Selected Services Display */}
          {providerData.skills.length > 0 && (
            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-lg sm:rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                    verified
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-gray-700">
                    Selected Services
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

          <CategorySelector
            categories={categories}
            selectedIds={providerData.skills}
            onToggle={handleSkillToggle}
            multiSelect={true}
            isLoading={isLoadingCategories}
            label={`What services do you offer? (Max ${VALIDATION.MAX_PROVIDER_SKILLS}) *`}
            disabled={
              providerData.skills.length >= VALIDATION.MAX_PROVIDER_SKILLS
            }
          />
        </div>

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
              className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium text-sm sm:text-base"
              placeholder="254712345678"
              required
            />
          </div>
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

        {/* Location */}
        <div className="group">
          <label
            htmlFor="provider-location"
            className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2 group-focus-within:text-emerald-600 transition-colors"
          >
            Service Location *
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
              onChange={(e) =>
                setProviderData((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
              className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium text-sm sm:text-base"
              placeholder="e.g., Nairobi, Kenya"
              required
            />
          </div>
        </div>

        {/* GPS Location Picker */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 bg-emerald-100/50 rounded-full blur-2xl -mr-8 -mt-8 sm:-mr-16 sm:-mt-16 pointer-events-none" />
          <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4 relative z-10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 shrink-0">
              <span className="material-symbols-outlined text-sm sm:text-base">
                my_location
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
                Get Precise Location
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Help clients find you easily by sharing your precise coordinates
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
                Get My Current Location
              </>
            )}
          </button>

          {providerData.latitude && providerData.longitude && (
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
            !providerData.phone ||
            !providerData.hourlyRate ||
            !providerData.bio.trim() ||
            providerData.bio.length > VALIDATION.MAX_BIO_LENGTH ||
            !providerData.location
          }
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2 text-sm sm:text-base min-h-[44px]"
        >
          <span className="hidden sm:inline">Next: Verification</span>
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
