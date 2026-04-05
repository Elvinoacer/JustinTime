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
      skills: [],
      bio: "",
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
          job: {
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
      booking.job?.title || "",
      booking.job?.category?.name || "",
    ]) || [];

  return {
    interests: user?.clientInterests || [],
    skills: [],
    historyTerms,
    bio: "",
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

    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";
    const verified = searchParams.get("verified") === "true";
    const minPrice = toNumber(searchParams.get("minPrice"));
    const maxPrice = toNumber(searchParams.get("maxPrice"));
    const minRating = toNumber(searchParams.get("minRating"));
    const latitude = toNumber(searchParams.get("latitude"));
    const longitude = toNumber(searchParams.get("longitude"));

    const searchTerms = getMarketplaceSearchTerms(search, 10);

    const where: Prisma.ServiceWhereInput = {
      isActive: true,
    };

    if (category) {
      where.category = {
        OR: [
          { id: category },
          { slug: { equals: category, mode: "insensitive" } },
          { name: { equals: category, mode: "insensitive" } },
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

    if (verified) {
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

    if (minPrice !== null || maxPrice !== null) {
      where.price = {};
      if (minPrice !== null) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== null) {
        where.price.lte = maxPrice;
      }
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            image: true,
            subscription: {
              select: {
                plan: true,
                isActive: true,
              },
            },
            profile: {
              select: {
                verificationStatus: true,
                latitude: true,
                longitude: true,
                location: true,
              },
            },
            trustScore: {
              select: {
                tier: true,
                overallScore: true,
              },
            },
          },
        },
        bookings: {
          select: {
            status: true,
            review: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 300,
    });

    const signals = await buildSignals(session?.user?.id, latitude, longitude);

    let ranked = services.map((service) => {
      const completedBookings = service.bookings.filter(
        (booking) => booking.status === "COMPLETED",
      );
      const ratings = completedBookings
        .map((booking) => booking.review?.rating)
        .filter((rating): rating is number => typeof rating === "number");

      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : 0;

      const providerIsVerified = isPubliclyVerified({
        verificationStatus: service.provider.profile?.verificationStatus,
        trustTier: service.provider.trustScore?.tier,
        overallScore: service.provider.trustScore?.overallScore,
      });

      const base = scoreTarget(signals, {
        title: service.title,
        description: service.description,
        category: service.category.name,
        latitude: service.provider.profile?.latitude,
        longitude: service.provider.profile?.longitude,
        rating: averageRating,
        reviewCount: ratings.length,
        completedCount: completedBookings.length,
        createdAt: service.createdAt,
        availableNow: service.isActive,
      });

      let distance: number | null = null;
      if (
        typeof signals.latitude === "number" &&
        typeof signals.longitude === "number" &&
        typeof service.provider.profile?.latitude === "number" &&
        typeof service.provider.profile?.longitude === "number"
      ) {
        distance = calculateDistance(
          signals.latitude,
          signals.longitude,
          service.provider.profile.latitude,
          service.provider.profile.longitude,
        );
      }

      const promotedBoost =
        service.promotedUntil && service.promotedUntil > new Date()
          ? service.promotionPlan === "PREMIUM"
            ? 8
            : 4
          : 0;

      const score = Number((base.score + promotedBoost).toFixed(3));

      return {
        id: service.id,
        title: service.title,
        description: service.description,
        price: Number(service.price),
        pricingUnit: service.pricingUnit,
        images: service.images,
        video: service.video,
        category: service.category,
        provider: {
          id: service.provider.id,
          name: service.provider.name || "Unknown Provider",
          image: service.provider.image,
          isVerified: providerIsVerified,
          latitude: service.provider.profile?.latitude ?? null,
          longitude: service.provider.profile?.longitude ?? null,
          location: service.provider.profile?.location ?? null,
          subscription: {
            plan: service.provider.subscription?.plan || "FREE",
            isActive: service.provider.subscription?.isActive || false,
          },
        },
        promoted: {
          isPromoted: Boolean(
            service.promotedUntil && service.promotedUntil > new Date(),
          ),
          plan: service.promotionPlan ?? null,
          until: service.promotedUntil?.toISOString() ?? null,
        },
        rating: averageRating,
        reviews: ratings.length,
        completedBookings: completedBookings.length,
        distance,
        recommendation: {
          score,
          reasons: base.reasons,
        },
      };
    });

    if (minRating !== null) {
      ranked = ranked.filter((service) => service.rating >= minRating);
    }

    ranked = ranked.sort((a, b) => {
      const scoreDelta =
        (b.recommendation?.score || 0) - (a.recommendation?.score || 0);
      if (scoreDelta !== 0) return scoreDelta;

      const aDistance =
        typeof a.distance === "number" ? a.distance : Number.POSITIVE_INFINITY;
      const bDistance =
        typeof b.distance === "number" ? b.distance : Number.POSITIVE_INFINITY;
      if (aDistance !== bDistance) return aDistance - bDistance;

      return b.rating - a.rating;
    });

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
