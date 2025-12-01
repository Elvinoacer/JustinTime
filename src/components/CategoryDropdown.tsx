"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
  id?: string;
  name: string;
  slug?: string;
  icon?: string;
  count?: number;
}

interface CategoryDropdownProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
}

export default function CategoryDropdown({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent body scroll when dropdown is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isMobile]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filter categories based on search
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (categoryName: string) => {
    onSelectCategory(categoryName);
    setIsOpen(false);
    setSearchQuery("");
  };

  const selectedCat = categories.find((cat) => cat.name === selectedCategory);

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      {/* Trigger Button - Responsive */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full sm:w-auto px-3 sm:px-4 py-2.5 bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 hover:border-emerald-500 transition-all shadow-sm hover:shadow-md justify-between active:scale-[0.98]"
        aria-label={isOpen ? "Close categories" : "Open categories"}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
            {selectedCat?.icon || "category"}
          </span>
          <span className="font-medium text-gray-700 truncate text-sm sm:text-base">
            {selectedCategory}
          </span>
        </div>
        <span
          className={`material-symbols-outlined text-gray-400 transition-transform text-sm sm:text-base ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Mobile Full-screen Overlay */}
      {isMobile && isOpen && <div className="fixed inset-0 bg-black/50 z-40" />}

      {/* Dropdown Menu - Responsive */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`fixed sm:absolute ${
              isMobile
                ? "inset-x-0 bottom-0 top-auto max-h-[70vh] overflow-hidden rounded-t-xl"
                : "top-full left-0 right-0 mt-2 max-h-[400px]"
            } bg-white border border-gray-200 shadow-xl sm:shadow-2xl z-50 flex flex-col`}
            initial={{
              opacity: 0,
              y: isMobile ? 100 : -10,
              scale: isMobile ? 1 : 0.95,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: isMobile ? 100 : -10,
              scale: isMobile ? 1 : 0.95,
            }}
            transition={{
              duration: 0.2,
              ease: isMobile ? "easeOut" : "easeInOut",
            }}
          >
            {/* Header with Search */}
            <div className="p-3 sm:p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Select Category
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close dropdown"
                >
                  <span className="material-symbols-outlined text-gray-500 text-sm sm:text-base">
                    close
                  </span>
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs sm:text-sm">
                  search
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 bg-gray-50 rounded-lg text-xs sm:text-sm outline-none focus:bg-white focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined text-xs sm:text-sm">
                      close
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Categories List - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              {filteredCategories.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <span className="material-symbols-outlined text-3xl sm:text-4xl text-gray-300 mb-2">
                    search_off
                  </span>
                  <p className="text-xs sm:text-sm text-gray-500">
                    No categories found
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try a different search term
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {/* Two Column Grid for Desktop */}
                  <div
                    className={`${
                      !isMobile
                        ? "grid grid-cols-2 gap-1 sm:gap-2"
                        : "space-y-1"
                    }`}
                  >
                    {filteredCategories.map((category) => (
                      <button
                        key={category.name}
                        onClick={() => handleSelect(category.name)}
                        className={`w-full flex items-center gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all text-left active:scale-[0.98] ${
                          selectedCategory === category.name
                            ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
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
                          <p className="font-medium truncate text-xs sm:text-sm">
                            {category.name}
                          </p>
                          {category.count !== undefined && (
                            <p
                              className={`text-[10px] sm:text-xs ${
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
                        {selectedCategory === category.name && (
                          <span className="material-symbols-outlined text-white text-sm sm:text-base">
                            check
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing {filteredCategories.length} of {categories.length}
                </p>
                <div className="flex items-center gap-2">
                  {searchQuery && (
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                      "{searchQuery}"
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Close Button */}
            {isMobile && (
              <div className="p-3 border-t border-gray-200 bg-white">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium active:scale-[0.98] text-sm"
                >
                  Close
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Stats - Optional */}
      {!isOpen && (
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <span className="material-symbols-outlined text-xs">info</span>
          <span>{categories.length} categories available</span>
        </div>
      )}
    </div>
  );
}
