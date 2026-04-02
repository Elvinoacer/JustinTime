import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const LOCATION_SOURCES = new Set(["GPS", "IP", "MANUAL"]);

// GET: Retrieve user's saved location
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        latitude: true,
        longitude: true,
        location: true,
        locationSource: true,
        locationAccuracy: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      latitude: profile.latitude,
      longitude: profile.longitude,
      location: profile.location,
      source: profile.locationSource,
      accuracy: profile.locationAccuracy,
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

    const body = await req.json();
    const { latitude, longitude, address, source, accuracy } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "Invalid coordinates" },
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

    // Update or create profile with location
    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {
        latitude,
        longitude,
        location: address || null,
        ...(source ? { locationSource: source } : {}),
        ...(accuracy !== undefined ? { locationAccuracy: accuracy } : {}),
      },
      create: {
        userId: session.user.id,
        latitude,
        longitude,
        location: address || null,
        bio: "",
        skills: [],
        portfolio: [],
        locationSource: source || "MANUAL",
        ...(accuracy !== undefined ? { locationAccuracy: accuracy } : {}),
      },
      select: {
        latitude: true,
        longitude: true,
        location: true,
        locationSource: true,
        locationAccuracy: true,
      },
    });

    return NextResponse.json({
      ...profile,
      source: profile.locationSource,
      accuracy: profile.locationAccuracy,
    });
  } catch (error) {
    console.error("Error saving location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
