import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
    const sortBy = searchParams.get("sortBy") || "rating"; // rating, price_asc, price_desc, newest

    // Build filter conditions
    const where: any = {
      role: "PROVIDER",
      // onboardingCompleted: true, // Uncomment when onboarding is fully implemented
      // privacySettings: { // Check if profile is visible
      //   path: ['profileVisible'],
      //   equals: true
      // }
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { profile: { bio: { contains: search, mode: "insensitive" } } },
        { profile: { skills: { has: search } } }, // Assuming skills is an array of strings
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.profile = {
        ...where.profile,
        hourlyRate: {
          gte: minPrice,
          lte: maxPrice,
        },
      };
    }

    // Fetch providers
    const providers = await prisma.user.findMany({
      where,
      include: {
        profile: true,
        _count: {
          select: {
            bookings: { where: { status: "COMPLETED" } },
            receivedReviews: true,
          },
        },
      },
      take: 50, // Limit results
    });

    // Calculate ratings and format response
    const formattedProviders = await Promise.all(
      providers.map(async (provider) => {
        const avgRating = await prisma.review.aggregate({
          where: { targetId: provider.id },
          _avg: { rating: true },
        });

        return {
          id: provider.id,
          name: provider.name,
          image: provider.image,
          title: provider.profile?.bio?.split(".")[0] || "Service Provider", // Use first sentence of bio as title or fallback
          bio: provider.profile?.bio,
          skills: provider.profile?.skills || [],
          hourlyRate: provider.profile?.hourlyRate ? Number(provider.profile.hourlyRate) : 0,
          location: provider.profile?.location,
          rating: avgRating._avg.rating || 0,
          reviews: provider._count.receivedReviews,
          completedJobs: provider._count.bookings,
          memberSince: provider.createdAt,
        };
      })
    );

    // Sort results
    let sortedProviders = [...formattedProviders];
    if (sortBy === "rating") {
      sortedProviders.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "price_asc") {
      sortedProviders.sort((a, b) => Number(a.hourlyRate) - Number(b.hourlyRate));
    } else if (sortBy === "price_desc") {
      sortedProviders.sort((a, b) => Number(b.hourlyRate) - Number(a.hourlyRate));
    } else if (sortBy === "newest") {
      sortedProviders.sort((a, b) => new Date(b.memberSince).getTime() - new Date(a.memberSince).getTime());
    }

    return successResponse(sortedProviders);
  } catch (error) {
    return handleError(error);
  }
}
