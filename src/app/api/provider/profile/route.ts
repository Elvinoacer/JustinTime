import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { z } from "zod";
import { hasRole } from "@/lib/auth/roles";
import { isPubliclyVerified } from "@/lib/trust/publicTrust";
import { checkAndAwardBadges } from "@/lib/gamification/badge-checker";
import { applyLoyaltyRule } from "@/lib/loyalty/rule-engine";
import { PAYMENT_AMOUNTS } from "@/lib/constants/pricing";

// Schema for profile update
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  image: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationSource: z.enum(["GPS", "IP", "MANUAL"]).optional(),
  locationAccuracy: z.number().min(0).optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  hourlyRate: z.number().optional(),
  portfolio: z.array(z.string().trim().min(1).max(2048)).optional(),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string(),
        date: z.string(),
        fileUrl: z.string(),
      }),
    )
    .optional(),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string(),
        field: z.string(),
        startYear: z.string(),
        endYear: z.string().optional(),
      }),
    )
    .optional(),
  socialLinks: z
    .array(
      z.object({
        platform: z.string(),
        url: z.string().url(),
      }),
    )
    .optional(),
});

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !hasRole(session.user, "PROVIDER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [user, onboardingFeeSetting] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          trustScore: {
            select: {
              tier: true,
              overallScore: true,
            },
          },
        },
      }),
      prisma.systemSetting.findUnique({
        where: { key: "onboarding_fee_amount" },
        select: { value: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all categories for skill normalization/mapping
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const categoryIdSet = new Set(categories.map((c) => c.id));
    const categoryNameToId = new Map(
      categories.map((c) => [c.name.toLowerCase().trim(), c.id]),
    );

    const rawSkills = Array.isArray(user.profile?.skills)
      ? user.profile.skills
      : [];

    const normalizedSkills = rawSkills.map((value) => {
      if (categoryIdSet.has(value)) return value;
      const mappedId = categoryNameToId.get(value.toLowerCase().trim());
      return mappedId || value;
    });

    const selectedSkillIds = normalizedSkills.filter((value) =>
      categoryIdSet.has(value),
    );
    const legacySkills = normalizedSkills.filter(
      (value) => !categoryIdSet.has(value),
    );

    // Combine user and profile data
    const verificationAccessGranted = Boolean(
      user.profile?.hasPaidOnboardingFee || user.profile?.onboardingFeeWaived,
    );

    const isVerified = isPubliclyVerified({
      verificationStatus: user.profile?.verificationStatus,
      trustTier: user.trustScore?.tier,
      overallScore: user.trustScore?.overallScore,
    });
    const configuredOnboardingFee = Number(onboardingFeeSetting?.value);
    const onboardingFeeAmount =
      Number.isFinite(configuredOnboardingFee) && configuredOnboardingFee > 0
        ? configuredOnboardingFee
        : PAYMENT_AMOUNTS.ONBOARDING_FEE;

    const profileData = {
      name: user.name,
      email: user.email,
      image: user.image,
      phone: user.phone,
      location: user.profile?.location,
      latitude: user.profile?.latitude,
      longitude: user.profile?.longitude,
      locationSource: user.profile?.locationSource,
      locationAccuracy: user.profile?.locationAccuracy,
      bio: user.profile?.bio,
      skills: normalizedSkills,
      selectedSkillIds,
      legacySkills,
      skillLabels: normalizedSkills.map(
        (skillId) => categoryMap.get(skillId) || skillId,
      ),
      hourlyRate: user.profile?.hourlyRate,
      portfolio: user.profile?.portfolio || [],
      isVerified,
      verificationStatus: user.profile?.verificationStatus || "PENDING",
      hasPaidOnboardingFee: user.profile?.hasPaidOnboardingFee || false,
      onboardingFeeWaived: user.profile?.onboardingFeeWaived || false,
      onboardingFeeAmount,
      verificationAccessGranted,
      onboardingPrivileges: {
        visibilityBoost: verificationAccessGranted,
        prioritySupport: verificationAccessGranted,
        storageCapacity: verificationAccessGranted ? "EXPANDED" : "BASIC",
        storageLimitMb: verificationAccessGranted ? 500 : 100,
      },
      certifications: user.profile?.certifications || [],
      education: user.profile?.education || [],
      socialLinks: user.profile?.socialLinks || [],
      memberSince: user.createdAt,
      completedJobs: await prisma.booking.count({
        where: {
          providerId: userId,
          status: "COMPLETED",
        },
      }),
      averageRating: await prisma.review
        .aggregate({
          where: { targetId: userId },
          _avg: { rating: true },
        })
        .then((res) => res._avg.rating || 0),
      // Placeholder for response time as it requires complex message analysis
      responseTime: "< 2 hours",
      views: user.profile?.views || 0,
      favorites: user.profile?.favorites || 0,
    };

    return successResponse(profileData);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !hasRole(session.user, "PROVIDER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const validatedData = updateProfileSchema.parse(body);

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        phone: true,
        image: true,
        profile: {
          select: {
            certifications: true,
          },
        },
      },
    });

    // Update User model for basic info
    const userUpdateData: any = {};
    if (validatedData.name !== undefined)
      userUpdateData.name = validatedData.name;
    if (validatedData.phone !== undefined)
      userUpdateData.phone = validatedData.phone;
    if (validatedData.image !== undefined) {
      userUpdateData.image = validatedData.image || null;
    }

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    let normalizedSkills = validatedData.skills;
    if (validatedData.skills !== undefined) {
      const categories = await prisma.category.findMany({
        select: { id: true, name: true },
      });
      const categoryIdSet = new Set(categories.map((c) => c.id));
      const categoryNameToId = new Map(
        categories.map((c) => [c.name.toLowerCase().trim(), c.id]),
      );

      const deduped = new Set<string>();
      normalizedSkills = [];

      for (const value of validatedData.skills) {
        const normalizedValue = categoryIdSet.has(value)
          ? value
          : categoryNameToId.get(value.toLowerCase().trim()) || value;

        if (!deduped.has(normalizedValue)) {
          deduped.add(normalizedValue);
          normalizedSkills.push(normalizedValue);
        }
      }
    }

    // Upsert Profile model for extended info
    const profileData: any = {};
    if (validatedData.location !== undefined)
      profileData.location = validatedData.location;
    if (validatedData.latitude !== undefined)
      profileData.latitude = validatedData.latitude;
    if (validatedData.longitude !== undefined)
      profileData.longitude = validatedData.longitude;
    if (validatedData.locationSource !== undefined)
      profileData.locationSource = validatedData.locationSource;
    if (validatedData.locationAccuracy !== undefined)
      profileData.locationAccuracy = validatedData.locationAccuracy;
    if (validatedData.bio !== undefined) profileData.bio = validatedData.bio;
    if (normalizedSkills !== undefined) profileData.skills = normalizedSkills;
    if (validatedData.hourlyRate !== undefined)
      profileData.hourlyRate = validatedData.hourlyRate;
    if (validatedData.portfolio !== undefined)
      profileData.portfolio = validatedData.portfolio;
    if (validatedData.certifications !== undefined)
      profileData.certifications = validatedData.certifications;
    if (validatedData.education !== undefined)
      profileData.education = validatedData.education;
    if (validatedData.socialLinks !== undefined)
      profileData.socialLinks = validatedData.socialLinks;

    const certificationsChanged =
      validatedData.certifications !== undefined &&
      JSON.stringify(validatedData.certifications || []) !==
        JSON.stringify(currentUser?.profile?.certifications || []);

    // Reset verification only when identity-sensitive fields change.
    const shouldResetVerification =
      (validatedData.name !== undefined &&
        validatedData.name !== currentUser?.name) ||
      (validatedData.phone !== undefined &&
        validatedData.phone !== currentUser?.phone) ||
      certificationsChanged;

    if (shouldResetVerification) {
      profileData.verificationStatus = "PENDING";
      profileData.isVerified = false;
    }

    await prisma.profile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        ...profileData,
        verificationStatus: "PENDING",
        isVerified: false,
      },
    });

    try {
      await Promise.all([
        checkAndAwardBadges(userId, {
          trigger: "PROFILE_UPDATED",
          eventId: `profile:${userId}:${Date.now()}`,
          actorUserId: userId,
        }),
        applyLoyaltyRule({
          type: "PROFILE_UPDATED",
          userId,
          metadata: {
            source: "provider-profile",
          },
        }),
      ]);
    } catch (badgeError) {
      console.error("[PROVIDER_PROFILE_GAMIFICATION]", badgeError);
    }

    return successResponse({ message: "Profile updated successfully" });
  } catch (error) {
    return handleError(error);
  }
}
