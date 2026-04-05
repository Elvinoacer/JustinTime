"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  detectCurrentLocation,
  getGeolocationPermissionState,
  getLocationFailureToastMessage,
  getLocationFallbackToastMessage,
  type DetectedLocation,
  type LocationSource as SharedLocationSource,
} from "@/lib/utils/geolocation";

export type LocationSource = SharedLocationSource;
export type LocationStatus =
  | "IDLE"
  | "LOADING"
  | "SUCCESS"
  | "DENIED"
  | "FAILED";

interface LocationResult {
  latitude: number | null;
  longitude: number | null;
  address: string;
  source: LocationSource;
  accuracy: number | null;
}

interface UseLocationReturn {
  location: LocationResult;
  status: LocationStatus;
  permissionStatus: PermissionState | null;
  getLocation: () => Promise<void>;
  prefillIfPermitted: () => Promise<void>;
  setManualAddress: (address: string) => void;
  setLocationResult: (result: Partial<LocationResult>) => void;
}

function normalizeAddress(location: DetectedLocation): string {
  const candidate = location.address?.trim();
  if (candidate) {
    return candidate;
  }

  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

function statusFromDetection(_location: DetectedLocation): LocationStatus {
  // A detected fallback location is still a usable success state.
  return "SUCCESS";
}

function isPermissionDeniedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /permission denied/i.test(error.message);
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationResult>({
    latitude: null,
    longitude: null,
    address: "",
    source: "MANUAL",
    accuracy: null,
  });
  const [status, setStatus] = useState<LocationStatus>("IDLE");
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState | null>(null);

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("permissions" in navigator) ||
      typeof navigator.permissions?.query !== "function"
    ) {
      return;
    }

    let permissionRef: PermissionStatus | null = null;

    const bindPermissionListener = async () => {
      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });
        permissionRef = permission;
        setPermissionStatus(permission.state);

        permission.onchange = () => {
          setPermissionStatus(permission.state);
          if (permission.state === "granted") {
            setStatus((current) => (current === "DENIED" ? "IDLE" : current));
          }
        };
      } catch {
        // Ignore unsupported permission listeners.
      }
    };

    void bindPermissionListener();

    return () => {
      if (permissionRef) {
        permissionRef.onchange = null;
      }
    };
  }, []);

  const applyDetectedLocation = useCallback(
    (detected: DetectedLocation, options?: { notify?: boolean }) => {
      setLocation({
        latitude: detected.latitude,
        longitude: detected.longitude,
        address: normalizeAddress(detected),
        source: detected.source,
        accuracy: detected.accuracy,
      });
      setStatus(statusFromDetection(detected));
      if (detected.fallbackReason === "permission_denied") {
        setPermissionStatus("denied");
      }

      if (options?.notify && detected.source === "IP") {
        const fallbackMessage = getLocationFallbackToastMessage(detected);
        if (fallbackMessage) {
          toast.info(fallbackMessage);
        }
      }
    },
    [],
  );

  const getLocation = useCallback(async () => {
    setStatus("LOADING");

    const permission = await getGeolocationPermissionState();
    if (permission) {
      setPermissionStatus(permission);
    }

    try {
      const detected = await detectCurrentLocation();
      applyDetectedLocation(detected, { notify: true });
    } catch (error) {
      const denied = permission === "denied" || isPermissionDeniedError(error);
      setStatus(denied ? "DENIED" : "FAILED");
      toast.error(getLocationFailureToastMessage(error));
    }
  }, [applyDetectedLocation]);

  const prefillIfPermitted = useCallback(async () => {
    const permission = await getGeolocationPermissionState();
    if (!permission) {
      return;
    }

    setPermissionStatus(permission);

    // Avoid surprise prompts: prefill only when browser already has a stored decision.
    if (permission !== "granted" && permission !== "denied") {
      return;
    }

    setStatus("LOADING");
    try {
      const detected = await detectCurrentLocation();
      applyDetectedLocation(detected);
    } catch (error) {
      const denied = permission === "denied" || isPermissionDeniedError(error);
      setStatus(denied ? "DENIED" : "FAILED");
    }
  }, [applyDetectedLocation]);

  const setManualAddress = useCallback((address: string) => {
    setLocation((prev) => ({
      ...prev,
      address,
      source: "MANUAL",
    }));
  }, []);

  const setLocationResult = useCallback((result: Partial<LocationResult>) => {
    setLocation((prev) => ({ ...prev, ...result }));
  }, []);

  return {
    location,
    status,
    permissionStatus,
    getLocation,
    prefillIfPermitted,
    setManualAddress,
    setLocationResult,
  };
}
