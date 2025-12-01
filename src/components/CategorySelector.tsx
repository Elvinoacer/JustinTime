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
}: CategorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(16); // For infinite scroll in modal
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
          setVisibleCount((prev) => prev + 12);
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
    setVisibleCount(16);
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
    size = "medium",
  }: {
    cat: Category;
    isModal?: boolean;
    size?: "small" | "medium" | "large";
  }) => {
    const isSelected = selectedIds.includes(cat.id);

    const sizeClasses = {
      small: "aspect-[3/2] rounded-lg",
      medium: "aspect-[4/3] rounded-xl",
      large: "aspect-[4/3] rounded-2xl",
    };

    const iconSize = {
      small: "text-2xl",
      medium: "text-3xl",
      large: "text-4xl",
    };

    const textSize = {
      small: "text-[10px] xs:text-xs",
      medium: "text-xs xs:text-sm",
      large: "text-sm xs:text-base",
    };

    const checkSize = {
      small: "top-1 right-1 w-5 h-5",
      medium: "top-1.5 right-1.5 sm:top-2 sm:right-2 w-6 h-6 sm:w-7 sm:h-7",
      large: "top-2 right-2 w-7 h-7",
    };

    return (
      <button
        type="button"
        onClick={() => {
          onToggle(cat.id);
          if (isModal && !multiSelect) setIsModalOpen(false);
        }}
        className={`group relative ${
          sizeClasses[size]
        } overflow-hidden transition-all duration-300 w-full text-left min-h-0 ${
          isSelected
            ? "ring-2 sm:ring-3 ring-emerald-500 ring-offset-1 sm:ring-offset-2 shadow-lg sm:shadow-xl shadow-emerald-500/20 scale-[1.02]"
            : "shadow-sm hover:shadow-md hover:scale-[1.02]"
        } active:scale-[0.98]`}
        aria-label={`Select ${cat.name}`}
        aria-pressed={isSelected}
      >
        {/* Image Background */}
        {cat.image ? (
          <div className="absolute inset-0">
            <img
              src={cat.image}
              alt={cat.name}
              className={`w-full h-full object-cover transition-all duration-500 ${
                isSelected ? "scale-110" : "scale-100 group-hover:scale-110"
              }`}
              loading="lazy"
            />
            {/* Gradient Overlay */}
            <div
              className={`absolute inset-0 bg-gradient-to-t transition-all duration-300 ${
                isSelected
                  ? "from-emerald-900/90 via-emerald-900/50 to-emerald-900/20"
                  : "from-gray-900/80 via-gray-900/40 to-gray-900/10 group-hover:from-emerald-900/70 group-hover:via-emerald-900/30"
              }`}
            />
          </div>
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br transition-all duration-300 ${
              isSelected
                ? "from-emerald-500 to-teal-600"
                : "from-gray-100 to-gray-200 group-hover:from-emerald-50 group-hover:to-teal-50"
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`material-symbols-outlined transition-all duration-300 ${
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
            className={`absolute ${checkSize[size]} bg-white rounded-full flex items-center justify-center shadow-lg z-10 animate-in zoom-in duration-200`}
          >
            <span className="material-symbols-outlined text-emerald-600 text-xs sm:text-sm">
              check_circle
            </span>
          </div>
        )}

        {/* Category Name */}
        <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 md:p-3 z-10">
          <div
            className={`font-bold text-center transition-all duration-300 ${
              textSize[size]
            } ${isSelected ? "text-white" : "text-white"}`}
          >
            {cat.name}
          </div>
        </div>

        {/* Shine effect - only on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
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
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 sm:gap-4 mb-1 sm:mb-2">
        <label className="block text-xs sm:text-sm font-bold text-gray-700">
          {label} <span className="text-red-500">*</span>
        </label>

        {/* Main Search Input */}
        <div className="relative w-full xs:w-auto xs:min-w-[200px]">
          <span className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-gray-400 text-sm">
              search
            </span>
          </span>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 text-xs sm:text-sm focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {[...Array(maxVisible)].map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-lg sm:rounded-xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {filteredCategories.slice(0, maxVisible).map((cat) => (
              <CategoryCard key={cat.id} cat={cat} size="medium" />
            ))}

            {/* View All Button Card */}
            {filteredCategories.length > maxVisible && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="aspect-[4/3] rounded-lg sm:rounded-xl border border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-300 flex flex-col items-center justify-center gap-1 sm:gap-2 group active:scale-[0.98] min-h-0"
                aria-label="View all categories"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-gray-500 group-hover:text-emerald-600 text-sm sm:text-base">
                    grid_view
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-600 group-hover:text-emerald-700">
                  View All
                </span>
                <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-emerald-600/70">
                  +{filteredCategories.length - maxVisible} more
                </span>
              </button>
            )}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-6 sm:py-8 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-100">
              <span className="material-symbols-outlined text-gray-400 text-2xl sm:text-3xl md:text-4xl mb-1 sm:mb-2">
                search_off
              </span>
              <p className="text-gray-500 font-medium text-sm sm:text-base">
                No categories found matching "{searchQuery}"
              </p>
            </div>
          )}
        </>
      )}

      {error && (
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-600 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs sm:text-sm">
            error
          </span>
          {error}
        </p>
      )}

      {/* Full Screen Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4"
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
              className="relative w-full max-w-4xl max-h-[90dvh] bg-white rounded-xl sm:rounded-2xl md:rounded-3xl shadow-xl sm:shadow-2xl overflow-hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Category selection modal"
            >
              {/* Modal Header */}
              <div className="p-3 sm:p-4 md:p-6 border-b border-gray-100 bg-white z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 md:gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                    All Categories
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Select {multiSelect ? "all that apply" : "a category"}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48 md:w-60 lg:w-72 min-w-0">
                    <span className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-gray-400 text-sm sm:text-base">
                        search
                      </span>
                    </span>
                    <input
                      type="text"
                      placeholder="Search all categories..."
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm sm:text-base"
                      autoFocus
                      aria-label="Search categories"
                    />
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors flex-shrink-0"
                    aria-label="Close modal"
                  >
                    <span className="material-symbols-outlined text-sm sm:text-base">
                      close
                    </span>
                  </button>
                </div>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-gray-50/50">
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
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
                    className="py-4 sm:py-6 md:py-8 flex justify-center"
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-3 md:border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  </div>
                )}

                {modalFilteredCategories.length === 0 && (
                  <div className="text-center py-6 sm:py-8 md:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4">
                      <span className="material-symbols-outlined text-gray-400 text-xl sm:text-2xl md:text-3xl">
                        search_off
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1 sm:mb-2">
                      No categories found
                    </h3>
                    <p className="text-gray-500 text-sm sm:text-base">
                      Try adjusting your search terms
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-2 sm:p-3 md:p-4 border-t border-gray-100 bg-white flex flex-col xs:flex-row justify-between items-center gap-2 sm:gap-3">
                <div className="text-xs sm:text-sm text-gray-500 text-center xs:text-left">
                  Showing{" "}
                  {Math.min(visibleCount, modalFilteredCategories.length)} of{" "}
                  {modalFilteredCategories.length} categories
                </div>
                <div className="flex gap-2 w-full xs:w-auto">
                  <button
                    onClick={() => {
                      if (multiSelect) {
                        // Clear all selections
                        selectedIds.forEach((id) => onToggle(id));
                      }
                    }}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-colors flex-1 xs:flex-none"
                    disabled={selectedIds.length === 0}
                  >
                    Clear {multiSelect ? "All" : ""}
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 sm:px-6 py-1.5 sm:py-2.5 bg-emerald-600 text-white rounded-lg sm:rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm sm:shadow-md shadow-emerald-200 flex-1 xs:flex-none text-xs sm:text-sm"
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
