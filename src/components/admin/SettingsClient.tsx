"use client";

import { updateSystemSetting } from "@/app/actions/admin";
import EnhancedCategoryManagement from "@/components/admin/EnhancedCategoryManagement";
import EnhancedSystemSettings from "@/components/admin/EnhancedSystemSettings";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Check,
  Copy,
  Layers,
  Loader2,
  Settings,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useFcmToken } from "@/lib/hooks/useFcmToken";

interface SettingsClientProps {
  categories: any[];
  systemSettings: any[];
}

export default function SettingsClient({
  categories,
  systemSettings,
}: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("categories");
  const [isSavingNotifications, startSavingNotifications] = useTransition();
  const [notificationStatusMessage, setNotificationStatusMessage] = useState<
    string | null
  >(null);

  const readBooleanSetting = (key: string, fallback: boolean) => {
    const setting = systemSettings.find((item) => item.key === key);
    if (!setting) {
      return fallback;
    }

    if (typeof setting.value === "boolean") {
      return setting.value;
    }

    if (typeof setting.value === "string") {
      const normalized = setting.value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }

    if (typeof setting.value === "number") {
      return setting.value !== 0;
    }

    return fallback;
  };

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(
    readBooleanSetting("email_notifications_enabled", true),
  );
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(
    readBooleanSetting("sms_alerts_enabled", false),
  );

  const persistNotificationToggle = (
    key: "email_notifications_enabled" | "sms_alerts_enabled",
    nextValue: boolean,
    previousValue: boolean,
    setLocalValue: (value: boolean) => void,
  ) => {
    setNotificationStatusMessage(null);
    setLocalValue(nextValue);

    startSavingNotifications(async () => {
      const result = await updateSystemSetting(
        key,
        nextValue,
        key === "email_notifications_enabled"
          ? "Enable or disable email-based admin notifications"
          : "Enable or disable SMS-based admin alerts",
      );

      if (!result.success) {
        setLocalValue(previousValue);
        setNotificationStatusMessage(
          result.error || "Failed to save notification setting",
        );
        return;
      }

      setNotificationStatusMessage("Notification settings saved.");
      router.refresh();
    });
  };

  const tabs = [
    {
      id: "categories",
      label: "Categories",
      shortLabel: "Categories",
      icon: Layers,
      description: "Manage service categories",
      group: "Live configuration",
    },
    {
      id: "system",
      label: "System",
      shortLabel: "System",
      icon: Settings,
      description: "Platform-wide settings",
      group: "Live configuration",
    },
    {
      id: "invites",
      label: "Admin Invites",
      shortLabel: "Invites",
      icon: UserPlus,
      description: "Invite trusted admins",
      group: "Operational tools",
    },
    {
      id: "notifications",
      label: "Notifications",
      shortLabel: "Notifications",
      icon: Bell,
      description: "Push notification settings",
      group: "Diagnostics",
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
      <div className="max-w-400 mx-auto p-3 xs:p-4 sm:p-6 space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="px-1">
          <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2 leading-tight">
            Platform Settings
          </h1>
          <p className="text-xs xs:text-sm sm:text-base text-slate-600 leading-relaxed">
            Manage your application configuration and preferences
          </p>
        </div>

        {/* Tabs Navigation - Mobile Horizontal Scroll */}
        <div className="overflow-x-auto pb-2 -mx-3 xs:-mx-4 sm:mx-0 px-3 xs:px-4 sm:px-0">
          <div className="flex gap-2 xs:gap-3 sm:gap-4 min-w-max sm:min-w-0 sm:grid sm:grid-cols-2 lg:grid-cols-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative p-3 xs:p-4 rounded-xl sm:rounded-2xl border text-left transition-all duration-300 shrink-0 w-70 xs:w-[300px] sm:w-auto ${
                    isActive
                      ? "bg-white border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
                      : "bg-white border-slate-200 hover:border-emerald-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-3 xs:gap-0 xs:flex-col xs:items-start">
                    <div
                      className={`w-8 h-8 xs:w-10 xs:h-10 rounded-lg xs:rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                        isActive
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600"
                      }`}
                    >
                      <Icon className="w-4 h-4 xs:w-5 xs:h-5" />
                    </div>
                    <div className="xs:mt-3 min-w-0">
                      <h3
                        className={`font-bold mb-1 text-sm xs:text-base ${
                          isActive ? "text-slate-900" : "text-slate-700"
                        }`}
                      >
                        <span className="hidden xs:inline">{tab.label}</span>
                        <span className="xs:hidden">{tab.shortLabel}</span>
                      </h3>
                      <span className="hidden xs:inline-flex mb-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {tab.group}
                      </span>
                      <p className="text-xs text-slate-500 line-clamp-2 hidden xs:block">
                        {tab.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl border border-slate-200 shadow-sm p-4 xs:p-5 sm:p-6 md:p-8 min-h-100 sm:min-h-125 lg:min-h-150">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "categories" && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3 pb-4 sm:pb-6 border-b border-slate-100">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                        Category Management
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500">
                        Organize your services into logical categories
                      </p>
                    </div>
                  </div>
                  <EnhancedCategoryManagement categories={categories} />
                </div>
              )}

              {activeTab === "system" && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3 pb-4 sm:pb-6 border-b border-slate-100">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                        System Configuration
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500">
                        Global settings affecting platform behavior
                      </p>
                    </div>
                  </div>
                  <EnhancedSystemSettings settings={systemSettings} />
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3 pb-4 sm:pb-6 border-b border-slate-100">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                        Notification Settings
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500">
                        Manage push notifications and alerts
                      </p>
                    </div>
                  </div>

                  <div className="p-4 xs:p-5 sm:p-6 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">
                      Push Notifications
                    </h3>
                    <PushNotificationToggle />
                  </div>

                  {/* Additional Mobile-friendly Notification Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-4 bg-white rounded-lg sm:rounded-xl border border-slate-200">
                      <h4 className="font-medium text-slate-900 text-sm sm:text-base mb-2">
                        Email Notifications
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 mb-3">
                        Receive important updates via email
                      </p>
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Enabled</span>
                        <div className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={emailNotificationsEnabled}
                            onChange={(event) =>
                              persistNotificationToggle(
                                "email_notifications_enabled",
                                event.target.checked,
                                emailNotificationsEnabled,
                                setEmailNotificationsEnabled,
                              )
                            }
                            disabled={isSavingNotifications}
                          />
                          <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </div>
                      </label>
                    </div>

                    <div className="p-4 bg-white rounded-lg sm:rounded-xl border border-slate-200">
                      <h4 className="font-medium text-slate-900 text-sm sm:text-base mb-2">
                        SMS Alerts
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 mb-3">
                        Critical alerts via SMS
                      </p>
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Enabled</span>
                        <div className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={smsAlertsEnabled}
                            onChange={(event) =>
                              persistNotificationToggle(
                                "sms_alerts_enabled",
                                event.target.checked,
                                smsAlertsEnabled,
                                setSmsAlertsEnabled,
                              )
                            }
                            disabled={isSavingNotifications}
                          />
                          <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {notificationStatusMessage ? (
                    <p
                      className={`text-sm ${
                        notificationStatusMessage.includes("saved")
                          ? "text-emerald-700"
                          : "text-red-600"
                      }`}
                    >
                      {notificationStatusMessage}
                    </p>
                  ) : null}
                </div>
              )}

              {activeTab === "invites" && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3 pb-4 sm:pb-6 border-b border-slate-100">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                        Admin Invite Management
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500">
                        Generate one-time admin invite links for verified users
                      </p>
                    </div>
                  </div>

                  <AdminInviteManager />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function AdminInviteManager() {
  const [email, setEmail] = useState("");
  const [expiryDays, setExpiryDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [invite, setInvite] = useState<{
    inviteUrl: string;
    email: string;
    expiresAt: string;
  } | null>(null);

  const createInvite = async () => {
    setError(null);
    setCopied(false);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), expiryDays }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        inviteUrl?: string;
        email?: string;
        expiresAt?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create invite");
      }

      setInvite({
        inviteUrl: payload.inviteUrl || "",
        email: payload.email || email.trim(),
        expiresAt: payload.expiresAt || new Date().toISOString(),
      });
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Could not create invite";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInviteUrl = async () => {
    if (!invite?.inviteUrl) return;

    try {
      await navigator.clipboard.writeText(invite.inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy invite link");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
              Invite email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
              Expires in
            </label>
            <select
              value={expiryDays}
              onChange={(event) => setExpiryDays(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={createInvite}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating invite...
            </span>
          ) : (
            "Generate admin invite"
          )}
        </button>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      {invite ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-6 space-y-3">
          <p className="text-sm font-semibold text-emerald-900">
            Invite ready for {invite.email}
          </p>
          <p className="text-xs text-emerald-700">
            Expires on {new Date(invite.expiresAt).toLocaleString()}
          </p>
          <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 break-all">
            {invite.inviteUrl}
          </div>
          <button
            type="button"
            onClick={copyInviteUrl}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied" : "Copy invite link"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PushNotificationToggle() {
  const { token, requestPermission, notificationPermission } = useFcmToken();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (!token && notificationPermission !== "denied") {
      setIsLoading(true);
      await requestPermission();
      setIsLoading(false);
    }
  };

  const isEnabled = !!token;

  return (
    <div className="flex flex-col xs:flex-row xs:items-center justify-between p-4 bg-white rounded-lg border border-slate-200 gap-3 xs:gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-slate-900 flex items-center gap-2 text-sm xs:text-base">
          Enable Notifications
          {isEnabled && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
              Active
            </span>
          )}
        </h3>
        <p className="text-xs xs:text-sm text-slate-600 mt-1 leading-relaxed">
          {isEnabled
            ? "You are receiving real-time updates on this device."
            : notificationPermission === "denied"
              ? "Notifications are blocked in your browser settings."
              : "Enable to receive real-time updates."}
        </p>
      </div>
      <label
        className={`relative inline-flex items-center cursor-pointer shrink-0 ${
          isLoading ? "opacity-50" : ""
        }`}
      >
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isEnabled}
          onChange={handleToggle}
          disabled={
            isEnabled || notificationPermission === "denied" || isLoading
          }
        />
        <div
          className={`w-14 h-7 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-emerald-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-1 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600 ${
            isEnabled || notificationPermission === "denied"
              ? "cursor-default"
              : ""
          }`}
        ></div>
      </label>
    </div>
  );
}
