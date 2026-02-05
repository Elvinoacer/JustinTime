"use client";

import { MemberStatus } from "@/generated/prisma";
import { MapPin, Phone, Briefcase } from "lucide-react";

interface MemberCardProps {
  member: {
    id: string;
    status: MemberStatus;
    role: string;
    totalJobsCompleted: number;
    totalEarnings: any;
    rating: number;
    lastLocation?: any;
    lastLocationAt?: Date | string | null;
    user: {
      name: string | null;
      image: string | null;
      phone?: string | null;
    };
  };
  onAssign?: (memberId: string) => void;
  onCall?: (phone: string) => void;
  compact?: boolean;
}

const STATUS_CONFIG = {
  ONLINE: { label: 'Online', color: 'bg-emerald-500', dot: '🟢' },
  BUSY: { label: 'Busy', color: 'bg-yellow-500', dot: '🟡' },
  ON_JOB: { label: 'On Job', color: 'bg-blue-500', dot: '🔵' },
  OFFLINE: { label: 'Offline', color: 'bg-gray-400', dot: '⚫' }
};

const ROLE_BADGES = {
  OWNER: { label: 'Owner', color: 'bg-purple-100 text-purple-700' },
  ADMIN: { label: 'Admin', color: 'bg-blue-100 text-blue-700' },
  MEMBER: { label: 'Member', color: 'bg-gray-100 text-gray-700' }
};

export function MemberCard({ member, onAssign, onCall, compact = false }: MemberCardProps) {
  const status = STATUS_CONFIG[member.status] || STATUS_CONFIG.OFFLINE;
  const role = ROLE_BADGES[member.role as keyof typeof ROLE_BADGES] || ROLE_BADGES.MEMBER;
  
  const formatEarnings = (amount: number | any) => 
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(Number(amount) || 0);

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
        <div className="relative">
          <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
            {member.user.image ? (
              <img src={member.user.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-500 font-medium">
                {member.user.name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ${status.color} border-2 border-white`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{member.user.name || 'Unknown'}</p>
          <p className="text-xs text-gray-500">{status.label}</p>
        </div>
        {onAssign && member.status !== 'ON_JOB' && (
          <button
            onClick={() => onAssign(member.id)}
            className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            Assign
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all hover:shadow-md overflow-hidden">
      {/* Header with Status */}
      <div className="p-4 border-b border-gray-100 flex items-center gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-full bg-gray-200 overflow-hidden">
            {member.user.image ? (
              <img src={member.user.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xl text-gray-500 font-medium">
                {member.user.name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ${status.color} border-2 border-white`} />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{member.user.name || 'Unknown'}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${role.color}`}>
              {role.label}
            </span>
            <span className="text-sm text-gray-500">{status.label}</span>
          </div>
        </div>

        {/* Star Rating */}
        <div className="flex items-center gap-1">
          <span className="text-yellow-500">★</span>
          <span className="font-medium text-gray-700">{member.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Briefcase className="h-4 w-4" />
            Jobs Done
          </div>
          <p className="text-xl font-bold text-gray-900">{member.totalJobsCompleted}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3">
          <p className="text-sm text-gray-500 mb-1">Total Earned</p>
          <p className="text-lg font-bold text-emerald-600">{formatEarnings(member.totalEarnings)}</p>
        </div>
      </div>

      {/* Location */}
      {member.lastLocation && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span className="truncate">
              {(member.lastLocation as any)?.address || 'Location available'}
            </span>
            {member.lastLocationAt && (
              <span className="text-xs text-gray-400">
                • {new Date(member.lastLocationAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        {onAssign && member.status !== 'ON_JOB' && (
          <button
            onClick={() => onAssign(member.id)}
            className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            Assign Job
          </button>
        )}
        {onCall && member.user.phone && (
          <button
            onClick={() => onCall(member.user.phone!)}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Phone className="h-5 w-5 text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}
