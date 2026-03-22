"use client";
import { motion } from "framer-motion";
import React from "react";

export default function StepComplete() {
  return (
    <motion.div
      key="step-complete"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="text-center py-8 sm:py-12 md:py-16"
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 md:mb-8 shadow-inner">
        <span className="material-symbols-outlined text-3xl sm:text-4xl md:text-5xl text-emerald-600">
          check_circle
        </span>
      </div>
      <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 mb-2 sm:mb-3 md:mb-4">
        All Set!
      </h2>
      <p className="text-sm sm:text-base md:text-lg text-gray-600">
        Redirecting you to your dashboard...
      </p>
    </motion.div>
  );
}
