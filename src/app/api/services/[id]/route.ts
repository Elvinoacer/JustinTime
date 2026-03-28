import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        provider: {
          include: {
            profile: true,
            subscription: true,
            receivedReviews: {
              orderBy: { createdAt: "desc" },
              take: 5,
              include: {
                author: {
                  select: { name: true, image: true },
                },
              },
            },
            backgroundChecks: {
              // Schema enum: PENDING | APPROVED | REJECTED (not CLEARED)
              where: { status: "APPROVED" },
              take: 1,
            },
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    if (!service.provider) {
      return NextResponse.json(
        { error: "Service provider not found" },
        { status: 404 },
      );
    }

    // Calculate average rating
    const reviews = service.provider.receivedReviews || [];
    const totalRating = reviews.reduce(
      (acc: number, review: (typeof reviews)[number]) => acc + review.rating,
      0,
    );
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    // Fetch other services by the same provider
    const otherServices = await prisma.service.findMany({
      where: {
        providerId: service.providerId,
        id: { not: id },
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        category: { select: { name: true } },
      },
      take: 5,
    });

    const responseData = {
      ...service,
      price: Number(service.price),
      provider: {
        id: service.provider.id,
        name: service.provider.name,
        email: service.provider.email,
        image: service.provider.image,
        phone: service.provider.phone,
        role: service.provider.role,
        profile: service.provider.profile
          ? {
              bio: service.provider.profile.bio,
              location: service.provider.profile.location,
              hourlyRate: service.provider.profile.hourlyRate
                ? Number(service.provider.profile.hourlyRate)
                : null,
              portfolio: service.provider.profile.portfolio,
              isVerified: service.provider.profile.isVerified,
            }
          : null,
        subscription: {
          plan: service.provider.subscription?.plan || "FREE",
          isActive: service.provider.subscription?.isActive || false,
        },
        backgroundChecks: service.provider.backgroundChecks || [],
        rating: averageRating,
        reviewCount: reviews.length,
        reviews: reviews.map((review: (typeof reviews)[number]) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          author: review.author,
        })),
      },
      otherServices,
    };

    return successResponse(responseData);
  } catch (error) {
    return handleError(error);
  }
}
