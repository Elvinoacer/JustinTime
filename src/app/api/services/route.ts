import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleError } from "@/lib/middleware/errorHandler";

/**
 * GET /api/services
 * Fetch all services with optional filtering
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

    // Build orderBy clause
    let orderBy: any = {};
    switch (sort) {
      case "rating":
        orderBy = { provider: { profile: { /* avg rating */ } } };
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

    // Fetch services
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  isVerified: true,
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
        },
      }),
      prisma.service.count({ where }),
    ]);

    // Calculate ratings (simplified - you might want to add a reviews model)
    const servicesWithRatings = services.map((service) => ({
      id: service.id,
      name: service.provider.name || "Unknown Provider",
      category: service.category.name,
      description: service.description,
      rating: 4.5 + Math.random() * 0.5, // TODO: Calculate from reviews
      reviews: Math.floor(Math.random() * 200) + 20, // TODO: Get from reviews count
      startingPrice: parseFloat(service.price.toString()),
      isVerified: service.provider.profile?.isVerified || false,
      imageUrl: service.images[0] || service.provider.image || "/placeholder.jpg",
      pricingUnit: service.pricingUnit,
    }));

    return successResponse({
      services: servicesWithRatings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
