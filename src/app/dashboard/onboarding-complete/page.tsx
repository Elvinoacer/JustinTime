"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

function OnboardingCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSettled, setIsSettled] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);

  const apiRef =
    searchParams.get("apiRef") ||
    searchParams.get("api_ref") ||
    searchParams.get("reference");
  const checkoutId =
    searchParams.get("checkoutId") || searchParams.get("checkout_id");

  useEffect(() => {
    let cancelled = false;

    const verifySettlement = async () => {
      try {
        const statusUrl = new URL(
          "/api/onboarding-fee/status",
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
          return;
        }

        const data = await response.json();
        if (cancelled) return;

        if (data.isSettled) {
          setIsSettled(true);
          toast.success(
            "Payment confirmed. Your verification review can now proceed.",
          );

          setTimeout(() => {
            router.replace("/dashboard/verification");
          }, 1500);
          return;
        }

        setPollAttempts((current) => current + 1);
      } catch {
        setPollAttempts((current) => current + 1);
      }
    };

    verifySettlement();
    const interval = setInterval(verifySettlement, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiRef, checkoutId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-emerald-100 p-4 rounded-full mb-6">
        <CheckCircle className="h-16 w-16 text-emerald-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Payment Processing
      </h1>
      <p className="text-gray-600 mb-6">
        We are confirming your onboarding payment through secure webhooks.
        Verification status will only change after Trust and Safety review.
      </p>
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>
          {isSettled
            ? "Payment confirmed. Redirecting to verification..."
            : "Waiting for payment confirmation..."}
        </span>
      </div>
      {!isSettled && pollAttempts > 10 && (
        <button
          onClick={() => router.replace("/dashboard")}
          className="mt-6 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Continue to Dashboard
        </button>
      )}
    </div>
  );
}

export default function OnboardingCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <OnboardingCompleteContent />
    </Suspense>
  );
}
