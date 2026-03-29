import React from 'react';
import { ShieldCheck, ShieldAlert, BadgeInfo } from 'lucide-react';

interface MessageSecurityBannerProps {
  onReportUser: () => void;
  onOpenSafety: () => void;
  partnerName: string;
}

export function MessageSecurityBanner({
  onReportUser,
  onOpenSafety,
  partnerName,
}: MessageSecurityBannerProps) {
  return (
    <div className="bg-emerald-50 border-b border-emerald-100 p-2 sm:p-3 flex items-start sm:items-center justify-between shadow-sm">
      <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0 bg-emerald-100 p-1.5 rounded-full mt-0.5 sm:mt-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-semibold text-emerald-800 flex items-center gap-1.5 truncate">
            End-to-End Protected
            <BadgeInfo className="w-3 h-3 text-emerald-500 hidden sm:inline" />
          </p>
          <p className="text-[10px] sm:text-xs text-emerald-600/80 truncate">
            Messages and calls are secured. Nobody outside this chat can read or listen to them.
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 ml-2">
        <button
          onClick={onOpenSafety}
          className="text-[10px] sm:text-xs bg-emerald-600 text-white px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-md hover:bg-emerald-700 transition shadow-sm font-medium whitespace-nowrap"
        >
          Safety Center
        </button>
        <button
          onClick={onReportUser}
          className="text-[10px] sm:text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-md transition font-medium whitespace-nowrap hidden sm:flex items-center gap-1"
          title={`Report ${partnerName}`}
        >
          <ShieldAlert className="w-3 h-3" /> Report
        </button>
      </div>
    </div>
  );
}
