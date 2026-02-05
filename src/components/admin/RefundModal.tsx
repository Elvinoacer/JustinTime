"use client";

import { useState, useTransition } from "react";
import { processManualRefund } from "@/app/actions/admin";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  X,
  AlertTriangle,
  Banknote,
  Info,
} from "lucide-react";

interface RefundModalProps {
  booking: {
    id: string;
    totalAmount: number;
    client: { name: string | null };
  };
  onClose: () => void;
}

export default function RefundModal({ booking, onClose }: RefundModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState<string>(booking.totalAmount.toString());
  const [reason, setReason] = useState("");

  const handleRefund = () => {
    const refundAmount = parseFloat(amount);
    
    if (isNaN(refundAmount) || refundAmount <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }

    if (refundAmount > booking.totalAmount) {
       if(!confirm(`Warning: The refund amount (KES ${refundAmount}) is greater than the booking total (KES ${booking.totalAmount}). Proceed?`)) {
         return;
       }
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for the refund");
      return;
    }

    startTransition(async () => {
      const result = await processManualRefund(booking.id, refundAmount, reason);
      if (result.success) {
        toast.success("Manual refund processed successfully");
        router.refresh();
        onClose();
      } else {
        toast.error(result.error || "Failed to process refund");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Banknote className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Manual Refund</h3>
              <p className="text-xs text-emerald-700 font-medium">Booking #{booking.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 leading-relaxed">
              Processing a manual refund will credit the client's wallet and update the booking status to <strong>CANCELLED</strong>. This action is recorded in the audit logs.
            </div>
          </div>

          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-1.5">
               Client
             </label>
             <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900">
               {booking.client.name || "Unknown"}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Booking Total
                </label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900">
                  KES {booking.totalAmount.toLocaleString()}
                </div>
             </div>
             <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Refund Amount (KES)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
             </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Reason for Refund
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Service not provided as expected, Duplicate payment..."
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
              rows={3}
            />
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
             <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
             <p className="text-[11px] text-amber-700 font-medium">
               Funds will be immediately available in the user's wallet. Ensure the reason is clearly documented for audit purposes.
             </p>
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRefund}
            disabled={isPending}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isPending ? (
               <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Banknote className="w-4 h-4" />
            )}
            Process Refund
          </button>
        </div>
      </div>
    </div>
  );
}
