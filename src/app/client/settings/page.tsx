"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings, useUpdateSettings } from "@/lib/api/hooks/useSettings";
import { toast } from "sonner";
import { ConfirmModal, PromptModal } from "@/components/Modal";
import { useRouter } from "next/navigation";

export default function ClientSettingsPage() {
  const router = useRouter();
  const { data: settingsData, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [activeTab, setActiveTab] = useState<"account" | "notifications" | "privacy">("account");
  
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
  });

  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    searchable: true,
    showLocation: true,
    allowMessages: true,
  });

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

  const handleNotificationChange = (key: string) => {
    const newNotifications = { ...notifications, [key]: !notifications[key as keyof typeof notifications] };
    setNotifications(newNotifications);
    updateSettings.mutate({ notifications: newNotifications }, {
      onSuccess: () => toast.success("Notification preferences updated"),
      onError: () => toast.error("Failed to update preferences"),
    });
  };

  const handlePrivacyChange = (key: string) => {
    const newPrivacy = { ...privacy, [key]: !privacy[key as keyof typeof privacy] };
    setPrivacy(newPrivacy);
    updateSettings.mutate({ privacy: newPrivacy }, {
      onSuccess: () => toast.success("Privacy settings updated"),
      onError: () => toast.error("Failed to update settings"),
    });
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
      // Refetch settings to update UI
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
      // Refetch settings to update UI
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
      toast.error(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: "account", label: "Account", icon: "person" },
    { id: "notifications", label: "Notifications", icon: "notifications" },
    { id: "privacy", label: "Privacy & Security", icon: "lock" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account preferences and security.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                  : "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="material-symbols-outlined">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {activeTab === "account" && (
                <div className="p-8 space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Account Information</h2>
                    <p className="text-gray-500 text-sm">Update your personal details.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-xl">
                        {settingsData?.settings.account.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{settingsData?.settings.account.name}</p>
                        <p className="text-sm text-gray-500">{settingsData?.settings.account.email}</p>
                      </div>
                      <button 
                        onClick={() => router.push('/client/profile')}
                        className="ml-auto text-emerald-600 text-sm font-medium hover:text-emerald-700"
                      >
                        Edit Profile
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                        <div className="px-4 py-2.5 bg-gray-50 rounded-xl text-gray-600 text-sm border border-gray-100">
                          {new Date(settingsData?.settings.account.createdAt || "").toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                        <div className="px-4 py-2.5 bg-gray-50 rounded-xl text-gray-600 text-sm border border-gray-100">
                          {settingsData?.settings.account.role}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      {settingsData?.settings.account.deletionScheduledAt ? (
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
                          <h3 className="text-sm font-bold text-red-600 mb-2">Danger Zone</h3>
                          <p className="text-xs text-gray-500 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                          <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isDeleting}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-100 flex items-center gap-2"
                          >
                            {isDeleting ? (
                              <>
                                <div className="w-3 h-3 border-2 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
                                Scheduling...
                              </>
                            ) : (
                              "Delete Account"
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="p-8 space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Notification Preferences</h2>
                    <p className="text-gray-500 text-sm">Choose how you want to be notified.</p>
                  </div>

                  <div className="space-y-6">
                    {[
                      { key: "emailMessages", label: "Email Messages", desc: "Receive emails when you get a new message." },
                      { key: "emailBookings", label: "Booking Updates", desc: "Get notified about booking status changes." },
                      { key: "emailMarketing", label: "Marketing Emails", desc: "Receive news, updates, and special offers." },
                      { key: "pushNotifications", label: "Push Notifications", desc: "Receive push notifications on your device." },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications[item.key as keyof typeof notifications]}
                            onChange={() => handleNotificationChange(item.key)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "privacy" && (
                <div className="p-8 space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Privacy & Security</h2>
                    <p className="text-gray-500 text-sm">Control your profile visibility and security.</p>
                  </div>

                  <div className="space-y-6">
                    {[
                      { key: "profileVisible", label: "Public Profile", desc: "Make your profile visible to everyone." },
                      { key: "showLocation", label: "Show Location", desc: "Allow others to see your general location." },
                      { key: "allowMessages", label: "Allow Messages", desc: "Allow others to send you direct messages." },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy[item.key as keyof typeof privacy]}
                            onChange={() => handlePrivacyChange(item.key)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>
                    ))}

                    <div className="pt-6 border-t border-gray-100">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600">lock</span>
                        Change Password
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">Current Password</label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                              placeholder="Enter current password"
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
                          <label className="block text-sm font-medium text-gray-900 mb-2">New Password</label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                              placeholder="Enter new password (min. 8 chars)"
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
                          <label className="block text-sm font-medium text-gray-900 mb-2">Confirm New Password</label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                              placeholder="Confirm new password"
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
                          onClick={handlePasswordChange}
                          disabled={isChangingPassword}
                          className="w-full md:w-auto px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                          {isChangingPassword ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              Updating...
                            </>
                          ) : (
                            "Update Password"
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="pt-6 border-t border-gray-100">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-600">verified_user</span>
                            Two-Factor Authentication
                          </h3>
                          <p className="text-sm text-gray-500">Add an extra layer of security to your account.</p>
                        </div>
                        <div className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                          Coming Soon
                        </div>
                      </div>
                    </div>

                    {/* Active Sessions */}
                    <div className="pt-6 border-t border-gray-100">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600">devices</span>
                        Active Sessions
                      </h3>
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-gray-400">computer</span>
                          <div>
                            <p className="font-medium text-gray-900">Current Session</p>
                            <p className="text-sm text-gray-500">Last active: Just now</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
