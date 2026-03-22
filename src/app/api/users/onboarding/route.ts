import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const POST = auth(async (req) => {
  try {
    const session = req.auth;
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { 
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

    // B12 Fix: Robust validation
    if (!["CLIENT", "PROVIDER"].includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    if (role === "PROVIDER") {
      if (!skills?.length) {
        return NextResponse.json({ message: "At least one skill is required" }, { status: 400 });
      }
      if (!bio?.trim()) {
        return NextResponse.json({ message: "Professional bio is required" }, { status: 400 });
      }
      if (!phone) {
        return NextResponse.json({ message: "Phone number is required" }, { status: 400 });
      }
      if (hourlyRate !== undefined && (isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0)) {
        return NextResponse.json({ message: "Invalid hourly rate" }, { status: 400 });
      }
    } else if (role === "CLIENT") {
      if (!phone) {
        return NextResponse.json({ message: "Phone number is required" }, { status: 400 });
      }
    }

    // Update user with common fields
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
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
        ...(faceMatchScore !== undefined && { faceMatchScore: Number(faceMatchScore) }),
        ...(idDocumentType && { idDocumentType }),
        ...(locationSource && { locationSource }),
        ...(locationAccuracy !== undefined && { locationAccuracy: Number(locationAccuracy) }),
        verificationAttempts: { increment: 1 },
        lastVerificationAt: new Date(),
      };

      await prisma.profile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          skills: skills || [],
          location,
          latitude,
          longitude,
          bio,
          hourlyRate: hourlyRate ? Number(hourlyRate) : null,
          verificationStatus: "PENDING",
          idDocument,
          isVerified: false,
          ...(faceMatchScore !== undefined && { faceMatchScore: Number(faceMatchScore) }),
          ...(idDocumentType && { idDocumentType }),
          ...(locationSource && { locationSource }),
          ...(locationAccuracy !== undefined && { locationAccuracy: Number(locationAccuracy) }),
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
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { message: `A user with this ${error.meta?.target?.join(', ') || 'field'} already exists.` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: errorMessage }, 
      { status: 500 }
    );
  }
});
