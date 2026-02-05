"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, CheckCircle2, CreditCard, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

interface OnboardingFeeModalProps {
  isOpen: boolean;
  userName: string;
}

export function OnboardingFeeModal({ isOpen, userName }: OnboardingFeeModalProps) {
  const [loading, setLoading] = useState(false);

  const handlePayFee = async () => {
    setLoading(true);
    try {
      // Call API to initiate Intasend payment
      const response = await fetch("/api/onboarding-fee/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate payment");
      }

      if (data.checkoutUrl) {
        // Redirect to Intasend checkout page
        toast.info("Redirecting to payment page...");
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err: any) {
      console.error("Payment initiation failed:", err);
      toast.error(err.message || "Something went wrong. Please try again.");
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
        className="fixed inset-0 bg-emerald-950/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative text-center"
        >
          <div className="bg-emerald-600 p-6 pb-12 flex flex-col items-center">
             <div className="bg-white/20 p-3 rounded-full mb-3 ring-4 ring-white/10">
                <ShieldCheck className="h-10 w-10 text-white" />
             </div>
             <h2 className="text-2xl font-bold text-white">Activate Your Account</h2>
             <p className="text-emerald-100 mt-1">Hello, {userName}!</p>
          </div>

          <div className="px-6 -mt-8 relative z-10">
             <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 pb-8">
                <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                  To ensure quality and trust on our platform, verified providers are required to pay a one-time activation fee.
                </p>

                <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-left">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <span className="text-sm font-medium text-gray-700">Receive unlimited job leads</span>
                    </div>
                    <div className="flex items-center gap-3 text-left">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <span className="text-sm font-medium text-gray-700">Get a "Verified" badge</span>
                    </div>
                    <div className="flex items-center gap-3 text-left">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <span className="text-sm font-medium text-gray-700">Access premium support</span>
                    </div>
                </div>

                <div className="bg-gray-50 py-3 rounded-lg mb-4 border border-gray-100">
                    <span className="text-sm text-gray-500">One-time Fee</span>
                    <div className="text-3xl font-bold text-emerald-700">KES 500</div>
                </div>

                {/* Payment methods indicator */}
                <div className="flex items-center justify-center gap-4 mb-4 text-gray-500">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Smartphone className="h-4 w-4" />
                    <span>M-Pesa</span>
                  </div>
                  <div className="w-px h-4 bg-gray-300" />
                  <div className="flex items-center gap-1.5 text-xs">
                    <CreditCard className="h-4 w-4" />
                    <span>Card</span>
                  </div>
                </div>

                <button
                  onClick={handlePayFee}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    "Pay & Activate Now"
                  )}
                </button>

                <p className="text-xs text-gray-400 mt-3">
                  Secure payment powered by IntaSend
                </p>
             </div>
          </div>
          <div className="h-6"></div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

