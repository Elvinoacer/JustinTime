"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
  id?: string;
  name: string;
  slug?: string;
  icon?: string;
  count?: number;
}

interface AllCategoriesModalProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function AllCategoriesModal({
  categories,
  selectedCategory,
  onSelectCategory,
  isOpen,
  onClose,
}: AllCategoriesModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string>("");
  const modalRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setSearchQuery("");
      setActiveLetter("");
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Filter categories based on search
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group categories alphabetically
  const groupedCategories = filteredCategories.reduce((acc, cat) => {
    const firstLetter = cat.name[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  // Alphabet letters for quick navigation
  const alphabet = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(65 + i)
  );

  const handleSelect = (categoryName: string) => {
    onSelectCategory(categoryName);
    onClose();
  };

  const handleLetterClick = (letter: string) => {
    setActiveLetter(letter);
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal - Full screen on mobile, side panel on desktop */}
          <motion.div
            ref={modalRef}
            className="fixed inset-0 sm:inset-y-0 sm:right-0 w-full sm:w-[500px] bg-white z-[100] flex flex-col"
            initial={{
              x: isMobile ? 0 : "100%",
              y: isMobile ? "100%" : 0,
            }}
            animate={{
              x: 0,
              y: 0,
            }}
            exit={{
              x: isMobile ? 0 : "100%",
              y: isMobile ? "100%" : 0,
            }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 p-4 sm:p-6 text-white">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-sm sm:text-base">
                      apps
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold">
                      All Categories
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-100 opacity-90">
                      {categories.length} total categories
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-95"
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined text-sm sm:text-base">
                    close
                  </span>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/70 text-sm sm:text-base">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-8 sm:pr-4 py-2.5 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl text-white placeholder-white/60 outline-none focus:bg-white/20 focus:border-white/40 transition-all text-sm sm:text-base"
                  autoFocus={!isMobile}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined text-sm sm:text-base">
                      close
                    </span>
                  </button>
                )}
              </div>

              {/* Quick Stats */}
              <div className="mt-3 flex items-center justify-between text-xs sm:text-sm">
                <span className="text-emerald-100">
                  {filteredCategories.length} found
                </span>
                {selectedCategory && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    Selected: {selectedCategory}
                  </span>
                )}
              </div>
            </div>

            {/* Alphabet Quick Navigation - Only show when not searching */}
            {!searchQuery && Object.keys(groupedCategories).length > 5 && (
              <div className="border-b border-gray-200 bg-gray-50 px-3 sm:px-6 py-2 sm:py-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600 font-medium">Quick Jump:</span>
                  <div className="flex-1 overflow-x-auto flex justify-center gap-0.5 sm:gap-1 px-2">
                    {alphabet.map((letter) => (
                      <button
                        key={letter}
                        onClick={() => handleLetterClick(letter)}
                        className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          groupedCategories[letter]
                            ? activeLetter === letter
                              ? "bg-emerald-600 text-white"
                              : "bg-white text-gray-700 hover:bg-emerald-100 hover:text-emerald-700 border border-gray-300"
                            : "bg-gray-100 text-gray-400 cursor-default"
                        }`}
                        disabled={!groupedCategories[letter]}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
              {Object.keys(groupedCategories).length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <span className="material-symbols-outlined text-4xl sm:text-6xl text-gray-300 mb-3 sm:mb-4">
                    search_off
                  </span>
                  <p className="text-gray-500 text-sm sm:text-base mb-1">
                    No categories found
                  </p>
                  <p className="text-gray-400 text-xs">
                    Try a different search term
                  </p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {Object.keys(groupedCategories)
                    .sort()
                    .map((letter) => (
                      <div key={letter} id={`letter-${letter}`}>
                        <div className="sticky top-0 bg-white py-2 mb-2 border-b border-gray-200">
                          <h3 className="text-base sm:text-lg font-bold text-emerald-600 flex items-center gap-2">
                            <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs sm:text-sm">
                              {letter}
                            </span>
                            <span>{letter}</span>
                            <span className="text-xs text-gray-500 ml-auto">
                              {groupedCategories[letter].length} items
                            </span>
                          </h3>
                        </div>
                        <div
                          className={`grid grid-cols-1 ${
                            isMobile ? "" : "sm:grid-cols-2"
                          } gap-2 sm:gap-3`}
                        >
                          {groupedCategories[letter].map((category) => (
                            <motion.button
                              key={category.name}
                              onClick={() => handleSelect(category.name)}
                              className={`flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all text-left active:scale-[0.98] ${
                                selectedCategory === category.name
                                  ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm sm:shadow-md"
                                  : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                              }`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <span
                                  className={`material-symbols-outlined text-sm sm:text-base ${
                                    selectedCategory === category.name
                                      ? "text-white"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  {category.icon || "category"}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm sm:text-base truncate">
                                    {category.name}
                                  </p>
                                  {category.count !== undefined && (
                                    <p
                                      className={`text-xs mt-0.5 ${
                                        selectedCategory === category.name
                                          ? "text-white/80"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      {category.count} service
                                      {category.count !== 1 ? "s" : ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {selectedCategory === category.name && (
                                <span className="material-symbols-outlined text-white text-sm sm:text-base flex-shrink-0">
                                  check_circle
                                </span>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-lg sm:rounded-xl font-medium hover:bg-gray-200 transition-colors active:scale-[0.98] text-sm sm:text-base flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onSelectCategory("All Services");
                    onClose();
                  }}
                  className="px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg sm:rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-colors active:scale-[0.98] text-sm sm:text-base flex-1"
                >
                  View All Services
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
