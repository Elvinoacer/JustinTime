"use client";

import { useState, useTransition } from "react";
import {
  toggleBanUser,
  updateUserRole,
  scheduleUserDeletion,
  cancelUserDeletion,
  sendPasswordReset,
  updateUserPlan,
} from "@/app/actions/admin";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Shield,
  ChevronDown,
  ChevronUp,
  UserCog,
  Crown,
  Ban,
  RotateCcw,
  Trash2,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  LockOpen,
} from "lucide-react";

interface UserAdminActionsProps {
  user: any;
}

export default function UserAdminActions({ user }: UserAdminActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showMenu, setShowMenu] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [selectedPlan, setSelectedPlan] = useState<"FREE" | "PRO" | "BUSINESS">(
    user.subscription?.plan || "FREE"
  );
  const [deleteReason, setDeleteReason] = useState("");

  const handleBanToggle = () => {
    if (
      !confirm(
        `Are you sure you want to ${user.isBanned ? "unban" : "ban"} this user?`
      )
    )
      return;

    startTransition(async () => {
      const result = await toggleBanUser(user.id, !user.isBanned);
      if (result.success) {
        toast.success(
          `User ${
            !user.isBanned ? "banned" : "unbanned"
          } successfully. Notifications sent.`
        );
        router.refresh();
      } else {
        toast.error(
          `Failed to ${!user.isBanned ? "ban" : "unban"} user: ${result.error}`
        );
      }
      setShowMenu(false);
    });
  };

  const handleRoleChange = () => {
    startTransition(async () => {
      const result = await updateUserRole(user.id, selectedRole);
      if (result.success) {
        toast.success(
          `User role updated to ${selectedRole}. Notifications sent.`
        );
        router.refresh();
      } else {
        toast.error(`Failed to update role: ${result.error}`);
      }
      setShowRoleModal(false);
      setShowMenu(false);
    });
  };

  const handlePlanChange = () => {
    startTransition(async () => {
      const result = await updateUserPlan(user.id, selectedPlan);
      if (result.success) {
        toast.success(
          `User plan updated to ${selectedPlan}. Notifications sent.`
        );
        router.refresh();
      } else {
        toast.error(`Failed to update plan: ${result.error}`);
      }
      setShowPlanModal(false);
      setShowMenu(false);
    });
  };

  const handleScheduleDeletion = () => {
    if (!deleteReason.trim()) {
      alert("Please provide a reason for deletion");
      return;
    }

    startTransition(async () => {
      const result = await scheduleUserDeletion(user.id, deleteReason);
      if (result.success) {
        toast.success("Account deletion scheduled. User has been notified.");
        router.refresh();
      } else {
        toast.error(`Failed to schedule deletion: ${result.error}`);
      }
      setShowDeleteModal(false);
      setShowMenu(false);
    });
  };

  const handleCancelDeletion = () => {
    if (!confirm("Cancel scheduled deletion?")) return;

    startTransition(async () => {
      const result = await cancelUserDeletion(user.id);
      if (result.success) {
        toast.success("Account deletion cancelled. User has been notified.");
        router.refresh();
      } else {
        toast.error(`Failed to cancel deletion: ${result.error}`);
      }
      setShowMenu(false);
    });
  };

  const handlePasswordReset = () => {
    if (!confirm("Send password reset email to this user?")) return;

    startTransition(async () => {
      const result = await sendPasswordReset(user.id);
      if (result.success) {
        toast.success(
          result.message || "Password reset email sent successfully."
        );
      } else {
        toast.error(result.error || "Failed to send password reset");
      }
      setShowMenu(false);
    });
  };

  return (
    <div className="relative">
      {/* Main Action Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isPending}
        className="group relative w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-lg sm:rounded-xl hover:from-slate-800 hover:to-slate-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 sm:gap-3 shadow-sm sm:shadow-lg hover:shadow-xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <Shield className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
        <span className="font-semibold text-sm sm:text-base relative z-10">
          Admin Actions
        </span>
        {showMenu ? (
          <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 transition-transform duration-200" />
        ) : (
          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 transition-transform duration-200" />
        )}
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm sm:backdrop-blur-none sm:bg-transparent"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-72 bg-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-1.5 sm:p-2 space-y-1">
              {/* Change Role */}
              <button
                onClick={() => {
                  setShowRoleModal(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 rounded-lg flex items-center gap-2 sm:gap-3 text-sm font-medium text-slate-700 transition-all duration-200 group"
              >
                <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg group-hover:bg-blue-500 group-hover:scale-110 transition-all duration-200">
                  <UserCog className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 group-hover:text-white" />
                </div>
                <span className="group-hover:text-blue-700 text-xs sm:text-sm">
                  Change Role
                </span>
              </button>

              {/* Change Plan */}
              <button
                onClick={() => {
                  setShowPlanModal(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-indigo-100 rounded-lg flex items-center gap-2 sm:gap-3 text-sm font-medium text-slate-700 transition-all duration-200 group"
              >
                <div className="p-1.5 sm:p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-500 group-hover:scale-110 transition-all duration-200">
                  <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 group-hover:text-white" />
                </div>
                <span className="group-hover:text-indigo-700 text-xs sm:text-sm">
                  Change Plan
                </span>
              </button>

              {/* Ban/Unban */}
              <button
                onClick={handleBanToggle}
                className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 rounded-lg flex items-center gap-2 sm:gap-3 text-sm font-medium text-slate-700 transition-all duration-200 group"
              >
                <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg group-hover:bg-red-500 group-hover:scale-110 transition-all duration-200">
                  {user.isBanned ? (
                    <LockOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 group-hover:text-white" />
                  ) : (
                    <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 group-hover:text-white" />
                  )}
                </div>
                <span className="group-hover:text-red-700 text-xs sm:text-sm">
                  {user.isBanned ? "Unban User" : "Ban User"}
                </span>
              </button>

              {/* Deletion Actions */}
              {user.deletionScheduledAt ? (
                <button
                  onClick={handleCancelDeletion}
                  className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100 rounded-lg flex items-center gap-2 sm:gap-3 text-sm font-medium text-slate-700 transition-all duration-200 group"
                >
                  <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-500 group-hover:scale-110 transition-all duration-200">
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 group-hover:text-white" />
                  </div>
                  <span className="group-hover:text-emerald-700 text-xs sm:text-sm">
                    Cancel Deletion
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 rounded-lg flex items-center gap-2 sm:gap-3 text-sm font-medium text-slate-700 transition-all duration-200 group"
                >
                  <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg group-hover:bg-orange-500 group-hover:scale-110 transition-all duration-200">
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600 group-hover:text-white" />
                  </div>
                  <span className="group-hover:text-orange-700 text-xs sm:text-sm">
                    Schedule Deletion
                  </span>
                </button>
              )}

              {/* Password Reset */}
              <button
                onClick={handlePasswordReset}
                className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 rounded-lg flex items-center gap-2 sm:gap-3 text-sm font-medium text-slate-700 transition-all duration-200 group"
              >
                <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg group-hover:bg-purple-500 group-hover:scale-110 transition-all duration-200">
                  <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 group-hover:text-white" />
                </div>
                <span className="group-hover:text-purple-700 text-xs sm:text-sm">
                  Send Password Reset
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-md w-full mx-auto shadow-xl sm:shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl">
                <UserCog className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Change User Role
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Select a new role for this user
                </p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
              {(["CLIENT", "PROVIDER", "ADMIN"] as const).map((role) => (
                <label
                  key={role}
                  className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedRole === role
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={selectedRole === role}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600"
                  />
                  <span
                    className={`text-sm font-semibold ${
                      selectedRole === role ? "text-blue-900" : "text-slate-700"
                    }`}
                  >
                    {role}
                  </span>
                  {selectedRole === role && (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 ml-auto" />
                  )}
                </label>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowRoleModal(false)}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-slate-200 rounded-lg sm:rounded-xl hover:bg-slate-50 font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={isPending || selectedRole === user.role}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </span>
                ) : (
                  "Update Role"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Change Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-md w-full mx-auto shadow-xl sm:shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 bg-indigo-100 rounded-lg sm:rounded-xl">
                <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Change Subscription Plan
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Select a new plan for this user
                </p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
              {(["FREE", "PRO", "BUSINESS"] as const).map((plan) => (
                <label
                  key={plan}
                  className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedPlan === plan
                      ? "border-indigo-500 bg-indigo-50 shadow-md"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan}
                    checked={selectedPlan === plan}
                    onChange={(e) => setSelectedPlan(e.target.value as any)}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600"
                  />
                  <span
                    className={`text-sm font-semibold ${
                      selectedPlan === plan
                        ? "text-indigo-900"
                        : "text-slate-700"
                    }`}
                  >
                    {plan}
                  </span>
                  {selectedPlan === plan && (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 ml-auto" />
                  )}
                </label>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-slate-200 rounded-lg sm:rounded-xl hover:bg-slate-50 font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handlePlanChange}
                disabled={isPending || selectedPlan === user.subscription?.plan}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg sm:rounded-xl hover:from-indigo-700 hover:to-indigo-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </span>
                ) : (
                  "Update Plan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-md w-full mx-auto shadow-xl sm:shadow-2xl border border-red-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 bg-red-100 rounded-lg sm:rounded-xl">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Schedule Deletion
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  This action will schedule account deletion
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-red-50 border-2 border-red-200 rounded-lg sm:rounded-xl mb-4 sm:mb-6">
              <p className="text-xs sm:text-sm text-red-900 font-medium">
                The account will be deleted in 30 days. The user will be
                notified via email.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Reason for Deletion *
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter the reason for scheduling this account deletion..."
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-slate-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none transition-all duration-200 text-sm"
                rows={3}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-slate-200 rounded-lg sm:rounded-xl hover:bg-slate-50 font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleDeletion}
                disabled={isPending || !deleteReason.trim()}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg sm:rounded-xl hover:from-red-700 hover:to-red-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Scheduling...
                  </span>
                ) : (
                  "Schedule Deletion"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
