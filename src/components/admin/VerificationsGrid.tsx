'use client';

import { verifyProvider } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: Date;
  profile?: {
    bio: string | null;
    phone: string | null;
    location: string | null;
    verificationStatus: string | null;
    businessName: string | null;
    address: string | null;
  } | null;
}

interface VerificationsGridProps {
  users: User[];
  total: number;
  currentPage: number;
  totalPages: number;
  currentStatus: string;
}

export default function VerificationsGrid({ users, total, currentPage, totalPages, currentStatus }: VerificationsGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleVerify = (userId: string, status: 'VERIFIED' | 'REJECTED') => {
    const action = status === 'VERIFIED' ? 'verify' : 'reject';
    if (!confirm(`Are you sure you want to ${action} this provider?`)) return;

    setProcessingId(userId);
    startTransition(async () => {
      await verifyProvider(userId, status);
      setProcessingId(null);
      router.refresh();
    });
  };

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">folder_off</span>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Providers Found</h3>
        <p className="text-slate-500 text-sm">
          {currentStatus === 'PENDING' && 'No pending verification requests at the moment.'}
          {currentStatus === 'VERIFIED' && 'No verified providers yet.'}
          {currentStatus === 'REJECTED' && 'No rejected providers.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Providers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 border-b border-purple-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-lg">{user.name || 'No Name'}</h3>
                  {user.profile?.businessName && (
                    <p className="text-sm text-purple-700 font-medium">{user.profile.businessName}</p>
                  )}
                  <p className="text-xs text-slate-600 mt-1">{user.email}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  user.profile?.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                  user.profile?.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {user.profile?.verificationStatus || 'PENDING'}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3">
              {user.profile?.bio && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Bio</p>
                  <p className="text-sm text-slate-700 line-clamp-2">{user.profile.bio}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                {user.profile?.phone && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Phone</p>
                    <p className="text-sm text-slate-900 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">phone</span>
                      {user.profile.phone}
                    </p>
                  </div>
                )}
                
                {user.profile?.location && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Location</p>
                    <p className="text-sm text-slate-900 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {user.profile.location}
                    </p>
                  </div>
                )}
              </div>

              {user.profile?.address && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Address</p>
                  <p className="text-sm text-slate-700">{user.profile.address}</p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  Joined: {new Date(user.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            {/* Card Actions */}
            {user.profile?.verificationStatus === 'PENDING' && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
                <button
                  onClick={() => handleVerify(user.id, 'VERIFIED')}
                  disabled={isPending && processingId === user.id}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  {isPending && processingId === user.id ? 'Processing...' : 'Verify'}
                </button>
                <button
                  onClick={() => handleVerify(user.id, 'REJECTED')}
                  disabled={isPending && processingId === user.id}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">cancel</span>
                  {isPending && processingId === user.id ? 'Processing...' : 'Reject'}
                </button>
              </div>
            )}
            
            {user.profile?.verificationStatus === 'VERIFIED' && (
              <div className="p-3 bg-emerald-50 border-t border-emerald-200 text-center">
                <p className="text-sm text-emerald-700 font-medium flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-base">verified</span>
                  Provider Verified
                </p>
              </div>
            )}
            
            {user.profile?.verificationStatus === 'REJECTED' && (
              <div className="p-3 bg-red-50 border-t border-red-200 text-center">
                <p className="text-sm text-red-700 font-medium flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-base">cancel</span>
                  Verification Rejected
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => router.push(`?status=${currentStatus}&page=${currentPage - 1}`)}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
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
                  onClick={() => router.push(`?status=${currentStatus}&page=${pageNum}`)}
                  className={`px-3 py-2 text-sm rounded-lg transition-all ${
                    currentPage === pageNum
                      ? 'bg-emerald-600 text-white font-semibold shadow-md'
                      : 'border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => router.push(`?status=${currentStatus}&page=${currentPage + 1}`)}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
