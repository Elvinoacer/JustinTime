"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";

export default function ClientTopupCompletePage() {
  const router = useRouter();

  useEffect(() => {
    toast.info(
      "Payment received. We are confirming settlement with the payment gateway.",
      {
        duration: 5000,
      },
    );

    const timeout = setTimeout(() => {
      router.replace("/client/wallet");
    }, 2000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-emerald-100 p-4 rounded-full mb-6">
        <Wallet className="h-16 w-16 text-emerald-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Top-up Processing
      </h1>
      <p className="text-gray-600 mb-6">
        We are waiting for secure webhook confirmation. Your wallet balance will
        update automatically.
      </p>
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Redirecting to wallet...</span>
      </div>
    </div>
  );
}
