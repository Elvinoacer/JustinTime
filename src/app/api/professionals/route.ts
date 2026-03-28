import { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import type { ProfessionalListItem } from "@/lib/api/contracts/public-listings";

const MAX_PROVIDERS_RANK = 4000;

function parseNum(val: string | null): number | undefined {
  if (!val) return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? undefined : n;
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
    const minPrice = parseNum(searchParams.get("minPrice"));
    const maxPrice = parseNum(searchParams.get("maxPrice"));
    const page = Math.max(1, parseNum(searchParams.get("page")) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseNum(searchParams.get("limit")) || 12),
    );
    const sortBy = searchParams.get("sortBy") || "rating";
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";
    const latitude = parseNum(searchParams.get("latitude"));
    const longitude = parseNum(searchParams.get("longitude"));

    const conditions: Prisma.UserWhereInput[] = [{ role: "PROVIDER" }];

    const profileFilters: Prisma.ProfileWhereInput = {};
    if (verifiedOnly) {
      profileFilters.verificationStatus = "VERIFIED";
      profileFilters.isVerified = true;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      profileFilters.hourlyRate = {};
      if (minPrice !== undefined) profileFilters.hourlyRate.gte = minPrice;
      if (maxPrice !== undefined) profileFilters.hourlyRate.lte = maxPrice;
    }
    if (Object.keys(profileFilters).length > 0) {
      conditions.push({ profile: profileFilters });
    }

    let skillIds: string[] = [];
    if (searchRaw) {
      const matchingCats = await prisma.category.findMany({
        where: {
          name: { contains: searchRaw, mode: "insensitive" },
        },
        select: { id: true },
      });
      skillIds = matchingCats.map((c) => c.id);
      const searchOr: Prisma.UserWhereInput[] = [
        { name: { contains: searchRaw, mode: "insensitive" } },
        { profile: { bio: { contains: searchRaw, mode: "insensitive" } } },
      ];
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
        subscription: {
          select: { plan: true, isActive: true },
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
        const skills = Array.isArray(p?.skills)
          ? p!.skills.map((skillId) => categoryMap.get(skillId) || skillId)
          : [];

        const hasPaidOrWaivedAccess =
          Boolean(p?.hasPaidOnboardingFee) || Boolean(p?.onboardingFeeWaived);
        const isSubscriptionPremium =
          ["PRO", "BUSINESS"].includes(provider.subscription?.plan || "") &&
          Boolean(provider.subscription?.isActive);
        const visibilityBoostScore =
          (hasPaidOrWaivedAccess ? 35 : 0) +
          (p?.isVerified || p?.verificationStatus === "VERIFIED" ? 20 : 0) +
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

        return {
          id: provider.id,
          name: provider.name || "Anonymous Professional",
          image: provider.image,
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
          verified: p?.isVerified || false,
          verificationAccessGranted: hasPaidOrWaivedAccess,
          visibilityBoostScore,
          subscription: {
            plan: provider.subscription?.plan || "FREE",
            isActive: provider.subscription?.isActive || false,
          },
          ...(distance !== undefined ? { distance } : {}),
        };
      },
    );

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
        total: totalMatched,
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
