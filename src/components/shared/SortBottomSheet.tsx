"use client";
import { motion, AnimatePresence } from "framer-motion";

export type SortOption = {
  label: string;
  value: string;
  disabled?: boolean;
  hint?: string;
};

interface SortBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentSort: string;
  onSortChange: (sort: string) => void;
  options?: SortOption[];
}

const defaultOptions: SortOption[] = [
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
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[101] max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200/80 bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_-16px_rgba(15,23,42,0.25)] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sort-sheet-title"
          >
            <div className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-slate-200" aria-hidden />
            <div className="mb-6 flex items-center justify-between">
              <h3 id="sort-sheet-title" className="text-lg font-bold text-slate-900">
                Sort by
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-slate-100 p-2.5 text-slate-600 transition hover:bg-slate-200"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 pb-4">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onSortChange(option.value);
                    onClose();
                  }}
                  className={`flex min-h-[52px] items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                    option.disabled
                      ? "cursor-not-allowed border-slate-50 bg-slate-50 text-slate-400"
                      : currentSort === option.value
                        ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-800"
                        : "border-slate-100 bg-white text-slate-800 hover:border-slate-200"
                  }`}
                >
                  <span className="flex flex-col gap-0.5">
                    <span>{option.label}</span>
                    {option.hint ? (
                      <span className="text-xs font-normal text-slate-400">
                        {option.hint}
                      </span>
                    ) : null}
                  </span>
                  {currentSort === option.value && !option.disabled ? (
                    <span className="material-symbols-outlined text-emerald-600">
                      check_circle
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
