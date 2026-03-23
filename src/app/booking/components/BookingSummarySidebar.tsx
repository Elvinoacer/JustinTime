import React, { Dispatch, SetStateAction } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Star, MapPin, Tag, AlertCircle, Info } from "lucide-react";
import { formatCurrency, calculateBookingBreakdown } from "@/lib/financials";
import { format } from "date-fns";
import { toast } from "sonner";
import { validatePromoCodeAction } from "@/app/actions/promo";

interface BookingSummarySidebarProps {
  professional: any;
  selectedServiceData: any;
  selectedDates: Date[];
  selectedTimeSlots: Record<string, string[]>;
  totalSlots: number;
  promoCode: string;
  setPromoCode: Dispatch<SetStateAction<string>>;
  appliedPromo: string;
  setAppliedPromo: Dispatch<SetStateAction<string>>;
  promoDiscount: number;
  setPromoDiscount: Dispatch<SetStateAction<number>>;
  isApplyingPromo: boolean;
  setIsApplyingPromo: Dispatch<SetStateAction<boolean>>;
  promoError: string;
  setPromoError: Dispatch<SetStateAction<string>>;
}

export default function BookingSummarySidebar({
  professional,
  selectedServiceData,
  selectedDates,
  selectedTimeSlots,
  totalSlots,
  promoCode,
  setPromoCode,
  appliedPromo,
  setAppliedPromo,
  promoDiscount,
  setPromoDiscount,
  isApplyingPromo,
  setIsApplyingPromo,
  promoError,
  setPromoError
}: BookingSummarySidebarProps) {
  const basePrice = totalSlots * (selectedServiceData?.price || 0);
  const { exciseDuty, totalAmount, trustFee, discountAmount } =
    calculateBookingBreakdown(basePrice, promoDiscount);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsApplyingPromo(true);
    setPromoError("");
    setAppliedPromo("");
    setPromoDiscount(0);

    try {
      const result = await validatePromoCodeAction(promoCode, basePrice);

      if (result.isValid) {
        setAppliedPromo(promoCode);
        setPromoDiscount(result.discountAmount);
        toast.success("Promo code applied!");
      } else {
        setPromoError(result.error || "Invalid promo code");
        toast.error(result.error || "Invalid promo code");
      }
    } catch (err) {
      setPromoError("Failed to apply promo");
      toast.error("Failed to apply promo code");
    } finally {
      setIsApplyingPromo(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Professional Card */}
      <motion.div
        className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
          Professional
        </h3>
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          {professional.image ? (
            <img
              src={professional.image}
              alt={professional.name}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-emerald-200"
            />
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl">
              {professional.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-1.5">
              {professional.name}
              {professional.isVerified && (
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              )}
            </div>
            <div className="flex items-center gap-1 text-xs sm:text-sm mt-0.5">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold">
                {professional.averageRating.toFixed(1)}
              </span>
              <span className="text-gray-500">
                ({professional.totalReviews} reviews)
              </span>
            </div>
          </div>
        </div>
        {professional.location && (
          <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="truncate">{professional.location}</span>
          </div>
        )}
      </motion.div>

      {/* Booking Summary */}
      {selectedServiceData && totalSlots > 0 && (
        <motion.div
          className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl sm:rounded-2xl border-2 border-emerald-200 p-4 sm:p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
            Booking Summary
          </h3>
          <div className="space-y-2.5 sm:space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-gray-600">Service</div>
              <div className="font-semibold text-gray-900 text-sm sm:text-base">
                {selectedServiceData?.title}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2.5">
              <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                Selected Times
              </h4>
              <div className="space-y-2">
                {Object.entries(selectedTimeSlots).map(([dateStr, slots]) => {
                  if (slots.length === 0) return null;
                  const date = selectedDates.find(
                    (d) => format(d, "yyyy-MM-dd") === dateStr
                  );
                  return (
                    <div
                      key={dateStr}
                      className="border-l-2 border-emerald-500 pl-2"
                    >
                      <div className="font-medium text-gray-900 text-xs sm:text-sm">
                        {date && format(date, "EEE, MMM d")}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {slots.length} slot{slots.length > 1 ? "s" : ""}:{" "}
                        {slots.join(", ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2.5 sm:pt-3 border-t-2 border-emerald-200">
              <div className="space-y-1">
                <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                  <span>
                    Subtotal ({totalSlots} session{totalSlots !== 1 ? "s" : ""})
                  </span>
                  <span>{formatCurrency(basePrice)}</span>
                </div>

                {/* Promo Input */}
                <div className="py-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) =>
                          setPromoCode(e.target.value.toUpperCase())
                        }
                        placeholder="Promo Code"
                        disabled={!!appliedPromo}
                        className="w-full pl-8 pr-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 uppercase disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </div>
                    {appliedPromo ? (
                      <button
                        onClick={() => {
                          setAppliedPromo("");
                          setPromoCode("");
                          setPromoDiscount(0);
                          toast.info("Promo removed");
                        }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        onClick={handleApplyPromo}
                        disabled={!promoCode || isApplyingPromo}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {isApplyingPromo ? "..." : "Apply"}
                      </button>
                    )}
                  </div>
                  {appliedPromo && (
                    <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Code applied
                      successfully!
                    </p>
                  )}
                  {promoError && (
                    <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {promoError}
                    </p>
                  )}
                </div>

                {appliedPromo && (
                  <div className="flex justify-between text-xs sm:text-sm text-emerald-600 font-medium">
                    <span>Discount ({appliedPromo})</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs sm:text-sm text-emerald-700">
                  <span>Excise Duty (20%)</span>
                  <span>{formatCurrency(exciseDuty)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm text-blue-700 font-medium">
                  <span>Happiness Pledge (Insurance)</span>
                  <span>{formatCurrency(trustFee)}</span>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-emerald-200 flex justify-between items-center">
                <div className="text-sm sm:text-base font-bold text-gray-900">
                  Total
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-600">
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Help Card */}
      <motion.div
        className="bg-blue-50 rounded-xl sm:rounded-2xl border border-blue-200 p-4 sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-start gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
          <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
              Need Help?
            </h4>
            <p className="text-gray-700 text-xs sm:text-sm">
              Questions about booking? Contact support anytime.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
