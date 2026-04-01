/**
 * Geolocation utilities for calculating distances and managing location data
 */

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

/**
 * Get current location using browser's Geolocation API
 * @returns Promise with coordinates and address
 */
export function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
  address?: string;
}> {
  const resolvePosition = (
    options: PositionOptions,
  ): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => reject(error),
        options,
      );
    });
  };

  const toError = (error: GeolocationPositionError) => {
    let errorMessage = "Unable to retrieve location";

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage =
          "Location permission denied. Please allow location access in your browser.";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Location information unavailable";
        break;
      case error.TIMEOUT:
        errorMessage =
          "Location request timed out. Try again in an open area or enter location manually.";
        break;
      default:
        break;
    }

    return new Error(errorMessage);
  };

  return new Promise(async (resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    try {
      // Attempt 1: Fast and accurate for devices with a good sensor/GPS fix.
      const precise = await resolvePosition({
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      });
      resolve(precise);
      return;
    } catch (firstError) {
      const geoError = firstError as GeolocationPositionError;

      if (geoError.code === geoError.PERMISSION_DENIED) {
        reject(toError(geoError));
        return;
      }

      try {
        // Attempt 2: More lenient fallback that can use cached/network-based location.
        const fallback = await resolvePosition({
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000,
        });
        resolve(fallback);
      } catch (secondError) {
        reject(toError(secondError as GeolocationPositionError));
      }
    }
  });
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

/**
 * Save location to localStorage
 */
export function saveLocationToStorage(location: {
  latitude: number;
  longitude: number;
  address?: string;
}): void {
  localStorage.setItem("userLocation", JSON.stringify(location));
}

/**
 * Get location from localStorage
 */
export function getLocationFromStorage(): {
  latitude: number;
  longitude: number;
  address?: string;
} | null {
  const stored = localStorage.getItem("userLocation");
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Clear location from localStorage
 */
export function clearLocationFromStorage(): void {
  localStorage.removeItem("userLocation");
}
