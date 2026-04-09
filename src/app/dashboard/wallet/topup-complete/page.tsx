import { Suspense } from "react";
import { PaymentVerificationStatus } from "@/components/payments/PaymentVerificationStatus";

export default function TopupCompletePage() {
  return (
    <div className="min-h-[70vh] px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10">
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-6">
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              Confirming Your Wallet Top-up
            </h1>
            <p className="mt-2 text-sm text-slate-600">Loading status...</p>
          </div>
        }
      >
        <PaymentVerificationStatus
          defaultKind="wallet_topup"
          defaultReturnTo="/dashboard/wallet"
        />
      </Suspense>
    </div>
  );
}
