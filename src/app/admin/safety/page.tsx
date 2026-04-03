import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasRole } from "@/lib/auth/roles";
import { getActiveSOSAdmin } from "@/app/actions/safety";
import ActiveSOSAlertsPanel from "@/components/admin/ActiveSOSAlertsPanel";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSafetyPage() {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    redirect("/dashboard");
  }

  const alerts = await getActiveSOSAdmin();

  const serializedAlerts = alerts.map((alert) => ({
    id: alert.id,
    latitude: alert.latitude,
    longitude: alert.longitude,
    locationDetails: alert.locationDetails,
    triggeredAt: alert.triggeredAt.toISOString(),
    user: {
      id: alert.user.id,
      name: alert.user.name,
      email: alert.user.email,
      phone: alert.user.phone,
    },
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-red-100 p-2 text-red-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Safety Ops</h1>
            <p className="mt-1 text-sm text-slate-600">
              Monitor active SOS incidents and resolve them after verification
              with affected users.
            </p>
          </div>
        </div>
      </div>

      <ActiveSOSAlertsPanel alerts={serializedAlerts} />
    </div>
  );
}
