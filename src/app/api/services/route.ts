import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleError } from "@/lib/middleware/errorHandler";
import { calculateDistance } from "@/lib/utils/geolocation";

/**
 * GET /api/services
 * Fetch all services with optional filtering and location-based sorting
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const skip = (page - 1) * limit;

    // Filters
    const category = searchParams.get("category");
    const verified = searchParams.get("verified");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "relevance";

    // Location parameters
    const userLat = searchParams.get("latitude");
    const userLon = searchParams.get("longitude");

    // Build where clause
    const where: any = {
      isActive: true,
    };

    if (category && category !== "All Services") {
      where.category = {
        name: category,
      };
    }

    if (verified === "true") {
      where.provider = {
        profile: {
          isVerified: true,
        },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Build orderBy clause (skip for distance sorting - we'll do it in memory)
    let orderBy: any = {};
    const isDistanceSort = sort === "distance" && userLat && userLon;

    if (!isDistanceSort) {
      switch (sort) {
        case "rating":
          // We can't easily sort by computed rating in Prisma without raw SQL or aggregate
          // For now, we'll sort by createdAt as fallback or handle in memory if dataset is small
          // But for pagination, we stick to DB sort.
          orderBy = { createdAt: "desc" };
          break;
        case "rebooked":
          // Rebook count is computed in memory from bookings and then ranked below.
          orderBy = { createdAt: "desc" };
          break;
        case "price_low":
          orderBy = { price: "asc" };
          break;
        case "price_high":
          orderBy = { price: "desc" };
          break;
        default:
          orderBy = { createdAt: "desc" };
      }
    }

    // Fetch services with provider location data and reviews
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: isDistanceSort ? undefined : orderBy,
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  isVerified: true,
                  latitude: true,
                  longitude: true,
                  location: true,
                },
              },
              subscription: {
                select: {
                  plan: true,
                  isActive: true,
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          bookings: {
            select: {
              clientId: true,
              status: true,
              review: {
                select: {
                  rating: true,
                },
              },
            },
          },
        },
      }),
      prisma.service.count({ where }),
    ]);

    // Calculate distances, ratings and format response
    // Calculate distances, ratings and format response
    let servicesWithData = services.map((service) => {
      let distance: number | undefined;

      if (
        userLat &&
        userLon &&
        service.provider.profile?.latitude &&
        service.provider.profile?.longitude
      ) {
        distance = calculateDistance(
          parseFloat(userLat),
          parseFloat(userLon),
          service.provider.profile.latitude,
          service.provider.profile.longitude,
        );
      }

      // Calculate rating from bookings
      const completedBookings = service.bookings.filter(
        (booking) => booking.status === "COMPLETED",
      );

      const ratings = completedBookings
        .map((b) => b.review?.rating)
        .filter((r): r is number => r !== undefined);

      const completedBookingsByClient = new Map<string, number>();
      for (const booking of completedBookings) {
        completedBookingsByClient.set(
          booking.clientId,
          (completedBookingsByClient.get(booking.clientId) || 0) + 1,
        );
      }
      const rebookedCount = Array.from(
        completedBookingsByClient.values(),
      ).reduce((sum, bookingCount) => sum + Math.max(bookingCount - 1, 0), 0);

      const averageRating =
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0;

      const isPromoted =
        service.promotedUntil && service.promotedUntil > new Date();

      return {
        id: service.id,
        title: service.title,
        description: service.description,
        price: parseFloat(service.price.toString()),
        pricingUnit: service.pricingUnit,
        images: service.images,
        video: service.video,
        category: {
          id: service.category.id,
          name: service.category.name,
          slug: service.category.slug,
        },
        provider: {
          id: service.provider.id,
          name: service.provider.name || "Unknown Provider",
          image: service.provider.image,
          isVerified: service.provider.profile?.isVerified || false,
          latitude: service.provider.profile?.latitude ?? null,
          longitude: service.provider.profile?.longitude ?? null,
          location: service.provider.profile?.location,
          subscription: {
            plan: service.provider.subscription?.plan || "FREE",
            isActive: service.provider.subscription?.isActive || false, // Use isActive (boolean) directly if supported, or check status
          },
        },
        promoted: {
          isPromoted,
          plan: service.promotionPlan,
          until: service.promotedUntil,
        },
        rating: averageRating,
        reviews: ratings.length,
        rebookedCount,
        distance,
      };
    });

    // Helper function to check if provider has premium plan
    const isPremiumProvider = (service: any) =>
      ["PRO", "BUSINESS"].includes(service.provider?.subscription?.plan) &&
      service.provider?.subscription?.isActive === true;

    // Sorting Logic: Promoted Service > Premium Provider > Distance/Rating/Relevance
    const sortServices = (a: any, b: any) => {
      // 1. Active Service Promotion
      if (a.promoted.isPromoted && !b.promoted.isPromoted) return -1;
      if (!a.promoted.isPromoted && b.promoted.isPromoted) return 1;

      // Tie-breaker Level 1: Promotion Plan (PREMIUM > STANDARD)
      if (a.promoted.isPromoted && b.promoted.isPromoted) {
        if (a.promoted.plan === "PREMIUM" && b.promoted.plan !== "PREMIUM")
          return -1;
        if (a.promoted.plan !== "PREMIUM" && b.promoted.plan === "PREMIUM")
          return 1;
      }

      // 2. Premium Provider Subscription
      const aProv = isPremiumProvider(a);
      const bProv = isPremiumProvider(b);
      if (aProv && !bProv) return -1;
      if (!aProv && bProv) return 1;

      // 3. Requested Sort
      if (isDistanceSort) {
        return (a.distance || 0) - (b.distance || 0);
      } else if (sort === "rebooked") {
        return b.rebookedCount - a.rebookedCount;
      } else if (sort === "rating") {
        return b.rating - a.rating;
      } else if (sort === "price_low") {
        return a.price - b.price;
      } else if (sort === "price_high") {
        return b.price - a.price;
      }

      return 0; // Relevance / Default
    };

    // Apply Sort
    servicesWithData.sort(sortServices);

    // Apply pagination after ranking to keep deterministic global ordering.
    if (isDistanceSort) {
      servicesWithData = servicesWithData.filter(
        (s) => s.distance !== undefined,
      );
    }

    const rankedTotal = servicesWithData.length;
    const paginatedServices = servicesWithData.slice(skip, skip + limit);

    return successResponse({
      services: paginatedServices,
      pagination: {
        page,
        limit,
        total: isDistanceSort ? rankedTotal : total,
        totalPages: Math.ceil((isDistanceSort ? rankedTotal : total) / limit),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
