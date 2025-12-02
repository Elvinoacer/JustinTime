
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { type } = await request.json(); // 'view' or 'favorite'

    if (!["view", "favorite"].includes(type)) {
      return NextResponse.json({ error: "Invalid interaction type" }, { status: 400 });
    }

    const service = await prisma.service.findUnique({
      where: { id },
      include: { provider: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Update stats
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        [type === "view" ? "views" : "favorites"]: {
          increment: 1,
        },
      },
    });

    // Send notification
    if (type === "view") {
        await sendComprehensiveNotification(
            service.providerId,
            "New Service View",
            `Someone just viewed your service: ${service.title}`,
            "VIEW_ALERT",
            `/dashboard/services`
        );
    } else if (type === "favorite") {
        await sendComprehensiveNotification(
            service.providerId,
            "New Service Favorite",
            `Someone just favorited your service: ${service.title}`,
            "FAVORITE_ALERT",
            `/dashboard/services`
        );
    }

    return successResponse({ 
      views: updatedService.views, 
      favorites: updatedService.favorites 
    });
  } catch (error) {
    return handleError(error);
  }
}
