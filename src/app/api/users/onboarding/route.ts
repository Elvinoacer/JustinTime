import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { VALIDATION } from "@/lib/constants/validation";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";
import { Prisma } from "@/generated/prisma/client";
import {
  getDefaultRolesForPrimaryRole,
  mergeRoles,
  multiRoleFeatureFlags,
} from "@/lib/auth/roles";
import {
  DEFAULT_ONBOARDING_DRAFT_STATE,
  getStepForRole,
  normalizeOnboardingIntent,
  type ClientOnboardingData,
  type OnboardingDraftState,
  type ProviderOnboardingData,
  type VerificationDraftData,
} from "@/lib/onboarding/draft";
import { completePendingSignupReferralsForUser } from "@/lib/referrals/reward-service";

const ALLOWED_LOCATION_SOURCES = new Set([
  "GPS",
  "IP",
  "MANUAL",
  "PROFILE",
  "BROWSER_GEOLOCATION",
]);

type DraftLocationSource = NonNullable<ClientOnboardingData["locationSource"]>;

type ActingUserRecord = {
  id: string;
  email: string | null;
  name: string | null;
  role: "CLIENT" | "PROVIDER" | "ADMIN";
  onboardingCompleted: boolean;
  clientInterests: string[];
  phone: string | null;
  referredById: string | null;
  onboardingDraft: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeLocationSource(
  value: unknown,
): DraftLocationSource | undefined {
  if (typeof value !== "string" || !ALLOWED_LOCATION_SOURCES.has(value)) {
    return undefined;
  }

  if (value === "GPS" || value === "IP" || value === "MANUAL") {
    return value;
  }

  return "MANUAL";
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeLocationAccuracy(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return undefined;
  }

  return numeric;
}

function normalizePhoneInput(value: unknown): string {
  return normalizeKenyanPhone(String(value ?? "").trim());
}

function sanitizeDraftState(input: unknown): OnboardingDraftState {
  const draft = isPlainObject(input) ? input : {};
  const role = normalizeOnboardingIntent(
    typeof draft.role === "string" ? draft.role : null,
  );

  const rawClient = isPlainObject(draft.clientData) ? draft.clientData : {};
  const rawProvider = isPlainObject(draft.providerData)
    ? draft.providerData
    : {};
  const rawVerification = isPlainObject(draft.verification)
    ? draft.verification
    : {};

  const clientData: ClientOnboardingData = {
    ...DEFAULT_ONBOARDING_DRAFT_STATE.clientData,
    name: typeof rawClient.name === "string" ? rawClient.name : "",
    phone: typeof rawClient.phone === "string" ? rawClient.phone : "",
    address: typeof rawClient.address === "string" ? rawClient.address : "",
    location: typeof rawClient.location === "string" ? rawClient.location : "",
    latitude:
      typeof rawClient.latitude === "number" ? rawClient.latitude : null,
    longitude:
      typeof rawClient.longitude === "number" ? rawClient.longitude : null,
    locationSource: normalizeLocationSource(rawClient.locationSource),
    locationAccuracy:
      normalizeLocationAccuracy(rawClient.locationAccuracy) ?? null,
    phoneValidated: Boolean(rawClient.phoneValidated),
  };

  const skills = Array.isArray(rawProvider.skills)
    ? rawProvider.skills.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  const providerData: ProviderOnboardingData = {
    ...DEFAULT_ONBOARDING_DRAFT_STATE.providerData,
    businessName:
      typeof rawProvider.businessName === "string"
        ? rawProvider.businessName
        : "",
    primaryCategoryId:
      typeof rawProvider.primaryCategoryId === "string"
        ? rawProvider.primaryCategoryId
        : "",
    skills,
    location:
      typeof rawProvider.location === "string" ? rawProvider.location : "",
    latitude:
      typeof rawProvider.latitude === "number" ? rawProvider.latitude : null,
    longitude:
      typeof rawProvider.longitude === "number" ? rawProvider.longitude : null,
    locationSource: normalizeLocationSource(rawProvider.locationSource),
    locationAccuracy:
      normalizeLocationAccuracy(rawProvider.locationAccuracy) ?? null,
    bio: typeof rawProvider.bio === "string" ? rawProvider.bio : "",
    phone: typeof rawProvider.phone === "string" ? rawProvider.phone : "",
    hourlyRate:
      typeof rawProvider.hourlyRate === "string" ? rawProvider.hourlyRate : "",
    phoneValidated: Boolean(rawProvider.phoneValidated),
  };

  const verification: VerificationDraftData = {
    ...DEFAULT_ONBOARDING_DRAFT_STATE.verification,
    idDocumentType:
      typeof rawVerification.idDocumentType === "string"
        ? rawVerification.idDocumentType
        : "unknown",
    faceMatchScore:
      typeof rawVerification.faceMatchScore === "number"
        ? rawVerification.faceMatchScore
        : null,
    verificationStatus:
      rawVerification.verificationStatus === "PASSED" ||
      rawVerification.verificationStatus === "REJECTED" ||
      rawVerification.verificationStatus === "MANUAL_REVIEW"
        ? rawVerification.verificationStatus
        : null,
    manualReviewRequested: Boolean(rawVerification.manualReviewRequested),
  };

  const currentStepCandidate = Number(draft.currentStep);
  const currentStep =
    Number.isFinite(currentStepCandidate) && currentStepCandidate >= 1
      ? currentStepCandidate
      : role
        ? getStepForRole(role)
        : 1;

  return {
    role,
    currentStep,
    clientData,
    providerData,
    clientInterests: Array.isArray(draft.clientInterests)
      ? draft.clientInterests.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    referralCode:
      typeof draft.referralCode === "string" ? draft.referralCode : "",
    verification,
    updatedAt:
      typeof draft.updatedAt === "string" ? draft.updatedAt : undefined,
  };
}

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
    console.warn("[ONBOARDING_COMPAT_ROLES_WRITE_SKIPPED]", error);
  }
}

async function getActingUser(
  session: {
    user?: { id?: string | null; email?: string | null };
  } | null,
): Promise<ActingUserRecord | null> {
  if (!session?.user?.id && !session?.user?.email) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      OR: [
        ...(session?.user?.id ? [{ id: session.user.id }] : []),
        ...(session?.user?.email
          ? [{ email: session.user.email.trim().toLowerCase() }]
          : []),
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      onboardingCompleted: true,
      clientInterests: true,
      phone: true,
      referredById: true,
      onboardingDraft: true,
    },
  });
}

function buildDraftFromState(params: {
  user: ActingUserRecord;
  profile: {
    businessName: string | null;
    primaryCategoryId: string | null;
    skills: string[];
    location: string | null;
    latitude: number | null;
    longitude: number | null;
    locationSource: string | null;
    locationAccuracy: number | null;
    bio: string | null;
    hourlyRate: unknown;
    faceMatchScore: number | null;
    idDocumentType: string | null;
  } | null;
}): OnboardingDraftState {
  const { user, profile } = params;
  const savedDraft = sanitizeDraftState(user.onboardingDraft);
  const role =
    savedDraft.role || (user.role === "PROVIDER" ? "PROVIDER" : null);

  return {
    ...savedDraft,
    role,
    currentStep: savedDraft.currentStep || (role ? getStepForRole(role) : 1),
    referralCode: savedDraft.referralCode || "",
    clientInterests:
      savedDraft.clientInterests.length > 0
        ? savedDraft.clientInterests
        : user.clientInterests,
    clientData: {
      ...savedDraft.clientData,
      name: savedDraft.clientData.name || user.name || "",
      phone: savedDraft.clientData.phone || user.phone || "",
      address: savedDraft.clientData.address || profile?.location || "",
      location: savedDraft.clientData.location || profile?.location || "",
      latitude: savedDraft.clientData.latitude ?? profile?.latitude ?? null,
      longitude: savedDraft.clientData.longitude ?? profile?.longitude ?? null,
      locationSource:
        savedDraft.clientData.locationSource ||
        normalizeLocationSource(profile?.locationSource) ||
        "MANUAL",
      locationAccuracy:
        savedDraft.clientData.locationAccuracy ??
        profile?.locationAccuracy ??
        null,
    },
    providerData: {
      ...savedDraft.providerData,
      businessName:
        savedDraft.providerData.businessName || profile?.businessName || "",
      primaryCategoryId:
        savedDraft.providerData.primaryCategoryId ||
        profile?.primaryCategoryId ||
        profile?.skills?.[0] ||
        "",
      skills:
        savedDraft.providerData.skills.length > 0
          ? savedDraft.providerData.skills
          : profile?.skills || [],
      location: savedDraft.providerData.location || profile?.location || "",
      latitude: savedDraft.providerData.latitude ?? profile?.latitude ?? null,
      longitude:
        savedDraft.providerData.longitude ?? profile?.longitude ?? null,
      locationSource:
        savedDraft.providerData.locationSource ||
        normalizeLocationSource(profile?.locationSource) ||
        "MANUAL",
      locationAccuracy:
        savedDraft.providerData.locationAccuracy ??
        profile?.locationAccuracy ??
        null,
      bio: savedDraft.providerData.bio || profile?.bio || "",
      phone: savedDraft.providerData.phone || user.phone || "",
      hourlyRate:
        savedDraft.providerData.hourlyRate ||
        (profile?.hourlyRate != null ? String(profile.hourlyRate) : ""),
    },
    verification: {
      ...savedDraft.verification,
      faceMatchScore:
        savedDraft.verification.faceMatchScore ??
        profile?.faceMatchScore ??
        null,
      idDocumentType:
        savedDraft.verification.idDocumentType ||
        profile?.idDocumentType ||
        "unknown",
    },
  };
}

async function resolveReferralReferrerId(params: {
  userId: string;
  referredById: string | null;
  referralCode: string;
}): Promise<string | null> {
  const normalizedReferralCode = params.referralCode.trim().toUpperCase();
  if (!normalizedReferralCode || params.referredById) {
    return null;
  }

  const referralCodePattern = /^JIT-[A-HJ-NP-Z2-9]{6}$/;
  if (!referralCodePattern.test(normalizedReferralCode)) {
    return null;
  }

  const referrer = await prisma.user.findUnique({
    where: { referralCode: normalizedReferralCode },
    select: { id: true },
  });

  if (!referrer || referrer.id === params.userId) {
    return null;
  }

  const existingReferral = await prisma.referral.findUnique({
    where: { referredUserId: params.userId },
    select: { id: true },
  });

  return existingReferral ? null : referrer.id;
}

export const GET = auth(async (req) => {
  try {
    const actingUser = await getActingUser(req.auth);
    if (!actingUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: actingUser.id },
      select: {
        businessName: true,
        primaryCategoryId: true,
        skills: true,
        location: true,
        latitude: true,
        longitude: true,
        locationSource: true,
        locationAccuracy: true,
        bio: true,
        hourlyRate: true,
        faceMatchScore: true,
        idDocumentType: true,
      },
    });

    return NextResponse.json({
      draft: buildDraftFromState({
        user: actingUser,
        profile,
      }),
    });
  } catch (error) {
    console.error("[ONBOARDING_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to load onboarding draft" },
      { status: 500 },
    );
  }
});

export const PATCH = auth(async (req) => {
  try {
    const actingUser = await getActingUser(req.auth);
    if (!actingUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const sanitizedDraft = sanitizeDraftState(body?.draft ?? body);

    await prisma.user.update({
      where: { id: actingUser.id },
      data: {
        onboardingDraft: toInputJsonValue({
          ...sanitizedDraft,
          updatedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      draft: {
        ...sanitizedDraft,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[ONBOARDING_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to save onboarding draft" },
      { status: 500 },
    );
  }
});

export const POST = auth(async (req) => {
  try {
    const actingUser = await getActingUser(req.auth);
    if (!actingUser) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const role = normalizeOnboardingIntent(body?.role);
    if (!role) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    let location =
      typeof body?.location === "string" ? body.location.trim() : "";
    const bio = typeof body?.bio === "string" ? body.bio.trim() : "";
    const normalizedPhone = normalizePhoneInput(body?.phone);
    const address =
      typeof body?.address === "string" ? body.address.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const image = typeof body?.image === "string" ? body.image.trim() : "";
    const businessName =
      typeof body?.businessName === "string" ? body.businessName.trim() : "";
    const primaryCategoryId =
      typeof body?.primaryCategoryId === "string"
        ? body.primaryCategoryId.trim()
        : "";
    const normalizedLocationSource = normalizeLocationSource(
      body?.locationSource,
    );
    const normalizedLocationAccuracy = normalizeLocationAccuracy(
      body?.locationAccuracy,
    );
    const referralCode =
      typeof body?.referralCode === "string"
        ? body.referralCode.trim().toUpperCase()
        : "";
    const clientInterests = Array.isArray(body?.clientInterests)
      ? body.clientInterests.filter(
          (value: unknown): value is string => typeof value === "string",
        )
      : [];
    const requestedSkills = Array.isArray(body?.skills)
      ? body.skills.filter(
          (value: unknown): value is string => typeof value === "string",
        )
      : [];
    const faceMatchScore =
      body?.faceMatchScore !== undefined && body?.faceMatchScore !== null
        ? Number(body.faceMatchScore)
        : undefined;
    const idDocumentType =
      typeof body?.idDocumentType === "string"
        ? body.idDocumentType.trim()
        : "";
    const onboardingCompleted = Boolean(body?.onboardingCompleted);
    const hourlyRateValue =
      body?.hourlyRate !== undefined &&
      body?.hourlyRate !== null &&
      body?.hourlyRate !== ""
        ? Number(body.hourlyRate)
        : null;
    const latitude =
      body?.latitude !== undefined && body?.latitude !== null
        ? Number(body.latitude)
        : null;
    const longitude =
      body?.longitude !== undefined && body?.longitude !== null
        ? Number(body.longitude)
        : null;

    if (
      normalizedLocationAccuracy !== undefined &&
      normalizedLocationAccuracy < 0
    ) {
      return NextResponse.json(
        { error: "Invalid location accuracy" },
        { status: 400 },
      );
    }

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    if (!isValidKenyanPhone(normalizedPhone)) {
      return NextResponse.json(
        {
          error:
            "Use a valid Kenyan phone number format, for example 254712345678.",
        },
        { status: 400 },
      );
    }

    const phoneOwner = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
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

    if (role === "CLIENT") {
      if (!name || name.length > VALIDATION.MAX_NAME_LENGTH) {
        return NextResponse.json(
          {
            error: `Name is required and must not exceed ${VALIDATION.MAX_NAME_LENGTH} characters`,
          },
          { status: 400 },
        );
      }

      if (!address || address.length > VALIDATION.MAX_ADDRESS_LENGTH) {
        return NextResponse.json(
          {
            error: `Address is required and must not exceed ${VALIDATION.MAX_ADDRESS_LENGTH} characters`,
          },
          { status: 400 },
        );
      }

      location = location || address;

      if (clientInterests.length > VALIDATION.MAX_CLIENT_INTERESTS) {
        return NextResponse.json(
          {
            error: `Maximum ${VALIDATION.MAX_CLIENT_INTERESTS} interests allowed`,
          },
          { status: 400 },
        );
      }
    }

    if (role === "PROVIDER") {
      if (!businessName || businessName.length > VALIDATION.MAX_NAME_LENGTH) {
        return NextResponse.json(
          {
            error: `Business name is required and must not exceed ${VALIDATION.MAX_NAME_LENGTH} characters`,
          },
          { status: 400 },
        );
      }

      if (!primaryCategoryId) {
        return NextResponse.json(
          { error: "Select a primary service category" },
          { status: 400 },
        );
      }

      if (!requestedSkills.length) {
        return NextResponse.json(
          { error: "At least one skill is required" },
          { status: 400 },
        );
      }

      if (requestedSkills.length > VALIDATION.MAX_PROVIDER_SKILLS) {
        return NextResponse.json(
          { error: `Maximum ${VALIDATION.MAX_PROVIDER_SKILLS} skills allowed` },
          { status: 400 },
        );
      }

      if (!requestedSkills.includes(primaryCategoryId)) {
        requestedSkills.unshift(primaryCategoryId);
      }

      if (!bio || bio.length > VALIDATION.MAX_BIO_LENGTH) {
        return NextResponse.json(
          {
            error: `Bio is required and must not exceed ${VALIDATION.MAX_BIO_LENGTH} characters`,
          },
          { status: 400 },
        );
      }

      if (
        hourlyRateValue === null ||
        !Number.isFinite(hourlyRateValue) ||
        hourlyRateValue < 0 ||
        hourlyRateValue > VALIDATION.MAX_HOURLY_RATE
      ) {
        return NextResponse.json(
          { error: "Invalid hourly rate" },
          { status: 400 },
        );
      }

      if (!location || location.length > VALIDATION.MAX_LOCATION_LENGTH) {
        return NextResponse.json(
          {
            error: `Location is required and must not exceed ${VALIDATION.MAX_LOCATION_LENGTH} characters`,
          },
          { status: 400 },
        );
      }
    }

    const referralToApplyReferrerId = await resolveReferralReferrerId({
      userId: actingUser.id,
      referredById: actingUser.referredById,
      referralCode,
    });

    const updatedUser = await prisma.user.update({
      where: { id: actingUser.id },
      data: {
        role,
        onboardingCompleted,
        clientInterests:
          role === "CLIENT" ? clientInterests : actingUser.clientInterests,
        onboardingDraft: Prisma.DbNull,
        ...(name ? { name } : {}),
        ...(image ? { image } : {}),
        phone: normalizedPhone,
        ...(referralToApplyReferrerId
          ? { referredById: referralToApplyReferrerId }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        onboardingCompleted: true,
        clientInterests: true,
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

    if (role === "PROVIDER") {
      const idDocument =
        typeof body?.idDocument === "string" ? body.idDocument.trim() : "";
      const selfieUrl = image;

      const verificationFields = {
        ...(faceMatchScore !== undefined && Number.isFinite(faceMatchScore)
          ? { faceMatchScore }
          : {}),
        ...(idDocumentType ? { idDocumentType } : {}),
        ...(normalizedLocationSource
          ? { locationSource: normalizedLocationSource }
          : {}),
        ...(normalizedLocationAccuracy !== undefined
          ? { locationAccuracy: normalizedLocationAccuracy }
          : {}),
        verificationAttempts: { increment: 1 },
        lastVerificationAt: new Date(),
      };

      await prisma.profile.upsert({
        where: { userId: actingUser.id },
        create: {
          userId: actingUser.id,
          businessName,
          primaryCategoryId,
          skills: requestedSkills.slice(0, VALIDATION.MAX_PROVIDER_SKILLS),
          location,
          latitude,
          longitude,
          bio,
          hourlyRate: hourlyRateValue,
          verificationStatus: "PENDING",
          idDocument: idDocument || null,
          ...(faceMatchScore !== undefined && Number.isFinite(faceMatchScore)
            ? { faceMatchScore }
            : {}),
          ...(idDocumentType ? { idDocumentType } : {}),
          ...(normalizedLocationSource
            ? { locationSource: normalizedLocationSource }
            : {}),
          ...(normalizedLocationAccuracy !== undefined
            ? { locationAccuracy: normalizedLocationAccuracy }
            : {}),
          verificationAttempts: 1,
          lastVerificationAt: new Date(),
        },
        update: {
          businessName,
          primaryCategoryId,
          skills: requestedSkills.slice(0, VALIDATION.MAX_PROVIDER_SKILLS),
          location,
          latitude,
          longitude,
          bio,
          hourlyRate: hourlyRateValue,
          verificationStatus: "PENDING",
          idDocument: idDocument || null,
          ...verificationFields,
        },
      });

      if (idDocument) {
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

        const reviewNotes =
          faceMatchScore !== undefined &&
          Number.isFinite(faceMatchScore) &&
          faceMatchScore < 45
            ? "Automatic face match was low. Manual review required."
            : null;

        if (existingOpenIdentityRequest) {
          await prisma.identityVerificationRequest.update({
            where: { id: existingOpenIdentityRequest.id },
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
              userId: actingUser.id,
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
            userId: actingUser.id,
            action: "IDENTITY_REQUEST_SUBMITTED",
            newValue: "SUBMITTED",
            performedBy: actingUser.id,
          },
        });
      }
    } else {
      await prisma.profile.upsert({
        where: { userId: actingUser.id },
        create: {
          userId: actingUser.id,
          skills: [],
          location,
          latitude,
          longitude,
          ...(normalizedLocationSource
            ? { locationSource: normalizedLocationSource }
            : {}),
          ...(normalizedLocationAccuracy !== undefined
            ? { locationAccuracy: normalizedLocationAccuracy }
            : {}),
        },
        update: {
          location,
          latitude,
          longitude,
          ...(normalizedLocationSource
            ? { locationSource: normalizedLocationSource }
            : {}),
          ...(normalizedLocationAccuracy !== undefined
            ? { locationAccuracy: normalizedLocationAccuracy }
            : {}),
        },
      });
    }

    if (onboardingCompleted) {
      await completePendingSignupReferralsForUser(actingUser.id);
    }

    return NextResponse.json({
      ...updatedUser,
      roles: mergeRoles(
        [],
        updatedUser.role,
        getDefaultRolesForPrimaryRole(updatedUser.role),
      ),
    });
  } catch (error: unknown) {
    console.error("[ONBOARDING_ERROR]", {
      message: error instanceof Error ? error.message : undefined,
      code:
        isPlainObject(error) && typeof error.code === "string"
          ? error.code
          : undefined,
      meta:
        isPlainObject(error) && "meta" in error
          ? (error as { meta?: unknown }).meta
          : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });

    const prismaCode =
      isPlainObject(error) && typeof error.code === "string" ? error.code : "";
    const prismaMeta =
      isPlainObject(error) && "meta" in error
        ? (error as { meta?: { target?: string | string[] } }).meta
        : undefined;

    if (prismaCode === "P2002") {
      const target = Array.isArray(prismaMeta?.target)
        ? prismaMeta.target.join(", ")
        : String(prismaMeta?.target || "");

      if (target.includes("phone")) {
        return NextResponse.json(
          {
            error:
              "That phone number is already linked to another account. Use a different number.",
            conflictField: "phone",
          },
          { status: 409 },
        );
      }

      if (target.includes("email")) {
        return NextResponse.json(
          {
            error: "That email is already linked to another account.",
            conflictField: "email",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Error",
      },
      { status: 500 },
    );
  }
});
