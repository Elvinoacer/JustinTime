import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

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
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      latitude: profile.latitude,
      longitude: profile.longitude,
      location: profile.location,
    });
  } catch (error) {
    console.error("Error fetching location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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
    const { latitude, longitude, address } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    // Update or create profile with location
    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {
        latitude,
        longitude,
        location: address || null,
      },
      create: {
        userId: session.user.id,
        latitude,
        longitude,
        location: address || null,
        bio: "",
        skills: [],
        portfolio: [],
      },
      select: {
        latitude: true,
        longitude: true,
        location: true,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error saving location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
