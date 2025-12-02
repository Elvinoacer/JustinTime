
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
        await sendComprehensiveNotification({
            userId: service.providerId,
            title: "New Service View",
            message: `Someone just viewed your service: ${service.title}`,
            type: "VIEW_ALERT",
            emailSubject: `New Service View: ${service.title}`,
            emailHtml: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>New Service View</h2>
                <p>Someone just viewed your service <strong>${service.title}</strong> on JustInTime.</p>
                <a href="${process.env.NEXTAUTH_URL}/dashboard/services" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Service Stats</a>
              </div>
            `
        });
    } else if (type === "favorite") {
        await sendComprehensiveNotification({
            userId: service.providerId,
            title: "New Service Favorite",
            message: `Someone just favorited your service: ${service.title}`,
            type: "FAVORITE_ALERT",
            emailSubject: `New Service Favorite: ${service.title}`,
            emailHtml: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>New Service Favorite</h2>
                <p>Someone just favorited your service <strong>${service.title}</strong> on JustInTime!</p>
                <a href="${process.env.NEXTAUTH_URL}/dashboard/services" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Service Stats</a>
              </div>
            `
        });
    }

    return successResponse({ 
      views: updatedService.views, 
      favorites: updatedService.favorites 
    });
  } catch (error) {
    return handleError(error);
  }
}
