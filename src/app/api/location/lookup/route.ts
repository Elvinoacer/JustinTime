import { NextRequest, NextResponse } from "next/server";

type NominatimResponse = {
  display_name?: string;
  address?: Record<string, string | undefined>;
  lat?: string;
  lon?: string;
};

type CachedEntry = {
  value: unknown;
  expiresAt: number;
};

const cache = new Map<string, CachedEntry>();
let lastNominatimRequestAt = 0;

function getCached<T>(key: string): T | null {
  const existing = cache.get(key);
  if (!existing) return null;
  if (Date.now() > existing.expiresAt) {
    cache.delete(key);
    return null;
  }
  return existing.value as T;
}

function setCached(key: string, value: unknown, ttlMs: number) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
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

function firstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return undefined;
}

function formatReadableAddress(
  data: NominatimResponse,
  lat: number,
  lon: number,
) {
  const address = data.address || {};

  const locality = firstNonEmpty(
    address.neighbourhood,
    address.suburb,
    address.city_district,
    address.town,
    address.city,
    address.village,
    address.county,
    address.state,
  );
  const city = firstNonEmpty(
    address.city,
    address.town,
    address.village,
    address.county,
    address.state_district,
    address.state,
  );
  const region = firstNonEmpty(
    address.county,
    address.state_district,
    address.state,
    address.region,
  );
  const country = firstNonEmpty(address.country);

  const ordered = [locality, city, region, country].filter(
    (part): part is string => Boolean(part),
  );

  const deduped: string[] = [];
  for (const part of ordered) {
    if (
      !deduped.some((existing) => existing.toLowerCase() === part.toLowerCase())
    ) {
      deduped.push(part);
    }
  }

  if (deduped.length > 0) {
    return deduped.join(", ");
  }

  if (typeof data.display_name === "string" && data.display_name.trim()) {
    const chunks = data.display_name
      .split(",")
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    if (chunks.length > 0) {
      return chunks.slice(0, 4).join(", ");
    }
  }

  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

async function fetchNominatim(url: string): Promise<Response> {
  const elapsed = Date.now() - lastNominatimRequestAt;
  if (elapsed < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "JustInTime/1.0 (support@gtss.software)",
      "Accept-Language": "en",
    },
    signal: AbortSignal.timeout(5000),
  });

  lastNominatimRequestAt = Date.now();
  return response;
}

async function resolveIpLocation() {
  const cached = getCached<{
    latitude: number;
    longitude: number;
    address?: string;
  }>("ip-location");
  if (cached) return cached;

  try {
    const primary = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(5000),
    });
    if (primary.ok) {
      const data = (await primary.json()) as Record<string, unknown>;
      const latitude = toNumber(data.latitude);
      const longitude = toNumber(data.longitude);

      if (latitude !== null && longitude !== null) {
        const parts = [data.city, data.region, data.country_name].filter(
          (part): part is string =>
            typeof part === "string" && part.trim().length > 0,
        );
        const result = {
          latitude,
          longitude,
          address: parts.length > 0 ? parts.join(", ") : undefined,
        };
        setCached("ip-location", result, 60_000);
        return result;
      }
    }
  } catch {
    // continue to fallback provider
  }

  const fallback = await fetch("https://ipwho.is/", {
    signal: AbortSignal.timeout(5000),
  });

  if (!fallback.ok) {
    throw new Error("Unable to resolve IP location");
  }

  const data = (await fallback.json()) as Record<string, unknown>;
  const latitude = toNumber(data.latitude);
  const longitude = toNumber(data.longitude);
  if (latitude === null || longitude === null) {
    throw new Error("Unable to resolve IP location");
  }

  const parts = [data.city, data.region, data.country].filter(
    (part): part is string =>
      typeof part === "string" && part.trim().length > 0,
  );
  const result = {
    latitude,
    longitude,
    address: parts.length > 0 ? parts.join(", ") : undefined,
  };
  setCached("ip-location", result, 60_000);
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "reverse") {
      const lat = toNumber(searchParams.get("lat"));
      const lon = toNumber(searchParams.get("lon"));
      if (lat === null || lon === null) {
        return NextResponse.json(
          { error: "Invalid coordinates" },
          { status: 400 },
        );
      }

      const cacheKey = `reverse:${lat.toFixed(5)}:${lon.toFixed(5)}`;
      const cached = getCached<{ address: string }>(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }

      const response = await fetchNominatim(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      );
      if (!response.ok) {
        return NextResponse.json(
          { address: `${lat.toFixed(5)}, ${lon.toFixed(5)}` },
          { status: 200 },
        );
      }

      const data = (await response.json()) as NominatimResponse;
      const result = { address: formatReadableAddress(data, lat, lon) };
      setCached(cacheKey, result, 5 * 60_000);
      return NextResponse.json(result);
    }

    if (mode === "search") {
      const query = (searchParams.get("q") || "").trim();
      const countryCode = (searchParams.get("countryCode") || "").trim();
      const limit = Math.min(
        8,
        Math.max(1, Number(searchParams.get("limit") || "5")),
      );

      if (!query) {
        return NextResponse.json({ items: [] });
      }

      const cacheKey = `search:${query.toLowerCase()}:${countryCode.toLowerCase()}:${limit}`;
      const cached = getCached<{
        items: Array<{ latitude: number; longitude: number; address: string }>;
      }>(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }

      const params = new URLSearchParams({
        q: query,
        format: "jsonv2",
        addressdetails: "1",
        limit: String(limit),
      });

      if (countryCode) {
        params.set("countrycodes", countryCode.toLowerCase());
      }

      const response = await fetchNominatim(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      );

      if (!response.ok) {
        return NextResponse.json({ items: [] });
      }

      const data = (await response.json()) as NominatimResponse[];
      const items = data
        .map((entry) => {
          const latitude = toNumber(entry.lat);
          const longitude = toNumber(entry.lon);
          if (latitude === null || longitude === null) return null;

          return {
            latitude,
            longitude,
            address: formatReadableAddress(entry, latitude, longitude),
          };
        })
        .filter(
          (
            item,
          ): item is { latitude: number; longitude: number; address: string } =>
            Boolean(item),
        );

      const result = { items };
      setCached(cacheKey, result, 2 * 60_000);
      return NextResponse.json(result);
    }

    if (mode === "ip") {
      const ipLocation = await resolveIpLocation();
      return NextResponse.json(ipLocation);
    }

    return NextResponse.json({ error: "Unsupported mode" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Location lookup failed" },
      { status: 500 },
    );
  }
}
