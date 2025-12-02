
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

    const provider = await prisma.user.findUnique({
      where: { id, role: "PROVIDER" },
      include: { profile: true },
    });

    if (!provider || !provider.profile) {
      return NextResponse.json({ error: "Professional not found" }, { status: 404 });
    }

    // Update stats
    const updatedProfile = await prisma.profile.update({
      where: { userId: id },
      data: {
        [type === "view" ? "views" : "favorites"]: {
          increment: 1,
        },
      },
    });

    // Send notification
    if (type === "view") {
        // Optional: Don't notify for every view to avoid spam, or implement throttling
        // For now, we'll notify as requested
        await sendComprehensiveNotification(
            provider.id,
            "New Profile View",
            "Someone just viewed your profile!",
            "VIEW_ALERT",
            `/dashboard/profile`
        );
    } else if (type === "favorite") {
        await sendComprehensiveNotification(
            provider.id,
            "New Profile Favorite",
            "Someone just favorited your profile!",
            "FAVORITE_ALERT",
            `/dashboard/profile`
        );
    }

    return successResponse({ 
      views: updatedProfile.views, 
      favorites: updatedProfile.favorites 
    });
  } catch (error) {
    return handleError(error);
  }
}
