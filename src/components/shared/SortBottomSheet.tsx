"use client";
import { motion, AnimatePresence } from "framer-motion";

interface SortBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentSort: string;
  onSortChange: (sort: string) => void;
  options?: { label: string; value: string }[];
}

const defaultOptions = [
  { label: "Relevance", value: "relevance" },
  { label: "Rating: High to Low", value: "rating" },
  { label: "Price: Low to High", value: "price_low" },
  { label: "Price: High to Low", value: "price_high" },
  { label: "Distance: Nearest", value: "distance" },
];

export default function SortBottomSheet({
  isOpen,
  onClose,
  currentSort,
  onSortChange,
  options = defaultOptions,
}: SortBottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[100] lg:hidden"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[101] bg-white w-full rounded-t-3xl p-6 lg:hidden max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Sort Options</h3>
              <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <div className="flex flex-col gap-3 pb-8">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value);
                    onClose();
                  }}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    currentSort === option.value
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold"
                      : "border-gray-100 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span>{option.label}</span>
                  {currentSort === option.value && (
                    <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
