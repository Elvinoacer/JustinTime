import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleError } from "@/lib/middleware/errorHandler";
import { calculateDistance } from "@/lib/utils/geolocation";
import { isPubliclyVerified } from "@/lib/trust/publicTrust";
import { getMarketplaceSearchTerms } from "@/lib/search/normalizeMarketplaceQuery";
import type { Prisma } from "@/generated/prisma/client";

const PRICING_TIMEZONE = "Africa/Nairobi";

const geocodeCache = new Map<
  string,
  { latitude: number; longitude: number } | null
>();

function parseCoordinate(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

async function geocodeLocationText(
  locationText: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const normalized = locationText.trim().toLowerCase();
  if (!normalized) return null;

  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized) ?? null;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(locationText)}&limit=1`,
      {
        headers: {
          "User-Agent": "JustInTime/1.0 (support@gtss.software)",
          "Accept-Language": "en",
        },
        signal: AbortSignal.timeout(4000),
      },
    );

    if (!response.ok) {
      geocodeCache.set(normalized, null);
      return null;
    }

    const payload = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
    }>;
    const first = payload[0];
    const latitude = first?.lat ? Number(first.lat) : NaN;
    const longitude = first?.lon ? Number(first.lon) : NaN;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      geocodeCache.set(normalized, null);
      return null;
    }

    const result = { latitude, longitude };
    geocodeCache.set(normalized, result);
    return result;
  } catch {
    geocodeCache.set(normalized, null);
    return null;
  }
}

function getDemandMultiplier(demandCount: number): number {
  if (demandCount >= 40) return 0.35;
  if (demandCount >= 20) return 0.2;
  if (demandCount >= 10) return 0.1;
  return 0;
}

function getCurrentPricingContext() {
  const now = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: PRICING_TIMEZONE,
    }),
  );

  const hour = now.getHours();
  const day = now.getDay();
  const month = now.getMonth() + 1;
  const rainySeasonMonths = new Set([3, 4, 5, 10, 11, 12]);

  const timeMultiplier =
    hour >= 20 || hour < 6 ? 0.2 : day === 0 || day === 6 ? 0.1 : 0;
  const weatherMultiplier = rainySeasonMonths.has(month) ? 0.05 : 0;

  return {
    timeMultiplier,
    weatherMultiplier,
  };
}

/**
 * GET /api/services
 * Fetch all services with optional filtering and location-based sorting
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10) || 1,
    );
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "12", 10) || 12),
    );
    const skip = (page - 1) * limit;

    // Filters
    const category = searchParams.get("category");
    const verified = searchParams.get("verified");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const minRating = searchParams.get("minRating");
    const search = searchParams.get("search");
    const locationQuery = searchParams.get("location");
    const sort = searchParams.get("sort") || "relevance";

    // Location parameters
    const userLat = parseCoordinate(searchParams.get("latitude"));
    const userLon = parseCoordinate(searchParams.get("longitude"));
    let effectiveLatitude = userLat;
    let effectiveLongitude = userLon;

    if (
      (effectiveLatitude === null || effectiveLongitude === null) &&
      locationQuery
    ) {
      const resolved = await geocodeLocationText(locationQuery);
      if (resolved) {
        effectiveLatitude = resolved.latitude;
        effectiveLongitude = resolved.longitude;
      }
    }

    const searchTerms = getMarketplaceSearchTerms(search || "", 12);

    // Build where clause
    const where: Prisma.ServiceWhereInput = {
      isActive: true,
    };

    if (category && category !== "All Services") {
      const normalizedCategory = category.trim();
      const resolvedCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { id: normalizedCategory },
            { slug: { equals: normalizedCategory, mode: "insensitive" } },
            { name: { equals: normalizedCategory, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });

      if (!resolvedCategory) {
        return successResponse({
          services: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }

      where.categoryId = resolvedCategory.id;
    }

    if (verified === "true") {
      where.provider = {
        OR: [
          {
            profile: {
              verificationStatus: "VERIFIED",
            },
          },
          {
            trustScore: {
              tier: {
                in: ["VERIFIED", "PREMIUM", "ELITE"],
              },
            },
          },
        ],
      };
    }

    if (searchTerms.length > 0) {
      where.OR = searchTerms.flatMap((term) => [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { category: { name: { contains: term, mode: "insensitive" } } },
      ]);
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Build orderBy clause (skip for distance sorting - we'll do it in memory)
    let orderBy: Prisma.ServiceOrderByWithRelationInput = {};
    const isDistanceSort =
      sort === "distance" &&
      effectiveLatitude !== null &&
      effectiveLongitude !== null;
    const candidateTake = Math.min(
      Math.max(skip + limit * 6, limit * 20),
      5000,
    );

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
        orderBy: isDistanceSort ? { createdAt: "desc" } : orderBy,
        skip: 0,
        take: candidateTake,
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  verificationStatus: true,
                  latitude: true,
                  longitude: true,
                  location: true,
                  premiumPricingEnabled: true,
                  premiumMultiplier: true,
                },
              },
              trustScore: {
                select: {
                  tier: true,
                  overallScore: true,
                  premiumEligible: true,
                  premiumMultiplier: true,
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

    const serviceIds = services.map((service) => service.id);
    const demandWindowStart = new Date();
    demandWindowStart.setDate(demandWindowStart.getDate() - 30);

    const demandCounts =
      serviceIds.length > 0
        ? await prisma.booking.groupBy({
            by: ["serviceId"],
            where: {
              serviceId: { in: serviceIds },
              createdAt: {
                gte: demandWindowStart,
              },
              status: {
                in: [
                  "PENDING",
                  "CONFIRMED",
                  "IN_PROGRESS",
                  "AWAITING_CLIENT_CONFIRMATION",
                  "COMPLETED",
                ],
              },
            },
            _count: {
              _all: true,
            },
          })
        : [];

    const demandMap = new Map(
      demandCounts
        .filter((row) => row.serviceId)
        .map((row) => [row.serviceId as string, row._count._all]),
    );

    const pricingContext = getCurrentPricingContext();

    // Calculate distances, ratings and format response
    // Calculate distances, ratings and format response
    let servicesWithData = services.map((service) => {
      let distance: number | undefined;

      if (
        effectiveLatitude !== null &&
        effectiveLongitude !== null &&
        typeof service.provider.profile?.latitude === "number" &&
        typeof service.provider.profile?.longitude === "number"
      ) {
        distance = calculateDistance(
          effectiveLatitude,
          effectiveLongitude,
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

      const providerIsVerified = isPubliclyVerified({
        verificationStatus: service.provider.profile?.verificationStatus,
        trustTier: service.provider.trustScore?.tier,
        overallScore: service.provider.trustScore?.overallScore,
      });

      const searchableText =
        `${service.title} ${service.description} ${service.category.name}`
          .toLowerCase()
          .trim();
      const searchHits = searchTerms.filter((term) =>
        searchableText.includes(term.toLowerCase()),
      ).length;
      const textMatchScore =
        searchTerms.length > 0
          ? Math.min((searchHits / searchTerms.length) * 22, 22)
          : 10;

      const proximityScore =
        typeof distance === "number"
          ? Math.max(0, 40 - Math.min(distance, 40))
          : 0;

      const ratingScore = Math.min(25, averageRating * 5);
      const reviewConfidenceScore = (Math.min(ratings.length, 30) / 30) * 8;
      const rebookScore = (Math.min(rebookedCount, 20) / 20) * 10;

      const demandMultiplier = getDemandMultiplier(
        demandMap.get(service.id) || 0,
      );
      const providerMultiplier =
        service.provider.profile?.premiumPricingEnabled &&
        (service.provider.profile?.premiumMultiplier || 1) > 1
          ? Math.max((service.provider.profile?.premiumMultiplier || 1) - 1, 0)
          : 0;
      const trustMultiplier =
        service.provider.trustScore?.premiumEligible &&
        (service.provider.trustScore?.premiumMultiplier || 1) > 1
          ? Math.max(
              (service.provider.trustScore?.premiumMultiplier || 1) - 1,
              0,
            )
          : 0;

      const previewMultiplier = Number(
        (
          1 +
          pricingContext.timeMultiplier +
          demandMultiplier +
          pricingContext.weatherMultiplier +
          providerMultiplier +
          trustMultiplier
        ).toFixed(2),
      );

      const pricingReasons: string[] = [];
      if (demandMultiplier > 0) pricingReasons.push("Service Demand");
      if (pricingContext.timeMultiplier > 0) pricingReasons.push("Time Window");
      if (providerMultiplier > 0) pricingReasons.push("Provider Premium");
      if (trustMultiplier > 0) pricingReasons.push("Trust Tier");
      if (pricingContext.weatherMultiplier > 0)
        pricingReasons.push("Seasonal Conditions");

      const promotedBoost = isPromoted
        ? service.promotionPlan === "PREMIUM"
          ? 6
          : 3
        : 0;
      const premiumProviderBoost =
        ["PRO", "BUSINESS"].includes(
          service.provider.subscription?.plan || "",
        ) && service.provider.subscription?.isActive
          ? 4
          : 0;
      const verificationBoost = providerIsVerified ? 4 : 0;

      const relevanceScore = Number(
        (
          proximityScore +
          textMatchScore +
          ratingScore +
          reviewConfidenceScore +
          rebookScore +
          promotedBoost +
          premiumProviderBoost +
          verificationBoost
        ).toFixed(3),
      );

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
          isVerified: providerIsVerified,
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
        relevanceScore,
        dynamicPricing: {
          multiplier: previewMultiplier,
          reason:
            previewMultiplier > 1
              ? pricingReasons.slice(0, 2).join(" + ") || "Dynamic Pricing"
              : null,
          finalPrice: Number(
            (Number(service.price) * previewMultiplier).toFixed(2),
          ),
        },
      };
    });

    type RankedService = (typeof servicesWithData)[number];

    const minRatingThreshold =
      minRating && minRating.trim().length > 0
        ? parseFloat(minRating)
        : undefined;

    if (
      minRatingThreshold !== undefined &&
      Number.isFinite(minRatingThreshold)
    ) {
      servicesWithData = servicesWithData.filter(
        (service) => service.rating >= minRatingThreshold,
      );
    }

    // Helper function to check if provider has premium plan
    const isPremiumProvider = (service: RankedService) =>
      ["PRO", "BUSINESS"].includes(service.provider?.subscription?.plan) &&
      service.provider?.subscription?.isActive === true;

    // Sorting logic: location-aware relevance by default when coordinates are available.
    const sortServices = (a: RankedService, b: RankedService) => {
      if (isDistanceSort) {
        const aDistance =
          typeof a.distance === "number"
            ? a.distance
            : Number.POSITIVE_INFINITY;
        const bDistance =
          typeof b.distance === "number"
            ? b.distance
            : Number.POSITIVE_INFINITY;
        if (aDistance !== bDistance) {
          return aDistance - bDistance;
        }
        return (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
      } else if (sort === "rebooked") {
        return (
          b.rebookedCount - a.rebookedCount ||
          (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)
        );
      } else if (sort === "rating") {
        return (
          b.rating - a.rating ||
          (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)
        );
      } else if (sort === "price_low") {
        return (
          a.price - b.price || (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)
        );
      } else if (sort === "price_high") {
        return (
          b.price - a.price || (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)
        );
      }

      // Default relevance ranking with bounded promotion/premium boosts.
      const relevanceDelta = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
      if (relevanceDelta !== 0) return relevanceDelta;

      const aProv = isPremiumProvider(a);
      const bProv = isPremiumProvider(b);
      if (aProv && !bProv) return -1;
      if (!aProv && bProv) return 1;

      return 0;
    };

    // Apply Sort
    servicesWithData.sort(sortServices);

    const rankedTotal = servicesWithData.length;
    const paginatedServices = servicesWithData.slice(skip, skip + limit);
    const effectiveTotal =
      minRatingThreshold !== undefined && Number.isFinite(minRatingThreshold)
        ? rankedTotal
        : total;

    return successResponse({
      services: paginatedServices,
      pagination: {
        page,
        limit,
        total: effectiveTotal,
        totalPages: Math.ceil(effectiveTotal / limit),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
