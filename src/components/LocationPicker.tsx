"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  getCurrentLocation,
  getLocationFromStorage,
  saveLocationToStorage,
  clearLocationFromStorage,
} from "@/lib/utils/geolocation";

interface LocationPickerProps {
  onLocationChange: (
    location: {
      latitude: number;
      longitude: number;
      address?: string;
    } | null
  ) => void;
  /** Smaller control when the services toolbar is in compact (scrolled) mode */
  compact?: boolean;
  /** Calmer browse toolbar: no hover scale, no pulsing dot, tighter copy */
  quiet?: boolean;
}

export default function LocationPicker({
  onLocationChange,
  compact = false,
  quiet = false,
}: LocationPickerProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".location-picker")) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Load saved location on mount
  useEffect(() => {
    const loadSavedLocation = async () => {
      // Try localStorage first
      const storedLocation = getLocationFromStorage();
      if (storedLocation) {
        setCurrentLocation(storedLocation);
        onLocationChange(storedLocation);
        return;
      }

      // If authenticated, try to fetch from server
      if (session?.user?.id) {
        try {
          const response = await fetch("/api/user/location");
          if (response.ok) {
            const data = await response.json();
            if (data.latitude && data.longitude) {
              const location = {
                latitude: data.latitude,
                longitude: data.longitude,
                address: data.location,
              };
              setCurrentLocation(location);
              onLocationChange(location);
            }
          }
        } catch (error) {
          console.error("Failed to load saved location:", error);
        }
      }
    };

    loadSavedLocation();
  }, [session]);

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
      onLocationChange(location);

      // Save to localStorage
      saveLocationToStorage(location);

      // If authenticated, save to server
      if (session?.user?.id) {
        try {
          await fetch("/api/user/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(location),
          });
        } catch (error) {
          console.error("Failed to save location to server:", error);
        }
      }

      toast.success("Location detected!");
      setIsOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to detect location"
      );
    } finally {
      setIsDetecting(false);
    }
  };

  const handleClearLocation = () => {
    setCurrentLocation(null);
    onLocationChange(null);
    clearLocationFromStorage();
    toast.success("Location cleared");
    setIsOpen(false);
  };

  const handleManualLocation = () => {
    toast.info("Manual location input coming soon!");
    setIsOpen(false);
  };

  const compactH =
    quiet || compact
      ? "min-h-10 px-3 py-2 text-xs sm:text-sm lg:min-h-10"
      : "min-h-[48px] px-4 py-2.5 text-sm lg:min-h-[52px] lg:min-w-[168px]";
  const rounded = quiet ? "rounded-xl" : "rounded-2xl";
  const labelClass = quiet ? "font-medium text-slate-700" : "font-semibold text-slate-800";
  const shadow = quiet
    ? "shadow-inner shadow-slate-200/30"
    : "shadow-sm shadow-slate-200/40";

  const buttonClass = `flex min-w-0 max-w-full items-center gap-2 border border-slate-200/90 bg-white ${labelClass} ${shadow} ring-emerald-500/0 transition-[border-color,background-color,box-shadow] hover:border-emerald-300/60 hover:bg-emerald-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${rounded} ${compactH} ${quiet ? "sm:max-w-[200px] lg:max-w-[220px]" : ""}`;

  return (
    <div className="relative location-picker">
      {quiet ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={buttonClass}
          aria-label={currentLocation ? "Change location" : "Set location for distance sorting"}
        >
          <span className="material-symbols-outlined shrink-0 text-[20px] text-emerald-600">
            my_location
          </span>
          {currentLocation ? (
            <span className="min-w-0 flex-1 truncate text-left">
              {currentLocation.address || "Location set"}
            </span>
          ) : (
            <span className="text-slate-600">Near me</span>
          )}
          {currentLocation ? (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
              aria-hidden
            />
          ) : null}
        </button>
      ) : (
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={buttonClass}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          aria-label={currentLocation ? "Change location" : "Set location"}
        >
          <span className="material-symbols-outlined shrink-0 text-emerald-600">
            my_location
          </span>
          {currentLocation ? (
            <span className="min-w-0 truncate text-left">
              {currentLocation.address || "Location set"}
            </span>
          ) : (
            <span className="text-slate-700">Near me</span>
          )}
          {currentLocation ? (
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
          ) : null}
        </motion.button>
      )}

      {/* Mobile Full-screen Overlay */}
      {isMobile && isOpen && <div className="fixed inset-0 bg-black/50 z-40" />}

      {/* Dropdown Panel - Responsive Positioning */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: isMobile ? 100 : -10,
              scale: isMobile ? 1 : 0.95,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: isMobile ? 100 : -10,
              scale: isMobile ? 1 : 0.95,
            }}
            transition={{
              duration: 0.2,
              ease: isMobile ? "easeOut" : "easeInOut",
            }}
            className={`fixed sm:absolute ${
              isMobile
                ? "inset-x-0 bottom-0 top-auto max-h-[70vh] overflow-y-auto rounded-t-2xl"
                : "top-full right-0 mt-2"
            } w-full sm:w-80 bg-white shadow-xl sm:shadow-2xl border border-gray-100 z-50`}
          >
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                      location_on
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">
                      Your Location
                    </h3>
                    <p className="text-xs text-gray-500">
                      {currentLocation
                        ? "Location is set"
                        : "Set your location"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close location picker"
                >
                  <span className="material-symbols-outlined text-gray-500 text-sm sm:text-base">
                    close
                  </span>
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4 sm:space-y-6">
                {currentLocation ? (
                  <>
                    {/* Current Location Info - Two Column Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="col-span-1 sm:col-span-2 bg-emerald-50 rounded-xl p-3 sm:p-4 border border-emerald-200">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base mt-0.5">
                            check_circle
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-emerald-900 mb-1">
                              Location Active
                            </p>
                            {currentLocation.address && (
                              <p className="text-xs text-emerald-700 truncate sm:break-words">
                                {currentLocation.address}
                              </p>
                            )}
                            <p className="text-xs text-emerald-600 mt-1 font-mono">
                              {currentLocation.latitude.toFixed(4)},{" "}
                              {currentLocation.longitude.toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats - Two Columns */}
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">
                          Distance Sorting
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          Active
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">
                          Services Found
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          Nearby
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons - Stack on mobile, side by side on larger */}
                    <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={handleDetectLocation}
                        disabled={isDetecting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg sm:rounded-xl font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all disabled:opacity-50 active:scale-[0.98]"
                      >
                        {isDetecting ? (
                          <>
                            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span className="text-sm">Detecting...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm sm:text-base">
                              refresh
                            </span>
                            <span className="text-sm">Update Location</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleClearLocation}
                        className="px-4 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-lg sm:rounded-xl font-medium hover:bg-gray-200 transition-colors active:scale-[0.98] text-sm"
                      >
                        <span className="hidden sm:inline">Clear Location</span>
                        <span className="inline sm:hidden">Clear</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Empty State */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-blue-600 text-sm sm:text-base">
                          info
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            Location Required
                          </p>
                          <p className="text-xs text-gray-600">
                            Set your location to see services sorted by distance
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Primary Action Button */}
                    <button
                      onClick={handleDetectLocation}
                      disabled={isDetecting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg sm:rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-emerald-500/30"
                    >
                      {isDetecting ? (
                        <>
                          <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span className="text-sm sm:text-base">
                            Detecting Location...
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg sm:text-xl">
                            my_location
                          </span>
                          <span className="text-sm sm:text-base">
                            Use Current Location
                          </span>
                        </>
                      )}
                    </button>

                    {/* Secondary Option */}
                    <div className="text-center">
                      <button
                        onClick={handleManualLocation}
                        className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center justify-center gap-1 mx-auto"
                      >
                        <span className="material-symbols-outlined text-sm">
                          edit_location
                        </span>
                        Enter location manually
                      </button>
                    </div>

                    {/* Privacy Note */}
                    <div className="text-center">
                      <p className="text-xs text-gray-500">
                        Your location is only used to show nearby services
                      </p>
                    </div>
                  </>
                )}

                {/* Quick Location Presets */}
                {currentLocation && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Quick Locations
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          label: "Nairobi CBD",
                          lat: -1.286389,
                          lng: 36.817223,
                        },
                        { label: "Westlands", lat: -1.26559, lng: 36.804356 },
                        { label: "Karen", lat: -1.319358, lng: 36.70842 },
                        { label: "Thika", lat: -1.03352, lng: 37.0698 },
                      ].map((loc) => (
                        <button
                          key={loc.label}
                          onClick={() => {
                            const newLocation = {
                              latitude: loc.lat,
                              longitude: loc.lng,
                              address: loc.label,
                            };
                            setCurrentLocation(newLocation);
                            onLocationChange(newLocation);
                            saveLocationToStorage(newLocation);
                            toast.success(`Location set to ${loc.label}`);
                            setIsOpen(false);
                          }}
                          className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-700 transition-colors active:scale-[0.98]"
                        >
                          {loc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Footer */}
              {isMobile && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium active:scale-[0.98] text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
