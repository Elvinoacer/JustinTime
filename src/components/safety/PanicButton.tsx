"use client";

import { useState, type FormEvent } from "react";
import { triggerSOS } from "@/app/actions/safety";
import { Loader2, ShieldAlert, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import {
  detectCurrentLocation,
  getLocationFailureToastMessage,
} from "@/lib/utils/geolocation";

async function geocodeEmergencyAddress(address: string) {
  const query = address.trim();
  if (!query) {
    throw new Error("Emergency address is required");
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    {
      headers: {
        "Accept-Language": "en",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to locate the provided address");
  }

  const payload = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
  }>;

  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("Could not map that address. Please be more specific.");
  }

  const first = payload[0];
  const latitude = Number(first.lat);
  const longitude = Number(first.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Mapped address returned invalid coordinates");
  }

  return {
    latitude,
    longitude,
    normalizedAddress: first.display_name || query,
  };
}

export default function PanicButton({
  className = "",
}: {
  className?: string;
}) {
  const [triggered, setTriggered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const sendSos = async (payload: {
    latitude: number;
    longitude: number;
    details: string;
    accuracy?: number | null;
  }) => {
    const result = await triggerSOS(payload);

    if (result.success) {
      toast.success("SOS Alert Sent! Helpers have been notified.");
      setTriggered(true);
      return;
    }

    throw new Error(result.error || "Failed to send SOS");
  };

  const handleTrigger = async () => {
    if (loading) return;

    setLoading(true);
    toast.info("Acquiring location...", { duration: 2000 });

    try {
      const detected = await detectCurrentLocation();

      if (detected.source === "IP") {
        setShowManualAddress(true);
        toast.error(
          "SOS requires precise GPS. Enter your emergency address now.",
          { duration: 5000 },
        );
        return;
      }

      const detailsParts = [`Source: ${detected.source}`];
      if (detected.accuracy != null) {
        detailsParts.push(`Accuracy: ${Math.round(detected.accuracy)}m`);
      }
      if (detected.address) {
        detailsParts.push(`Address: ${detected.address}`);
      }

      await sendSos({
        latitude: detected.latitude,
        longitude: detected.longitude,
        details: detailsParts.join(" | "),
        accuracy: detected.accuracy,
      });
    } catch (error) {
      console.error(error);
      toast.error(getLocationFailureToastMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!manualAddress.trim()) {
      toast.error("Enter your emergency address or nearby landmark.");
      return;
    }

    setManualSubmitting(true);
    try {
      const mapped = await geocodeEmergencyAddress(manualAddress);

      await sendSos({
        latitude: mapped.latitude,
        longitude: mapped.longitude,
        details: `Source: MANUAL_ADDRESS | Address: ${mapped.normalizedAddress}`,
        accuracy: null,
      });

      setShowManualAddress(false);
      setManualAddress("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not use that emergency address.",
      );
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <>
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
      </button>

      {showManualAddress && (
        <div className="fixed inset-0 z-[10000] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                Emergency Address Required
              </h3>
              <button
                type="button"
                onClick={() => setShowManualAddress(false)}
                className="p-1.5 rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                GPS location could not be confirmed. Enter your current address,
                nearest landmark, or cross streets to continue SOS dispatch.
              </p>
              <textarea
                rows={3}
                value={manualAddress}
                onChange={(event) => setManualAddress(event.target.value)}
                placeholder="Example: Mombasa Road near ABC Petrol Station, Gate 3"
                className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 text-sm"
              />
              <button
                type="submit"
                disabled={manualSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold disabled:opacity-60"
              >
                {manualSubmitting
                  ? "Sending SOS..."
                  : "Send SOS with Manual Address"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
