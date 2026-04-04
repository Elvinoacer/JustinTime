import { Suspense } from "react";
import VerifyRequestClient from "./VerifyRequestClient";

export default function VerifyRequestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyRequestClient />
    </Suspense>
  );
}
