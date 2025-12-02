import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const provider = await prisma.user.findUnique({
      where: { 
        id,
        role: "PROVIDER",
      },
      include: {
        profile: true,
        services: true,
        receivedReviews: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        subscription: {
          select: {
            plan: true,
            isActive: true,
          },
        },
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Professional not found" }, { status: 404 });
    }

    // Calculate stats
    const completedJobs = await prisma.booking.count({
      where: {
        providerId: id,
        status: "COMPLETED",
      },
    });

    const totalEarnings = await prisma.booking.aggregate({
      where: {
        providerId: id,
        status: "COMPLETED",
      },
      _sum: {
        totalAmount: true,
      },
    });

    const avgRating = await prisma.review.aggregate({
      where: { targetId: id },
      _avg: { rating: true },
    });

    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { targetId: id },
      _count: {
        rating: true,
      },
    });

    // Format rating distribution
    const distribution = [5, 4, 3, 2, 1].map(star => {
      const found = ratingDistribution.find(r => r.rating === star);
      return {
        stars: star,
        count: found?._count.rating || 0,
      };
    });

    const totalReviews = distribution.reduce((sum, d) => sum + d.count, 0);

    // Fetch all categories for skill mapping
    const categories = await prisma.category.findMany({
      select: { id: true, name: true }
    });
    
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    // Format response
    const professionalData = {
      id: provider.id,
      name: provider.name,
      email: provider.email,
      image: provider.image,
      phone: provider.phone,
      location: provider.profile?.location,
      latitude: provider.profile?.latitude,
      longitude: provider.profile?.longitude,
      bio: provider.profile?.bio,
      skills: (provider.profile?.skills || []).map(skillId => categoryMap.get(skillId) || skillId),
      hourlyRate: provider.profile?.hourlyRate || 0,
      isVerified: provider.profile?.isVerified || false,
      certifications: provider.profile?.certifications || [],
      education: provider.profile?.education || [],
      education: provider.profile?.education || [],
      memberSince: provider.createdAt,
      views: provider.profile?.views || 0,
      favorites: provider.profile?.favorites || 0,
      subscription: {
        plan: provider.subscription?.plan || "FREE",
        isActive: provider.subscription?.isActive || false,
      },
      completedJobs,
      totalEarnings: Number(totalEarnings._sum?.totalAmount || 0),
      averageRating: avgRating._avg.rating || 0,
      totalReviews,
      ratingDistribution: distribution,
      services: provider.services.map(service => ({
        id: service.id,
        title: service.title,
        description: service.description,
        categoryId: service.categoryId,
        price: Number(service.price),
        pricingUnit: service.pricingUnit,
        images: service.images,
      })),
      reviews: provider.receivedReviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        reviewer: review.author,
      })),
    };

    return successResponse(professionalData);
  } catch (error) {
    return handleError(error);
  }
}
