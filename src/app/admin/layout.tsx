import React from "react";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import AdminLayoutShell from "@/components/admin/AdminLayoutShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || !hasRole(session.user, "ADMIN")) {
    redirect("/admin/login");
  }

  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
