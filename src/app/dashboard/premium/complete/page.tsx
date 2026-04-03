"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function PremiumCompletePage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const pollStatus = async () => {
      try {
        const response = await fetch("/api/subscription/status", {
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
  }, [router]);

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
            : "Waiting for subscription confirmation..."}
        </span>
      </div>
      {!isActivated && attempts > 10 && (
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
