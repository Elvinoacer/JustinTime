import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Service } from "@/lib/api/hooks/useServices";
import { isPubliclyVerified } from "@/lib/trust/publicTrust";
import { getDynamicPrice } from "@/lib/pricing-engine";

async function fetchPublicServiceDetail(id: string): Promise<Service | null> {
  const service = await prisma.service.findFirst({
    where: {
      id,
      isActive: true,
    },
    include: {
      category: true,
      provider: {
        include: {
          profile: true,
          trustScore: {
            select: {
              tier: true,
              overallScore: true,
            },
          },
          subscription: true,
          receivedReviews: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: {
              author: {
                select: { name: true, image: true },
              },
            },
          },
          backgroundChecks: {
            where: { status: "APPROVED" },
            take: 1,
            select: { id: true, status: true },
          },
        },
      },
    },
  });

  if (!service?.provider) return null;

  const providerId = service.providerId;

  const [otherServices, completedJobs, reviewAgg, dynamicPricing] =
    await Promise.all([
      prisma.service.findMany({
        where: {
          providerId,
          id: { not: id },
          isActive: true,
        },
        select: {
          id: true,
          title: true,
          price: true,
          pricingUnit: true,
          category: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.booking.count({
        where: { providerId, status: "COMPLETED" },
      }),
      prisma.review.aggregate({
        where: { targetId: providerId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      getDynamicPrice(service.id),
    ]);

  const listReviews = service.provider.receivedReviews || [];
  const ratingAvg = reviewAgg._avg.rating ?? 0;
  const reviewCount = reviewAgg._count._all;

  const provider = service.provider;
  const providerVerified = isPubliclyVerified({
    verificationStatus: provider.profile?.verificationStatus,
    trustTier: provider.trustScore?.tier,
    overallScore: provider.trustScore?.overallScore,
  });

  return {
    id: service.id,
    title: service.title,
    description: service.description,
    price: Number(service.price),
    pricingUnit: service.pricingUnit,
    images: service.images || [],
    video: service.video,
    views: service.views,
    favorites: service.favorites,
    createdAt: service.createdAt.toISOString(),
    category: {
      id: service.category.id,
      name: service.category.name,
      slug: service.category.slug,
    },
    provider: {
      id: provider.id,
      name: provider.name ?? "Provider",
      image: provider.image,
      email: provider.email ?? "",
      phone: provider.phone,
      createdAt: provider.createdAt.toISOString(),
      role: provider.role,
      isVerified: providerVerified,
      profile: provider.profile
        ? {
            bio: provider.profile.bio,
            location: provider.profile.location,
            hourlyRate: provider.profile.hourlyRate
              ? Number(provider.profile.hourlyRate)
              : null,
            portfolio: provider.profile.portfolio || [],
            verificationStatus: provider.profile.verificationStatus,
          }
        : null,
      subscription: {
        plan: provider.subscription?.plan ?? "FREE",
        isActive: provider.subscription?.isActive ?? false,
      },
      backgroundChecks: provider.backgroundChecks || [],
      rating: Number.isFinite(ratingAvg) ? ratingAvg : 0,
      reviewCount,
      completedJobs,
      receivedReviews: listReviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        author: review.author,
      })),
    },
    otherServices: otherServices.map((s) => ({
      id: s.id,
      title: s.title,
      price: Number(s.price),
      pricingUnit: s.pricingUnit,
      category: { name: s.category.name, slug: s.category.slug },
    })),
    dynamicPricing: {
      multiplier: dynamicPricing.multiplier,
      reason: dynamicPricing.reason,
      finalPrice: Number(
        (Number(service.price) * dynamicPricing.multiplier).toFixed(2),
      ),
      breakdown: dynamicPricing.breakdown,
    },
  };
}

/**
 * Full public service payload (matches GET /api/services/[id] and client Service type).
 * Cached per request so generateMetadata + page share one DB round-trip.
 */
export const getPublicServiceDetail = cache(fetchPublicServiceDetail);
