import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleError } from "@/lib/middleware/errorHandler";

/**
 * GET /api/categories
 * Fetch all categories with service counts
 */
export async function GET() {
  try {
    // Fetch categories with count of active services
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        _count: {
          select: {
            services: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Helper to map category names to icons
    const getIconForCategory = (name: string) => {
      const lowerName = name.toLowerCase();
      if (lowerName.includes("electric")) return "electrical_services";
      if (lowerName.includes("plumb")) return "plumbing";
      if (lowerName.includes("clean")) return "cleaning_services";
      if (lowerName.includes("garden") || lowerName.includes("yard")) return "yard";
      if (lowerName.includes("computer") || lowerName.includes("it")) return "computer";
      if (lowerName.includes("tutor") || lowerName.includes("school")) return "school";
      if (lowerName.includes("event")) return "event";
      if (lowerName.includes("paint")) return "format_paint";
      if (lowerName.includes("move") || lowerName.includes("transport")) return "local_shipping";
      if (lowerName.includes("beauty") || lowerName.includes("hair")) return "content_cut";
      return "category"; // Default
    };

    // Format response
    const formattedCategories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image, // Include database image URL
      icon: getIconForCategory(cat.name), // Keep icon as fallback for components that expect it
      count: cat._count.services,
    }));

    // Add "All Services" category at the beginning
    const totalServices = formattedCategories.reduce((acc, curr) => acc + curr.count, 0);
    
    const allCategories = [
      {
        id: "all",
        name: "All Services",
        slug: "all-services",
        icon: "apps",
        count: totalServices,
      },
      ...formattedCategories,
    ];

    return successResponse(allCategories);
  } catch (error) {
    return handleError(error);
  }
}
