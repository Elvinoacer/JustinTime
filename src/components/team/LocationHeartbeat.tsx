"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { updateMemberLocation } from "@/app/actions/team";
import {
  detectCurrentLocation,
  getLocationFailureToastMessage,
  getLocationFallbackToastMessage,
} from "@/lib/utils/geolocation";

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

interface LocationHeartbeatProps {
  teamId: string;
}

function formatLastSynced(date: Date | null) {
  if (!date) {
    return "Not synced yet";
  }

  return `Last synced ${date.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function LocationHeartbeat({ teamId }: LocationHeartbeatProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const syncInFlightRef = useRef(false);
  const fallbackToastShownRef = useRef(false);

  const syncLocation = useCallback(
    async (notifyOnSuccess: boolean) => {
      if (syncInFlightRef.current) {
        return;
      }

      syncInFlightRef.current = true;
      setIsSyncing(true);

      try {
        const location = await detectCurrentLocation();
        const result = await updateMemberLocation(
          {
            lat: location.latitude,
            lng: location.longitude,
            address: location.address,
          },
          teamId,
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to sync location");
        }

        setLastSyncedAt(new Date());

        if (notifyOnSuccess) {
          toast.success("Location sync enabled.");
        }

        if (!fallbackToastShownRef.current) {
          const fallbackMessage = getLocationFallbackToastMessage(location);
          if (fallbackMessage) {
            toast.info(fallbackMessage);
            fallbackToastShownRef.current = true;
          }
        }
      } catch (error) {
        toast.error(getLocationFailureToastMessage(error));
        setIsEnabled(false);
      } finally {
        setIsSyncing(false);
        syncInFlightRef.current = false;
      }
    },
    [teamId],
  );

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    void syncLocation(true);

    const intervalId = window.setInterval(() => {
      void syncLocation(false);
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isEnabled, syncLocation]);

  const startSync = () => {
    fallbackToastShownRef.current = false;
    setIsEnabled(true);
  };

  const stopSync = () => {
    setIsEnabled(false);
    setIsSyncing(false);
    syncInFlightRef.current = false;
    toast("Location sync paused.");
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
      <span className="hidden md:inline">{formatLastSynced(lastSyncedAt)}</span>
      {isEnabled ? (
        <button
          type="button"
          onClick={stopSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
        >
          <PauseCircle className="h-3.5 w-3.5" />
          {isSyncing ? "Syncing..." : "Pause GPS Sync"}
        </button>
      ) : (
        <button
          type="button"
          onClick={startSync}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
        >
          <LocateFixed className="h-3.5 w-3.5" />
          Enable GPS Sync
        </button>
      )}
    </div>
  );
}
