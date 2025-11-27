import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleError } from "@/lib/middleware/errorHandler";
import { calculateDistance } from "@/lib/utils/geolocation";

/**
 * GET /api/services
 * Fetch all services with optional filtering and location-based sorting
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
    
    // Location parameters
    const userLat = searchParams.get("latitude");
    const userLon = searchParams.get("longitude");

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

    // Build orderBy clause (skip for distance sorting - we'll do it in memory)
    let orderBy: any = {};
    const isDistanceSort = sort === "distance" && userLat && userLon;
    
    if (!isDistanceSort) {
      switch (sort) {
        case "rating":
          // We can't easily sort by computed rating in Prisma without raw SQL or aggregate
          // For now, we'll sort by createdAt as fallback or handle in memory if dataset is small
          // But for pagination, we stick to DB sort. 
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
        orderBy: isDistanceSort ? undefined : orderBy,
        skip: isDistanceSort ? undefined : skip,
        take: isDistanceSort ? undefined : limit,
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  isVerified: true,
                  latitude: true,
                  longitude: true,
                  location: true,
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
            where: {
              review: { isNot: null }
            },
            select: {
              review: {
                select: {
                  rating: true
                }
              }
            }
          }
        },
      }),
      prisma.service.count({ where }),
    ]);

    // Calculate distances, ratings and format response
    let servicesWithData = services.map((service) => {
      let distance: number | undefined;
      
      if (userLat && userLon && service.provider.profile?.latitude && service.provider.profile?.longitude) {
        distance = calculateDistance(
          parseFloat(userLat),
          parseFloat(userLon),
          service.provider.profile.latitude,
          service.provider.profile.longitude
        );
      }

      // Calculate rating from bookings
      const ratings = service.bookings.map(b => b.review?.rating).filter((r): r is number => r !== undefined);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0;

      return {
        id: service.id,
        title: service.title, // Correctly mapped title
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
          isVerified: service.provider.profile?.isVerified || false,
          location: service.provider.profile?.location,
        },
        rating: averageRating,
        reviews: ratings.length,
        distance,
      };
    });

    // Sort by distance if requested
    if (isDistanceSort) {
      servicesWithData = servicesWithData
        .filter(s => s.distance !== undefined)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      
      // Apply pagination after sorting
      servicesWithData = servicesWithData.slice(skip, skip + limit);
    } 
    // Handle rating sort in memory since we computed it
    else if (sort === "rating") {
       servicesWithData.sort((a, b) => b.rating - a.rating);
    }

    return successResponse({
      services: servicesWithData,
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
