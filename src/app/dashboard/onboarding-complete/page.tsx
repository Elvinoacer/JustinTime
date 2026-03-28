"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

export default function OnboardingCompletePage() {
  const router = useRouter();

  useEffect(() => {
    // Show success message
    toast.success(
      "🎉 Payment successful! You are now verified with full provider privileges.",
      {
        duration: 5000,
      },
    );

    // Redirect to dashboard after a short delay
    const timeout = setTimeout(() => {
      router.replace("/dashboard");
    }, 2000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-emerald-100 p-4 rounded-full mb-6">
        <CheckCircle className="h-16 w-16 text-emerald-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Verification Activated!
      </h1>
      <p className="text-gray-600 mb-6">
        Your account is now auto-verified with enhanced visibility, expanded
        upload capacity, and priority support.
      </p>
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Redirecting to dashboard...</span>
      </div>
    </div>
  );
}
