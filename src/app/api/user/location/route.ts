import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const LOCATION_SOURCES = new Set(["GPS", "IP", "MANUAL"]);
const SOURCE_PRIORITY: Record<string, number> = {
  IP: 1,
  GPS: 2,
  MANUAL: 3,
};

type StoredDiscoveryLocation = {
  latitude: number;
  longitude: number;
  location: string | null;
  source: "GPS" | "IP" | "MANUAL";
  accuracy: number | null;
  updatedAt: string;
  lastConfirmedAt: string | null;
};

function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function coerceDraftObject(draft: unknown): Record<string, unknown> {
  if (draft && typeof draft === "object" && !Array.isArray(draft)) {
    return { ...(draft as Record<string, unknown>) };
  }

  return {};
}

function toFiniteNumber(value: unknown): number | null {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(num) ? num : null;
}

function parseDiscoveryLocation(
  draft: unknown,
): StoredDiscoveryLocation | null {
  const root = coerceDraftObject(draft);
  const candidate = root.discoveryLocation;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  const value = candidate as Record<string, unknown>;
  const latitude = toFiniteNumber(value.latitude);
  const longitude = toFiniteNumber(value.longitude);
  if (latitude === null || longitude === null) return null;
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;

  const source =
    value.source === "GPS" || value.source === "IP" || value.source === "MANUAL"
      ? value.source
      : "MANUAL";

  return {
    latitude,
    longitude,
    location: typeof value.location === "string" ? value.location : null,
    source,
    accuracy: value.accuracy === null ? null : toFiniteNumber(value.accuracy),
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString(),
    lastConfirmedAt:
      typeof value.lastConfirmedAt === "string" ? value.lastConfirmedAt : null,
  };
}

function shouldReplaceLocation(
  existing: StoredDiscoveryLocation | null,
  incomingSource: "GPS" | "IP" | "MANUAL",
  force: boolean,
): boolean {
  if (force || !existing) return true;

  const existingPriority = SOURCE_PRIORITY[existing.source] || 0;
  const incomingPriority = SOURCE_PRIORITY[incomingSource] || 0;

  if (incomingPriority > existingPriority) return true;
  if (incomingPriority < existingPriority) return false;

  return true;
}

function buildResponse(location: StoredDiscoveryLocation | null) {
  if (!location) {
    return {
      latitude: null,
      longitude: null,
      location: null,
      source: null,
      accuracy: null,
      updatedAt: null,
      lastConfirmedAt: null,
    };
  }

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    location: location.location,
    source: location.source,
    accuracy: location.accuracy,
    updatedAt: location.updatedAt,
    lastConfirmedAt: location.lastConfirmedAt,
  };
}

async function saveDiscoveryLocationForUser(
  userId: string,
  body: {
    latitude?: number;
    longitude?: number;
    address?: string;
    source?: string;
    accuracy?: number | null;
    force?: boolean;
  },
) {
  const { latitude, longitude, address, source, accuracy, force } = body;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return NextResponse.json(
      { error: "Coordinates out of valid geographic bounds" },
      { status: 400 },
    );
  }

  if (source !== undefined && !LOCATION_SOURCES.has(source)) {
    return NextResponse.json(
      { error: "Invalid location source" },
      { status: 400 },
    );
  }

  if (
    accuracy !== undefined &&
    accuracy !== null &&
    (typeof accuracy !== "number" || !Number.isFinite(accuracy))
  ) {
    return NextResponse.json(
      { error: "Invalid location accuracy" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingDraft: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const draft = coerceDraftObject(user.onboardingDraft);
  const existing = parseDiscoveryLocation(draft);

  const incomingSource: "GPS" | "IP" | "MANUAL" =
    source === "GPS" || source === "IP" || source === "MANUAL"
      ? source
      : "MANUAL";

  const shouldReplace = shouldReplaceLocation(
    existing,
    incomingSource,
    Boolean(force),
  );

  if (!shouldReplace && existing) {
    return NextResponse.json({
      ...buildResponse(existing),
      scope: "USER_DISCOVERY_LOCATION",
      replaced: false,
    });
  }

  const nowIso = new Date().toISOString();
  const nextLocation: StoredDiscoveryLocation = {
    latitude,
    longitude,
    location: typeof address === "string" ? address : null,
    source: incomingSource,
    accuracy: accuracy === null ? null : toFiniteNumber(accuracy),
    updatedAt: nowIso,
    lastConfirmedAt:
      incomingSource === "MANUAL" || incomingSource === "GPS"
        ? nowIso
        : existing?.lastConfirmedAt || null,
  };

  draft.discoveryLocation = nextLocation;

  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingDraft: draft,
    },
  });

  return NextResponse.json({
    ...buildResponse(nextLocation),
    scope: "USER_DISCOVERY_LOCATION",
    replaced: true,
  });
}

async function clearDiscoveryLocationForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingDraft: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const draft = coerceDraftObject(user.onboardingDraft);
  delete draft.discoveryLocation;

  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingDraft: Object.keys(draft).length > 0 ? draft : null,
    },
  });

  return NextResponse.json({
    ...buildResponse(null),
    scope: "USER_DISCOVERY_LOCATION",
    cleared: true,
  });
}

// GET: Retrieve user's saved location
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        onboardingDraft: true,
        profile: {
          select: {
            latitude: true,
            longitude: true,
            location: true,
            locationSource: true,
            locationAccuracy: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stored = parseDiscoveryLocation(user.onboardingDraft);
    if (stored) {
      return NextResponse.json({
        ...buildResponse(stored),
        scope: "USER_DISCOVERY_LOCATION",
      });
    }

    // Backward-compatible fallback for previously stored profile location.
    if (
      user.profile &&
      typeof user.profile.latitude === "number" &&
      typeof user.profile.longitude === "number"
    ) {
      return NextResponse.json({
        latitude: user.profile.latitude,
        longitude: user.profile.longitude,
        location: user.profile.location,
        source: user.profile.locationSource,
        accuracy: user.profile.locationAccuracy,
        updatedAt: user.profile.updatedAt.toISOString(),
        lastConfirmedAt: null,
        scope: "LEGACY_PROFILE_LOCATION",
      });
    }

    return NextResponse.json({
      ...buildResponse(null),
      scope: "USER_DISCOVERY_LOCATION",
    });
  } catch (error) {
    console.error("Error fetching location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: Save user's location
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      latitude?: number;
      longitude?: number;
      address?: string;
      source?: string;
      accuracy?: number | null;
      force?: boolean;
    };

    return saveDiscoveryLocationForUser(session.user.id, body);
  } catch (error) {
    console.error("Error saving location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE: Clear user's saved discovery location
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return clearDiscoveryLocationForUser(session.user.id);
  } catch (error) {
    console.error("Error clearing location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH: Partial updates / clear semantics
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (body?.clear === true) {
      return clearDiscoveryLocationForUser(session.user.id);
    }

    return saveDiscoveryLocationForUser(session.user.id, body);
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 },
    );
  }
}
