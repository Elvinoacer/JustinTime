import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, handleError } from "@/lib/middleware/errorHandler";
import { isPubliclyVerified } from "@/lib/trust/publicTrust";
import { getMarketplaceSearchTerms } from "@/lib/search/normalizeMarketplaceQuery";
import {
  scoreTarget,
  type RecommendationSignals,
} from "@/lib/recommendations/scoring";
import { calculateDistance } from "@/lib/utils/geolocation";
import type { Prisma } from "@/generated/prisma/client";

const IMAGE_FILE_PATTERN =
  /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;

function isLikelyImageUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();

    if (IMAGE_FILE_PATTERN.test(pathname)) return true;

    const format = parsed.searchParams.get("format");
    const fm = parsed.searchParams.get("fm");
    return Boolean(
      (format && IMAGE_FILE_PATTERN.test(`file.${format}`)) ||
      (fm && IMAGE_FILE_PATTERN.test(`file.${fm}`)),
    );
  } catch {
    return IMAGE_FILE_PATTERN.test(url);
  }
}

function toNumber(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

async function buildSignals(
  userId: string | undefined,
  latitude: number | null,
  longitude: number | null,
): Promise<RecommendationSignals> {
  if (!userId) {
    return {
      interests: [],
      historyTerms: [],
      latitude,
      longitude,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      clientInterests: true,
      profile: {
        select: {
          latitude: true,
          longitude: true,
        },
      },
      bookings: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          service: {
            select: {
              title: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const historyTerms =
    user?.bookings.flatMap((booking) => [
      booking.service?.title || "",
      booking.service?.category?.name || "",
    ]) || [];

  return {
    interests: user?.clientInterests || [],
    historyTerms,
    latitude: latitude ?? user?.profile?.latitude ?? null,
    longitude: longitude ?? user?.profile?.longitude ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(
      40,
      Math.max(5, Number(searchParams.get("limit") || "12")),
    );
    const skip = (page - 1) * limit;

    const search = searchParams.get("search") || "";
    const minPrice = toNumber(searchParams.get("minPrice"));
    const maxPrice = toNumber(searchParams.get("maxPrice"));
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";
    const backgroundCheckedOnly =
      searchParams.get("backgroundCheckedOnly") === "true";
    const certifiedOnly = searchParams.get("certifiedOnly") === "true";
    const latitude = toNumber(searchParams.get("latitude"));
    const longitude = toNumber(searchParams.get("longitude"));
    const searchTerms = getMarketplaceSearchTerms(search, 10);

    const whereConditions: Prisma.UserWhereInput[] = [
      {
        OR: [{ role: "PROVIDER" }, { roles: { has: "PROVIDER" } }],
      },
    ];

    const profileFilters: Prisma.ProfileWhereInput = {};
    if (minPrice !== null || maxPrice !== null) {
      profileFilters.hourlyRate = {};
      if (minPrice !== null) {
        profileFilters.hourlyRate.gte = minPrice;
      }
      if (maxPrice !== null) {
        profileFilters.hourlyRate.lte = maxPrice;
      }
    }
    if (Object.keys(profileFilters).length > 0) {
      whereConditions.push({ profile: profileFilters });
    }

    if (verifiedOnly) {
      whereConditions.push({
        OR: [
          { profile: { verificationStatus: "VERIFIED" } },
          { trustScore: { tier: { in: ["VERIFIED", "PREMIUM", "ELITE"] } } },
        ],
      });
    }

    if (searchTerms.length > 0) {
      whereConditions.push({
        OR: searchTerms.flatMap((term) => [
          { name: { contains: term, mode: "insensitive" } },
          { profile: { bio: { contains: term, mode: "insensitive" } } },
          {
            services: {
              some: { title: { contains: term, mode: "insensitive" } },
            },
          },
        ]),
      });
    }

    const where: Prisma.UserWhereInput =
      whereConditions.length === 1
        ? whereConditions[0]!
        : { AND: whereConditions };

    const providers = await prisma.user.findMany({
      where,
      include: {
        profile: true,
        subscription: {
          select: {
            plan: true,
            isActive: true,
          },
        },
        backgroundChecks: {
          select: {
            status: true,
          },
        },
        verificationBadges: {
          select: {
            type: true,
            status: true,
          },
        },
        trustScore: {
          select: {
            tier: true,
            overallScore: true,
          },
        },
        services: {
          where: {
            isActive: true,
          },
          select: {
            title: true,
            images: true,
            category: {
              select: {
                name: true,
              },
            },
          },
          take: 8,
        },
        _count: {
          select: {
            providerBookings: {
              where: {
                status: "COMPLETED",
              },
            },
            receivedReviews: true,
          },
        },
        receivedReviews: {
          select: {
            rating: true,
          },
          take: 80,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 300,
    });

    const signals = await buildSignals(session?.user?.id, latitude, longitude);

    let ranked = providers
      .map((provider) => {
        const ratings = provider.receivedReviews.map((review) => review.rating);
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : 0;

        const providerIsVerified = isPubliclyVerified({
          verificationStatus: provider.profile?.verificationStatus,
          trustTier: provider.trustScore?.tier,
          overallScore: provider.trustScore?.overallScore,
        });

        const categoryNames = provider.services.map(
          (service) => service.category?.name || "",
        );
        const serviceTitles = provider.services.map(
          (service) => service.title || "",
        );

        const approvedBadges = provider.verificationBadges.filter(
          (badge) => badge.status === "VERIFIED",
        );
        const hasApprovedBackgroundCheck = provider.backgroundChecks.some(
          (backgroundCheck) => backgroundCheck.status === "APPROVED",
        );
        const backgroundChecked =
          hasApprovedBackgroundCheck ||
          approvedBadges.some((badge) => badge.type === "GOOD_CONDUCT");

        const certificationsRaw = Array.isArray(
          provider.profile?.certifications,
        )
          ? provider.profile?.certifications
          : [];
        const certified =
          certificationsRaw.length > 0 ||
          approvedBadges.some((badge) => badge.type === "SKILLS_CERTIFIED");

        const trustBadges = [
          ...(providerIsVerified ? ["Verified"] : []),
          ...(backgroundChecked ? ["Background checked"] : []),
          ...(certified ? ["Certified"] : []),
        ];

        const hasPaidOrWaivedAccess =
          Boolean(provider.profile?.hasPaidOnboardingFee) ||
          Boolean(provider.profile?.onboardingFeeWaived);
        const isSubscriptionPremium =
          ["PRO", "BUSINESS"].includes(provider.subscription?.plan || "") &&
          Boolean(provider.subscription?.isActive);
        const visibilityBoostScore =
          (hasPaidOrWaivedAccess ? 35 : 0) +
          (providerIsVerified ? 20 : 0) +
          (isSubscriptionPremium ? 15 : 0) +
          Math.min(provider._count.providerBookings, 30) * 0.5 +
          Math.min(provider._count.receivedReviews, 20) * 0.5;

        const coverImage =
          (Array.isArray(provider.profile?.portfolio)
            ? (provider.profile?.portfolio.find(
                (url) =>
                  typeof url === "string" &&
                  url.trim().length > 0 &&
                  isLikelyImageUrl(url),
              ) ?? null)
            : null) ||
          (provider.services
            .find((service) =>
              Array.isArray(service.images)
                ? service.images.some(
                    (url) =>
                      typeof url === "string" &&
                      url.trim().length > 0 &&
                      isLikelyImageUrl(url),
                  )
                : false,
            )
            ?.images.find(
              (url) =>
                typeof url === "string" &&
                url.trim().length > 0 &&
                isLikelyImageUrl(url),
            ) ??
            null);

        const base = scoreTarget(signals, {
          title: provider.name,
          description: `${provider.profile?.bio || ""} ${serviceTitles.join(" ")}`,
          category: categoryNames.join(" "),
          latitude: provider.profile?.latitude,
          longitude: provider.profile?.longitude,
          rating: averageRating,
          reviewCount: provider._count.receivedReviews,
          completedCount: provider._count.providerBookings,
          createdAt: provider.createdAt,
          availableNow: provider.services.length > 0,
        });

        let distance: number | null = null;
        if (
          typeof signals.latitude === "number" &&
          typeof signals.longitude === "number" &&
          typeof provider.profile?.latitude === "number" &&
          typeof provider.profile?.longitude === "number"
        ) {
          distance = calculateDistance(
            signals.latitude,
            signals.longitude,
            provider.profile.latitude,
            provider.profile.longitude,
          );
        }

        const score = Number(
          (base.score + (providerIsVerified ? 6 : 0)).toFixed(3),
        );

        return {
          id: provider.id,
          name: provider.name || "Anonymous Professional",
          image: provider.image,
          coverImage,
          title: provider.profile?.bio?.split(".")[0] || "Service Provider",
          bio: provider.profile?.bio || "",
          location: provider.profile?.location || "Mobile Service",
          latitude: provider.profile?.latitude ?? null,
          longitude: provider.profile?.longitude ?? null,
          skills: categoryNames,
          hourlyRate: provider.profile?.hourlyRate
            ? Number(provider.profile.hourlyRate)
            : 0,
          rating: averageRating,
          reviews: provider._count.receivedReviews,
          completedJobs: provider._count.providerBookings,
          memberSince: provider.createdAt.toISOString(),
          verified: providerIsVerified,
          backgroundChecked,
          certified,
          trustBadges,
          verificationAccessGranted: hasPaidOrWaivedAccess,
          visibilityBoostScore,
          subscription: {
            plan: provider.subscription?.plan || "FREE",
            isActive: provider.subscription?.isActive || false,
          },
          distance,
          recommendation: {
            score,
            reasons: base.reasons,
          },
        };
      })
      .sort((a, b) => {
        const scoreDelta =
          (b.recommendation?.score || 0) - (a.recommendation?.score || 0);
        if (scoreDelta !== 0) return scoreDelta;

        const aDistance =
          typeof a.distance === "number"
            ? a.distance
            : Number.POSITIVE_INFINITY;
        const bDistance =
          typeof b.distance === "number"
            ? b.distance
            : Number.POSITIVE_INFINITY;
        if (aDistance !== bDistance) return aDistance - bDistance;

        return b.rating - a.rating;
      });

    if (backgroundCheckedOnly) {
      ranked = ranked.filter((provider) => provider.backgroundChecked);
    }

    if (certifiedOnly) {
      ranked = ranked.filter((provider) => provider.certified);
    }

    const filteredTotal = ranked.length;

    const items = ranked.slice(skip, skip + limit);

    return successResponse({
      items,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: filteredTotal === 0 ? 0 : Math.ceil(filteredTotal / limit),
        hasMore: page * limit < filteredTotal,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
