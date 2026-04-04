"use client";

import { toggleTwoFactor } from "@/app/actions/twoFactor";
import { ConfirmModal, PromptModal } from "@/components/Modal";
import { useSettings, useUpdateSettings } from "@/lib/api/hooks/useSettings";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Tab =
  | "account"
  | "security"
  | "notifications"
  | "privacy"
  | "verification"
  | "tax";
import BackgroundCheckForm from "@/components/provider/BackgroundCheckForm";
import { getProviderBackgroundCheck } from "@/app/actions/verification";
import TaxSettings from "@/components/dashboard/TaxSettings";
import { getTaxProfile, getTaxFilings } from "@/app/actions/tax";
import { useProviderProfile } from "@/lib/api/hooks/useProvider";

import { useFcmToken } from "@/lib/hooks/useFcmToken";

// PushNotificationToggle Component
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
    <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200">
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
          Push Notifications
          {isEnabled && (
            <span className="px-1.5 sm:px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
              Active
            </span>
          )}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
          {isEnabled
            ? "You are receiving real-time updates on this device."
            : notificationPermission === "denied"
              ? "Notifications are blocked in your browser settings."
              : "Enable to receive real-time updates on orders and messages."}
        </p>
      </div>
      <label
        className={`relative inline-flex items-center cursor-pointer flex-shrink-0 ${
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
          className={`w-12 h-6 sm:w-14 sm:h-7 bg-gray-300 rounded-full peer peer-focus:ring-2 sm:peer-focus:ring-4 peer-focus:ring-emerald-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 sm:after:h-6 sm:after:w-6 after:transition-all peer-checked:bg-emerald-600 ${
            isEnabled || notificationPermission === "denied"
              ? "cursor-default"
              : ""
          }`}
        ></div>
      </label>
    </div>
  );
}

// TwoFactorToggle Component
function TwoFactorToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const newState = !enabled;
      await toggleTwoFactor(newState);
      setEnabled(newState);
      toast.success(
        newState
          ? "Two-Factor Authentication enabled!"
          : "Two-Factor Authentication disabled.",
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to update 2FA settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <label
      className={`relative inline-flex items-center cursor-pointer ${
        isLoading ? "opacity-50" : ""
      }`}
    >
      <input
        type="checkbox"
        className="sr-only peer"
        checked={enabled}
        onChange={handleToggle}
        disabled={isLoading}
      />
      <div
        className={`w-12 h-6 sm:w-14 sm:h-7 bg-gray-300 rounded-full peer peer-focus:ring-2 sm:peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 sm:after:h-6 sm:after:w-6 after:transition-all peer-checked:bg-blue-600 ${
          isLoading ? "cursor-not-allowed" : ""
        }`}
      ></div>
    </label>
  );
}

const SettingsPage = () => {
  const router = useRouter();
  const { data: settingsData, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const isProvider = settingsData?.settings?.account?.role === "PROVIDER";
  const { data: providerProfileData } = useProviderProfile(isProvider);

  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  // Form states
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notifications, setNotifications] = useState({
    emailJobAlerts: true,
    emailMessages: true,
    emailBookings: true,
    emailReviews: true,
    emailMarketing: false,
    pushNotifications: true,
    allowMarketing: true,
    allowMessages: true,
    allowBookingUpdates: true,
  });
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    searchable: true,
    showLocation: true,
    allowMessages: true,
  });

  // Deletion tracking
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");

  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReasonPrompt, setShowReasonPrompt] = useState(false);

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);

  // Update form states when data loads
  useEffect(() => {
    if (settingsData?.settings) {
      setPhone(settingsData.settings.account.phone || "");
      setNotifications(settingsData.settings.notifications);
      setPrivacy(settingsData.settings.privacy);
    }
  }, [settingsData]);

  // Background Check State
  const [backgroundCheck, setBackgroundCheck] = useState<any>(null);
  const [loadingCheck, setLoadingCheck] = useState(false);

  useEffect(() => {
    if (
      activeTab === "verification" &&
      settingsData?.settings?.account?.role === "PROVIDER"
    ) {
      const fetchCheck = async () => {
        setLoadingCheck(true);
        try {
          const result = await getProviderBackgroundCheck();
          setBackgroundCheck(result);
        } catch (error) {
          console.error("Failed to fetch background check:", error);
        } finally {
          setLoadingCheck(false);
        }
      };
      fetchCheck();
    }
  }, [activeTab, settingsData]);

  // Tax Profile State
  const [taxProfile, setTaxProfile] = useState<any>(null);
  const [taxFilings, setTaxFilings] = useState<any[]>([]);
  const [loadingTax, setLoadingTax] = useState(false);

  useEffect(() => {
    if (
      activeTab === "tax" &&
      settingsData?.settings?.account?.role === "PROVIDER"
    ) {
      const fetchTaxData = async () => {
        setLoadingTax(true);
        try {
          const [profile, filings] = await Promise.all([
            getTaxProfile(),
            getTaxFilings(),
          ]);
          setTaxProfile(profile || { kraVerified: false });
          setTaxFilings(filings || []);
        } catch (error) {
          console.error("Failed to fetch tax data:", error);
        } finally {
          setLoadingTax(false);
        }
      };
      fetchTaxData();
    }
  }, [activeTab, settingsData]);

  // Check for tab parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (
      tab &&
      [
        "account",
        "security",
        "notifications",
        "privacy",
        "verification",
      ].includes(tab)
    ) {
      setActiveTab(tab as Tab);
    }
  }, []);

  // Countdown timer for account deletion
  useEffect(() => {
    if (!settingsData?.settings?.account?.deletionScheduledAt) {
      setTimeRemaining("");
      return;
    }

    const updateCountdown = () => {
      const deletionTime = new Date(
        settingsData.settings.account.deletionScheduledAt!,
      );
      const now = new Date();
      const diff = deletionTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [settingsData]);

  const tabs = [
    { id: "account" as Tab, name: "Account", icon: "person" },
    { id: "security" as Tab, name: "Security", icon: "lock" },
    {
      id: "notifications" as Tab,
      name: "Notifications",
      icon: "notifications",
    },
    { id: "privacy" as Tab, name: "Privacy", icon: "shield" },
    ...(settingsData?.settings?.account?.role === "PROVIDER"
      ? [
          { id: "verification" as Tab, name: "Verification", icon: "verified" },
          { id: "tax" as Tab, name: "Tax Center", icon: "account_balance" },
        ]
      : []),
  ];

  const showSuccessNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handlePhoneUpdate = async () => {
    try {
      await updateSettings.mutateAsync({ phone });
      showSuccessNotification("Phone number updated successfully!");
    } catch (error) {
      console.error("Failed to update phone:", error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Frontend validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New passwords don't match!");
      return;
    }

    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters long");
      return;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      alert(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      );
      return;
    }

    try {
      setIsPasswordChanging(true);

      const response = await fetch("/api/settings/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      showSuccessNotification("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Hide all password visibility toggles after successful change
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to change password",
      );
    } finally {
      setIsPasswordChanging(false);
    }
  };

  const handleNotificationsUpdate = async () => {
    try {
      await updateSettings.mutateAsync({ notifications });
      showSuccessNotification("Notification preferences saved!");
    } catch (error) {
      console.error("Failed to update notifications:", error);
    }
  };

  const handlePrivacyUpdate = async () => {
    try {
      await updateSettings.mutateAsync({ privacy });
      showSuccessNotification("Privacy settings saved!");
    } catch (error) {
      console.error("Failed to update privacy:", error);
    }
  };

  const handleRequestDeletion = async (reason: string) => {
    setShowReasonPrompt(false);
    setIsDeleting(true);
    try {
      const response = await fetch("/api/account/request-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) throw new Error("Failed to schedule deletion");

      showSuccessNotification("Account deletion scheduled for 24 hours");
      // Refetch settings to update UI
      window.location.reload();
    } catch (error) {
      console.error("Error scheduling deletion:", error);
      alert("Failed to schedule account deletion");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsRestoring(true);
    try {
      const response = await fetch("/api/account/cancel-deletion", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to cancel deletion");

      showSuccessNotification("Account deletion cancelled!");
      // Refetch settings to update UI
      window.location.reload();
    } catch (error) {
      console.error("Error cancelling deletion:", error);
      alert("Failed to cancel account deletion");
    } finally {
      setIsRestoring(false);
    }
  };

  if (isLoading || !settingsData) {
    return (
      <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <div
          role="status"
          aria-label="Loading settings"
          className="w-10 h-10 sm:w-12 sm:h-12 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"
        />
      </div>
    );
  }

  const { settings } = settingsData;

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6">
      {/* Success Notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-2 sm:top-4 right-2 sm:right-4 left-2 sm:left-auto bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4 shadow-lg z-50 flex items-center gap-2 sm:gap-3 max-w-sm sm:max-w-md"
            role="alert"
            aria-live="polite"
          >
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-emerald-600 text-xs sm:text-sm">
                check_circle
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-emerald-900 text-xs sm:text-sm">
                Success!
              </p>
              <p className="text-xs sm:text-sm text-emerald-700 truncate">
                {notificationMessage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          setShowReasonPrompt(true);
        }}
        title="Delete Your Account?"
        description="This will schedule your account for permanent deletion in 24 hours. You'll have time to restore it before then."
        confirmText="Continue"
        cancelText="Cancel"
        danger
      />

      {/* Deletion Reason Prompt Modal */}
      <PromptModal
        isOpen={showReasonPrompt}
        onClose={() => setShowReasonPrompt(false)}
        onSubmit={handleRequestDeletion}
        title="Help Us Improve"
        description="Please tell us why you're leaving (optional)"
        placeholder="Your feedback helps us improve..."
        submitText="Schedule Deletion"
        cancelText="Cancel"
        isLoading={isDeleting}
        required={false}
      />

      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-xs sm:shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex -mb-px min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors flex-1 sm:flex-none justify-center
                  ${
                    activeTab === tab.id
                      ? "border-emerald-500 text-emerald-600 bg-emerald-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50/50"
                  }
                `}
                aria-label={`${tab.name} settings`}
              >
                <span
                  className={`material-symbols-outlined text-sm ${
                    activeTab === tab.id
                      ? "text-emerald-600"
                      : "text-gray-400 group-hover:text-gray-600"
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="hidden xs:inline">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-3 sm:p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            {/* Verification Tab (Provider Only) */}
            {activeTab === "verification" &&
              settings.account.role === "PROVIDER" && (
                <motion.div
                  key="verification"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                    Provider Verification
                  </h2>
                  {loadingCheck ? (
                    <div className="flex justify-center p-8">
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <BackgroundCheckForm
                      initialStatus={backgroundCheck?.status}
                      expiresAt={backgroundCheck?.expiresAt}
                    />
                  )}
                </motion.div>
              )}

            {/* Account Tab */}
            {activeTab === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Account Information
                </h2>

                <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                  {/* Name (Read-only) */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Full Name
                    </label>
                    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="material-symbols-outlined text-gray-400 text-sm sm:text-base">
                        person
                      </span>
                      <span className="text-gray-900 text-sm sm:text-base truncate">
                        {settings.account.name}
                      </span>
                    </div>
                  </div>

                  {/* Email (Read-only) */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Email Address
                    </label>
                    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="material-symbols-outlined text-gray-400 text-sm sm:text-base">
                        mail
                      </span>
                      <span className="text-gray-900 text-sm sm:text-base truncate">
                        {settings.account.email}
                      </span>
                    </div>
                  </div>

                  {/* Phone (Editable) */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
                    >
                      Phone Number
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <div className="flex-1 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-white rounded-lg border border-gray-200 focus-within:ring-1 sm:focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent">
                        <span className="material-symbols-outlined text-gray-400 text-sm sm:text-base">
                          call
                        </span>
                        <input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="flex-1 outline-none text-gray-900 placeholder:text-gray-600 text-sm sm:text-base min-w-0"
                          placeholder="e.g., +254 700 000 000"
                        />
                      </div>
                      <button
                        onClick={handlePhoneUpdate}
                        disabled={updateSettings.isPending}
                        className="px-4 sm:px-5 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg font-medium text-xs sm:text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {updateSettings.isPending ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="pt-4 sm:pt-6 border-t border-gray-200">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                      Account Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                      <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600 mb-1">
                          Role
                        </p>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base capitalize truncate">
                          {settings.account.role.toLowerCase()}
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600 mb-1">
                          Member Since
                        </p>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">
                          {new Date(
                            settings.account.createdAt,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      {settings.subscription && (
                        <div className="p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200 col-span-1 sm:col-span-2">
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">
                            Subscription
                          </p>
                          <p className="font-semibold text-amber-900 text-sm sm:text-base">
                            {settings.subscription.plan} Plan
                          </p>
                          {settings.subscription.isActive &&
                            settings.subscription.endDate && (
                              <p className="text-xs text-amber-700 mt-0.5 sm:mt-1">
                                Valid until{" "}
                                {new Date(
                                  settings.subscription.endDate,
                                ).toLocaleDateString()}
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  </div>

                  {settings.account.role === "PROVIDER" && (
                    <div className="p-4 sm:p-5 bg-linear-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-xl">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-emerald-900">
                            Verification Privileges
                          </h3>
                          <p className="text-xs sm:text-sm text-emerald-700 mt-1">
                            Your access status increases discoverability and
                            unlocks larger uploads.
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            providerProfileData?.data?.verificationAccessGranted
                              ? "bg-emerald-600 text-white"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {providerProfileData?.data?.verificationAccessGranted
                            ? "Access Active"
                            : "Upgrade Available"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-4">
                        <div className="bg-white/70 rounded-lg border border-emerald-100 p-3">
                          <p className="text-xs text-gray-600">
                            Visibility Boost
                          </p>
                          <p className="font-semibold text-sm text-gray-900 mt-0.5">
                            {providerProfileData?.data?.onboardingPrivileges
                              ?.visibilityBoost
                              ? "Enabled"
                              : "Standard"}
                          </p>
                        </div>
                        <div className="bg-white/70 rounded-lg border border-emerald-100 p-3">
                          <p className="text-xs text-gray-600">
                            Support Priority
                          </p>
                          <p className="font-semibold text-sm text-gray-900 mt-0.5">
                            {providerProfileData?.data?.onboardingPrivileges
                              ?.prioritySupport
                              ? "Priority"
                              : "Regular"}
                          </p>
                        </div>
                        <div className="bg-white/70 rounded-lg border border-emerald-100 p-3">
                          <p className="text-xs text-gray-600">
                            Upload Capacity
                          </p>
                          <p className="font-semibold text-sm text-gray-900 mt-0.5">
                            {providerProfileData?.data?.onboardingPrivileges
                              ?.storageCapacity || "BASIC"}
                            {" · "}
                            {providerProfileData?.data?.onboardingPrivileges
                              ?.storageLimitMb || 100}
                            MB
                          </p>
                        </div>
                      </div>

                      {!providerProfileData?.data
                        ?.verificationAccessGranted && (
                        <a
                          href="/dashboard"
                          className="inline-flex items-center mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          Activate Access from Dashboard
                          <span className="material-symbols-outlined text-base ml-1">
                            arrow_forward
                          </span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Danger Zone */}
                  <div className="pt-4 sm:pt-6 border-t border-gray-200">
                    {settingsData.settings.account.deletionScheduledAt ? (
                      /* Deletion Scheduled - Show Countdown and Restore */
                      <div className="bg-red-50 border border-red-300 rounded-xl p-3 sm:p-4 md:p-6">
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg md:text-xl font-bold text-red-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                              <span className="material-symbols-outlined text-sm sm:text-base">
                                schedule_send
                              </span>
                              <span>Account Deletion Scheduled</span>
                            </h3>
                            <p className="text-xs sm:text-sm text-red-600 mb-2 sm:mb-3">
                              Your account is scheduled for permanent deletion.
                              This cannot be undone after the time expires.
                            </p>
                            {settingsData.settings.account.deletionReason && (
                              <p className="text-xs sm:text-sm text-gray-700 italic truncate">
                                Reason:{" "}
                                {settingsData.settings.account.deletionReason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Countdown Timer */}
                        <div className="bg-white border border-red-200 rounded-lg p-3 sm:p-4 md:p-6 mb-3 sm:mb-4">
                          <div className="text-center">
                            <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">
                              Time Remaining
                            </p>
                            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-600 font-mono">
                              {timeRemaining || "Calculating..."}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 sm:mt-2">
                              Scheduled:{" "}
                              {new Date(
                                settingsData.settings.account
                                  .deletionScheduledAt,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Restore Button */}
                        <button
                          onClick={handleCancelDeletion}
                          disabled={isRestoring}
                          className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-lg font-bold text-sm sm:text-base hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3"
                        >
                          {isRestoring ? (
                            <>
                              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              <span>Restoring Account...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm sm:text-base">
                                restore
                              </span>
                              <span>Restore My Account</span>
                            </>
                          )}
                        </button>
                        <p className="text-center text-xs text-gray-600 mt-2 sm:mt-3">
                          Changed your mind? Click above to cancel deletion.
                        </p>
                      </div>
                    ) : (
                      /* No Deletion Scheduled - Show Delete Button */
                      <>
                        <h3 className="text-base sm:text-lg font-semibold text-red-600 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                          <span className="material-symbols-outlined text-sm sm:text-base">
                            warning
                          </span>
                          <span>Danger Zone</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                          Once you delete your account, there is no going back.
                        </p>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={isDeleting}
                          className="px-4 sm:px-6 py-2.5 sm:py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium text-xs sm:text-sm hover:bg-red-100 transition-colors flex items-center gap-1.5 sm:gap-2 disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <>
                              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-700/20 border-t-red-700 rounded-full animate-spin" />
                              <span>Scheduling...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">
                                delete
                              </span>
                              <span>Delete Account</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Security Settings
                </h2>

                <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                  {/* Change Password */}
                  <div className="p-4 sm:p-5 md:p-6 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                        lock
                      </span>
                      <span>Change Password</span>
                    </h3>
                    <form
                      onSubmit={handlePasswordChange}
                      className="space-y-3 sm:space-y-4"
                    >
                      <div>
                        <label
                          htmlFor="currentPassword"
                          className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2"
                        >
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base text-gray-900"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowCurrentPassword(!showCurrentPassword)
                            }
                            className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <span className="material-symbols-outlined text-lg sm:text-xl">
                              {showCurrentPassword
                                ? "visibility_off"
                                : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="newPassword"
                          className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2"
                        >
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base text-gray-900"
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <span className="material-symbols-outlined text-lg sm:text-xl">
                              {showNewPassword
                                ? "visibility_off"
                                : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="confirmPassword"
                          className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2"
                        >
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base text-gray-900"
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <span className="material-symbols-outlined text-lg sm:text-xl">
                              {showConfirmPassword
                                ? "visibility_off"
                                : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isPasswordChanging}
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg font-medium text-xs sm:text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 w-full"
                      >
                        {isPasswordChanging && (
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        {isPasswordChanging ? "Updating..." : "Update Password"}
                      </button>
                    </form>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border border-blue-200">
                    <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                          <span className="material-symbols-outlined text-blue-600 text-sm sm:text-base">
                            verified_user
                          </span>
                          <span>Two-Factor Authentication (2FA)</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3">
                          Add an extra layer of security to your account by
                          requiring a verification code sent to your email
                          during login.
                        </p>
                        {settingsData?.twoFactorEnabled && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-blue-700 bg-blue-100 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg w-fit">
                            <span className="material-symbols-outlined text-xs sm:text-sm">
                              check_circle
                            </span>
                            <span className="font-medium">
                              2FA is currently enabled
                            </span>
                          </div>
                        )}
                      </div>
                      <TwoFactorToggle
                        initialEnabled={settingsData?.twoFactorEnabled || false}
                      />
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Notification Preferences
                </h2>

                <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                      Email Notifications
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      {[
                        {
                          key: "emailJobAlerts",
                          label: "Job Alerts",
                          desc: "Get notified about new job opportunities",
                        },
                        {
                          key: "emailMessages",
                          label: "Messages",
                          desc: "Receive email notifications for new messages",
                        },
                        {
                          key: "emailBookings",
                          label: "Booking Updates",
                          desc: "Stay updated on booking status changes",
                        },
                        {
                          key: "emailReviews",
                          label: "Reviews",
                          desc: "Get notified when someone reviews your service",
                        },
                        {
                          key: "emailMarketing",
                          label: "Marketing & Promotions",
                          desc: "Receive news, tips, and special offers",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={
                              notifications[
                                item.key as keyof typeof notifications
                              ]
                            }
                            onChange={(e) =>
                              setNotifications({
                                ...notifications,
                                [item.key]: e.target.checked,
                              })
                            }
                            className="mt-0.5 sm:mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm sm:text-base">
                              {item.label}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                              {item.desc}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 sm:pt-6 border-t border-gray-200">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                      In-App Notification Channels
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      {[
                        {
                          key: "allowMessages",
                          label: "Messages",
                          desc: "Show message-related alerts in your notification center",
                        },
                        {
                          key: "allowBookingUpdates",
                          label: "Booking Updates",
                          desc: "Show booking and negotiation updates in-app",
                        },
                        {
                          key: "allowMarketing",
                          label: "Marketing",
                          desc: "Allow promotional and campaign notifications in-app",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={
                              notifications[
                                item.key as keyof typeof notifications
                              ]
                            }
                            onChange={(e) =>
                              setNotifications({
                                ...notifications,
                                [item.key]: e.target.checked,
                              })
                            }
                            className="mt-0.5 sm:mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm sm:text-base">
                              {item.label}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                              {item.desc}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 sm:pt-6 border-t border-gray-200">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                      Push Notifications
                    </h3>
                    <PushNotificationToggle />
                  </div>
                  <button
                    onClick={handleNotificationsUpdate}
                    disabled={updateSettings.isPending}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg font-medium text-xs sm:text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 w-full sm:w-auto"
                  >
                    {updateSettings.isPending
                      ? "Saving..."
                      : "Save Preferences"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Privacy Tab */}
            {activeTab === "privacy" && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Privacy Settings
                </h2>

                <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                      Profile Visibility
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      {[
                        {
                          key: "profileVisible",
                          label: "Make Profile Public",
                          desc: "Allow others to view your profile",
                        },
                        {
                          key: "searchable",
                          label: "Searchable Profile",
                          desc: "Let others find you through search",
                        },
                        {
                          key: "showLocation",
                          label: "Show Location",
                          desc: "Display your location on your profile",
                        },
                        {
                          key: "allowMessages",
                          label: "Allow Direct Messages",
                          desc: "Let others send you messages",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={privacy[item.key as keyof typeof privacy]}
                            onChange={(e) =>
                              setPrivacy({
                                ...privacy,
                                [item.key]: e.target.checked,
                              })
                            }
                            className="mt-0.5 sm:mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm sm:text-base">
                              {item.label}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                              {item.desc}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handlePrivacyUpdate}
                    disabled={updateSettings.isPending}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg font-medium text-xs sm:text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 w-full sm:w-auto"
                  >
                    {updateSettings.isPending
                      ? "Saving..."
                      : "Save Privacy Settings"}
                  </button>
                </div>
              </motion.div>
            )}
            {/* Tax Tab (Providers Only) */}
            {activeTab === "tax" &&
              settingsData?.settings?.account?.role === "PROVIDER" && (
                <motion.div
                  key="tax"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {loadingTax ? (
                    <div className="flex justify-center p-12">
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <TaxSettings
                      initialData={taxProfile || { kraVerified: false }}
                      filings={taxFilings}
                    />
                  )}
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
