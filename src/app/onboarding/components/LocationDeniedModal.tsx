"use client";
import { motion } from "framer-motion";
import React from "react";

interface LocationDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LocationDeniedModal({
  isOpen,
  onClose,
}: LocationDeniedModalProps) {
  if (!isOpen) return null;

  const instructions = [
    {
      platform: "Android Chrome",
      icon: "phone_android",
      steps: "Tap the lock icon in your address bar → Site settings → Location → Allow",
    },
    {
      platform: "iOS Safari",
      icon: "phone_iphone",
      steps: "Go to Settings → Safari → Location → Allow",
    },
    {
      platform: "Desktop Chrome",
      icon: "laptop",
      steps: "Click the lock icon in the URL bar → Location → Allow",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-600">
              location_off
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Location Access Blocked
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-5">
          Your browser has blocked location access. To fix this, follow the
          instructions for your device:
        </p>

        <div className="space-y-3">
          {instructions.map((inst) => (
            <div
              key={inst.platform}
              className="p-3 bg-gray-50 rounded-xl border border-gray-100"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-sm text-gray-600">
                  {inst.icon}
                </span>
                <span className="text-sm font-bold text-gray-800">
                  {inst.platform}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {inst.steps}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors text-sm"
        >
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
}
