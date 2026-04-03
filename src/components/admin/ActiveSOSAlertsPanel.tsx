"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  MapPin,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { resolveSOSByAdmin } from "@/app/actions/safety";

type ActiveSOSAlert = {
  id: string;
  latitude: number;
  longitude: number;
  locationDetails: string | null;
  triggeredAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
};

interface ActiveSOSAlertsPanelProps {
  alerts: ActiveSOSAlert[];
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActiveSOSAlertsPanel({
  alerts,
}: ActiveSOSAlertsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleResolve = (alertId: string) => {
    setResolvingId(alertId);
    startTransition(async () => {
      const result = await resolveSOSByAdmin(alertId);
      if (!result.success) {
        toast.error(result.error || "Failed to resolve SOS alert");
        setResolvingId(null);
        return;
      }

      toast.success("SOS alert marked as resolved.");
      setResolvingId(null);
      router.refresh();
    });
  };

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400" />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">
          No active SOS incidents
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          All current SOS alerts are resolved.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="rounded-2xl border border-red-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">Active SOS Incident</span>
            </div>
            <span className="text-xs font-mono text-red-700">
              #{alert.id.slice(-8).toUpperCase()}
            </span>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                User
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {alert.user.name || "Unknown user"}
              </p>
              <p className="text-xs text-slate-500">
                {alert.user.email || "No email"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-xs text-slate-500">Triggered</p>
                <p className="mt-1 font-medium text-slate-800">
                  {formatDate(alert.triggeredAt)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-xs text-slate-500">Coordinates</p>
                <p className="mt-1 font-medium text-slate-800">
                  {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                </p>
              </div>
            </div>

            {alert.locationDetails ? (
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Context</p>
                <p className="text-sm text-slate-700">
                  {alert.locationDetails}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <a
                href={`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                <MapPin className="h-3.5 w-3.5" />
                Open map
              </a>

              {alert.user.phone ? (
                <a
                  href={`tel:${alert.user.phone}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Call user
                </a>
              ) : null}

              <button
                type="button"
                onClick={() => handleResolve(alert.id)}
                disabled={isPending && resolvingId === alert.id}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isPending && resolvingId === alert.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                Mark resolved
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
