import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { VALIDATION } from "@/lib/constants/validation";

export const POST = auth(async (req) => {
  try {
    const session = req.auth;
    if (!session?.user?.id && !session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    let {
      role,
      onboardingCompleted,
      clientInterests,
      skills,
      location,
      latitude,
      longitude,
      bio,
      image,
      phone,
      hourlyRate,
      address,
      faceMatchScore,
      idDocumentType,
      locationSource,
      locationAccuracy,
    } = body;

    // Sanitize string inputs
    location = location?.trim();
    bio = bio?.trim();
    phone = phone?.trim();
    address = address?.trim();

    // B12 Fix: Robust validation
    if (!["CLIENT", "PROVIDER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (role === "PROVIDER") {
      if (!skills?.length) {
        return NextResponse.json(
          { error: "At least one skill is required" },
          { status: 400 },
        );
      }
      if (skills.length > VALIDATION.MAX_PROVIDER_SKILLS) {
        return NextResponse.json(
          { error: `Maximum ${VALIDATION.MAX_PROVIDER_SKILLS} skills allowed` },
          { status: 400 },
        );
      }
      if (!bio?.trim() || bio.length > VALIDATION.MAX_BIO_LENGTH) {
        return NextResponse.json(
          {
            error: `Bio is required and must not exceed ${VALIDATION.MAX_BIO_LENGTH} characters`,
          },
          { status: 400 },
        );
      }
      if (!phone) {
        return NextResponse.json(
          { error: "Phone number is required" },
          { status: 400 },
        );
      }
      if (
        hourlyRate !== undefined &&
        (isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0)
      ) {
        return NextResponse.json(
          { error: "Invalid hourly rate" },
          { status: 400 },
        );
      }
    } else if (role === "CLIENT") {
      if (!phone) {
        return NextResponse.json(
          { error: "Phone number is required" },
          { status: 400 },
        );
      }
      if (
        clientInterests &&
        clientInterests.length > VALIDATION.MAX_CLIENT_INTERESTS
      ) {
        return NextResponse.json(
          {
            error: `Maximum ${VALIDATION.MAX_CLIENT_INTERESTS} interests allowed`,
          },
          { status: 400 },
        );
      }
    }

    // Resolve the acting user robustly. If session id is stale, fall back to email.
    const actingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(session?.user?.id ? [{ id: session.user.id }] : []),
          ...(session?.user?.email
            ? [{ email: session.user.email.trim().toLowerCase() }]
            : []),
        ],
      },
      select: { id: true, email: true },
    });

    if (!actingUser) {
      return NextResponse.json(
        {
          error:
            "Account not found for current session. Please sign out and sign in again.",
        },
        { status: 404 },
      );
    }

    // Update user with common fields
    const updatedUser = await prisma.user.update({
      where: { id: actingUser.id },
      data: {
        role,
        onboardingCompleted,
        clientInterests: clientInterests || [],
        ...(image && { image }), // Update image if provided
        ...(phone && { phone }), // Update phone if provided
      },
    });

    // If provider, create or update profile
    if (role === "PROVIDER") {
      const { verificationStatus, idDocument } = body;

      const verificationFields = {
        ...(faceMatchScore !== undefined && {
          faceMatchScore: Number(faceMatchScore),
        }),
        ...(idDocumentType && { idDocumentType }),
        ...(locationSource && { locationSource }),
        ...(locationAccuracy !== undefined && {
          locationAccuracy: Number(locationAccuracy),
        }),
        verificationAttempts: { increment: 1 },
        lastVerificationAt: new Date(),
      };

      await prisma.profile.upsert({
        where: { userId: actingUser.id },
        create: {
          userId: actingUser.id,
          skills: skills || [],
          location,
          latitude,
          longitude,
          bio,
          hourlyRate: hourlyRate ? Number(hourlyRate) : null,
          verificationStatus: "PENDING",
          idDocument,
          isVerified: false,
          ...(faceMatchScore !== undefined && {
            faceMatchScore: Number(faceMatchScore),
          }),
          ...(idDocumentType && { idDocumentType }),
          ...(locationSource && { locationSource }),
          ...(locationAccuracy !== undefined && {
            locationAccuracy: Number(locationAccuracy),
          }),
          verificationAttempts: 1,
          lastVerificationAt: new Date(),
        },
        update: {
          skills: skills || [],
          location,
          latitude,
          longitude,
          bio,
          hourlyRate: hourlyRate ? Number(hourlyRate) : null,
          verificationStatus: "PENDING",
          idDocument,
          isVerified: false,
          ...verificationFields,
        },
      });
    }

    // If client, we might want to create a profile too or store address somewhere
    // For now, we can extend the User model or store in a separate ClientProfile
    // Since the schema doesn't have a specific client profile, we'll just ensure phone is saved above

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("[ONBOARDING_ERROR]", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });

    // Return more specific error message
    const errorMessage = error?.message || "Internal Error";

    // Check for specific Prisma errors (e.g., unique constraint)
    if (error?.code === "P2002") {
      const target = Array.isArray(error?.meta?.target)
        ? error.meta.target.join(", ")
        : String(error?.meta?.target || "field");

      if (target.includes("phone")) {
        return NextResponse.json(
          {
            error:
              "That phone number is already linked to another account. Use a different number.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: `A user with this ${target} already exists.`,
        },
        { status: 409 },
      );
    }

    if (error?.code === "P2025") {
      return NextResponse.json(
        {
          error:
            "Your session is out of sync with the account record. Please sign out and sign in again.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
