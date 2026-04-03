import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { VALIDATION } from "@/lib/constants/validation";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";
import {
  getDefaultRolesForPrimaryRole,
  mergeRoles,
  multiRoleFeatureFlags,
} from "@/lib/auth/roles";

const ALLOWED_LOCATION_SOURCES = new Set([
  "GPS",
  "IP",
  "MANUAL",
  "PROFILE",
  "BROWSER_GEOLOCATION",
]);

async function persistCompatibilityRoles(
  userId: string,
  primaryRole: "CLIENT" | "PROVIDER",
) {
  if (!multiRoleFeatureFlags.writeEnabled) return;

  const extraRoles =
    primaryRole === "PROVIDER" ? ["PROVIDER", "CLIENT"] : ["CLIENT"];
  const normalized = Array.from(new Set(extraRoles));

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "User"
       SET "roles" = (
         SELECT ARRAY(
           SELECT DISTINCT role_item
           FROM unnest(
             COALESCE("roles", ARRAY[]::"UserRole"[])
             || ARRAY[${normalized.map((_, i) => `$${i + 1}::"UserRole"`).join(",")}]::"UserRole"[]
           ) AS role_item
         )
       )
       WHERE id = $${normalized.length + 1}`,
      ...normalized,
      userId,
    );
  } catch (error) {
    // Compatibility writes should not block onboarding if migration is not yet applied.
    console.warn("[ONBOARDING_COMPAT_ROLES_WRITE_SKIPPED]", error);
  }
}

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
    const normalizedLocationSource =
      typeof locationSource === "string" &&
      ALLOWED_LOCATION_SOURCES.has(locationSource)
        ? locationSource
        : undefined;
    const normalizedLocationAccuracy =
      locationAccuracy !== undefined && locationAccuracy !== null
        ? Number(locationAccuracy)
        : undefined;

    if (
      normalizedLocationAccuracy !== undefined &&
      (!Number.isFinite(normalizedLocationAccuracy) ||
        normalizedLocationAccuracy < 0)
    ) {
      return NextResponse.json(
        { error: "Invalid location accuracy" },
        { status: 400 },
      );
    }

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

    await persistCompatibilityRoles(actingUser.id, role);

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
      const { idDocument } = body;
      const idDocumentUrl =
        typeof idDocument === "string" ? idDocument.trim() : "";
      const selfieUrl = typeof image === "string" ? image.trim() : "";

      const verificationFields = {
        ...(faceMatchScore !== undefined && {
          faceMatchScore: Number(faceMatchScore),
        }),
        ...(idDocumentType && { idDocumentType }),
        ...(normalizedLocationSource && {
          locationSource: normalizedLocationSource,
        }),
        ...(normalizedLocationAccuracy !== undefined && {
          locationAccuracy: normalizedLocationAccuracy,
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
          idDocument: idDocumentUrl || null,
          ...(faceMatchScore !== undefined && {
            faceMatchScore: Number(faceMatchScore),
          }),
          ...(idDocumentType && { idDocumentType }),
          ...(normalizedLocationSource && {
            locationSource: normalizedLocationSource,
          }),
          ...(normalizedLocationAccuracy !== undefined && {
            locationAccuracy: normalizedLocationAccuracy,
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
          idDocument: idDocumentUrl || null,
          ...verificationFields,
        },
      });

      if (idDocumentUrl) {
        const existingOpenIdentityRequest =
          await prisma.identityVerificationRequest.findFirst({
            where: {
              userId: actingUser.id,
              status: {
                in: ["SUBMITTED", "UNDER_REVIEW"],
              },
            },
            select: { id: true },
            orderBy: { createdAt: "desc" },
          });

        if (existingOpenIdentityRequest) {
          await prisma.identityVerificationRequest.update({
            where: { id: existingOpenIdentityRequest.id },
            data: {
              status: "SUBMITTED",
              idDocumentUrl,
              selfieUrl: selfieUrl || null,
              faceMatchScore:
                faceMatchScore !== undefined
                  ? Number(faceMatchScore)
                  : undefined,
              idDocumentType: idDocumentType || null,
              reviewNotes: null,
              reviewedAt: null,
              reviewedById: null,
              submittedAt: new Date(),
            },
          });
        } else {
          await prisma.identityVerificationRequest.create({
            data: {
              userId: actingUser.id,
              status: "SUBMITTED",
              idDocumentUrl,
              selfieUrl: selfieUrl || null,
              faceMatchScore:
                faceMatchScore !== undefined
                  ? Number(faceMatchScore)
                  : undefined,
              idDocumentType: idDocumentType || null,
            },
          });
        }

        await prisma.verificationAudit.create({
          data: {
            userId: actingUser.id,
            action: "IDENTITY_REQUEST_SUBMITTED",
            newValue: "SUBMITTED",
            performedBy: actingUser.id,
          },
        });
      }
    } else if (role === "CLIENT") {
      // Persist client location metadata for consistent location-driven experiences.
      await prisma.profile.upsert({
        where: { userId: actingUser.id },
        create: {
          userId: actingUser.id,
          skills: [],
          location,
          latitude,
          longitude,
          ...(normalizedLocationSource && {
            locationSource: normalizedLocationSource,
          }),
          ...(normalizedLocationAccuracy !== undefined && {
            locationAccuracy: normalizedLocationAccuracy,
          }),
        },
        update: {
          location,
          latitude,
          longitude,
          ...(normalizedLocationSource && {
            locationSource: normalizedLocationSource,
          }),
          ...(normalizedLocationAccuracy !== undefined && {
            locationAccuracy: normalizedLocationAccuracy,
          }),
        },
      });
    }

    return NextResponse.json({
      ...updatedUser,
      roles: mergeRoles(
        [],
        updatedUser.role,
        getDefaultRolesForPrimaryRole(updatedUser.role),
      ),
    });
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
