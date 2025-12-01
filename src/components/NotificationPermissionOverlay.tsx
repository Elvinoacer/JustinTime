"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useFcmToken } from "@/lib/hooks/useFcmToken";

export default function NotificationPermissionOverlay() {
  const { notificationPermission, requestPermission, token } = useFcmToken();
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed =
      sessionStorage.getItem("notification_overlay_dismissed") === "true";

    if (isDismissed) {
      setIsVisible(false);
      return;
    }

    // Show overlay if:
    // 1. Permission is default (not yet asked), OR
    // 2. Permission is granted but no token (incomplete setup)
    // Delay slightly to avoid flashing on load
    const timer = setTimeout(() => {
      const shouldShow =
        notificationPermission === "default" ||
        (notificationPermission === "granted" && !token);

      setIsVisible(shouldShow);
    }, 2000);

    return () => clearTimeout(timer);
  }, [notificationPermission, token]);

  const handleEnable = async () => {
    await requestPermission();
    setIsVisible(false);
    // Store dismissal when enabled
    sessionStorage.setItem("notification_overlay_dismissed", "true");
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Store dismissal in session storage to not show again for this session
    sessionStorage.setItem("notification_overlay_dismissed", "true");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`fixed z-50 ${
            isMobile
              ? "bottom-0 left-0 right-0 p-3"
              : "bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96"
          }`}
        >
          <div
            className={`bg-white/95 backdrop-blur-md border border-emerald-100 ${
              isMobile
                ? "rounded-t-2xl rounded-b-none p-4 shadow-lg"
                : "rounded-2xl p-4 shadow-2xl"
            } flex flex-col gap-3`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 ${
                    isMobile ? "p-2" : "p-2.5"
                  } bg-emerald-100 rounded-full text-emerald-600`}
                >
                  <Bell className={`${isMobile ? "w-4 h-4" : "w-5 h-5"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-semibold text-gray-900 ${
                      isMobile ? "text-sm" : "text-base"
                    }`}
                  >
                    Enable Notifications
                  </h3>
                  <p
                    className={`text-gray-500 ${
                      isMobile ? "text-xs" : "text-sm"
                    } mt-0.5`}
                  >
                    Get real-time updates on your orders and messages.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-2 flex-shrink-0"
                aria-label="Close notification prompt"
              >
                <X className={`${isMobile ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
              </button>
            </div>

            <div className={`flex gap-2 mt-1 ${isMobile ? "flex-col" : ""}`}>
              <button
                onClick={handleDismiss}
                className={`${
                  isMobile ? "w-full px-3 py-2.5" : "flex-1 px-3 py-2"
                } text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors touch-manipulation`}
              >
                Maybe Later
              </button>
              <button
                onClick={handleEnable}
                className={`${
                  isMobile ? "w-full px-3 py-2.5" : "flex-1 px-3 py-2"
                } text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors shadow-lg shadow-emerald-600/20 touch-manipulation`}
              >
                Enable
              </button>
            </div>
          </div>

          {/* Mobile-only backdrop to prevent interaction with content behind */}
          {isMobile && (
            <div
              className="fixed inset-0 bg-black/20 -z-10"
              onClick={handleDismiss}
              aria-hidden="true"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
