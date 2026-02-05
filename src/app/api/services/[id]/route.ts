import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        provider: {
            include: {
                // Include profile to show verification, subscription etc (if needed for select, but include mixes fields)
                // Actually since we used select: before, we should be consistent.
                // But prisma doesn't allow mixing select and include at the same level easily without nested include.
                // Let's use include for everything to be safe, or just stick to select and add backgroundChecks to select.
                // Reverting to robust select:
                profile: {
                    select: {
                        bio: true,
                        location: true,
                        hourlyRate: true,
                        portfolio: true,
                        isVerified: true,
                    }
                },
                subscription: {
                    select: {
                        plan: true,
                        isActive: true,
                    }
                },
                receivedReviews: {
                    select: {
                        id: true,
                        rating: true,
                        comment: true,
                        createdAt: true,
                        author: { select: { name: true, image: true } }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 5
                },
                backgroundChecks: {
                    where: { status: 'CLEARED' },
                    select: { id: true, status: true, clearedAt: true }
                }
            }
        }
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Calculate average rating
    const reviews = service.provider.receivedReviews;
    const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
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
        ...service.provider,
        profile: {
          ...service.provider.profile,
          hourlyRate: service.provider.profile?.hourlyRate ? Number(service.provider.profile.hourlyRate) : null,
        },
        subscription: {
          plan: service.provider.subscription?.plan || "FREE",
          isActive: service.provider.subscription?.isActive || false,
        },
        rating: averageRating,
        reviewCount: reviews.length,
      },
      otherServices,
    };

    return successResponse(responseData);
  } catch (error) {
    return handleError(error);
  }
}
