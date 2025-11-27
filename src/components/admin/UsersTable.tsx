'use client';

import { useState, useTransition } from 'react';
import { verifyProvider, toggleBanUser } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: Date;
  isBanned: boolean;
  profile?: {
    verificationStatus: string | null;
    isVerified: boolean;
  } | null;
}

interface UsersTableProps {
  users: User[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export default function UsersTable({ users, total, currentPage, totalPages }: UsersTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleVerify = (userId: string, status: 'VERIFIED' | 'REJECTED') => {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this provider?`)) return;
    
    startTransition(async () => {
      await verifyProvider(userId, status);
      router.refresh();
    });
  };

  const handleBan = (userId: string, isBanned: boolean) => {
    if (!confirm(`Are you sure you want to ${isBanned ? 'ban' : 'unban'} this user?`)) return;

    startTransition(async () => {
      await toggleBanUser(userId, isBanned);
      router.refresh();
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{user.name || 'No Name'}</span>
                    <span className="text-slate-500 text-xs">{user.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'PROVIDER' ? 'bg-purple-50 text-purple-700' :
                    user.role === 'ADMIN' ? 'bg-slate-100 text-slate-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {user.isBanned && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 w-fit">
                        Banned
                      </span>
                    )}
                    {user.role === 'PROVIDER' && user.profile && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${
                        user.profile.verificationStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' :
                        user.profile.verificationStatus === 'REJECTED' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {user.profile.verificationStatus || 'PENDING'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <span className="material-symbols-outlined text-[20px]">visibility</span>
                    </button>

                    {user.role === 'PROVIDER' && user.profile?.verificationStatus === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleVerify(user.id, 'VERIFIED')}
                          disabled={isPending}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Verify Provider"
                        >
                          <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        </button>
                        <button
                          onClick={() => handleVerify(user.id, 'REJECTED')}
                          disabled={isPending}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Reject Provider"
                        >
                          <span className="material-symbols-outlined text-[20px]">cancel</span>
                        </button>
                      </>
                    )}
                    
                    {user.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleBan(user.id, !user.isBanned)}
                        disabled={isPending}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.isBanned 
                            ? 'text-emerald-600 hover:bg-emerald-50' 
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={user.isBanned ? "Unban User" : "Ban User"}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {user.isBanned ? 'lock_open' : 'block'}
                        </span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium">{((currentPage - 1) * 10) + 1}</span> - <span className="font-medium">{Math.min(currentPage * 10, total)}</span> of <span className="font-medium">{total}</span> users
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => router.push(`?page=1`)}
            className="px-2 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            title="First page"
          >
            <span className="material-symbols-outlined text-base">keyboard_double_arrow_left</span>
          </button>
          <button
            disabled={currentPage <= 1}
            onClick={() => router.push(`?page=${currentPage - 1}`)}
            className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            Previous
          </button>
          
          {/* Page numbers */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => router.push(`?page=${pageNum}`)}
                  className={`px-3 py-1 text-sm rounded-lg transition-all ${
                    currentPage === pageNum
                      ? 'bg-emerald-600 text-white font-semibold shadow-md'
                      : 'border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => router.push(`?page=${currentPage + 1}`)}
            className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            Next
          </button>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => router.push(`?page=${totalPages}`)}
            className="px-2 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            title="Last page"
          >
            <span className="material-symbols-outlined text-base">keyboard_double_arrow_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
