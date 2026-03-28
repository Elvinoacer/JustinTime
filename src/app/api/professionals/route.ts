import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    // Robust numeric parsing
    const parseNum = (val: string | null) => {
      if (!val) return undefined;
      const n = Number(val);
      return isNaN(n) ? undefined : n;
    };

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

    // Build filter conditions
    const where: any = {
      role: "PROVIDER",
    };

    if (verifiedOnly) {
      where.profile = {
        ...where.profile,
        verificationStatus: "VERIFIED",
        isVerified: true,
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.profile = {
        ...(where.profile || {}),
        hourlyRate: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      };
    }

    // 1. Fetch Providers
    console.log("[Professionals API] Fetching providers from DB...");
    const providers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        profile: true,
        subscription: {
          select: {
            plan: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            providerBookings: { where: { status: "COMPLETED" } },
            receivedReviews: true,
          },
        },
      },
      take: 200,
    });

    if (providers.length === 0) {
      return successResponse({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    // 2. Fetch Ratings
    // Using findMany + in-memory grouping is often more stable than groupBy across various Prisma versions
    console.log(
      "[Professionals API] Fetching reviews for",
      providers.length,
      "providers...",
    );
    const providerIds = providers.map((p) => p.id);
    const reviews = await prisma.review.findMany({
      where: { targetId: { in: providerIds } },
      select: { targetId: true, rating: true },
    });

    // Group reviews by targetId and calculate averages
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

    // 3. Fetch categories for skill mapping
    console.log("[Professionals API] Fetching categories for mapping...");
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    // 4. Transform and Format
    const formattedProviders = providers.map((provider) => {
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

      return {
        id: provider.id,
        name: provider.name || "Anonymous Professional",
        image: provider.image,
        title: p?.bio?.split(".")[0] || "Service Provider",
        bio: p?.bio || "",
        skills,
        hourlyRate: p?.hourlyRate ? Number(p.hourlyRate) : 0,
        location: p?.location || "Mobile Service",
        latitude: p?.latitude,
        longitude: p?.longitude,
        rating: getAvg(provider.id),
        reviews: provider._count?.receivedReviews || 0,
        completedJobs: provider._count?.providerBookings || 0,
        memberSince: provider.createdAt,
        verified: p?.isVerified || false,
        verificationAccessGranted: hasPaidOrWaivedAccess,
        visibilityBoostScore,
        subscription: {
          plan: provider.subscription?.plan || "FREE",
          isActive: provider.subscription?.isActive || false,
        },
      };
    });

    // 5. Client-side Search
    let filtered = formattedProviders;
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = formattedProviders.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(lowerSearch) ||
          p.bio?.toLowerCase().includes(lowerSearch) ||
          p.skills.some((s) => s.toLowerCase().includes(lowerSearch)),
      );
    }

    // 6. Support Distance Sorting
    const calculateDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
    ) => {
      const R = 6371; // km
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
    };

    // 7. SortResults
    filtered.sort((a, b) => {
      const isAPremium =
        ["PRO", "BUSINESS"].includes(a.subscription.plan) &&
        a.subscription.isActive;
      const isBPremium =
        ["PRO", "BUSINESS"].includes(b.subscription.plan) &&
        b.subscription.isActive;
      const boostDelta = b.visibilityBoostScore - a.visibilityBoostScore;

      // Paid/waived onboarding access should produce a visible ranking lift.
      if (Math.abs(boostDelta) >= 1) {
        return boostDelta;
      }

      if (isAPremium && !isBPremium) return -1;
      if (!isAPremium && isBPremium) return 1;

      const hasCoords = (lat: any, lon: any) =>
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

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return successResponse({
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[Professionals API Fatal Error]:", error);
    return handleError(error);
  }
}
