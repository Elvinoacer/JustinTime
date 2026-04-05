/**
 * Geolocation utilities for calculating distances and managing location data
 */

export type LocationSource = "GPS" | "IP" | "MANUAL";

export type LocationFallbackReason =
  | "permission_denied"
  | "position_unavailable"
  | "timeout"
  | "unsupported"
  | "unknown";

export type LocationCoordinates = {
  latitude: number;
  longitude: number;
  address?: string;
  source?: LocationSource;
  accuracy?: number | null;
  fallbackReason?: LocationFallbackReason;
};

export type DetectedLocation = {
  latitude: number;
  longitude: number;
  address?: string;
  source: "GPS" | "IP";
  accuracy: number | null;
  fallbackReason?: LocationFallbackReason;
};

export type ManualLocationOption = {
  latitude: number;
  longitude: number;
  address: string;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate the initial compass bearing from point A to point B.
 * Returns degrees normalized to [0, 360), where 0 is North.
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dLambda = toRadians(lon2 - lon1);

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);

  const theta = Math.atan2(y, x);
  const bearing = ((theta * 180) / Math.PI + 360) % 360;
  return Math.round(bearing * 10) / 10;
}

/**
 * Convert bearing angle into a short compass direction label.
 */
export function bearingToCompass(bearing: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round((((bearing % 360) + 360) % 360) / 45) % dirs.length;
  return dirs[idx];
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

async function fetchLocationLookup<T>(
  mode: "reverse" | "search" | "ip",
  params?: Record<string, string>,
  timeoutMs = 6000,
): Promise<T> {
  const query = new URLSearchParams({ mode, ...(params || {}) });
  const response = await fetch(`/api/location/lookup?${query.toString()}`, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error(`Location lookup failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function toNumber(value: unknown): number | null {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isFinite(num) ? num : null;
}

function geolocationErrorToFallbackReason(
  error: GeolocationPositionError,
): LocationFallbackReason {
  switch (error.code) {
    case 1:
      return "permission_denied";
    case 2:
      return "position_unavailable";
    case 3:
      return "timeout";
    default:
      return "unknown";
  }
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (geolocationErrorToFallbackReason(error)) {
    case "permission_denied":
      return "Location permission denied. Please allow location access in your browser.";
    case "position_unavailable":
      return "Location information unavailable";
    case "timeout":
      return "Location request timed out. Try again in an open area or enter location manually.";
    default:
      return "Unable to retrieve location";
  }
}

function isOfflineBrowser(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function getLocationFallbackToastMessage(
  location: Pick<DetectedLocation, "source" | "fallbackReason">,
): string | null {
  if (location.source !== "IP") {
    return null;
  }

  switch (location.fallbackReason) {
    case "permission_denied":
      return "Location permission was denied, so we used an approximate location from your network.";
    case "timeout":
      return "GPS took too long to respond, so we used an approximate location from your network.";
    case "position_unavailable":
      return "Your device could not get a precise GPS fix, so we used an approximate location from your network.";
    case "unsupported":
      return "Your browser does not support GPS location, so we used an approximate location from your network.";
    case "unknown":
    default:
      return "We could not get a precise GPS location, so we used an approximate location from your network.";
  }
}

export function getLocationFailureToastMessage(error: unknown): string {
  if (isOfflineBrowser()) {
    return "You appear to be offline. Connect to the internet to detect location, or enter it manually.";
  }

  const rawMessage = error instanceof Error ? error.message : "";
  const normalizedMessage = rawMessage.toLowerCase();

  if (normalizedMessage.includes("permission denied")) {
    return "Location access is blocked and fallback could not be completed. Enable permission or enter location manually.";
  }

  if (normalizedMessage.includes("timed out")) {
    return "Location request timed out. Check your signal or internet connection and try again.";
  }

  if (normalizedMessage.includes("not supported")) {
    return "This browser does not support geolocation. Please enter your location manually.";
  }

  if (
    normalizedMessage.includes(
      "unable to determine your location automatically",
    )
  ) {
    return "We could not detect your location automatically. Check your internet connection and try again, or enter it manually.";
  }

  if (rawMessage.trim()) {
    return `${rawMessage} You can also enter location manually.`;
  }

  return "We could not detect your location. Check GPS and internet, then try again or enter it manually.";
}

function resolvePosition(
  options: PositionOptions,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export async function reverseGeocodeCoordinates(
  lat: number,
  lon: number,
  timeoutMs: number = 5000,
): Promise<string> {
  try {
    const data = await fetchLocationLookup<{ address?: string }>(
      "reverse",
      {
        lat: String(lat),
        lon: String(lon),
      },
      timeoutMs,
    );

    if (typeof data.address === "string" && data.address.trim()) {
      return data.address;
    }

    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

export async function searchManualLocations(
  query: string,
  options?: { countryCode?: string; limit?: number; timeoutMs?: number },
): Promise<ManualLocationOption[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  try {
    const data = await fetchLocationLookup<{
      items?: ManualLocationOption[];
    }>(
      "search",
      {
        q: trimmedQuery,
        countryCode: options?.countryCode?.trim() || "",
        limit: String(options?.limit ?? 5),
      },
      options?.timeoutMs ?? 6000,
    );

    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function getGeolocationPermissionState(): Promise<PermissionState | null> {
  if (
    typeof navigator === "undefined" ||
    !("permissions" in navigator) ||
    typeof navigator.permissions?.query !== "function"
  ) {
    return null;
  }

  try {
    const permission = await navigator.permissions.query({
      name: "geolocation",
    });
    return permission.state;
  } catch {
    return null;
  }
}

export async function getApproximateLocationFromIP(): Promise<DetectedLocation> {
  const data = await fetchLocationLookup<{
    latitude?: number;
    longitude?: number;
    address?: string;
  }>("ip", undefined, 6000);

  const latitude = toNumber(data?.latitude);
  const longitude = toNumber(data?.longitude);

  if (latitude === null || longitude === null) {
    throw new Error("Unable to determine location automatically");
  }

  return {
    latitude,
    longitude,
    address: typeof data.address === "string" ? data.address : undefined,
    source: "IP",
    accuracy: null,
  };
}

export async function detectCurrentLocation(): Promise<DetectedLocation> {
  if (typeof navigator === "undefined") {
    throw new Error("Location detection is only available in the browser");
  }

  const resolveWithIPFallback = async (
    fallbackReason: LocationFallbackReason,
    geolocationError?: GeolocationPositionError,
  ) => {
    try {
      const approximate = await getApproximateLocationFromIP();
      return {
        ...approximate,
        fallbackReason,
      } satisfies DetectedLocation;
    } catch {
      if (geolocationError) {
        throw new Error(geolocationErrorMessage(geolocationError));
      }

      throw new Error("Unable to determine your location automatically");
    }
  };

  if (!navigator.geolocation) {
    return resolveWithIPFallback("unsupported");
  }

  const ipFallbackPromise = getApproximateLocationFromIP()
    .then((result) => result)
    .catch(() => null);

  try {
    const precise = await resolvePosition({
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    });

    return {
      latitude: precise.coords.latitude,
      longitude: precise.coords.longitude,
      accuracy: precise.coords.accuracy ?? null,
      address: await reverseGeocodeCoordinates(
        precise.coords.latitude,
        precise.coords.longitude,
      ),
      source: "GPS",
    };
  } catch (firstError) {
    const firstGeoError = firstError as GeolocationPositionError;
    const firstReason = geolocationErrorToFallbackReason(firstGeoError);

    if (firstReason === "permission_denied") {
      const fastIpFallback = await ipFallbackPromise;
      if (fastIpFallback) {
        return {
          ...fastIpFallback,
          fallbackReason: firstReason,
        } satisfies DetectedLocation;
      }

      return resolveWithIPFallback(firstReason, firstGeoError);
    }

    try {
      const fallback = await resolvePosition({
        enableHighAccuracy: false,
        timeout: 4000,
        maximumAge: 120000,
      });

      return {
        latitude: fallback.coords.latitude,
        longitude: fallback.coords.longitude,
        accuracy: fallback.coords.accuracy ?? null,
        address: await reverseGeocodeCoordinates(
          fallback.coords.latitude,
          fallback.coords.longitude,
        ),
        source: "GPS",
      };
    } catch (secondError) {
      const secondGeoError = secondError as GeolocationPositionError;
      const secondReason = geolocationErrorToFallbackReason(secondGeoError);
      const fastIpFallback = await ipFallbackPromise;
      if (fastIpFallback) {
        return {
          ...fastIpFallback,
          fallbackReason: secondReason,
        } satisfies DetectedLocation;
      }

      return resolveWithIPFallback(secondReason, secondGeoError);
    }
  }
}

/**
 * Get current location using browser's Geolocation API
 * @returns Promise with coordinates and address
 */
export async function getCurrentLocation(): Promise<LocationCoordinates> {
  const location = await detectCurrentLocation();
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    address: location.address,
  };
}

/**
 * Format distance for display
 * @param km Distance in kilometers
 * @returns Formatted string (e.g., "2.5 km" or "500 m")
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

const LOCATION_STORAGE_KEY = "userLocation";

type StoredLocation = {
  latitude: number;
  longitude: number;
  address?: string;
  source?: LocationSource;
  accuracy?: number | null;
};

function normalizeStoredLocation(value: unknown): StoredLocation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    latitude?: unknown;
    longitude?: unknown;
    address?: unknown;
    source?: unknown;
    accuracy?: unknown;
  };

  const latitude = toNumber(candidate.latitude);
  const longitude = toNumber(candidate.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  const normalized: StoredLocation = {
    latitude,
    longitude,
  };

  if (typeof candidate.address === "string" && candidate.address.trim()) {
    normalized.address = candidate.address;
  }

  if (
    candidate.source === "GPS" ||
    candidate.source === "IP" ||
    candidate.source === "MANUAL"
  ) {
    normalized.source = candidate.source;
  }

  const accuracy = toNumber(candidate.accuracy);
  if (accuracy !== null) {
    normalized.accuracy = accuracy;
  } else if (candidate.accuracy === null) {
    normalized.accuracy = null;
  }

  return normalized;
}

/**
 * Save location to localStorage
 */
export function saveLocationToStorage(location: StoredLocation): void {
  const normalized = normalizeStoredLocation(location);
  if (!normalized) {
    return;
  }

  localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(normalized));
}

/**
 * Get location from localStorage
 */
export function getLocationFromStorage(): StoredLocation | null {
  const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
  if (!stored) return null;

  try {
    return normalizeStoredLocation(JSON.parse(stored));
  } catch {
    return null;
  }
}

/**
 * Clear location from localStorage
 */
export function clearLocationFromStorage(): void {
  localStorage.removeItem(LOCATION_STORAGE_KEY);
}
