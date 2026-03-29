import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { VALIDATION } from "@/lib/constants/validation";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";

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
      referralCode,
    } = body;

    // Sanitize string inputs
    location = location?.trim();
    bio = bio?.trim();
    phone = phone ? normalizeKenyanPhone(phone.trim()) : "";
    address = address?.trim();
    const normalizedReferralCode = referralCode
      ? String(referralCode).trim().toUpperCase()
      : "";

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
      if (!isValidKenyanPhone(phone)) {
        return NextResponse.json(
          {
            error:
              "Use a valid Kenyan phone number format, for example 254712345678.",
          },
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
      if (!isValidKenyanPhone(phone)) {
        return NextResponse.json(
          {
            error:
              "Use a valid Kenyan phone number format, for example 254712345678.",
          },
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
      select: { id: true, email: true, referredById: true },
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

    let referralToApplyReferrerId: string | null = null;
    if (normalizedReferralCode && !actingUser.referredById) {
      const referralCodePattern = /^JIT-[A-HJ-NP-Z2-9]{6}$/;
      if (!referralCodePattern.test(normalizedReferralCode)) {
        return NextResponse.json(
          { error: "Invalid referral code format" },
          { status: 400 },
        );
      }

      const referrer = await prisma.user.findUnique({
        where: { referralCode: normalizedReferralCode },
        select: { id: true },
      });

      if (!referrer) {
        return NextResponse.json(
          { error: "Referral code not found" },
          { status: 400 },
        );
      }

      if (referrer.id === actingUser.id) {
        return NextResponse.json(
          { error: "You cannot use your own referral code" },
          { status: 400 },
        );
      }

      const existingReferral = await prisma.referral.findUnique({
        where: { referredUserId: actingUser.id },
        select: { id: true },
      });

      if (!existingReferral) {
        referralToApplyReferrerId = referrer.id;
      }
    }

    // Fail fast with a precise error when phone is already used by another user.
    if (phone) {
      const phoneOwner = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: actingUser.id },
        },
        select: { id: true },
      });

      if (phoneOwner) {
        return NextResponse.json(
          {
            error:
              "That phone number is already linked to another account. Use a different number.",
            conflictField: "phone",
          },
          { status: 409 },
        );
      }
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
        ...(referralToApplyReferrerId && {
          referredById: referralToApplyReferrerId,
        }),
      },
    });

    if (referralToApplyReferrerId) {
      await prisma.referral.create({
        data: {
          referrerId: referralToApplyReferrerId,
          referredUserId: actingUser.id,
          status: "PENDING",
          type: "SIGNUP",
          points: 100,
        },
      });
    }

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
        : String(error?.meta?.target || "");
      const rawErrorMessage = String(error?.message || "").toLowerCase();

      const inferredField = target
        ? target
        : rawErrorMessage.includes("phone") ||
            rawErrorMessage.includes("user_phone_key")
          ? "phone"
          : rawErrorMessage.includes("email") ||
              rawErrorMessage.includes("user_email_key")
            ? "email"
            : rawErrorMessage.includes("userid") ||
                rawErrorMessage.includes("profile_userid_key")
              ? "profile.userId"
              : "field";

      if (inferredField.includes("phone")) {
        return NextResponse.json(
          {
            error:
              "That phone number is already linked to another account. Use a different number.",
            conflictField: "phone",
          },
          { status: 409 },
        );
      }

      if (inferredField.includes("email")) {
        return NextResponse.json(
          {
            error: "That email is already linked to another account.",
            conflictField: "email",
          },
          { status: 409 },
        );
      }

      if (inferredField.includes("profile.userId")) {
        return NextResponse.json(
          {
            error:
              "Your profile already exists but was not linked correctly. Please sign out and sign in again.",
            conflictField: "profile",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error:
            "A conflicting account field already exists. Please verify your details and try again.",
          conflictField: inferredField,
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
