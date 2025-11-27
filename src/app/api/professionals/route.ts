import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
    const sortBy = searchParams.get("sortBy") || "rating";
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";

    // Build filter conditions (no search filter in Prisma - we'll filter in JS)
    const where: any = {
      role: "PROVIDER",
    };

    // Add verified filter
    if (verifiedOnly) {
      where.profile = {
        ...where.profile,
        verificationStatus: "VERIFIED",
        isVerified: true,
      };
    }

    // Add price filters
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.profile = {
        ...where.profile,
        hourlyRate: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      };
    }

    // Fetch providers (without search filter - we'll filter in JavaScript)
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
      take: 100, // Increased limit for better filtering
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
          title: provider.profile?.bio?.split(".")[0] || "Service Provider",
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

    // Filter by skills (case-insensitive) if search term is provided
    let filteredProviders = formattedProviders;
    if (search) {
      filteredProviders = formattedProviders.filter((provider) => {
        // Check if search term matches name or bio (already filtered by Prisma)
        const matchesNameOrBio = 
          provider.name.toLowerCase().includes(search.toLowerCase()) ||
          (provider.bio?.toLowerCase().includes(search.toLowerCase()) ?? false);
        
        // Check if search term matches any skill (case-insensitive)
        const matchesSkill = provider.skills.some((skill) =>
          skill.toLowerCase().includes(search.toLowerCase())
        );

        return matchesNameOrBio || matchesSkill;
      });
    }

    // Sort results
    let sortedProviders = [...filteredProviders];
    if (sortBy === "rating") {
      sortedProviders.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "price_asc") {
      sortedProviders.sort((a, b) => Number(a.hourlyRate) - Number(b.hourlyRate));
    } else if (sortBy === "price_desc") {
      sortedProviders.sort((a, b) => Number(b.hourlyRate) - Number(a.hourlyRate));
    } else if (sortBy === "newest") {
      sortedProviders.sort((a, b) => new Date(b.memberSince).getTime() - new Date(a.memberSince).getTime());
    }

    // Limit final results
    const limitedResults = sortedProviders.slice(0, 50);

    return successResponse(limitedResults);
  } catch (error) {
    return handleError(error);
  }
}
