"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface JobSortProps {
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
}

const sortOptions = [
  { value: "recommended-desc", label: "Recommended For You", icon: "stars" },
  { value: "distance-asc", label: "Nearest First", icon: "near_me" },
  { value: "createdAt-desc", label: "Newest First", icon: "schedule" },
  { value: "createdAt-asc", label: "Oldest First", icon: "history" },
  { value: "budget-desc", label: "Budget: High to Low", icon: "trending_down" },
  { value: "budget-asc", label: "Budget: Low to High", icon: "trending_up" },
  { value: "location-asc", label: "Location (A-Z)", icon: "location_on" },
  {
    value: "proposals-desc",
    label: "Most Applicants",
    icon: "groups",
  },
];

const JobSort: React.FC<JobSortProps> = ({
  sortBy,
  sortOrder,
  onSortChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentValue = `${sortBy}-${sortOrder}`;
  const currentOption =
    sortOptions.find((opt) => opt.value === currentValue) || sortOptions[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOptionClick = (value: string) => {
    const [newSortBy, newSortOrder] = value.split("-");
    onSortChange(newSortBy, newSortOrder as "asc" | "desc");
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow-md text-sm font-bold text-gray-700 min-w-[220px] justify-between"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base">
            {currentOption.icon}
          </span>
          <span>{currentOption.label}</span>
        </div>
        <span
          className={`material-symbols-outlined transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-full min-w-[240px] bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50"
            role="listbox"
          >
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
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
                <span>{option.label}</span>
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
