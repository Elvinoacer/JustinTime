"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface JobSortProps {
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  isMobile?: boolean;
}

const sortOptions = [
  {
    value: "recommended-desc",
    label: "Recommended",
    icon: "stars",
    mobileLabel: "Recommended",
  },
  {
    value: "distance-asc",
    label: "Nearest First",
    icon: "near_me",
    mobileLabel: "Nearest",
  },
  {
    value: "createdAt-desc",
    label: "Newest First",
    icon: "schedule",
    mobileLabel: "Newest",
  },
  {
    value: "createdAt-asc",
    label: "Oldest First",
    icon: "history",
    mobileLabel: "Oldest",
  },
  {
    value: "budget-desc",
    label: "Budget: High to Low",
    icon: "trending_down",
    mobileLabel: "High Budget",
  },
  {
    value: "budget-asc",
    label: "Budget: Low to High",
    icon: "trending_up",
    mobileLabel: "Low Budget",
  },
  {
    value: "location-asc",
    label: "Location (A-Z)",
    icon: "location_on",
    mobileLabel: "Location",
  },
  {
    value: "proposals-desc",
    label: "Most Applicants",
    icon: "groups",
    mobileLabel: "Popular",
  },
];

const JobSort: React.FC<JobSortProps> = ({
  sortBy,
  sortOrder,
  onSortChange,
  isMobile = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentValue = `${sortBy}-${sortOrder}`;
  const currentOption =
    sortOptions.find((opt) => opt.value === currentValue) || sortOptions[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleOptionClick = (value: string) => {
    const [newSortBy, newSortOrder] = value.split("-");
    onSortChange(newSortBy, newSortOrder as "asc" | "desc");
    setIsOpen(false);
  };

  // Handle touch interactions for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart !== null) {
      const touchEnd = e.touches[0].clientY;
      const diff = touchStart - touchEnd;

      // If user swipes up more than 50px, close dropdown
      if (diff > 50 && isOpen) {
        setIsOpen(false);
      }
    }
  };

  // Mobile: Use bottom sheet instead of dropdown
  if (isMobile) {
    return (
      <>
        <div className="relative w-full" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(true)}
            className={`flex items-center justify-between w-full px-3 py-2.5 bg-white border border-gray-200 ${
              isMobile ? "rounded-lg" : "rounded-xl"
            } hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-[0.98]`}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-emerald-600">
                {currentOption.icon}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {currentOption.mobileLabel}
              </span>
            </div>
            <span className="material-symbols-outlined text-lg text-gray-400">
              expand_more
            </span>
          </button>
        </div>

        {/* Mobile Bottom Sheet */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              />

              {/* Bottom Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-hidden lg:hidden"
                ref={dropdownRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => setTouchStart(null)}
              >
                {/* Drag Handle */}
                <div className="flex justify-center p-3">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">Sort By</h3>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      aria-label="Close"
                    >
                      <span className="material-symbols-outlined text-xl">
                        close
                      </span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Currently: {currentOption.label}
                  </p>
                </div>

                {/* Options */}
                <div className="overflow-y-auto max-h-[60vh] py-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleOptionClick(option.value)}
                      className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                        option.value === currentValue
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                      role="option"
                      aria-selected={option.value === currentValue}
                    >
                      <span
                        className={`material-symbols-outlined text-lg ${
                          option.value === currentValue
                            ? "text-emerald-600"
                            : "text-gray-400"
                        }`}
                      >
                        {option.icon}
                      </span>
                      <div className="flex flex-col items-start">
                        <span
                          className={`font-medium ${
                            option.value === currentValue ? "font-semibold" : ""
                          }`}
                        >
                          {option.mobileLabel}
                        </span>
                        <span className="text-xs text-gray-500 mt-0.5">
                          {option.label}
                        </span>
                      </div>
                      {option.value === currentValue && (
                        <span className="material-symbols-outlined text-base ml-auto text-emerald-600">
                          check
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Action Button */}
                <div className="p-4 border-t border-gray-100 bg-white">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 active:scale-[0.98]"
                  >
                    Apply Sort
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop Version
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 ${
          isMobile ? "rounded-lg w-full" : "rounded-xl min-w-[200px]"
        } hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow-md ${
          isMobile ? "text-sm" : "text-sm"
        } font-semibold text-gray-700 justify-between`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-emerald-600">
            {currentOption.icon}
          </span>
          <span>
            {isMobile ? currentOption.mobileLabel : currentOption.label}
          </span>
        </div>
        <span
          className={`material-symbols-outlined transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 mt-2 ${
              isMobile ? "w-full" : "min-w-[240px]"
            } bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50`}
            role="listbox"
          >
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                  option.value === currentValue
                    ? "bg-emerald-50 text-emerald-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                role="option"
                aria-selected={option.value === currentValue}
              >
                <span
                  className={`material-symbols-outlined text-base ${
                    option.value === currentValue
                      ? "text-emerald-600"
                      : "text-gray-400"
                  }`}
                >
                  {option.icon}
                </span>
                <span className="text-sm">{option.label}</span>
                {option.value === currentValue && (
                  <span className="material-symbols-outlined text-base ml-auto text-emerald-600">
                    check
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobSort;
