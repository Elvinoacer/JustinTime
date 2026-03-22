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
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 12;

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
      take: 100, // Increased limit for better filtering
    });

    // Fetch all categories for skill mapping
    const categories = await prisma.category.findMany({
      select: { id: true, name: true }
    });
    
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

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
          skills: (provider.profile?.skills || []).map(skillId => categoryMap.get(skillId) || skillId),
          hourlyRate: provider.profile?.hourlyRate ? Number(provider.profile.hourlyRate) : 0,
          location: provider.profile?.location,
          rating: avgRating._avg.rating || 0,
          reviews: provider._count.receivedReviews,
          completedJobs: provider._count.bookings,
          memberSince: provider.createdAt,
          verified: provider.profile?.isVerified || false,
          subscription: {
            plan: provider.subscription?.plan || "FREE",
            isActive: provider.subscription?.isActive || false,
          },
        };
      })
    );

    // Filter by skills (case-insensitive) if search term is provided
    let filteredProviders = formattedProviders;
    if (search) {
      filteredProviders = formattedProviders.filter((provider) => {
        // Check if search term matches name or bio (already filtered by Prisma)
        const matchesNameOrBio = 
          (provider.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (provider.bio?.toLowerCase().includes(search.toLowerCase()) ?? false);
        
        // Check if search term matches any skill (case-insensitive)
        const matchesSkill = provider.skills.some((skill) =>
          skill.toLowerCase().includes(search.toLowerCase())
        );

        return matchesNameOrBio || matchesSkill;
      });
    }

    // Sort results - Prioritize Pro/Business members first
    let sortedProviders = [...filteredProviders];
    
    // Helper function to check if user has premium plan
    const isPremium = (provider: any) => 
      ["PRO", "BUSINESS"].includes(provider.subscription?.plan) && 
      provider.subscription?.isActive === true;
    
    // First sort by premium status, then by selected criteria
    sortedProviders.sort((a, b) => {
      // Prioritize premium members
      const aPremium = isPremium(a);
      const bPremium = isPremium(b);
      
      if (aPremium && !bPremium) return -1;
      if (!aPremium && bPremium) return 1;
      
      // Then apply selected sorting criteria
      if (sortBy === "rating") {
        return b.rating - a.rating;
      } else if (sortBy === "price_asc") {
        return Number(a.hourlyRate) - Number(b.hourlyRate);
      } else if (sortBy === "price_desc") {
        return Number(b.hourlyRate) - Number(a.hourlyRate);
      } else if (sortBy === "newest") {
        return new Date(b.memberSince).getTime() - new Date(a.memberSince).getTime();
      }
      
      return 0;
    });

    // Pagination
    const total = sortedProviders.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedResults = sortedProviders.slice((page - 1) * limit, page * limit);

    return successResponse({
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
