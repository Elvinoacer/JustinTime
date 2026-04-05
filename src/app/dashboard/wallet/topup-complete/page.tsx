"use client";

import { TopUpCompletionStatus } from "@/components/wallet/TopUpCompletionStatus";

export default function TopupCompletePage() {
  return (
    <div className="min-h-[70vh] px-4 py-10">
      <TopUpCompletionStatus
        walletPath="/dashboard/wallet"
        heading="Confirming Your Wallet Top-up"
      />
    </div>
  );
}
