"use client";
import { useState, useCallback } from "react";
import { getApproximateLocationFromIP } from "@/lib/utils/geolocation";

export type LocationSource = "GPS" | "IP" | "MANUAL";
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

const GPS_OPTIONS_TIERS = [
  { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
  { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
];

const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: {
          "User-Agent": "JustInTime/1.0 (support@gtss.software)",
          "Accept-Language": "en",
        },
        signal: AbortSignal.timeout(5000),
      },
    );
    const data = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
};

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

  const applyLocation = useCallback(
    async (
      lat: number,
      lon: number,
      source: LocationSource,
      accuracy: number | null,
    ) => {
      const address = await reverseGeocode(lat, lon);
      setLocation({ latitude: lat, longitude: lon, address, source, accuracy });
      setStatus("SUCCESS");
    },
    [],
  );

  const requestIPFallback = useCallback(async () => {
    try {
      const approximate = await getApproximateLocationFromIP();
      if (approximate.latitude != null && approximate.longitude != null) {
        setLocation({
          latitude: approximate.latitude,
          longitude: approximate.longitude,
          address:
            approximate.address ||
            `${approximate.latitude.toFixed(5)}, ${approximate.longitude.toFixed(5)}`,
          source: "IP",
          accuracy: null,
        });
        setStatus("SUCCESS");
      } else {
        setStatus("FAILED");
      }
    } catch {
      setStatus("FAILED");
    }
  }, []);

  const requestGPS = useCallback(
    (tier: number = 0) => {
      if (tier >= GPS_OPTIONS_TIERS.length) {
        requestIPFallback();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await applyLocation(
            pos.coords.latitude,
            pos.coords.longitude,
            "GPS",
            pos.coords.accuracy,
          );
        },
        (err) => {
          if (err.code === err.TIMEOUT) {
            requestGPS(tier + 1);
          } else {
            // PERMISSION_DENIED or POSITION_UNAVAILABLE
            if (err.code === err.PERMISSION_DENIED) {
              setPermissionStatus("denied");
              setStatus("DENIED");
            }
            void requestIPFallback();
          }
        },
        GPS_OPTIONS_TIERS[tier],
      );
    },
    [applyLocation, requestIPFallback],
  );

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setStatus("LOADING");
      await requestIPFallback();
      return;
    }

    setStatus("LOADING");

    // Step 1: Check permission status
    if ("permissions" in navigator) {
      try {
        const perm = await navigator.permissions.query({ name: "geolocation" });
        setPermissionStatus(perm.state);
        if (perm.state === "denied") {
          setStatus("DENIED");
          // Still try IP fallback
          await requestIPFallback();
          return;
        }
      } catch {
        // permissions.query not supported (e.g., Safari) — proceed anyway
      }
    }

    // Step 2: Attempt GPS
    requestGPS(0);
  }, [requestGPS, requestIPFallback]);

  const prefillIfPermitted = useCallback(async () => {
    if (!("permissions" in navigator)) {
      return;
    }

    try {
      const perm = await navigator.permissions.query({ name: "geolocation" });
      setPermissionStatus(perm.state);

      if (perm.state === "granted") {
        setStatus("LOADING");
        requestGPS(0);
      } else if (perm.state === "denied") {
        setStatus("LOADING");
        await requestIPFallback();
      }
    } catch {
      // Ignore permission prefill failures and keep manual flow available.
    }
  }, [requestGPS, requestIPFallback]);

  const setManualAddress = useCallback((address: string) => {
    setLocation((prev) => ({
      ...prev,
      address,
      source: "MANUAL" as LocationSource,
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
