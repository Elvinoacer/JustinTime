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
    const limit = Math.max(1, Math.min(100, parseNum(searchParams.get("limit")) || 12));
    
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
        _count: {
          select: {
            bookings: { where: { status: "COMPLETED" } },
            receivedReviews: true,
          },
        },
      },
      take: 200, // Reasonable limit for in-memory sorting/filtering
    });

    if (providers.length === 0) {
      return successResponse({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      });
    }

    // 2. Optimized Batch Rating Fetch (Solves N+1 connection exhaustion)
    const providerIds = providers.map(p => p.id);
    const ratings = await prisma.review.groupBy({
      by: ['targetId'],
      where: { targetId: { in: providerIds } },
      _avg: { rating: true },
    });

    const ratingMap = new Map(ratings.map(r => [r.targetId, r._avg.rating || 0]));

    // 3. Fetch categories for skill mapping
    const categories = await prisma.category.findMany({
      select: { id: true, name: true }
    });
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    // 4. Transform and Format
    const formattedProviders = providers.map((provider) => {
      const skills = Array.isArray(provider.profile?.skills) 
        ? provider.profile.skills.map(skillId => categoryMap.get(skillId) || skillId)
        : [];

      return {
        id: provider.id,
        name: provider.name,
        image: provider.image,
        title: provider.profile?.bio?.split(".")[0] || "Service Provider",
        bio: provider.profile?.bio,
        skills,
        hourlyRate: provider.profile?.hourlyRate ? Number(provider.profile.hourlyRate) : 0,
        location: provider.profile?.location,
        latitude: provider.profile?.latitude,
        longitude: provider.profile?.longitude,
        rating: ratingMap.get(provider.id) || 0,
        reviews: provider._count.receivedReviews,
        completedJobs: provider._count.bookings,
        memberSince: provider.createdAt,
        verified: provider.profile?.isVerified || false,
        subscription: {
          plan: provider.subscription?.plan || "FREE",
          isActive: provider.subscription?.isActive || false,
        },
      };
    });

    // 5. Client-side Search (Skills, Bio, Name)
    let filtered = formattedProviders;
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = formattedProviders.filter(p => 
        (p.name || "").toLowerCase().includes(lowerSearch) ||
        (p.bio?.toLowerCase().includes(lowerSearch) ?? false) ||
        p.skills.some(s => s.toLowerCase().includes(lowerSearch))
      );
    }

    // 6. Support Distance Sorting if coordinates available
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // 7. SortResults
    filtered.sort((a, b) => {
      // Premium prioritization
      const isAPremium = ["PRO", "BUSINESS"].includes(a.subscription.plan) && a.subscription.isActive;
      const isBPremium = ["PRO", "BUSINESS"].includes(b.subscription.plan) && b.subscription.isActive;
      if (isAPremium && !isBPremium) return -1;
      if (!isAPremium && isBPremium) return 1;

      if (sortBy === "distance" && latitude && longitude && a.latitude && a.longitude && b.latitude && b.longitude) {
        const distA = calculateDistance(latitude, longitude, a.latitude, a.longitude);
        const distB = calculateDistance(latitude, longitude, b.latitude, b.longitude);
        return distA - distB;
      }
      
      switch (sortBy) {
        case "rating": return b.rating - a.rating;
        case "price_asc": return a.hourlyRate - b.hourlyRate;
        case "price_desc": return b.hourlyRate - a.hourlyRate;
        case "newest": return new Date(b.memberSince).getTime() - new Date(a.memberSince).getTime();
        default: return 0;
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
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
