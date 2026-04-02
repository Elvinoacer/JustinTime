"use client";

import { useState } from "react";
import { triggerSOS } from "@/app/actions/safety";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  detectCurrentLocation,
  getLocationFailureToastMessage,
  getLocationFallbackToastMessage,
} from "@/lib/utils/geolocation";

export default function PanicButton({
  className = "",
}: {
  className?: string;
}) {
  const [triggered, setTriggered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  // In a real app we'd use a long-press hook.
  // For this MVP, we'll use a confirm dialog or double click, but user asked for robust UI.
  // Let's implement a simple "Double Tap" or "Click and confirm" to avoid accidents.

  const handleTrigger = async () => {
    if (loading) return;

    setLoading(true);
    toast.info("Acquiring location...", { duration: 2000 });

    try {
      const detected = await detectCurrentLocation();

      if (detected.source === "IP") {
        toast.info(
          getLocationFallbackToastMessage(detected) ||
            "Using approximate location from your network.",
          { duration: 3500 },
        );
      }

      const detailsParts = [`Source: ${detected.source}`];
      if (detected.accuracy != null) {
        detailsParts.push(`Accuracy: ${Math.round(detected.accuracy)}m`);
      }
      if (detected.address) {
        detailsParts.push(`Address: ${detected.address}`);
      }

      const result = await triggerSOS({
        latitude: detected.latitude,
        longitude: detected.longitude,
        details: detailsParts.join(" | "),
      });

      if (result.success) {
        toast.success("SOS Alert Sent! Helpers have been notified.");
        setTriggered(true);
      } else {
        toast.error(
          "Failed to send SOS. Please call emergency services directly.",
        );
      }
    } catch (error) {
      console.error(error);
      toast.error(getLocationFailureToastMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleTrigger}
      disabled={loading || triggered}
      className={`group relative flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:grayscale ${className}`}
      title="Emergency Panic Button"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <ShieldAlert className="w-5 h-5 group-hover:animate-pulse" />
      )}
      <span>{loading ? "SENDING..." : "SOS ALERT"}</span>

      {/* Ripple effect container could go here */}
    </button>
  );
}
