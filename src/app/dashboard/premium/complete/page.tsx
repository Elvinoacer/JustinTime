import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PaymentVerificationStatus } from "@/components/payments/PaymentVerificationStatus";

export default function PremiumCompletePage() {
  return (
    <div className="min-h-[70vh] px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10">
      <Suspense
        fallback={
          <div className="mx-auto flex max-w-2xl items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm sm:p-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        }
      >
        <PaymentVerificationStatus
          defaultKind="subscription"
          defaultReturnTo="/dashboard/premium"
        />
      </Suspense>
    </div>
  );
}
