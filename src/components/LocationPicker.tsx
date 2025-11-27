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
  onLocationChange: (location: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null) => void;
}

export default function LocationPicker({ onLocationChange }: LocationPickerProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

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

      toast.success("Location detected successfully!");
      setIsOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to detect location");
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

  return (
    <div className="relative">
      {/* Location Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
          currentLocation
            ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300"
            : "bg-white text-gray-700 border-2 border-gray-200 hover:border-emerald-300"
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="material-symbols-outlined text-xl">
          {currentLocation ? "location_on" : "location_off"}
        </span>
        <span className="hidden sm:inline">
          {currentLocation ? "Location Set" : "Set Location"}
        </span>
      </motion.button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Your Location</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            {currentLocation ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
                  <span className="material-symbols-outlined text-emerald-600 mt-0.5">
                    check_circle
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-900">Location Active</p>
                    {currentLocation.address && (
                      <p className="text-xs text-emerald-700 mt-1 break-words">
                        {currentLocation.address}
                      </p>
                    )}
                    <p className="text-xs text-emerald-600 mt-1">
                      {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDetectLocation}
                    disabled={isDetecting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {isDetecting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Detecting...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">refresh</span>
                        <span>Update</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleClearLocation}
                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Set your location to see services sorted by distance
                </p>
                <button
                  onClick={handleDetectLocation}
                  disabled={isDetecting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {isDetecting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Detecting Location...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">my_location</span>
                      <span>Use My Current Location</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
