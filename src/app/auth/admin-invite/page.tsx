import { Suspense } from "react";
import AdminInviteClient from "@/app/auth/admin-invite/AdminInviteClient";

export default function AdminInvitePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminInviteClient />
    </Suspense>
  );
}
