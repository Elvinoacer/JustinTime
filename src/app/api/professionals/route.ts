import { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import type { ProfessionalListItem } from "@/lib/api/contracts/public-listings";
import { isPubliclyVerified } from "@/lib/trust/publicTrust";
import { getMarketplaceSearchTerms } from "@/lib/search/normalizeMarketplaceQuery";

const MAX_PROVIDERS_RANK = 4000;
const IMAGE_FILE_PATTERN =
  /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;

function parseNum(val: string | null): number | undefined {
  if (!val) return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? undefined : n;
}

function isLikelyImageUrl(url: string) {
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

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchRaw = (searchParams.get("search") || "").trim();
    const searchTerms = getMarketplaceSearchTerms(searchRaw, 10);
    const minPrice = parseNum(searchParams.get("minPrice"));
    const maxPrice = parseNum(searchParams.get("maxPrice"));
    const page = Math.max(1, parseNum(searchParams.get("page")) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseNum(searchParams.get("limit")) || 12),
    );
    const sortBy = searchParams.get("sortBy") || "rating";
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";
    const backgroundCheckedOnly =
      searchParams.get("backgroundCheckedOnly") === "true";
    const certifiedOnly = searchParams.get("certifiedOnly") === "true";
    const latitude = parseNum(searchParams.get("latitude"));
    const longitude = parseNum(searchParams.get("longitude"));

    const conditions: Prisma.UserWhereInput[] = [
      {
        OR: [{ role: "PROVIDER" }, { roles: { has: "PROVIDER" } }],
      },
    ];

    const profileFilters: Prisma.ProfileWhereInput = {};
    if (minPrice !== undefined || maxPrice !== undefined) {
      profileFilters.hourlyRate = {};
      if (minPrice !== undefined) profileFilters.hourlyRate.gte = minPrice;
      if (maxPrice !== undefined) profileFilters.hourlyRate.lte = maxPrice;
    }
    if (Object.keys(profileFilters).length > 0) {
      conditions.push({ profile: profileFilters });
    }

    if (verifiedOnly) {
      conditions.push({
        OR: [
          { profile: { verificationStatus: "VERIFIED" } },
          { trustScore: { tier: { in: ["VERIFIED", "PREMIUM", "ELITE"] } } },
        ],
      });
    }

    if (backgroundCheckedOnly) {
      conditions.push({
        OR: [
          {
            backgroundChecks: {
              some: {
                status: "APPROVED",
              },
            },
          },
          {
            verificationBadges: {
              some: {
                type: "GOOD_CONDUCT",
                status: "VERIFIED",
              },
            },
          },
        ],
      });
    }

    let skillIds: string[] = [];
    if (searchTerms.length > 0) {
      const matchingCats = await prisma.category.findMany({
        where: {
          OR: searchTerms.map((term) => ({
            name: { contains: term, mode: "insensitive" },
          })),
        },
        select: { id: true },
      });
      skillIds = matchingCats.map((c) => c.id);
      const searchOr: Prisma.UserWhereInput[] = searchTerms.flatMap((term) => [
        { name: { contains: term, mode: "insensitive" } },
        { profile: { bio: { contains: term, mode: "insensitive" } } },
      ]);
      if (skillIds.length > 0) {
        searchOr.push({ profile: { skills: { hasSome: skillIds } } });
      }
      conditions.push({ OR: searchOr });
    }

    const where: Prisma.UserWhereInput =
      conditions.length === 1 ? conditions[0]! : { AND: conditions };

    const totalMatched = await prisma.user.count({ where });

    if (totalMatched === 0) {
      return successResponse({
        items: [] as ProfessionalListItem[],
        pagination: {
          page,
          pageSize: limit,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }

    const truncatedListing = totalMatched > MAX_PROVIDERS_RANK;
    const providers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        profile: true,
        services: {
          where: {
            isActive: true,
          },
          select: {
            images: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        subscription: {
          select: { plan: true, isActive: true },
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
        _count: {
          select: {
            providerBookings: { where: { status: "COMPLETED" } },
            receivedReviews: true,
          },
        },
      },
      ...(truncatedListing
        ? { take: MAX_PROVIDERS_RANK, orderBy: { createdAt: "desc" } }
        : {}),
    });

    const providerIds = providers.map((p) => p.id);
    const reviews = await prisma.review.findMany({
      where: { targetId: { in: providerIds } },
      select: { targetId: true, rating: true },
    });

    const ratingsAcc: Record<string, { sum: number; count: number }> = {};
    reviews.forEach((r) => {
      if (!ratingsAcc[r.targetId])
        ratingsAcc[r.targetId] = { sum: 0, count: 0 };
      ratingsAcc[r.targetId].sum += r.rating;
      ratingsAcc[r.targetId].count += 1;
    });

    const getAvg = (pid: string) => {
      const stats = ratingsAcc[pid];
      return stats ? stats.sum / stats.count : 0;
    };

    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    let formattedProviders: ProfessionalListItem[] = providers.map(
      (provider) => {
        const p = provider.profile;
        const verified = isPubliclyVerified({
          verificationStatus: p?.verificationStatus,
          trustTier: provider.trustScore?.tier,
          overallScore: provider.trustScore?.overallScore,
        });
        const approvedBadges = provider.verificationBadges.filter(
          (badge) => badge.status === "VERIFIED",
        );
        const hasApprovedBackgroundCheck = provider.backgroundChecks.some(
          (backgroundCheck) => backgroundCheck.status === "APPROVED",
        );
        const backgroundChecked =
          hasApprovedBackgroundCheck ||
          approvedBadges.some((badge) => badge.type === "GOOD_CONDUCT");
        const certificationsRaw = Array.isArray(p?.certifications)
          ? p.certifications
          : [];
        const certified =
          certificationsRaw.length > 0 ||
          approvedBadges.some((badge) => badge.type === "SKILLS_CERTIFIED");
        const skills = Array.isArray(p?.skills)
          ? p!.skills.map((skillId) => categoryMap.get(skillId) || skillId)
          : [];
        const trustBadges = [
          ...(verified ? ["Verified"] : []),
          ...(backgroundChecked ? ["Background checked"] : []),
          ...(certified ? ["Certified"] : []),
        ];

        const hasPaidOrWaivedAccess =
          Boolean(p?.hasPaidOnboardingFee) || Boolean(p?.onboardingFeeWaived);
        const isSubscriptionPremium =
          ["PRO", "BUSINESS"].includes(provider.subscription?.plan || "") &&
          Boolean(provider.subscription?.isActive);
        const visibilityBoostScore =
          (hasPaidOrWaivedAccess ? 35 : 0) +
          (verified ? 20 : 0) +
          (isSubscriptionPremium ? 15 : 0) +
          Math.min(provider._count?.providerBookings || 0, 30) * 0.5 +
          Math.min(provider._count?.receivedReviews || 0, 20) * 0.5;

        const lat = p?.latitude ?? null;
        const lon = p?.longitude ?? null;
        let distance: number | undefined;
        if (
          sortBy === "distance" &&
          latitude !== undefined &&
          longitude !== undefined &&
          typeof lat === "number" &&
          typeof lon === "number"
        ) {
          distance =
            Math.round(calculateDistance(latitude, longitude, lat, lon) * 10) /
            10;
        }

        const portfolio =
          Array.isArray(p?.portfolio) && p.portfolio.length > 0
            ? (p!.portfolio.find(
                (url) =>
                  typeof url === "string" &&
                  url.trim().length > 0 &&
                  isLikelyImageUrl(url),
              ) ?? null)
            : null;
        const serviceImage =
          provider.services
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
            ) ?? null;

        const searchableText = [provider.name || "", p?.bio || "", ...skills]
          .join(" ")
          .toLowerCase();
        const matchedTerms = searchTerms.filter((term) =>
          searchableText.includes(term.toLowerCase()),
        ).length;
        const textRelevance =
          searchTerms.length > 0
            ? Math.min((matchedTerms / searchTerms.length) * 24, 24)
            : 8;
        const distanceScore =
          typeof distance === "number"
            ? Math.max(0, 35 - Math.min(distance, 35))
            : 0;
        const ratingScore = Math.min((getAvg(provider.id) || 0) * 5, 25);
        const completionScore =
          (Math.min(provider._count?.providerBookings || 0, 50) / 50) * 16;
        const reviewsScore =
          (Math.min(provider._count?.receivedReviews || 0, 40) / 40) * 10;
        const verificationScore = verified ? 8 : 0;
        const relevanceScore = Number(
          (
            textRelevance +
            distanceScore +
            ratingScore +
            completionScore +
            reviewsScore +
            verificationScore
          ).toFixed(3),
        );

        return {
          id: provider.id,
          name: provider.name || "Anonymous Professional",
          image: provider.image,
          coverImage: portfolio || serviceImage,
          title: p?.bio?.split(".")[0] || "Service Provider",
          bio: p?.bio || "",
          skills,
          hourlyRate: p?.hourlyRate ? Number(p.hourlyRate) : 0,
          location: p?.location || "Mobile Service",
          latitude: lat,
          longitude: lon,
          rating: getAvg(provider.id),
          reviews: provider._count?.receivedReviews || 0,
          completedJobs: provider._count?.providerBookings || 0,
          memberSince: provider.createdAt.toISOString(),
          verified,
          backgroundChecked,
          certified,
          trustBadges,
          verificationAccessGranted: hasPaidOrWaivedAccess,
          visibilityBoostScore,
          relevanceScore,
          subscription: {
            plan: provider.subscription?.plan || "FREE",
            isActive: provider.subscription?.isActive || false,
          },
          ...(distance !== undefined ? { distance } : {}),
        };
      },
    );

    if (backgroundCheckedOnly) {
      formattedProviders = formattedProviders.filter(
        (provider) => provider.backgroundChecked,
      );
    }

    if (certifiedOnly) {
      formattedProviders = formattedProviders.filter(
        (provider) => provider.certified,
      );
    }

    formattedProviders.sort((a, b) => {
      const isAPremium =
        ["PRO", "BUSINESS"].includes(a.subscription.plan) &&
        a.subscription.isActive;
      const isBPremium =
        ["PRO", "BUSINESS"].includes(b.subscription.plan) &&
        b.subscription.isActive;
      const boostDelta = b.visibilityBoostScore - a.visibilityBoostScore;

      if (Math.abs(boostDelta) >= 1) return boostDelta;
      if (isAPremium && !isBPremium) return -1;
      if (!isAPremium && isBPremium) return 1;

      const hasCoords = (lat: unknown, lon: unknown) =>
        typeof lat === "number" && typeof lon === "number";

      if (
        sortBy === "distance" &&
        hasCoords(latitude, longitude) &&
        hasCoords(a.latitude, a.longitude) &&
        hasCoords(b.latitude, b.longitude)
      ) {
        const distA = calculateDistance(
          latitude!,
          longitude!,
          a.latitude!,
          a.longitude!,
        );
        const distB = calculateDistance(
          latitude!,
          longitude!,
          b.latitude!,
          b.longitude!,
        );
        if (Math.abs(distA - distB) > 0.3) return distA - distB;
        return boostDelta;
      }

      if (sortBy === "recommended") {
        const recommendationDelta =
          (b.relevanceScore || 0) - (a.relevanceScore || 0);
        if (Math.abs(recommendationDelta) > 0.1) return recommendationDelta;
        return boostDelta;
      }

      switch (sortBy) {
        case "rating": {
          const ratingDelta = b.rating - a.rating;
          if (Math.abs(ratingDelta) > 0.1) return ratingDelta;
          return boostDelta;
        }
        case "price_asc": {
          const priceDelta = a.hourlyRate - b.hourlyRate;
          if (Math.abs(priceDelta) > 20) return priceDelta;
          return boostDelta;
        }
        case "price_desc": {
          const priceDelta = b.hourlyRate - a.hourlyRate;
          if (Math.abs(priceDelta) > 20) return priceDelta;
          return boostDelta;
        }
        case "newest": {
          const newestDelta =
            new Date(b.memberSince).getTime() -
            new Date(a.memberSince).getTime();
          if (Math.abs(newestDelta) > 1000 * 60 * 60 * 24 * 2)
            return newestDelta;
          return boostDelta;
        }
        default:
          return boostDelta;
      }
    });

    const rankableCount = formattedProviders.length;
    const totalVisible = rankableCount;
    const paginated = formattedProviders.slice(
      (page - 1) * limit,
      page * limit,
    );
    const totalPages = Math.max(1, Math.ceil(rankableCount / limit));
    const hasMore = page * limit < rankableCount;

    return successResponse({
      items: paginated,
      pagination: {
        page,
        pageSize: limit,
        limit,
        total: totalVisible,
        totalPages: rankableCount === 0 ? 0 : totalPages,
        hasMore,
      },
      meta: truncatedListing
        ? {
            limited: true,
            totalMatched,
            processed: formattedProviders.length,
          }
        : undefined,
    });
  } catch (error: unknown) {
    console.error("[Professionals API Fatal Error]:", error);
    return handleError(error);
  }
}
