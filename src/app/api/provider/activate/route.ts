import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { VALIDATION } from "@/lib/constants/validation";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";
import {
  mergeRoles,
  multiRoleFeatureFlags,
  type AppRole,
} from "@/lib/auth/roles";

/**
 * POST /api/provider/activate
 *
 * Activates provider mode for an existing authenticated client user.
 * - Adds PROVIDER to roles[]
 * - Creates/upserts Profile
 * - Sets providerSetupCompleted = true
 * - Sets preferredWorkspace = "PROVIDER"
 * - Does NOT reset onboardingCompleted or role
 */

const ALLOWED_LOCATION_SOURCES = new Set([
  "GPS",
  "IP",
  "MANUAL",
  "PROFILE",
  "BROWSER_GEOLOCATION",
]);

function normalizeLocationSource(value: unknown): string | undefined {
  return typeof value === "string" && ALLOWED_LOCATION_SOURCES.has(value)
    ? value
    : undefined;
}

function normalizeLocationAccuracy(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return undefined;
  return numeric;
}

async function persistProviderRole(userId: string) {
  if (!multiRoleFeatureFlags.writeEnabled) return;

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "User"
       SET "roles" = (
         SELECT ARRAY(
           SELECT DISTINCT role_item
           FROM unnest(
             COALESCE("roles", ARRAY[]::"UserRole"[])
             || ARRAY[$1::"UserRole", $2::"UserRole"]::"UserRole"[]
           ) AS role_item
         )
       )
       WHERE id = $3`,
      "PROVIDER",
      "CLIENT",
      userId,
    );
  } catch (error) {
    console.warn("[PROVIDER_ACTIVATE_COMPAT_ROLES_WRITE_SKIPPED]", error);
  }
}

export const POST = auth(async (req) => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        roles: true,
        onboardingCompleted: true,
        providerSetupCompleted: true,
        phone: true,
        name: true,
        image: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.onboardingCompleted) {
      return NextResponse.json(
        { error: "Complete onboarding first" },
        { status: 400 },
      );
    }

    if (user.providerSetupCompleted) {
      return NextResponse.json(
        { error: "Provider mode is already activated" },
        { status: 409 },
      );
    }

    const body = await req.json();

    // Validate required fields
    const businessName =
      typeof body?.businessName === "string" ? body.businessName.trim() : "";
    const primaryCategoryId =
      typeof body?.primaryCategoryId === "string"
        ? body.primaryCategoryId.trim()
        : "";
    const skills = Array.isArray(body?.skills)
      ? body.skills.filter(
          (v: unknown): v is string => typeof v === "string",
        )
      : [];
    const bio = typeof body?.bio === "string" ? body.bio.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const location =
      typeof body?.location === "string" ? body.location.trim() : "";
    const hourlyRateRaw = body?.hourlyRate;
    const hourlyRate =
      hourlyRateRaw !== undefined &&
      hourlyRateRaw !== null &&
      hourlyRateRaw !== ""
        ? Number(hourlyRateRaw)
        : null;
    const latitude =
      body?.latitude !== undefined && body?.latitude !== null
        ? Number(body.latitude)
        : null;
    const longitude =
      body?.longitude !== undefined && body?.longitude !== null
        ? Number(body.longitude)
        : null;
    const locationSource = normalizeLocationSource(body?.locationSource);
    const locationAccuracy = normalizeLocationAccuracy(body?.locationAccuracy);
    const idDocument =
      typeof body?.idDocument === "string" ? body.idDocument.trim() : "";
    const selfieUrl =
      typeof body?.image === "string" ? body.image.trim() : "";
    const faceMatchScore =
      body?.faceMatchScore !== undefined && body?.faceMatchScore !== null
        ? Number(body.faceMatchScore)
        : undefined;
    const idDocumentType =
      typeof body?.idDocumentType === "string"
        ? body.idDocumentType.trim()
        : "";
    const manualReviewRequested = Boolean(body?.manualReviewRequested);

    // Validation
    if (!businessName || businessName.length > VALIDATION.MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 },
      );
    }

    if (!primaryCategoryId) {
      return NextResponse.json(
        { error: "Select a primary service category" },
        { status: 400 },
      );
    }

    if (!skills.length) {
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

    if (!skills.includes(primaryCategoryId)) {
      skills.unshift(primaryCategoryId);
    }

    if (!bio || bio.length > VALIDATION.MAX_BIO_LENGTH) {
      return NextResponse.json(
        { error: "Bio is required" },
        { status: 400 },
      );
    }

    if (!location || location.length > VALIDATION.MAX_LOCATION_LENGTH) {
      return NextResponse.json(
        { error: "Location is required" },
        { status: 400 },
      );
    }

    if (
      hourlyRate === null ||
      !Number.isFinite(hourlyRate) ||
      hourlyRate < 0 ||
      hourlyRate > VALIDATION.MAX_HOURLY_RATE
    ) {
      return NextResponse.json(
        { error: "Invalid hourly rate" },
        { status: 400 },
      );
    }

    // Normalize and validate phone
    const normalizedPhone = normalizeKenyanPhone(phone);
    if (!normalizedPhone || !isValidKenyanPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: "Valid Kenyan phone number is required" },
        { status: 400 },
      );
    }

    // Check phone conflict
    const phoneOwner = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (phoneOwner) {
      return NextResponse.json(
        { error: "That phone number is already linked to another account" },
        { status: 409 },
      );
    }

    // Update user: add provider role, set setup completed, set workspace preference
    const updatedRoles = mergeRoles(user.roles, user.role, [
      "PROVIDER" as AppRole,
      "CLIENT" as AppRole,
    ]);

    await prisma.user.update({
      where: { id: userId },
      data: {
        providerSetupCompleted: true,
        preferredWorkspace: "PROVIDER",
        phone: normalizedPhone,
        ...(selfieUrl ? { image: selfieUrl } : {}),
        // Keep the legacy role as-is, rely on roles[]
        roles: updatedRoles,
      },
    });

    // Also persist via raw SQL for compatibility
    await persistProviderRole(userId);

    // Create/upsert Profile
    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        businessName,
        primaryCategoryId,
        skills: skills.slice(0, VALIDATION.MAX_PROVIDER_SKILLS),
        location,
        latitude,
        longitude,
        bio,
        hourlyRate,
        verificationStatus: "PENDING",
        idDocument: idDocument || null,
        ...(faceMatchScore !== undefined && Number.isFinite(faceMatchScore)
          ? { faceMatchScore }
          : {}),
        ...(idDocumentType ? { idDocumentType } : {}),
        ...(locationSource ? { locationSource } : {}),
        ...(locationAccuracy !== undefined ? { locationAccuracy } : {}),
        verificationAttempts: 1,
        lastVerificationAt: new Date(),
      },
      update: {
        businessName,
        primaryCategoryId,
        skills: skills.slice(0, VALIDATION.MAX_PROVIDER_SKILLS),
        location,
        latitude,
        longitude,
        bio,
        hourlyRate,
        verificationStatus: "PENDING",
        idDocument: idDocument || null,
        ...(faceMatchScore !== undefined && Number.isFinite(faceMatchScore)
          ? { faceMatchScore }
          : {}),
        ...(idDocumentType ? { idDocumentType } : {}),
        ...(locationSource ? { locationSource } : {}),
        ...(locationAccuracy !== undefined ? { locationAccuracy } : {}),
        verificationAttempts: { increment: 1 },
        lastVerificationAt: new Date(),
      },
    });

    // Create identity verification request if ID document uploaded
    if (idDocument) {
      const existingRequest =
        await prisma.identityVerificationRequest.findFirst({
          where: {
            userId,
            status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
          },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        });

      const reviewNotes =
        faceMatchScore !== undefined &&
        Number.isFinite(faceMatchScore) &&
        faceMatchScore < 45
          ? "Automatic face match was low. Manual review required."
          : manualReviewRequested
            ? "Manual review requested by user."
            : null;

      if (existingRequest) {
        await prisma.identityVerificationRequest.update({
          where: { id: existingRequest.id },
          data: {
            status: "SUBMITTED",
            idDocumentUrl: idDocument,
            selfieUrl: selfieUrl || null,
            faceMatchScore:
              faceMatchScore !== undefined && Number.isFinite(faceMatchScore)
                ? faceMatchScore
                : undefined,
            idDocumentType: idDocumentType || null,
            reviewNotes,
            reviewedAt: null,
            reviewedById: null,
            submittedAt: new Date(),
          },
        });
      } else {
        await prisma.identityVerificationRequest.create({
          data: {
            userId,
            status: "SUBMITTED",
            idDocumentUrl: idDocument,
            selfieUrl: selfieUrl || null,
            faceMatchScore:
              faceMatchScore !== undefined && Number.isFinite(faceMatchScore)
                ? faceMatchScore
                : undefined,
            idDocumentType: idDocumentType || null,
            reviewNotes,
          },
        });
      }

      await prisma.verificationAudit.create({
        data: {
          userId,
          action: "IDENTITY_REQUEST_SUBMITTED",
          newValue: "SUBMITTED",
          performedBy: userId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      roles: updatedRoles,
      preferredWorkspace: "PROVIDER",
      providerSetupCompleted: true,
    });
  } catch (error) {
    console.error("[PROVIDER_ACTIVATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to activate provider mode" },
      { status: 500 },
    );
  }
});
