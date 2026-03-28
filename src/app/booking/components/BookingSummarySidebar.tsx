import React, { Dispatch, SetStateAction, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  Clock3,
  Info,
  MapPin,
  ShieldCheck,
  Star,
  Tag,
} from "lucide-react";
import { calculateBookingBreakdown, formatCurrency } from "@/lib/financials";
import { format } from "date-fns";
import { toast } from "sonner";
import { validatePromoCodeAction } from "@/app/actions/promo";
import Image from "next/image";
import type { ProfessionalDetail } from "@/lib/api/hooks/useProfessional";

type BookingService = ProfessionalDetail["services"][number];

interface BookingSummarySidebarProps {
  professional: ProfessionalDetail;
  selectedServiceData?: BookingService;
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

function getLocationLabel(locationType?: string | null) {
  switch (locationType) {
    case "CLIENT_LOCATION":
      return "At your location";
    case "PROVIDER_LOCATION":
      return "At provider location";
    case "REMOTE":
      return "Remote";
    case "NEGOTIABLE":
      return "Location negotiable";
    default:
      return "Flexible location";
  }
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
  setPromoError,
}: BookingSummarySidebarProps) {
  const serviceDuration = selectedServiceData?.defaultDuration || 60;
  const totalMinutes = totalSlots * serviceDuration;
  const totalHours = totalMinutes / 60;
  const averageVisitCost =
    totalSlots > 0 ? (selectedServiceData?.price || 0) : 0;
  const basePrice = totalSlots * (selectedServiceData?.price || 0);
  const { exciseDuty, totalAmount, trustFee, discountAmount } =
    calculateBookingBreakdown(basePrice, promoDiscount);

  const orderedAppointments = useMemo(
    () =>
      Object.entries(selectedTimeSlots)
        .flatMap(([dateStr, slots]) =>
          slots.map((slot) => ({ dateStr, time: slot })),
        )
        .sort((a, b) =>
          `${a.dateStr}-${a.time}`.localeCompare(`${b.dateStr}-${b.time}`),
        ),
    [selectedTimeSlots],
  );

  const firstAppointment = orderedAppointments[0];
  const lastAppointment = orderedAppointments[orderedAppointments.length - 1];

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
        toast.success("Promo code applied");
      } else {
        setPromoError(result.error || "Invalid promo code");
        toast.error(result.error || "Invalid promo code");
      }
    } catch {
      setPromoError("Failed to apply promo");
      toast.error("Failed to apply promo code");
    } finally {
      setIsApplyingPromo(false);
    }
  };

  return (
    <div className="space-y-5">
      <motion.div
        className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 to-slate-800 px-5 py-4 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Booking with
          </p>
          <h3 className="mt-1 text-lg font-bold">{professional.name}</h3>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
              {professional.image ? (
                <Image
                  src={professional.image}
                  alt={professional.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 text-xl font-bold text-white">
                  {professional.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {professional.name}
                </p>
                {professional.isVerified ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                ) : null}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-slate-800">
                  {professional.averageRating.toFixed(1)}
                </span>
                <span>({professional.totalReviews} reviews)</span>
              </div>
            </div>
          </div>

          {professional.location ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span className="truncate">{professional.location}</span>
            </div>
          ) : null}
        </div>
      </motion.div>

      {selectedServiceData ? (
        <motion.div
          className="rounded-[1.75rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-lg font-bold text-slate-950">Booking summary</h3>

          <div className="mt-4 rounded-2xl bg-white/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Selected service
            </p>
            <p className="mt-1 text-base font-bold text-slate-950">
              {selectedServiceData.title}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                {formatCurrency(selectedServiceData.price)} {selectedServiceData.pricingUnit}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                <Clock3 className="h-3.5 w-3.5" />
                {serviceDuration} min per slot
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                {getLocationLabel(selectedServiceData.locationType)}
              </span>
            </div>
          </div>

          {totalSlots > 0 ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/85 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Total time
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {totalHours >= 1
                      ? `${totalHours.toFixed(totalHours % 1 === 0 ? 0 : 1)} hrs`
                      : `${totalMinutes} mins`}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/85 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Avg per visit
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {formatCurrency(averageVisitCost)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white/85 p-4">
                <h4 className="text-sm font-bold text-slate-950">
                  Appointment timeline
                </h4>
                <div className="mt-3 space-y-2">
                  {Object.entries(selectedTimeSlots).map(([dateStr, slots]) => {
                    if (slots.length === 0) return null;
                    const date = selectedDates.find(
                      (selectedDate) =>
                        format(selectedDate, "yyyy-MM-dd") === dateStr,
                    );

                    return (
                      <div key={dateStr} className="border-l-2 border-emerald-300 pl-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {date ? format(date, "EEE, MMM d") : dateStr}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {slots.join(", ")}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {firstAppointment ? (
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                    Earliest slot:{" "}
                    <span className="font-semibold text-slate-900">
                      {format(new Date(`${firstAppointment.dateStr}T00:00:00`), "EEE, MMM d")} at {firstAppointment.time}
                    </span>
                    {lastAppointment ? (
                      <>
                        {" "}· Last slot:{" "}
                        <span className="font-semibold text-slate-900">
                          {format(new Date(`${lastAppointment.dateStr}T00:00:00`), "EEE, MMM d")} at {lastAppointment.time}
                        </span>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-4 text-sm text-slate-600">
              Pick dates and time slots to see total time and cost details here.
            </div>
          )}

          {totalSlots > 0 ? (
            <div className="mt-4 rounded-2xl bg-white/92 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>
                    Subtotal ({totalSlots} slot{totalSlots !== 1 ? "s" : ""})
                  </span>
                  <span>{formatCurrency(basePrice)}</span>
                </div>

                <div className="py-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) =>
                          setPromoCode(e.target.value.toUpperCase())
                        }
                        placeholder="Promo code"
                        disabled={!!appliedPromo}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs uppercase text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500"
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
                        className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        onClick={handleApplyPromo}
                        disabled={!promoCode || isApplyingPromo || basePrice <= 0}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isApplyingPromo ? "..." : "Apply"}
                      </button>
                    )}
                  </div>

                  {appliedPromo ? (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Promo applied successfully
                    </p>
                  ) : null}
                  {promoError ? (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {promoError}
                    </p>
                  ) : null}
                </div>

                {appliedPromo ? (
                  <div className="flex justify-between font-medium text-emerald-700">
                    <span>Discount ({appliedPromo})</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                ) : null}

                <div className="flex justify-between text-slate-600">
                  <span>Excise Duty (20%)</span>
                  <span>{formatCurrency(exciseDuty)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Happiness Pledge</span>
                  <span>{formatCurrency(trustFee)}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm font-bold text-slate-950">Estimated total</span>
                <span className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          ) : null}
        </motion.div>
      ) : null}

      <motion.div
        className="rounded-[1.75rem] border border-sky-200 bg-sky-50 p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <div>
            <h4 className="text-sm font-bold text-slate-950">
              What happens next?
            </h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Your booking is created as pending, the provider is notified, and
              you will see the request in your bookings after confirmation.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
