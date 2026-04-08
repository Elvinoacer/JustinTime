"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  BadgeCheck,
  Sparkles,
  ShieldCheck,
  HardDrive,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { payOnboardingFee } from "@/app/actions/revenue";

interface OnboardingAccessNoticeProps {
  userName: string;
  amount?: number;
  storageKey?: string;
}

export function OnboardingAccessNotice({
  userName,
  amount = 500,
  storageKey,
}: OnboardingAccessNoticeProps) {
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setIsReady(true);
      return;
    }

    try {
      const stored = window.sessionStorage.getItem(storageKey);
      setDismissed(stored === "hidden");
    } catch {
      setDismissed(false);
    } finally {
      setIsReady(true);
    }
  }, [storageKey]);

  const handleActivate = async () => {
    setGatewayLoading(true);
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
      setGatewayLoading(false);
    }
  };

  const handlePayFromWallet = async () => {
    setWalletLoading(true);
    try {
      const result = await payOnboardingFee();
      if (!result.success) {
        throw new Error(result.error || "Unable to deduct onboarding fee");
      }

      toast.success("Payment recorded. Verification review can now continue.");
      window.location.href = "/dashboard/verification";
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to process wallet payment";
      toast.error(message);
      setWalletLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (!storageKey) return;
    try {
      window.sessionStorage.setItem(storageKey, "hidden");
    } catch {
      // Ignore storage errors and still dismiss for this session.
    }
  };

  if (!isReady || dismissed) {
    return null;
  }

  return (
    <section className="mb-3 sm:mb-6 rounded-xl sm:rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,#fffdf5_0%,#fff8e8_52%,#fff4e4_100%)] p-3 sm:p-5">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              Verification Access Pending
            </div>
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 leading-5 sm:leading-7">
              {userName}, complete onboarding payment to continue verification
            </h3>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-amber-200 bg-white text-amber-500 transition hover:bg-amber-50 hover:text-amber-700"
            aria-label="Dismiss verification notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 sm:space-y-3">
            <p className="max-w-3xl text-xs sm:text-sm leading-5 text-gray-700">
              Pay a one-time activation of KES {amount}. Payment unlocks your
              verification processing path, but Trust and Safety still performs
              the final verification decision.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs text-gray-700">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                Eligible for verification review
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1">
                <HardDrive className="h-3.5 w-3.5 text-blue-600" />
                Higher media upload allowance
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                Priority support treatment
              </span>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
            <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-[11px] sm:text-xs font-semibold text-amber-700">
              One-time fee
            </span>
            <button
              onClick={handlePayFromWallet}
              disabled={walletLoading || gatewayLoading}
              className="inline-flex w-full sm:w-auto h-10 sm:h-auto items-center justify-center gap-2 rounded-xl border border-emerald-600 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {walletLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Pay from Wallet"
              )}
            </button>
            <button
              onClick={handleActivate}
              disabled={gatewayLoading || walletLoading}
              className="inline-flex w-full sm:w-auto h-10 sm:h-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {gatewayLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Pay with M-Pesa (STK Push)"
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
