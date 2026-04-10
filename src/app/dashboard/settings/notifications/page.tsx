"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSettings, useUpdateSettings } from "@/lib/api/hooks/useSettings";

type NotificationFormState = {
  emailJobAlerts: boolean;
  emailMessages: boolean;
  emailBookings: boolean;
  emailReviews: boolean;
  emailMarketing: boolean;
  pushNotifications: boolean;
  allowMarketing: boolean;
  allowMessages: boolean;
  allowBookingUpdates: boolean;
};

const DEFAULT_STATE: NotificationFormState = {
  emailJobAlerts: true,
  emailMessages: true,
  emailBookings: true,
  emailReviews: true,
  emailMarketing: false,
  pushNotifications: true,
  allowMarketing: true,
  allowMessages: true,
  allowBookingUpdates: true,
};

export default function DashboardNotificationSettingsPage() {
  const { data: settingsData, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [formState, setFormState] =
    useState<NotificationFormState>(DEFAULT_STATE);

  useEffect(() => {
    const incoming = settingsData?.settings?.notifications;
    if (!incoming) {
      return;
    }

    setFormState({
      ...DEFAULT_STATE,
      ...incoming,
    });
  }, [settingsData]);

  const updateKey = (key: keyof NotificationFormState, checked: boolean) => {
    setFormState((previous) => ({
      ...previous,
      [key]: checked,
    }));
  };

  const saveChanges = async () => {
    try {
      await updateSettings.mutateAsync({ notifications: formState });
      toast.success("Notification preferences updated");
    } catch {
      toast.error("Failed to update notification preferences");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-6 p-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Notification Settings
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Control which notifications you receive and which categories are
          muted.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          In-App Categories
        </h2>
        <div className="mt-4 space-y-3">
          {[
            {
              key: "allowMessages",
              label: "Messages",
              description: "Show new message notifications in-app",
            },
            {
              key: "allowBookingUpdates",
              label: "Booking updates",
              description: "Show booking and negotiation updates in-app",
            },
            {
              key: "allowMarketing",
              label: "Marketing",
              description: "Show promotional and campaign notifications in-app",
            },
          ].map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 hover:bg-gray-100 touch-manipulation"
            >
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                checked={formState[item.key as keyof NotificationFormState]}
                onChange={(event) =>
                  updateKey(
                    item.key as keyof NotificationFormState,
                    event.target.checked,
                  )
                }
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {item.label}
                </p>
                <p className="text-xs text-gray-600">{item.description}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Delivery Channels
        </h2>
        <div className="mt-4 space-y-3">
          {[
            {
              key: "pushNotifications",
              label: "Push notifications",
              description: "Receive browser push alerts",
            },
            {
              key: "emailMessages",
              label: "Email: Messages",
              description: "Receive message updates by email",
            },
            {
              key: "emailBookings",
              label: "Email: Booking updates",
              description: "Receive booking updates by email",
            },
            {
              key: "emailJobAlerts",
              label: "Email: Job alerts",
              description: "Receive job opportunity updates by email",
            },
            {
              key: "emailReviews",
              label: "Email: Reviews",
              description: "Receive review notifications by email",
            },
            {
              key: "emailMarketing",
              label: "Email: Marketing",
              description: "Receive campaigns and promotional offers by email",
            },
          ].map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 hover:bg-gray-100 touch-manipulation"
            >
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                checked={formState[item.key as keyof NotificationFormState]}
                onChange={(event) =>
                  updateKey(
                    item.key as keyof NotificationFormState,
                    event.target.checked,
                  )
                }
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {item.label}
                </p>
                <p className="text-xs text-gray-600">{item.description}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveChanges}
          disabled={updateSettings.isPending}
          className="w-full sm:w-auto rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 touch-manipulation disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updateSettings.isPending ? "Saving..." : "Save preferences"}
        </button>
      </div>
    </motion.div>
  );
}
