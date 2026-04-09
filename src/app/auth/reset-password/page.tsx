import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div
            className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600"
            aria-label="Loading reset password page"
          />
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
