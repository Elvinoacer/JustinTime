import { Suspense } from "react";
import { TopUpCompletionStatus } from "@/components/wallet/TopUpCompletionStatus";

export default function ClientTopupCompletePage() {
  return (
    <div className="min-h-[70vh] px-4 py-10">
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">
              Confirming Your Wallet Top-up
            </h1>
            <p className="mt-2 text-sm text-slate-600">Loading status...</p>
          </div>
        }
      >
        <TopUpCompletionStatus
          walletPath="/client/wallet"
          heading="Confirming Your Wallet Top-up"
        />
      </Suspense>
    </div>
  );
}
