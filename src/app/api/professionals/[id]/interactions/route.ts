
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
        await sendComprehensiveNotification({
            userId: provider.id,
            title: "New Profile View",
            message: "Someone just viewed your profile!",
            type: "VIEW_ALERT",
            emailSubject: "New Profile View - JustInTime",
            emailHtml: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>New Profile View</h2>
                <p>Someone just viewed your profile on JustInTime.</p>
                <a href="${process.env.NEXTAUTH_URL}/dashboard/profile" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Profile Stats</a>
              </div>
            `
        });
    } else if (type === "favorite") {
        await sendComprehensiveNotification({
            userId: provider.id,
            title: "New Profile Favorite",
            message: "Someone just favorited your profile!",
            type: "FAVORITE_ALERT",
            emailSubject: "New Profile Favorite - JustInTime",
            emailHtml: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>New Profile Favorite</h2>
                <p>Someone just favorited your profile on JustInTime!</p>
                <a href="${process.env.NEXTAUTH_URL}/dashboard/profile" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Profile Stats</a>
              </div>
            `
        });
    }

    return successResponse({ 
      views: updatedProfile.views, 
      favorites: updatedProfile.favorites 
    });
  } catch (error) {
    return handleError(error);
  }
}
