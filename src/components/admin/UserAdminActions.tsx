'use client';

import { useState, useTransition } from 'react';
import { toggleBanUser, updateUserRole, scheduleUserDeletion, cancelUserDeletion, sendPasswordReset } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

interface UserAdminActionsProps {
  user: any;
}

export default function UserAdminActions({ user }: UserAdminActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showMenu, setShowMenu] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [deleteReason, setDeleteReason] = useState('');

  const handleBanToggle = () => {
    if (!confirm(`Are you sure you want to ${user.isBanned ? 'unban' : 'ban'} this user?`)) return;
    
    startTransition(async () => {
      await toggleBanUser(user.id, !user.isBanned);
      router.refresh();
      setShowMenu(false);
    });
  };

  const handleRoleChange = () => {
    startTransition(async () => {
      await updateUserRole(user.id, selectedRole);
      router.refresh();
      setShowRoleModal(false);
      setShowMenu(false);
    });
  };

  const handleScheduleDeletion = () => {
    if (!deleteReason.trim()) {
      alert('Please provide a reason for deletion');
      return;
    }

    startTransition(async () => {
      await scheduleUserDeletion(user.id, deleteReason);
      router.refresh();
      setShowDeleteModal(false);
      setShowMenu(false);
    });
  };

  const handleCancelDeletion = () => {
    if (!confirm('Cancel scheduled deletion?')) return;

    startTransition(async () => {
      await cancelUserDeletion(user.id);
      router.refresh();
      setShowMenu(false);
    });
  };

  const handlePasswordReset = () => {
    if (!confirm('Send password reset email to this user?')) return;

    startTransition(async () => {
      const result = await sendPasswordReset(user.id);
      if (result.success) {
        alert(result.message);
      } else {
        alert(result.error);
      }
      setShowMenu(false);
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isPending}
        className="group relative px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-700 transition-all duration-200 disabled:opacity-50 flex items-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <span className="material-symbols-outlined text-xl relative z-10">admin_panel_settings</span>
        <span className="font-semibold relative z-10">Admin Actions</span>
        <span className="material-symbols-outlined text-xl relative z-10 transition-transform duration-200">
          {showMenu ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2">
              <button
                onClick={() => {
                  setShowRoleModal(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 rounded-xl flex items-center gap-3 text-sm font-medium text-slate-700 transition-all duration-200 group"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-500 group-hover:scale-110 transition-all duration-200">
                  <span className="material-symbols-outlined text-lg text-blue-600 group-hover:text-white">badge</span>
                </div>
                <span className="group-hover:text-blue-700">Change Role</span>
              </button>

              <button
                onClick={handleBanToggle}
                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 rounded-xl flex items-center gap-3 text-sm font-medium text-slate-700 transition-all duration-200 group"
              >
                <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-500 group-hover:scale-110 transition-all duration-200">
                  <span className="material-symbols-outlined text-lg text-red-600 group-hover:text-white">
                    {user.isBanned ? 'lock_open' : 'block'}
                  </span>
                </div>
                <span className="group-hover:text-red-700">{user.isBanned ? 'Unban User' : 'Ban User'}</span>
              </button>

              {user.deletionScheduledAt ? (
                <button
                  onClick={handleCancelDeletion}
                  className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100 rounded-xl flex items-center gap-3 text-sm font-medium text-slate-700 transition-all duration-200 group"
                >
                  <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-500 group-hover:scale-110 transition-all duration-200">
                    <span className="material-symbols-outlined text-lg text-emerald-600 group-hover:text-white">restore</span>
                  </div>
                  <span className="group-hover:text-emerald-700">Cancel Deletion</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 rounded-xl flex items-center gap-3 text-sm font-medium text-slate-700 transition-all duration-200 group"
                >
                  <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-500 group-hover:scale-110 transition-all duration-200">
                    <span className="material-symbols-outlined text-lg text-orange-600 group-hover:text-white">delete</span>
                  </div>
                  <span className="group-hover:text-orange-700">Schedule Deletion</span>
                </button>
              )}

              <button
                onClick={handlePasswordReset}
                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 rounded-xl flex items-center gap-3 text-sm font-medium text-slate-700 transition-all duration-200 group"
              >
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-500 group-hover:scale-110 transition-all duration-200">
                  <span className="material-symbols-outlined text-lg text-purple-600 group-hover:text-white">key</span>
                </div>
                <span className="group-hover:text-purple-700">Send Password Reset</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Enhanced Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-xl">
                <span className="material-symbols-outlined text-3xl text-blue-600">badge</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Change User Role</h3>
                <p className="text-sm text-slate-500">Select a new role for this user</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {(['CLIENT', 'PROVIDER', 'ADMIN'] as const).map((role) => (
                <label 
                  key={role} 
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedRole === role 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={selectedRole === role}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className={`text-sm font-semibold ${
                    selectedRole === role ? 'text-blue-900' : 'text-slate-700'
                  }`}>
                    {role}
                  </span>
                  {selectedRole === role && (
                    <span className="material-symbols-outlined text-blue-600 ml-auto">check_circle</span>
                  )}
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRoleModal(false)}
                className="flex-1 px-6 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={isPending || selectedRole === user.role}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </span>
                ) : (
                  'Update Role'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-red-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-100 rounded-xl">
                <span className="material-symbols-outlined text-3xl text-red-600">delete_forever</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Schedule Deletion</h3>
                <p className="text-sm text-slate-500">This action will schedule account deletion</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl mb-6">
              <p className="text-sm text-red-900 font-medium">
                The account will be deleted in 30 days. The user will be notified via email.
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
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none transition-all duration-200"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleDeletion}
                disabled={isPending || !deleteReason.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Scheduling...
                  </span>
                ) : (
                  'Schedule Deletion'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
