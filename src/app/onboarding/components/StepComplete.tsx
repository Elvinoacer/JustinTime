"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import React from "react";

type Role = "CLIENT" | "PROVIDER";

interface StepCompleteProps {
  role?: Role | null;
  redirectPath?: string;
}

export default function StepComplete({ role, redirectPath }: StepCompleteProps) {
  const isProvider = role === "PROVIDER";

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
      <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-xl mx-auto">
        {isProvider
          ? "You're ready to start getting booked. Redirecting you to create your first service."
          : "Your account is ready. Redirecting you to your dashboard..."}
      </p>
      {isProvider && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={redirectPath || "/dashboard/services?create=true"}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Create Service
          </Link>
          <Link
            href="/dashboard/availability"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-base">schedule</span>
            Set Availability
          </Link>
        </div>
      )}
    </motion.div>
  );
}
