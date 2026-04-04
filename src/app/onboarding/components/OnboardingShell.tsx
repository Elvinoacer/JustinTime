"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import React from "react";

type Role = "CLIENT" | "PROVIDER";

interface OnboardingShellProps {
  currentStep: number;
  selectedRole: Role | null;
  children: React.ReactNode;
}

export default function OnboardingShell({
  currentStep,
  selectedRole,
  children,
}: OnboardingShellProps) {
  const labels =
    selectedRole === "PROVIDER"
      ? ["Role", "Details", "Verify", "Pay", "Done"]
      : ["Role", "Details", "Done"];
  const totalSteps = labels.length;
  const currentLabel = labels[Math.min(currentStep - 1, totalSteps - 1)] || "Start";
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100 via-gray-50 to-white flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute bottom-[10%] right-[20%] w-[30%] h-[30%] rounded-full bg-green-400/10 blur-3xl" />
      </div>

      <div className="max-w-3xl w-full bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl md:rounded-[2.5rem] shadow-lg sm:shadow-2xl overflow-hidden border border-white/50 relative z-10 mx-2">
        <div className="p-4 sm:p-6 md:p-8 lg:p-12">
          {/* Logo + Header */}
          <div className="mb-6 sm:mb-8 md:mb-10 text-center">
            <div className="flex justify-center mb-4 sm:mb-6 md:mb-8">
              <div className="relative w-full max-w-[200px] xs:max-w-[240px] sm:max-w-[280px] md:max-w-[320px] lg:max-w-[360px] aspect-[3/1] transition-transform duration-500 hover:scale-105">
                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full opacity-20" />
                <Image
                  src="/images/JustinTimeLogo.png"
                  alt="JustInTime Logo"
                  fill
                  className="object-contain drop-shadow-xl"
                  priority
                  sizes="(max-width: 640px) 200px, (max-width: 768px) 240px, (max-width: 1024px) 280px, 360px"
                />
              </div>
            </div>
            <h1 className="text-2xl xs:text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-2 sm:mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Welcome to JustInTime
            </h1>
            <p className="text-sm xs:text-base sm:text-lg text-gray-600 font-medium max-w-md mx-auto px-2">
              A quick setup that adapts to what you want to do next.
            </p>
          </div>

          {/* Step Dot Progress Bar */}
          <div className="mb-6 sm:mb-8 md:mb-12 relative">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
                  Step {Math.min(currentStep, totalSteps)} of {totalSteps}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-700">
                  {currentLabel}
                </p>
              </div>
              <div className="min-w-[88px] rounded-full bg-gray-100 px-3 py-1 text-right text-xs font-semibold text-gray-500">
                {Math.round(progress)}% complete
              </div>
            </div>
            <div className="flex items-center justify-between relative">
              {/* Background line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
              {/* Active line */}
              <motion.div
                className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 -translate-y-1/2 z-[1]"
                initial={{ width: "0%" }}
                animate={{
                  width: `${((Math.min(currentStep, totalSteps) - 1) / (totalSteps - 1)) * 100}%`,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              {labels.map((label, index) => {
                const stepNum = index + 1;
                const isCompleted = currentStep > stepNum;
                const isCurrent = currentStep === stepNum;
                return (
                  <div
                    key={label}
                    className="relative z-10 flex flex-col items-center"
                  >
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 ${
                        isCompleted
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                          : isCurrent
                          ? "bg-white border-[3px] border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-500/20"
                          : "bg-white border-2 border-gray-200 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <span className="material-symbols-outlined text-sm sm:text-base">
                          check
                        </span>
                      ) : (
                        stepNum
                      )}
                    </div>
                    <span
                      className={`mt-1.5 text-[10px] xs:text-xs font-bold uppercase tracking-wider transition-colors ${
                        isCompleted || isCurrent
                          ? "text-emerald-600"
                          : "text-gray-400"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          {children}
        </div>
      </div>
    </div>
  );
}
