"use client";

import { useState, useEffect } from "react";
import { cancelSOS, getActiveSOS } from "@/app/actions/safety";
import { motion, AnimatePresence } from "framer-motion";
import { OctagonAlert, Phone, Loader2, CheckCircle2 } from "lucide-react";
import { socket } from "@/lib/socket";
import { useSession } from "next-auth/react";

export default function SOSOverlay() {
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const checkStatus = async () => {
      const alert = await getActiveSOS();
      setActiveAlert(alert);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    socket.connect();
    socket.emit("join", session.user.id);

    const handleSosUpdate = async (payload: {
      userId?: string;
      status?: "ACTIVE" | "CANCELLED" | "RESOLVED";
      alertId?: string;
    }) => {
      if (!payload?.userId || payload.userId !== session.user.id) {
        return;
      }

      if (payload.status === "ACTIVE") {
        const alert = await getActiveSOS();
        setActiveAlert(alert);
        return;
      }

      if (payload.status === "CANCELLED" || payload.status === "RESOLVED") {
        setActiveAlert(null);
      }
    };

    socket.on("sos_alert_update", handleSosUpdate);

    return () => {
      socket.off("sos_alert_update", handleSosUpdate);
    };
  }, [session?.user?.id]);

  const handleImSafe = async () => {
    if (!activeAlert) return;
    setLoading(true);
    try {
      await cancelSOS(activeAlert.id);
      setActiveAlert(null);
      // Optional: Show success toast
    } catch (error) {
      console.error("Failed to cancel SOS", error);
    } finally {
      setLoading(false);
    }
  };

  if (!activeAlert) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-red-600/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white overflow-hidden"
      >
        {/* Pulsing Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-400 rounded-full blur-3xl opacity-20"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center space-y-8">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl"
          >
            <OctagonAlert className="w-16 h-16 text-red-600 animate-pulse" />
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter uppercase">
              SOS Active
            </h1>
            <p className="text-red-100 text-lg font-medium">
              Sharing live location with trusted contacts...
            </p>
          </div>

          <div className="bg-red-800/50 rounded-xl p-4 w-full backdrop-blur-sm border border-red-400/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-200 text-sm font-semibold uppercase tracking-wider">
                Status
              </span>
              <span className="flex items-center text-white font-bold gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Broadcasting
              </span>
            </div>
            <div className="text-xs text-red-200 font-mono break-all text-left">
              ID: {activeAlert.id}
            </div>
            <div className="mt-4 flex gap-3">
              <button className="flex-1 bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-lg flex items-center justify-center gap-2 font-semibold">
                <Phone className="w-4 h-4" /> Call Police
              </button>
              <button className="flex-1 bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-lg flex items-center justify-center gap-2 font-semibold">
                <Phone className="w-4 h-4" /> Call Contact
              </button>
            </div>
          </div>

          {/* Slide/Hold to Cancel UI - Simplifying to button for MVP accessibility */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleImSafe}
            disabled={loading}
            className="w-full bg-white text-red-600 py-4 px-6 rounded-full font-black text-xl shadow-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" /> Stopping...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" /> I'M SAFE - STOP SOS
              </>
            )}
          </motion.button>

          <p className="text-xs text-red-200/60 max-w-xs">
            Pressing this will notify your contacts that you are safe and stop
            location sharing.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
