"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSettings, useUpdateSettings } from "@/lib/api/hooks/useSettings";
import { ConfirmModal, PromptModal } from "@/components/Modal";

type Tab = "account" | "security" | "notifications" | "privacy";

const SettingsPage = () => {
  const router = useRouter();
  const { data: settingsData, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  
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

  // Check for tab parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["account", "security", "notifications", "privacy"].includes(tab)) {
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
      const deletionTime = new Date(settingsData.settings.account.deletionScheduledAt!);
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
    { id: "notifications" as Tab, name: "Notifications", icon: "notifications" },
    { id: "privacy" as Tab, name: "Privacy", icon: "shield" },
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
      alert("Password must contain at least one uppercase letter, one lowercase letter, and one number");
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
      alert(error instanceof Error ? error.message : "Failed to change password");
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
      
      showSuccessNotification("Account deletion scheduled for 24 hours from now");
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
      
      showSuccessNotification("Account deletion cancelled! Welcome back!");
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" aria-label="Loading settings" className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const { settings } = settingsData;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Success Notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4 shadow-lg z-50 flex items-center gap-3"
            role="alert"
            aria-live="polite"
          >
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600 text-sm">
                check_circle
              </span>
            </div>
            <div>
              <p className="font-semibold text-emerald-900">Success!</p>
              <p className="text-sm text-emerald-700">{notificationMessage}</p>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                  ${
                    activeTab === tab.id
                      ? "border-emerald-500 text-emerald-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
                aria-label={`${tab.name} settings`}
              >
                <span className={`material-symbols-outlined text-sm ${activeTab === tab.id ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600"}`}>
                  {tab.icon}
                </span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {/* Account Tab */}
            {activeTab === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-bold text-gray-900 mb-6">Account Information</h2>

                <div className="space-y-6">
                  {/* Name (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="material-symbols-outlined text-gray-400">person</span>
                      <span className="text-gray-900">{settings.account.name}</span>
                    </div>
                  </div>

                  {/* Email (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="material-symbols-outlined text-gray-400">mail</span>
                      <span className="text-gray-900">{settings.account.email}</span>
                    </div>
                  </div>

                  {/* Phone (Editable) */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="flex gap-3">
                      <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent">
                        <span className="material-symbols-outlined text-gray-400">call</span>
                        <input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="flex-1 outline-none text-gray-900 placeholder:text-gray-600"
                          placeholder="e.g., +254 700 000 000"
                        />
                      </div>
                      <button
                        onClick={handlePhoneUpdate}
                        disabled={updateSettings.isPending}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {updateSettings.isPending ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Role</p>
                        <p className="font-semibold text-gray-900 capitalize">{settings.account.role.toLowerCase()}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Member Since</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(settings.account.createdAt).toLocaleDateString("en-US", { 
                            month: "long", 
                            year: "numeric" 
                          })}
                        </p>
                      </div>
                      {settings.subscription && (
                        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                          <p className="text-sm text-gray-600 mb-1">Subscription</p>
                          <p className="font-semibold text-amber-900">{settings.subscription.plan} Plan</p>
                          {settings.subscription.isActive && settings.subscription.endDate && (
                            <p className="text-xs text-amber-700 mt-1">
                              Valid until {new Date(settings.subscription.endDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-6 border-t border-gray-200">
                    {settingsData.settings.account.deletionScheduledAt ? (
                      /* Deletion Scheduled - Show Countdown and Restore */
                      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-red-700 mb-2 flex items-center gap-2">
                              <span className="material-symbols-outlined">schedule_send</span>
                              Account Deletion Scheduled
                            </h3>
                            <p className="text-sm text-red-600 mb-3">
                              Your account is scheduled for permanent deletion. This cannot be undone after the time expires.
                            </p>
                            {settingsData.settings.account.deletionReason && (
                              <p className="text-sm text-gray-700 italic">
                                Reason: {settingsData.settings.account.deletionReason}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Countdown Timer */}
                        <div className="bg-white border border-red-200 rounded-lg p-6 mb-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-2">Time Remaining</p>
                            <div className="text-4xl font-bold text-red-600 font-mono">
                              {timeRemaining || "Calculating..."}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Scheduled for: {new Date(settingsData.settings.account.deletionScheduledAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        {/* Restore Button */}
                        <button
                          onClick={handleCancelDeletion}
                          disabled={isRestoring}
                          className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-lg font-bold text-lg hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                          {isRestoring ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              Restoring Account...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined">restore</span>
                              Restore My Account
                            </>
                          )}
                        </button>
                        <p className="text-center text-xs text-gray-600 mt-3">
                          Changed your mind? Click above to cancel the deletion and keep your account.
                        </p>
                      </div>
                    ) : (
                      /* No Deletion Scheduled - Show Delete Button */
                      <>
                        <h3 className="text-lg font-semibold text-red-600 mb-2 flex items-center gap-2">
                          <span className="material-symbols-outlined">warning</span>
                          Danger Zone
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Once you delete your account, there is no going back. Your account will be permanently deleted after 24 hours.
                        </p>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={isDeleting}
                          className="px-6 py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-red-700/20 border-t-red-700 rounded-full animate-spin" />
                              Scheduling...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">delete</span>
                              Delete Account
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
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-bold text-gray-900 mb-6">Security Settings</h2>

                <div className="space-y-6">
                  {/* Change Password */}
                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600">lock</span>
                      Change Password
                    </h3>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-900 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <span className="material-symbols-outlined text-xl">
                              {showCurrentPassword ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-900 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <span className="material-symbols-outlined text-xl">
                              {showNewPassword ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-2">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <span className="material-symbols-outlined text-xl">
                              {showConfirmPassword ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isPasswordChanging}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isPasswordChanging && (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        {isPasswordChanging ? "Updating..." : "Update Password"}
                      </button>

                    </form>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-600">verified_user</span>
                          Two-Factor Authentication
                        </h3>
                        <p className="text-sm text-gray-800">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" disabled />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-emerald-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 opacity-50"></div>
                      </label>
                    </div>
                    <p className="text-xs text-gray-700">Coming soon</p>
                  </div>

                  {/* Active Sessions */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600">devices</span>
                      Active Sessions
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-gray-400">computer</span>
                          <div>
                            <p className="font-medium text-gray-900">Current Session</p>
                            <p className="text-sm text-gray-800">Last active: Just now</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
                    <div className="space-y-4">
                      {[
                        { key: "emailJobAlerts", label: "Job Alerts", desc: "Get notified about new job opportunities" },
                        { key: "emailMessages", label: "Messages", desc: "Receive email notifications for new messages" },
                        { key: "emailBookings", label: "Booking Updates", desc: "Stay updated on booking status changes" },
                        { key: "emailReviews", label: "Reviews", desc: "Get notified when someone reviews your service" },
                        { key: "emailMarketing", label: "Marketing & Promotions", desc: "Receive news, tips, and special offers" },
                      ].map((item) => (
                        <label key={item.key} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications[item.key as keyof typeof notifications]}
                            onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                            className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.label}</p>
                            <p className="text-sm text-gray-600">{item.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Notifications</h3>
                    <label className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.pushNotifications}
                        onChange={(e) => setNotifications({ ...notifications, pushNotifications: e.target.checked })}
                        className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Enable Push Notifications</p>
                        <p className="text-sm text-gray-600">Get real-time notifications on your device</p>
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={handleNotificationsUpdate}
                    disabled={updateSettings.isPending}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {updateSettings.isPending ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Privacy Tab */}
            {activeTab === "privacy" && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-bold text-gray-900 mb-6">Privacy Settings</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Visibility</h3>
                    <div className="space-y-4">
                      {[
                        { key: "profileVisible", label: "Make Profile Public", desc: "Allow others to view your profile" },
                        { key: "searchable", label: "Searchable Profile", desc: "Let others find you through search" },
                        { key: "showLocation", label: "Show Location", desc: "Display your location on your profile" },
                        { key: "allowMessages", label: "Allow Direct Messages", desc: "Let others send you messages" },
                      ].map((item) => (
                        <label key={item.key} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy[item.key as keyof typeof privacy]}
                            onChange={(e) => setPrivacy({ ...privacy, [item.key]: e.target.checked })}
                            className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.label}</p>
                            <p className="text-sm text-gray-600">{item.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handlePrivacyUpdate}
                    disabled={updateSettings.isPending}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {updateSettings.isPending ? "Saving..." : "Save Privacy Settings"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
