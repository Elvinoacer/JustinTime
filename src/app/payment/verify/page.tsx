import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Loader2 } from "lucide-react";
import { PaymentVerificationStatus } from "@/components/payments/PaymentVerificationStatus";

export const dynamic = "force-dynamic";

export default async function PaymentVerifyPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-[70vh] px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10">
      <Suspense
        fallback={
          <div className="mx-auto flex max-w-2xl items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm sm:p-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        }
      >
        <PaymentVerificationStatus />
      </Suspense>
    </div>
  );
}
