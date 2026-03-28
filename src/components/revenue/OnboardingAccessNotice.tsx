"use client";

import { useState } from "react";
import {
  Loader2,
  BadgeCheck,
  Sparkles,
  ShieldCheck,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";

interface OnboardingAccessNoticeProps {
  userName: string;
  amount?: number;
}

export function OnboardingAccessNotice({
  userName,
  amount = 500,
}: OnboardingAccessNoticeProps) {
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    try {
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
        toast.info("Redirecting to secure checkout...");
        window.location.href = data.checkoutUrl;
        return;
      }

      throw new Error("No checkout URL received");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unable to start activation";
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 p-4 sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <Sparkles className="h-3.5 w-3.5" />
            Verification Access Pending
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {userName}, unlock your verified provider privileges
          </h3>
          <p className="text-sm text-gray-700 max-w-3xl">
            Pay a one-time activation of KES {amount} to instantly enable
            verified visibility, expanded media storage for profile and service
            uploads, and priority support handling.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-gray-700">
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
              Verified badge + better marketplace visibility
            </span>
            <span className="inline-flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-blue-600" />
              Higher media upload allowance
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
              Priority support treatment
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <button
            onClick={handleActivate}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Activate Verification"
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
