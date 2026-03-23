"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  icon: string;
  count: number;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  multiSelect?: boolean;
  isLoading?: boolean;
  maxVisible?: number;
  label?: string;
  error?: string;
  compact?: boolean;
  disabled?: boolean;
}

export default function CategorySelector({
  categories,
  selectedIds,
  onToggle,
  multiSelect = false,
  isLoading = false,
  maxVisible = 6, // Reduced for mobile
  label = "Category",
  error,
  compact = false,
  disabled = false,
}: CategorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(12); // Reduced for mobile
  const observerTarget = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return categories.filter((cat) => cat.name.toLowerCase().includes(query));
  }, [categories, searchQuery]);

  const modalFilteredCategories = useMemo(() => {
    const query = modalSearchQuery.toLowerCase();
    return categories.filter((cat) => cat.name.toLowerCase().includes(query));
  }, [categories, modalSearchQuery]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 8); // Reduced for mobile
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isModalOpen, modalFilteredCategories]);

  // Reset visible count when modal opens/closes or search changes
  useEffect(() => {
    setVisibleCount(12);
  }, [isModalOpen, modalSearchQuery]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isModalOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  const CategoryCard = ({
    cat,
    isModal = false,
    size = "small",
  }: {
    cat: Category;
    isModal?: boolean;
    size?: "small" | "medium" | "large";
  }) => {
    const isSelected = selectedIds.includes(cat.id);

    const sizeClasses = {
      small: "aspect-[3/2] rounded-md sm:rounded-lg",
      medium: "aspect-[4/3] rounded-lg sm:rounded-xl",
      large: "aspect-[4/3] rounded-xl sm:rounded-2xl",
    };

    const iconSize = {
      small: "text-xl sm:text-2xl",
      medium: "text-2xl sm:text-3xl",
      large: "text-3xl sm:text-4xl",
    };

    const textSize = {
      small: "text-[10px] xs:text-xs sm:text-sm",
      medium: "text-xs sm:text-sm md:text-base",
      large: "text-sm sm:text-base md:text-lg",
    };

    const checkSize = {
      small: "top-1 right-1 w-4 h-4 sm:w-5 sm:h-5",
      medium: "top-1.5 right-1.5 sm:top-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6",
      large: "top-2 right-2 w-6 h-6 sm:w-7 sm:h-7",
    };

    const padding = {
      small: "p-1 sm:p-1.5",
      medium: "p-1.5 sm:p-2 md:p-3",
      large: "p-2 sm:p-3 md:p-4",
    };

    return (
      <button
        type="button"
        disabled={disabled && !isSelected}
        onClick={() => {
          if (disabled && !isSelected) return;
          onToggle(cat.id);
          if (isModal && !multiSelect) setIsModalOpen(false);
        }}
        className={`group relative ${
          sizeClasses[size]
        } overflow-hidden transition-all duration-200 w-full text-left min-h-0 ${
          isSelected
            ? "ring-1 sm:ring-2 ring-emerald-500 ring-offset-1 shadow-md shadow-emerald-500/20 scale-[1.02]"
            : disabled
            ? "opacity-50 cursor-not-allowed grayscale-[50%]"
            : "shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
        }`}
        aria-label={`Select ${cat.name}`}
        aria-pressed={isSelected}
      >
        {/* Image Background */}
        {cat.image ? (
          <div className="absolute inset-0">
            <img
              src={cat.image}
              alt={cat.name}
              className={`w-full h-full object-cover transition-all duration-300 ${
                isSelected ? "scale-110" : "scale-100 group-hover:scale-110"
              }`}
              loading="lazy"
            />
            {/* Gradient Overlay */}
            <div
              className={`absolute inset-0 bg-gradient-to-t transition-all duration-200 ${
                isSelected
                  ? "from-emerald-900/90 via-emerald-900/50 to-emerald-900/20"
                  : "from-gray-900/80 via-gray-900/40 to-gray-900/10 group-hover:from-emerald-900/70 group-hover:via-emerald-900/30"
              }`}
            />
          </div>
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br transition-all duration-200 ${
              isSelected
                ? "from-emerald-500 to-teal-600"
                : "from-gray-100 to-gray-200 group-hover:from-emerald-50 group-hover:to-teal-50"
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`material-symbols-outlined transition-all duration-200 ${
                  iconSize[size]
                } ${
                  isSelected
                    ? "text-white"
                    : "text-gray-400 group-hover:text-emerald-600"
                }`}
              >
                {cat.icon}
              </span>
            </div>
          </div>
        )}

        {/* Selected Checkmark */}
        {isSelected && (
          <div
            className={`absolute ${checkSize[size]} bg-white rounded-full flex items-center justify-center shadow-lg z-10 animate-in zoom-in duration-150`}
          >
            <span className="material-symbols-outlined text-emerald-600 text-xs sm:text-sm">
              check
            </span>
          </div>
        )}

        {/* Category Name */}
        <div
          className={`absolute bottom-0 left-0 right-0 ${padding[size]} z-10`}
        >
          <div
            className={`font-bold text-center line-clamp-2 ${textSize[size]} ${
              isSelected ? "text-white" : "text-white"
            } leading-tight`}
          >
            {cat.name}
          </div>
        </div>
      </button>
    );
  };

  // Handle modal click outside
  const handleModalClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsModalOpen(false);
    }
  };

  return (
    <div className={`space-y-2 ${compact ? "sm:space-y-3" : "sm:space-y-4"}`}>
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
        <label className="block text-xs sm:text-sm font-semibold text-gray-700 truncate">
          {label} <span className="text-red-500">*</span>
        </label>

        {/* Main Search Input - Only show in non-compact mode */}
        {!compact && (
          <div className="relative w-full xs:w-auto xs:min-w-[150px] sm:min-w-[180px]">
            <span className="absolute inset-y-0 left-0 pl-2 sm:pl-2.5 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400 text-sm">
                search
              </span>
            </span>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 sm:pl-8 pr-2 sm:pr-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg border border-gray-200 text-xs sm:text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div
          className={`grid grid-cols-2 xs:grid-cols-3 ${
            compact
              ? "sm:grid-cols-4"
              : "sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
          } gap-1.5 sm:gap-2 ${!compact ? "md:gap-3" : ""}`}
        >
          {[...Array(maxVisible)].map((_, i) => (
            <div
              key={i}
              className="aspect-[3/2] rounded-md sm:rounded-lg bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          <div
            className={`grid grid-cols-2 xs:grid-cols-3 ${
              compact
                ? "sm:grid-cols-4"
                : "sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
            } gap-1.5 sm:gap-2 ${!compact ? "md:gap-3" : ""}`}
          >
            {filteredCategories.slice(0, maxVisible).map((cat) => (
              <CategoryCard key={cat.id} cat={cat} size="small" />
            ))}

            {/* View All Button Card */}
            {filteredCategories.length > maxVisible && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="aspect-[3/2] rounded-md sm:rounded-lg border border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 flex flex-col items-center justify-center gap-1 sm:gap-1.5 group active:scale-[0.98] min-h-0 p-2"
                aria-label="View all categories"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-gray-500 group-hover:text-emerald-600 text-xs sm:text-sm">
                    grid_view
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-600 group-hover:text-emerald-700 truncate w-full text-center">
                  View All
                </span>
                <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-emerald-600/70">
                  +{filteredCategories.length - maxVisible}
                </span>
              </button>
            )}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-3 sm:py-4 bg-gray-50 rounded-md sm:rounded-lg border border-gray-100">
              <span className="material-symbols-outlined text-gray-400 text-xl sm:text-2xl mb-1">
                search_off
              </span>
              <p className="text-gray-500 font-medium text-xs sm:text-sm">
                No categories found
              </p>
            </div>
          )}
        </>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-0.5 sm:gap-1">
          <span className="material-symbols-outlined text-xs">error</span>
          {error}
        </p>
      )}

      {/* Full Screen Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-3 md:p-4 overflow-y-auto"
            onClick={handleModalClick}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl sm:max-w-3xl md:max-w-4xl max-h-[90dvh] bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg sm:shadow-xl md:shadow-2xl overflow-hidden flex flex-col my-auto sm:my-0"
              role="dialog"
              aria-modal="true"
              aria-label="Category selection modal"
            >
              {/* Modal Header */}
              <div className="p-3 sm:p-4 md:p-5 border-b border-gray-100 bg-white z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">
                    All Categories
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm truncate">
                    Select {multiSelect ? "all that apply" : "a category"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-40 md:w-48 lg:w-56 min-w-0">
                    <span className="absolute inset-y-0 left-0 pl-2 sm:pl-2.5 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-gray-400 text-sm sm:text-base">
                        search
                      </span>
                    </span>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      className="w-full pl-7 sm:pl-8 pr-2 sm:pr-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-xs sm:text-sm"
                      autoFocus
                      aria-label="Search categories"
                    />
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors flex-shrink-0"
                    aria-label="Close modal"
                  >
                    <span className="material-symbols-outlined text-sm sm:text-base">
                      close
                    </span>
                  </button>
                </div>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 bg-gray-50/50">
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2 md:gap-3">
                  {modalFilteredCategories.slice(0, visibleCount).map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      cat={cat}
                      isModal={true}
                      size="medium"
                    />
                  ))}
                </div>

                {/* Intersection Observer Target */}
                {visibleCount < modalFilteredCategories.length && (
                  <div
                    ref={observerTarget}
                    className="py-2 sm:py-3 md:py-4 flex justify-center"
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  </div>
                )}

                {modalFilteredCategories.length === 0 && (
                  <div className="text-center py-4 sm:py-6 md:py-8">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <span className="material-symbols-outlined text-gray-400 text-lg sm:text-xl md:text-2xl">
                        search_off
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-1 sm:mb-1.5">
                      No categories found
                    </h3>
                    <p className="text-gray-500 text-xs sm:text-sm">
                      Try adjusting your search terms
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-2 sm:p-3 md:p-4 border-t border-gray-100 bg-white flex flex-col xs:flex-row justify-between items-center gap-1.5 sm:gap-2">
                <div className="text-xs text-gray-500 text-center xs:text-left">
                  Showing{" "}
                  {Math.min(visibleCount, modalFilteredCategories.length)} of{" "}
                  {modalFilteredCategories.length} categories
                </div>
                <div className="flex gap-1.5 sm:gap-2 w-full xs:w-auto">
                  <button
                    onClick={() => {
                      if (multiSelect) {
                        // Clear all selections
                        selectedIds.forEach((id) => onToggle(id));
                      } else if (selectedIds.length > 0) {
                        onToggle(selectedIds[0]);
                      }
                    }}
                    className="px-3 sm:px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md sm:rounded-lg font-medium text-xs sm:text-sm transition-colors flex-1 xs:flex-none"
                    disabled={selectedIds.length === 0}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 sm:px-5 py-1.5 bg-emerald-600 text-white rounded-md sm:rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200 flex-1 xs:flex-none text-xs sm:text-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
