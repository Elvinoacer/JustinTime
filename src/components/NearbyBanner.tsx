"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface NearbyBannerProps {
  userLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  onLocationChange: (
    location: { latitude: number; longitude: number; address?: string } | null,
  ) => void;
  onRadiusChange: (radius: number) => void;
  radius: number;
  resultsCount?: number;
  isDetecting?: boolean;
  onDetectLocation: () => void;
}

const NearbyBanner: React.FC<NearbyBannerProps> = ({
  userLocation,
  onLocationChange,
  onRadiusChange,
  radius,
  resultsCount = 0,
  isDetecting = false,
  onDetectLocation,
}) => {
  const [isExpanded, setIsExpanded] = useState(!userLocation);

  const radiusOptions = [
    { value: 5, label: "5 km" },
    { value: 10, label: "10 km" },
    { value: 25, label: "25 km" },
    { value: 50, label: "50 km" },
    { value: 100, label: "100 km" },
  ];

  return (
    <motion.div
      className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 overflow-hidden relative"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        {/* Map Grid Pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Header Row */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl sm:text-2xl">
                location_on
              </span>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Discover Nearby Services
                {userLocation && (
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium text-emerald-100">
                    Active
                  </span>
                )}
              </h3>
              <p className="text-emerald-100 text-sm hidden sm:block">
                Find professionals and services closest to you
              </p>
            </div>
          </div>

          {/* Toggle Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <span
              className={`material-symbols-outlined text-white transition-transform ${isExpanded ? "rotate-180" : ""}`}
            >
              expand_more
            </span>
          </button>
        </div>

        {/* Collapsed State - Quick Info */}
        {!isExpanded && userLocation && (
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl backdrop-blur-md">
              <span className="material-symbols-outlined text-emerald-200 text-sm">
                pin_drop
              </span>
              <span className="text-white text-sm font-medium truncate max-w-[150px] sm:max-w-[200px]">
                {userLocation.address || "Current location"}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl backdrop-blur-md">
              <span className="material-symbols-outlined text-emerald-200 text-sm">
                radar
              </span>
              <span className="text-white text-sm font-medium">
                {radius} km radius
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/50 rounded-xl backdrop-blur-md">
              <span className="material-symbols-outlined text-white text-sm">
                store
              </span>
              <span className="text-white text-sm font-bold">
                {resultsCount} services found
              </span>
            </div>
          </div>
        )}

        {/* Expanded State */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Left Column - Location Status */}
                <div className="space-y-4">
                  {userLocation ? (
                    <>
                      {/* Current Location Card */}
                      <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-white text-lg">
                              check_circle
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold mb-1">
                              Location Active
                            </p>
                            <p className="text-emerald-100 text-sm truncate">
                              {userLocation.address ||
                                `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`}
                            </p>
                          </div>
                          <button
                            onClick={() => onLocationChange(null)}
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Clear location"
                          >
                            <span className="material-symbols-outlined text-sm">
                              close
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Results Summary */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl">
                        <span className="material-symbols-outlined text-emerald-200">
                          store
                        </span>
                        <span className="text-white">
                          <span className="font-bold text-lg">
                            {resultsCount}
                          </span>{" "}
                          <span className="text-emerald-100">
                            services within {radius}km
                          </span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Empty State */}
                      <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-10 h-10 bg-blue-500/50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-white text-lg">
                              info
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-semibold mb-1">
                              Set Your Location
                            </p>
                            <p className="text-emerald-100 text-sm">
                              Enable location to discover services and
                              professionals nearby. Sorted by distance.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={onDetectLocation}
                          disabled={isDetecting}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-emerald-700 rounded-xl font-bold hover:bg-emerald-50 transition-colors disabled:opacity-50 shadow-lg"
                        >
                          {isDetecting ? (
                            <>
                              <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin" />
                              <span>Detecting...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-lg">
                                my_location
                              </span>
                              <span>Use My Current Location</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Right Column - Radius Selector */}
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                    <p className="text-white font-semibold mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">
                        radar
                      </span>
                      Search Radius
                    </p>

                    <div className="grid grid-cols-5 gap-2">
                      {radiusOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => onRadiusChange(option.value)}
                          className={`px-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            radius === option.value
                              ? "bg-white text-emerald-700 shadow-lg"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {/* Radius Visualization */}
                    <div className="mt-4 flex items-center justify-center">
                      <div className="relative">
                        {/* Radius circles */}
                        <div
                          className="w-24 h-24 rounded-full border-2 border-white/30 flex items-center justify-center"
                          style={{ transform: `scale(${0.5 + radius / 100})` }}
                        >
                          <div className="w-3 h-3 bg-white rounded-full shadow-lg shadow-white/50" />
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-emerald-100/90">
                    Location is detected from your device or network only. No
                    hardcoded city defaults are used.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default NearbyBanner;
