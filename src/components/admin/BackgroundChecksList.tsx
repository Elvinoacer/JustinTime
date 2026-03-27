"use client";
import { BackgroundCheck, User, Profile } from "@/generated/prisma/client";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, XCircle, FileText, User as UserIcon, Calendar, ExternalLink } from "lucide-react";
import { useState, useTransition } from "react";
import { approveBackgroundCheck, rejectBackgroundCheck } from "@/app/actions/verification";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type BackgroundCheckWithProvider = BackgroundCheck & {
  provider: User & {
    profile: Profile | null;
  };
};

interface BackgroundChecksListProps {
  checks: BackgroundCheckWithProvider[];
}

export default function BackgroundChecksList({ checks }: BackgroundChecksListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = (checkId: string, action: "APPROVE" | "REJECT") => {
    if (!confirm(`Are you sure you want to ${action.toLowerCase()} this background check?`)) return;

    setProcessingId(checkId);
    startTransition(async () => {
      let result;
      if (action === "APPROVE") {
        result = await approveBackgroundCheck(checkId);
      } else {
        const reason = prompt("Enter rejection reason (optional):");
        if (reason === null) return; // Cancelled
        result = await rejectBackgroundCheck(checkId, reason || "No reason provided");
      }

      if (result.success) {
        toast.success(`Background check ${action.toLowerCase()}ed`);
        router.refresh();
      } else {
        toast.error(`Failed to ${action.toLowerCase()} check`);
      }
      setProcessingId(null);
    });
  };

  if (checks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900">No Background Checks Found</h3>
        <p className="text-slate-500 text-sm">There are no pending background checks to review.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {checks.map((check) => (
        <div key={check.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                {check.provider.image ? (
                  <img src={check.provider.image} alt={check.provider.name || ''} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-slate-500" />
                )}
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">{check.provider.name || 'Unknown Provider'}</h4>
                <p className="text-xs text-slate-500">{check.provider.email}</p>
              </div>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              check.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' :
              check.status === 'CLEARED' ? 'bg-emerald-100 text-emerald-700' :
              'bg-red-100 text-red-700'
            }`}>
              {check.status}
            </span>
          </div>
          
          <div className="p-4 flex-1 space-y-4">
            <div className="text-sm">
                <span className="text-slate-500 block mb-1">Document:</span>
                <a 
                    href={check.dciCertificateUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline font-medium p-2 bg-blue-50 rounded-lg"
                >
                    <FileText className="w-4 h-4" />
                    View Certificate
                    <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="w-3 h-3" />
                Submitted: {formatDate(check.submittedAt)}
            </div>
          </div>

          {check.status === 'SUBMITTED' && (
            <div className="p-3 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAction(check.id, "APPROVE")}
                disabled={isPending && processingId === check.id}
                className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => handleAction(check.id, "REJECT")}
                disabled={isPending && processingId === check.id}
                className="flex items-center justify-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
