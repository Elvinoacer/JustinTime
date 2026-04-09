"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

function PremiumCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [attempts, setAttempts] = useState(0);
  const [isActivated, setIsActivated] = useState(false);
  const [failureReason, setFailureReason] = useState<string | null>(null);

  const apiRef =
    searchParams.get("apiRef") ||
    searchParams.get("api_ref") ||
    searchParams.get("reference");
  const checkoutId =
    searchParams.get("checkoutId") || searchParams.get("checkout_id");

  useEffect(() => {
    if (failureReason) {
      return;
    }

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const statusUrl = new URL(
          "/api/subscription/status",
          window.location.origin,
        );

        if (apiRef) {
          statusUrl.searchParams.set("apiRef", apiRef);
        }

        if (checkoutId) {
          statusUrl.searchParams.set("checkoutId", checkoutId);
        }

        const response = await fetch(statusUrl.toString(), {
          cache: "no-store",
        });

        if (!response.ok) {
          setAttempts((current) => current + 1);
          return;
        }

        const data = await response.json();
        if (cancelled) return;

        if (data?.subscription?.isPremium) {
          setIsActivated(true);
          toast.success("Subscription activated successfully.");
          setTimeout(() => {
            router.replace("/dashboard/premium");
          }, 1500);
          return;
        }

        const latestAttempt = data.latestAttempt || data.pendingPayment;
        const latestStatus = String(latestAttempt?.status || "").toUpperCase();
        const isTerminalFailure = ["FAILED", "CANCELLED", "REVERSED"].includes(
          latestStatus,
        );

        if (isTerminalFailure) {
          setFailureReason(
            latestAttempt?.failureReason ||
              `Subscription payment ${latestStatus.toLowerCase()}.`,
          );
          return;
        }

        setAttempts((current) => current + 1);
      } catch {
        setAttempts((current) => current + 1);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiRef, checkoutId, router, failureReason]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 rounded-full bg-amber-100 p-4">
        <Sparkles className="h-12 w-12 text-amber-600" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Activating Subscription
      </h1>
      <p className="mb-6 max-w-md text-sm text-gray-600">
        We are confirming your payment. Your plan will reflect on your account
        once the webhook is settled.
      </p>
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>
          {isActivated
            ? "Activation confirmed. Redirecting..."
            : failureReason
              ? "Subscription activation failed."
              : "Waiting for subscription confirmation..."}
        </span>
      </div>
      {failureReason ? (
        <p className="mt-3 max-w-md rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {failureReason}
        </p>
      ) : null}
      {!isActivated && (attempts > 10 || Boolean(failureReason)) && (
        <button
          onClick={() => router.replace("/dashboard/premium")}
          className="mt-6 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Return to Premium Page
        </button>
      )}
    </div>
  );
}

export default function PremiumCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <PremiumCompleteContent />
    </Suspense>
  );
}
