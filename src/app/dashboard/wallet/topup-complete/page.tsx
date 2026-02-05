"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle, Wallet } from "lucide-react";

export default function TopupCompletePage() {
  const router = useRouter();

  useEffect(() => {
    // Show success message
    toast.success("💰 Wallet top-up successful!", {
      duration: 5000,
    });

    // Redirect to wallet page after a short delay
    const timeout = setTimeout(() => {
      router.replace("/dashboard/earnings");
    }, 2000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-emerald-100 p-4 rounded-full mb-6">
        <div className="relative">
          <Wallet className="h-16 w-16 text-emerald-600" />
          <CheckCircle className="h-6 w-6 text-emerald-600 absolute -bottom-1 -right-1 bg-white rounded-full" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Top-up Successful!
      </h1>
      <p className="text-gray-600 mb-6">
        Your wallet has been credited. The balance will be updated shortly.
      </p>
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Redirecting to wallet...</span>
      </div>
    </div>
  );
}
