import DashboardLayoutClient from "@/components/dashboard/DashboardLayoutClient";

// Force dynamic rendering for all dashboard routes to avoid prerender issues
// with session-dependent components
export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
