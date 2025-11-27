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
  maxVisible = 8,
  label = "Category",
  error,
}: CategorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(20); // For infinite scroll in modal
  const observerTarget = useRef<HTMLDivElement>(null);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  const modalFilteredCategories = useMemo(() => {
    const query = modalSearchQuery.toLowerCase();
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(query)
    );
  }, [categories, modalSearchQuery]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 20);
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
    setVisibleCount(20);
  }, [isModalOpen, modalSearchQuery]);

  const CategoryCard = ({ cat, isModal = false }: { cat: Category; isModal?: boolean }) => {
    const isSelected = selectedIds.includes(cat.id);
    
    return (
      <button
        type="button"
        onClick={() => {
          onToggle(cat.id);
          if (isModal && !multiSelect) setIsModalOpen(false);
        }}
        className={`group relative aspect-[4/3] rounded-2xl overflow-hidden transition-all duration-300 w-full text-left ${
          isSelected
            ? "ring-4 ring-emerald-500 ring-offset-2 shadow-2xl shadow-emerald-500/30 scale-[1.02]"
            : "hover:shadow-xl hover:scale-[1.02] shadow-md"
        }`}
      >
        {/* Image Background */}
        {cat.image ? (
          <div className="absolute inset-0">
            <img
              src={cat.image}
              alt={cat.name}
              className={`w-full h-full object-cover transition-all duration-500 ${
                isSelected
                  ? "scale-110"
                  : "scale-100 group-hover:scale-110 grayscale-[0.3] group-hover:grayscale-0"
              }`}
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
                  isSelected
                    ? "text-white text-5xl"
                    : "text-gray-400 text-4xl group-hover:text-emerald-600 group-hover:text-5xl"
                }`}
              >
                {cat.icon}
              </span>
            </div>
          </div>
        )}

        {/* Selected Checkmark */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg z-10 animate-in zoom-in duration-200">
            <span className="material-symbols-outlined text-emerald-600 text-lg">
              check_circle
            </span>
          </div>
        )}

        {/* Category Name */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <div
            className={`font-bold text-center transition-all duration-300 ${
              isSelected
                ? "text-white text-sm"
                : "text-white text-xs group-hover:text-sm"
            }`}
          >
            {cat.name}
          </div>
        </div>

        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <label className="block text-sm font-bold text-gray-700">
          {label} <span className="text-red-500">*</span>
        </label>
        
        {/* Main Search Input */}
        <div className="relative w-full sm:w-64">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-gray-400 text-sm">search</span>
          </span>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(maxVisible)].map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-2xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredCategories.slice(0, maxVisible).map((cat) => (
              <CategoryCard key={cat.id} cat={cat} />
            ))}
            
            {/* View All Button Card */}
            {filteredCategories.length > maxVisible && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-300 flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-gray-500 group-hover:text-emerald-600">grid_view</span>
                </div>
                <span className="text-sm font-bold text-gray-600 group-hover:text-emerald-700">View All</span>
                <span className="text-xs text-gray-400 group-hover:text-emerald-600/70">
                  +{filteredCategories.length - maxVisible} more
                </span>
              </button>
            )}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="material-symbols-outlined text-gray-400 text-4xl mb-2">search_off</span>
              <p className="text-gray-500 font-medium">No categories found matching "{searchQuery}"</p>
            </div>
          )}
        </>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </p>
      )}

      {/* Full Screen Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 bg-white z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">All Categories</h2>
                  <p className="text-gray-500 text-sm">Select {multiSelect ? "all that apply" : "a category"}</p>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-72">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-gray-400">search</span>
                    </span>
                    <input
                      type="text"
                      placeholder="Search all categories..."
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {modalFilteredCategories.slice(0, visibleCount).map((cat) => (
                    <CategoryCard key={cat.id} cat={cat} isModal={true} />
                  ))}
                </div>
                
                {/* Intersection Observer Target */}
                {visibleCount < modalFilteredCategories.length && (
                  <div ref={observerTarget} className="py-8 flex justify-center">
                    <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  </div>
                )}

                {modalFilteredCategories.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-gray-400 text-4xl">search_off</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No categories found</h3>
                    <p className="text-gray-500">Try adjusting your search terms</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Showing {Math.min(visibleCount, modalFilteredCategories.length)} of {modalFilteredCategories.length} categories
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
