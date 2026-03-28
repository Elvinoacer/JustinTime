"use client";
import { motion } from "framer-motion";
import React, { useState } from "react";

type Role = "CLIENT" | "PROVIDER";

interface StepRoleSelectProps {
  selectedRole: Role | null;
  onSelect: (role: Role) => void;
}

export default function StepRoleSelect({
  selectedRole,
  onSelect,
}: StepRoleSelectProps) {
  const [pendingRole, setPendingRole] = useState<Role | null>(null);

  const handleSelect = (role: Role) => {
    setPendingRole(role);
    // Show selection visually for 350ms before advancing
    setTimeout(() => onSelect(role), 350);
  };

  const activeRole = pendingRole || selectedRole;

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-4 sm:space-y-6 md:space-y-8"
    >
      <div className="text-center space-y-2 px-2">
        <h2 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-800">
          What brings you here today?
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
          Choose the path that fits your goal and we&apos;ll tailor the next
          steps for you.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* CLIENT card */}
        <button
          onClick={() => handleSelect("CLIENT")}
          disabled={!!pendingRole}
          className={`group relative p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl md:rounded-[2rem] border-2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.05)] transition-all duration-300 text-left focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/20 overflow-hidden min-h-[140px] sm:min-h-[180px] md:min-h-[220px] ${
            activeRole === "CLIENT"
              ? "border-emerald-500 bg-emerald-50 shadow-[0_10px_20px_rgba(16,185,129,0.2)]"
              : "border-transparent hover:shadow-[0_10px_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/30"
          }`}
          aria-label="I want to hire professionals"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {/* Selected checkmark */}
          {activeRole === "CLIENT" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg z-20"
            >
              <span className="material-symbols-outlined text-white text-sm sm:text-base">
                check
              </span>
            </motion.div>
          )}
          {activeRole !== "CLIENT" && (
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
              <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                arrow_forward
              </span>
            </div>
          )}
          <div className="relative z-10">
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg sm:rounded-xl md:rounded-2xl bg-emerald-50 flex items-center justify-center mb-3 sm:mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-emerald-600">
                search
              </span>
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1 sm:mb-2 group-hover:text-emerald-700 transition-colors">
              I want to hire pros
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-500 leading-relaxed">
              Find reliable professionals for your home and business needs.
            </p>
            <p className="mt-3 text-xs sm:text-sm font-medium text-emerald-700">
              Next: add your contact details and location.
            </p>
          </div>
        </button>

        {/* PROVIDER card */}
        <button
          onClick={() => handleSelect("PROVIDER")}
          disabled={!!pendingRole}
          className={`group relative p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl md:rounded-[2rem] border-2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.05)] transition-all duration-300 text-left focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/20 overflow-hidden min-h-[140px] sm:min-h-[180px] md:min-h-[220px] ${
            activeRole === "PROVIDER"
              ? "border-blue-500 bg-blue-50 shadow-[0_10px_20px_rgba(59,130,246,0.2)]"
              : "border-transparent hover:shadow-[0_10px_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/30"
          }`}
          aria-label="I want to work as a professional"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {/* Selected checkmark */}
          {activeRole === "PROVIDER" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg z-20"
            >
              <span className="material-symbols-outlined text-white text-sm sm:text-base">
                check
              </span>
            </motion.div>
          )}
          {activeRole !== "PROVIDER" && (
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
              <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                arrow_forward
              </span>
            </div>
          )}
          <div className="relative z-10">
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg sm:rounded-xl md:rounded-2xl bg-blue-50 flex items-center justify-center mb-3 sm:mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-blue-600">
                work
              </span>
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1 sm:mb-2 group-hover:text-blue-700 transition-colors">
              I want to work
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-500 leading-relaxed">
              Offer your services, find jobs, and grow your business.
            </p>
            <p className="mt-3 text-xs sm:text-sm font-medium text-blue-700">
              Next: choose your services, confirm your location, then verify
              your identity.
            </p>
          </div>
        </button>
      </div>
    </motion.div>
  );
}
