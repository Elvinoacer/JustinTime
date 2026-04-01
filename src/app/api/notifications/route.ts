import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { APPLICATION_UPDATE_NOTIFICATION_TYPES } from "@/lib/notifications/applicationUpdates";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wantsCounts = req.nextUrl.searchParams.get("counts") === "true";

    if (wantsCounts) {
      const [unreadCount, unreadApplicationUpdatesCount] = await Promise.all([
        prisma.notification.count({
          where: {
            userId: session.user.id,
            isRead: false,
          },
        }),
        prisma.notification.count({
          where: {
            userId: session.user.id,
            isRead: false,
            type: {
              in: [...APPLICATION_UPDATE_NOTIFICATION_TYPES],
            },
          },
        }),
      ]);

      return NextResponse.json({
        counts: {
          unreadCount,
          unreadApplicationUpdatesCount,
        },
      });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.notification.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
