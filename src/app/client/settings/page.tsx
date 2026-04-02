"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings, useUpdateSettings } from "@/lib/api/hooks/useSettings";
import { toast } from "sonner";
import { ConfirmModal, PromptModal } from "@/components/Modal";
import { useRouter } from "next/navigation";
import { toggleTwoFactor } from "@/app/actions/twoFactor";
import {
  User,
  Lock,
  Bell,
  Shield,
  Mail,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Clock,
  Settings,
  Smartphone,
  Monitor,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Menu,
  X,
  Home,
  LogOut,
  HelpCircle,
  ShieldCheck,
  Key,
  Trash2,
  Globe,
  MessageSquare,
  Search,
} from "lucide-react";

import { useFcmToken } from "@/lib/hooks/useFcmToken";

// PushNotificationToggle Component
function PushNotificationToggle() {
  const { token, requestPermission, notificationPermission } = useFcmToken();
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleToggle = async () => {
    if (!token && notificationPermission !== "denied") {
      setIsLoading(true);
      await requestPermission();
      setIsLoading(false);
    }
  };

  const isEnabled = !!token;

  return (
    <div
      className={`p-3 sm:p-4 lg:p-5 rounded-lg sm:rounded-xl transition-all border bg-gray-50/50 border-gray-100 hover:border-gray-200 ${
        isMobile ? "mb-2" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center ${
              isEnabled ? "bg-emerald-100" : "bg-gray-100"
            }`}
          >
            <Smartphone
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                isEnabled ? "text-emerald-600" : "text-gray-400"
              }`}
            />
          </div>
          <div>
            <p className="text-sm sm:text-base font-medium text-gray-900">
              Push Notifications
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEnabled
                ? "Active on this device"
                : notificationPermission === "denied"
                  ? "Blocked in browser settings"
                  : "Enable for real-time updates"}
            </p>
          </div>
        </div>
        <label
          className={`relative inline-flex items-center cursor-pointer ${
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
            className={`w-10 h-5 sm:w-12 sm:h-6 bg-gray-300 rounded-full peer peer-focus:ring-2 sm:peer-focus:ring-4 peer-focus:ring-emerald-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] sm:after:top-[4px] sm:after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-emerald-600 ${
              isEnabled || notificationPermission === "denied"
                ? "cursor-default"
                : ""
            }`}
          ></div>
        </label>
      </div>
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
          ? "Two-Factor Authentication enabled! You'll receive a code via email during login."
          : "Two-Factor Authentication disabled.",
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to update 2FA settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={enabled}
        onChange={handleToggle}
        disabled={isLoading}
      />
      <div
        className={`w-10 h-5 sm:w-12 sm:h-6 bg-gray-300 rounded-full peer peer-focus:ring-2 sm:peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] sm:after:top-[4px] sm:after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-indigo-600 ${
          isLoading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      ></div>
    </label>
  );
}

export default function ClientSettingsPage() {
  const router = useRouter();
  const { data: settingsData, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "account" | "security" | "notifications" | "privacy"
  >("account");

  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Deletion tracking
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");

  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReasonPrompt, setShowReasonPrompt] = useState(false);

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

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (settingsData?.settings) {
      setNotifications(settingsData.settings.notifications);
      setPrivacy(settingsData.settings.privacy);
    }
  }, [settingsData]);

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

  const handleNotificationChange = (key: string) => {
    const newNotifications = {
      ...notifications,
      [key]: !notifications[key as keyof typeof notifications],
    };
    setNotifications(newNotifications);
    updateSettings.mutate(
      { notifications: newNotifications },
      {
        onSuccess: () => toast.success("Notification preferences updated"),
        onError: () => toast.error("Failed to update preferences"),
      },
    );
  };

  const handlePrivacyChange = (key: string) => {
    const newPrivacy = {
      ...privacy,
      [key]: !privacy[key as keyof typeof privacy],
    };
    setPrivacy(newPrivacy);
    updateSettings.mutate(
      { privacy: newPrivacy },
      {
        onSuccess: () => toast.success("Privacy settings updated"),
        onError: () => toast.error("Failed to update settings"),
      },
    );
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

      toast.success("Account deletion scheduled for 24 hours from now");
      window.location.reload();
    } catch (error) {
      console.error("Error scheduling deletion:", error);
      toast.error("Failed to schedule account deletion");
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

      toast.success("Account deletion cancelled! Welcome back!");
      window.location.reload();
    } catch (error) {
      console.error("Error cancelling deletion:", error);
      toast.error("Failed to cancel account deletion");
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/settings/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to change password",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    {
      id: "account",
      label: "Account",
      icon: User,
      color: "from-emerald-500 to-teal-600",
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      color: "from-blue-500 to-indigo-600",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      color: "from-amber-500 to-orange-600",
    },
    {
      id: "privacy",
      label: "Privacy",
      icon: Lock,
      color: "from-purple-500 to-pink-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Modals */}
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

        {/* Mobile Header */}
        {isMobile && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                {showMobileMenu ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
              <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            </div>
            <button
              onClick={() => router.push("/client/dashboard")}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <Home className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Mobile Navigation Menu */}
        {isMobile && showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg border border-gray-200 mb-4 overflow-hidden"
          >
            <div className="p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg mb-1 transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-emerald-600" : "text-gray-500"
                        }`}
                      />
                      <span className="font-medium">{tab.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 lg:mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md shadow-emerald-500/30">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                  Settings
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Manage your account preferences and security
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Sidebar Navigation - Desktop */}
          {!isMobile && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-xs sm:shadow-sm border border-gray-100 p-2 sticky top-4">
                <div className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium group ${
                          isActive
                            ? `bg-gradient-to-r ${tab.color} text-white shadow-md`
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${
                            isActive
                              ? "text-white"
                              : "text-gray-400 group-hover:text-emerald-600"
                          }`}
                        />
                        <span className="text-sm sm:text-base">
                          {tab.label}
                        </span>
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Content Area */}
          <div className={`${isMobile ? "col-span-1" : "lg:col-span-3"}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xs sm:shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Mobile Tab Header */}
                {isMobile && (
                  <div className="flex items-center gap-2 p-4 border-b border-gray-200">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      if (activeTab === tab.id) {
                        return (
                          <React.Fragment key={tab.id}>
                            <div
                              className={`w-8 h-8 rounded-lg bg-gradient-to-r ${tab.color} flex items-center justify-center`}
                            >
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold text-gray-900">
                              {tab.label}
                            </span>
                          </React.Fragment>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                {/* Account Tab */}
                {activeTab === "account" && (
                  <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
                    <div>
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                        Account Information
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Manage your personal details and account settings
                      </p>
                    </div>

                    {/* Profile Card */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 text-white shadow-md">
                      <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-white/10 rounded-full blur-xl sm:blur-3xl -mr-16 sm:-mr-32 -mt-16 sm:-mt-32" />
                      <div className="relative flex items-center gap-3 sm:gap-4">
                        <div
                          className={`${
                            isMobile ? "w-16 h-16" : "w-20 h-20"
                          } bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-2xl sm:text-3xl border-2 border-white/30 shadow-lg`}
                        >
                          {settingsData?.settings.account.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-0.5 sm:mb-1 truncate">
                            {settingsData?.settings.account.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-white/90">
                            <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                            <p className="text-xs sm:text-sm truncate">
                              {settingsData?.settings.account.email}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push("/client/profile")}
                          className="px-3 sm:px-4 py-2 sm:py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-lg sm:rounded-xl font-medium transition-all shadow-md text-xs sm:text-sm whitespace-nowrap"
                        >
                          Edit Profile
                        </button>
                      </div>
                    </div>

                    {/* Account Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                      <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl lg:rounded-2xl border border-blue-100">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-gray-600">
                            Member Since
                          </p>
                        </div>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                          {new Date(
                            settingsData?.settings.account.createdAt || "",
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg sm:rounded-xl lg:rounded-2xl border border-purple-100">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-gray-600">
                            Account Type
                          </p>
                        </div>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 capitalize">
                          {settingsData?.settings.account.role.toLowerCase()}
                        </p>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-4 sm:pt-6 border-t border-gray-200">
                      {settingsData?.settings.account.deletionScheduledAt ? (
                        <div className="bg-red-50 border-2 border-red-200 rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6">
                          <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-red-700 mb-1 sm:mb-2">
                                Account Deletion Scheduled
                              </h3>
                              <p className="text-xs sm:text-sm text-red-600 mb-1">
                                Your account will be permanently deleted. This
                                cannot be undone after the time expires.
                              </p>
                              {settingsData.settings.account.deletionReason && (
                                <p className="text-xs sm:text-sm text-gray-700 italic mt-2">
                                  Reason:{" "}
                                  {settingsData.settings.account.deletionReason}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="bg-white border border-red-200 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-3 sm:mb-4">
                            <div className="text-center">
                              <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">
                                Time Remaining
                              </p>
                              <div
                                className={`${
                                  isMobile ? "text-3xl" : "text-4xl sm:text-5xl"
                                } font-bold text-red-600 font-mono mb-1 sm:mb-2`}
                              >
                                {timeRemaining || "Calculating..."}
                              </div>
                              <p className="text-xs text-gray-500">
                                Scheduled:{" "}
                                {new Date(
                                  settingsData.settings.account
                                    .deletionScheduledAt,
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={handleCancelDeletion}
                            disabled={isRestoring}
                            className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg sm:rounded-xl font-bold hover:shadow-md hover:shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                          >
                            {isRestoring ? (
                              <>
                                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                Restoring...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                Restore My Account
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-red-600 mb-1 sm:mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                            Danger Zone
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                            Once you delete your account, there is no going
                            back. Please be certain.
                          </p>
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isDeleting}
                            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-red-50 text-red-700 border-2 border-red-200 rounded-lg sm:rounded-xl font-medium hover:bg-red-100 transition-all flex items-center gap-2 text-sm sm:text-base"
                          >
                            {isDeleting ? (
                              <>
                                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-700/20 border-t-red-700 rounded-full animate-spin" />
                                Scheduling...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                Delete Account
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === "security" && (
                  <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
                    <div>
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                        Security Settings
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Manage your passwords and security preferences
                      </p>
                    </div>

                    {/* Change Password */}
                    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200">
                      <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg">
                        <Key className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                        Change Password
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        {[
                          {
                            label: "Current Password",
                            value: currentPassword,
                            setValue: setCurrentPassword,
                            show: showCurrentPassword,
                            setShow: setShowCurrentPassword,
                          },
                          {
                            label: "New Password",
                            value: newPassword,
                            setValue: setNewPassword,
                            show: showNewPassword,
                            setShow: setShowNewPassword,
                          },
                          {
                            label: "Confirm New Password",
                            value: confirmPassword,
                            setValue: setConfirmPassword,
                            show: showConfirmPassword,
                            setShow: setShowConfirmPassword,
                          },
                        ].map((field, idx) => (
                          <div key={idx}>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                              {field.label}
                            </label>
                            <div className="relative">
                              <input
                                type={field.show ? "text" : "password"}
                                value={field.value}
                                onChange={(e) => field.setValue(e.target.value)}
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                placeholder="••••••••"
                              />
                              <button
                                type="button"
                                onClick={() => field.setShow(!field.show)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {field.show ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={handlePasswordChange}
                          disabled={isChangingPassword}
                          className="w-full px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-md hover:shadow-gray-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                          {isChangingPassword ? (
                            <>
                              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                              Update Password
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl lg:rounded-2xl border border-blue-200">
                      <div className="flex items-start justify-between mb-3 sm:mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1.5 sm:mb-2 flex items-center gap-2 text-base sm:text-lg">
                            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                            Two-Factor Authentication (2FA)
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3">
                            Add an extra layer of security by requiring a
                            verification code sent to your email during login.
                          </p>
                          {settingsData?.twoFactorEnabled && (
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-700 bg-blue-100 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg w-fit">
                              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="font-medium">
                                2FA is currently enabled
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-2">
                          <TwoFactorToggle
                            initialEnabled={
                              settingsData?.twoFactorEnabled || false
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Active Sessions */}
                    <div>
                      <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg">
                        <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                        Active Sessions
                      </h3>
                      <div className="space-y-2 sm:space-y-3">
                        {(settingsData?.settings.activeSessions || []).map(
                          (activeSession) => (
                            <div
                              key={activeSession.id}
                              className="p-3 sm:p-4 bg-white rounded-lg sm:rounded-xl border border-gray-100 flex items-center justify-between hover:border-emerald-200 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-lg sm:rounded-xl flex items-center justify-center">
                                  <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                                    {activeSession.isCurrent
                                      ? "Current Session"
                                      : "Another Session"}
                                  </p>
                                  <p className="text-xs sm:text-sm text-gray-500">
                                    Expires:{" "}
                                    {activeSession.expires
                                      ? new Date(
                                          activeSession.expires,
                                        ).toLocaleString()
                                      : "Unknown"}
                                  </p>
                                </div>
                              </div>
                              <span className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-100 text-emerald-700 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse" />
                                {activeSession.isCurrent ? "Current" : "Active"}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === "notifications" && (
                  <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
                    <div>
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                        Notification Preferences
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Choose how and when you want to be notified
                      </p>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      {[
                        {
                          key: "emailMessages",
                          label: "Email Messages",
                          desc: "Receive emails when you get a new message",
                          icon: Mail,
                        },
                        {
                          key: "emailBookings",
                          label: "Email Booking Updates",
                          desc: "Get booking status updates by email",
                          icon: Bell,
                        },
                        {
                          key: "emailMarketing",
                          label: "Email Marketing",
                          desc: "Receive news, updates, and special offers",
                          icon: Bell,
                        },
                        {
                          key: "allowMessages",
                          label: "In-App Messages",
                          desc: "Show message alerts inside your notification center",
                          icon: MessageSquare,
                        },
                        {
                          key: "allowBookingUpdates",
                          label: "In-App Booking Updates",
                          desc: "Show booking and negotiation updates in-app",
                          icon: Bell,
                        },
                        {
                          key: "allowMarketing",
                          label: "In-App Marketing",
                          desc: "Allow promotional notifications in-app",
                          icon: Bell,
                        },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isEnabled =
                          notifications[item.key as keyof typeof notifications];
                        return (
                          <div
                            key={item.key}
                            className={`flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all border ${
                              isEnabled
                                ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
                                : "bg-gray-50/50 border-gray-100 hover:border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center ${
                                  isEnabled ? "bg-emerald-100" : "bg-gray-100"
                                }`}
                              >
                                <Icon
                                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                    isEnabled
                                      ? "text-emerald-600"
                                      : "text-gray-400"
                                  }`}
                                />
                              </div>
                              <div>
                                <p className="text-sm sm:text-base font-medium text-gray-900">
                                  {item.label}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {item.desc}
                                </p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() =>
                                  handleNotificationChange(item.key)
                                }
                                className="sr-only peer"
                              />
                              <div className="w-10 h-5 sm:w-12 sm:h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 sm:peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] sm:after:top-[4px] sm:after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-600 peer-checked:to-teal-600"></div>
                            </label>
                          </div>
                        );
                      })}
                      <PushNotificationToggle />
                    </div>
                  </div>
                )}

                {/* Privacy Tab */}
                {activeTab === "privacy" && (
                  <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
                    <div>
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                        Privacy Settings
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Control your profile visibility and data sharing
                      </p>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      {[
                        {
                          key: "profileVisible",
                          label: "Public Profile",
                          desc: "Make your profile visible to everyone",
                          icon: Globe,
                        },
                        {
                          key: "showLocation",
                          label: "Show Location",
                          desc: "Allow others to see your general location",
                          icon: Globe,
                        },
                        {
                          key: "allowMessages",
                          label: "Allow Messages",
                          desc: "Allow others to send you direct messages",
                          icon: MessageSquare,
                        },
                        {
                          key: "searchable",
                          label: "Searchable",
                          desc: "Allow your profile to appear in search results",
                          icon: Search,
                        },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isEnabled =
                          privacy[item.key as keyof typeof privacy];
                        return (
                          <div
                            key={item.key}
                            className={`flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all border ${
                              isEnabled
                                ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                                : "bg-gray-50/50 border-gray-100 hover:border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center ${
                                  isEnabled ? "bg-blue-100" : "bg-gray-100"
                                }`}
                              >
                                <Icon
                                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                    isEnabled
                                      ? "text-blue-600"
                                      : "text-gray-400"
                                  }`}
                                />
                              </div>
                              <div>
                                <p className="text-sm sm:text-base font-medium text-gray-900">
                                  {item.label}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {item.desc}
                                </p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => handlePrivacyChange(item.key)}
                                className="sr-only peer"
                              />
                              <div className="w-10 h-5 sm:w-12 sm:h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 sm:peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] sm:after:top-[4px] sm:after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-indigo-600"></div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
