"use client";

import { useState } from "react";
import { initiateSecureCall } from "@/app/actions/communication";
import { Lock, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

interface SecureCallButtonProps {
  bookingId: string;
  className?: string;
  label?: string;
}

export default function SecureCallButton({
  bookingId,
  className = "",
  label = "Cellular Secure Line (No Internet Required)",
}: SecureCallButtonProps) {
  const [session, setSession] = useState<{
    virtualNumber: string;
    accessCode: string;
    expiresAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReveal = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (session) return; // Already revealed

    setLoading(true);
    try {
      const result = await initiateSecureCall(bookingId);
      if (result.success && result.data) {
        setSession(result.data);
        toast.success("Secure cellular line ready");
      } else {
        toast.error("Could not generate secure line.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  if (session) {
    return (
      <div
        className={`flex flex-col items-start bg-emerald-50 border border-emerald-200 rounded-lg p-3 animate-in fade-in zoom-in duration-200 ${className}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-lg font-bold text-emerald-700 tracking-wide select-all">
            {session.virtualNumber}
          </span>
        </div>
        <div className="flex items-center gap-4 w-full">
          <div className="bg-white px-2 py-0.5 rounded border border-emerald-100 text-xs text-gray-500 font-medium">
            Ext:{" "}
            <span className="font-bold text-gray-900 select-all">
              {session.accessCode}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600/80">
            <Clock className="w-3 h-3" />
            <span>Expires in 2h</span>
          </div>
        </div>
        <a
          href={`tel:${session.virtualNumber},,${session.accessCode}`}
          className="mt-2 w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 rounded transition-colors"
        >
          Dial Now
        </a>
      </div>
    );
  }

  return (
    <button
      onClick={handleReveal}
      disabled={loading}
      className={`group relative overflow-hidden flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm active:scale-95 disabled:opacity-70 ${className}`}
      title="Cellular secure line (no internet required)"
    >
      {/* Privacy Shield Effect */}
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Connecting...</span>
        </>
      ) : (
        <>
          <Lock className="w-4 h-4 text-emerald-400" />
          <span className="text-sm">{label}</span>
        </>
      )}
    </button>
  );
}
