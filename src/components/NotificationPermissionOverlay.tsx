"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useFcmToken } from "@/lib/hooks/useFcmToken";

export default function NotificationPermissionOverlay() {
  const { notificationPermission, requestPermission } = useFcmToken();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show overlay if permission is default (not granted or denied)
    // Delay slightly to avoid flashing on load
    const timer = setTimeout(() => {
      if (notificationPermission === "default") {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [notificationPermission]);

  const handleEnable = async () => {
    await requestPermission();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Optionally store dismissal in local storage to not show again for a session
    sessionStorage.setItem("notification_overlay_dismissed", "true");
  };

  // Check if dismissed in this session
  useEffect(() => {
    if (sessionStorage.getItem("notification_overlay_dismissed") === "true") {
      setIsVisible(false);
    }
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
        >
          <div className="bg-white/90 backdrop-blur-md border border-emerald-100 p-4 rounded-2xl shadow-2xl flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Enable Notifications</h3>
                  <p className="text-xs text-gray-500">Get real-time updates on your orders and messages.</p>
                </div>
              </div>
              <button 
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleDismiss}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={handleEnable}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
              >
                Enable
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
