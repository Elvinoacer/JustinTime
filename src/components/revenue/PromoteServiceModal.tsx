"use client";

import { useState } from "react";
import { Loader2, Rocket, Check } from "lucide-react";
import { toast } from "sonner";
import { promoteService } from "@/app/actions/revenue";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PROMOTION_PLANS } from "@/lib/constants/pricing";

const PLANS = [
  { id: "STANDARD", ...PROMOTION_PLANS.STANDARD },
  { id: "PREMIUM", ...PROMOTION_PLANS.PREMIUM },
] as const;

interface PromoteServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  serviceTitle: string;
}

export function PromoteServiceModal({
  isOpen,
  onClose,
  serviceId,
  serviceTitle,
}: PromoteServiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const router = useRouter();

  const handlePromote = async (planId: "STANDARD" | "PREMIUM") => {
    setLoading(true);
    try {
      const result = await promoteService(
        serviceId,
        planId,
        promoCode.trim() || undefined,
      );
      if (result.success) {
        toast.success(`Service boosted successfully!`);
        router.refresh();
        onClose();
      } else {
        toast.error(result.error || "Promotion failed");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-xl lg:rounded-2xl lg:shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-2">
              <Rocket className="h-5 w-5 shrink-0 text-purple-600" />
              <h2 className="truncate text-base font-bold text-gray-900 sm:text-xl">
                Promote "{serviceTitle}"
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 shrink-0"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <div className="overflow-y-auto p-4 sm:p-6">
            <p className="mb-5 text-sm text-gray-600 sm:mb-6 sm:text-base">
              Boost your service visibility to get more bookings.
            </p>

            <div className="mb-5 space-y-2 sm:mb-6">
              <label
                htmlFor="promotion-promo-code"
                className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Promo Code (Optional)
              </label>
              <input
                id="promotion-promo-code"
                type="text"
                value={promoCode}
                onChange={(event) =>
                  setPromoCode(event.target.value.toUpperCase())
                }
                placeholder="Enter promo code"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex cursor-pointer flex-col rounded-xl border p-3 transition-all hover:border-purple-500 sm:p-4 ${plan.popular ? "border-purple-500 bg-purple-50/50 shadow-sm" : "border-gray-200 hover:shadow-md"}`}
                  onClick={() =>
                    !loading && handlePromote(plan.id as "STANDARD" | "PREMIUM")
                  }
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
                      Best Value
                    </span>
                  )}

                  <div className="mb-2 text-center">
                    <h4 className="text-base font-bold text-gray-900 sm:text-lg">
                      {plan.label}
                    </h4>
                    <div className="mt-1 text-xl font-bold text-purple-700 sm:text-2xl">
                      KES {plan.price.toLocaleString()}
                    </div>
                  </div>

                  <ul className="mb-4 flex-1 space-y-2 text-sm text-gray-600">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all touch-manipulation ${plan.popular ? "bg-purple-600 text-white shadow-md shadow-purple-200 hover:bg-purple-700" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Select Plan"
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
