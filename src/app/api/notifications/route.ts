import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { APPLICATION_UPDATE_NOTIFICATION_TYPES } from "@/lib/notifications/applicationUpdates";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wantsCounts = req.nextUrl.searchParams.get("counts") === "true";

    const baseWhere = {
      userId: session.user.id,
      deletedAt: null,
    };

    if (wantsCounts) {
      const [unreadCount, unreadApplicationUpdatesCount] = await Promise.all([
        prisma.notification.count({
          where: {
            ...baseWhere,
            isRead: false,
          },
        }),
        prisma.notification.count({
          where: {
            ...baseWhere,
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

    const page = parsePositiveInt(req.nextUrl.searchParams.get("page"), 1);
    const limit = Math.min(
      parsePositiveInt(req.nextUrl.searchParams.get("limit"), DEFAULT_LIMIT),
      MAX_LIMIT,
    );
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: baseWhere,
      }),
    ]);

    const hasMore = skip + notifications.length < total;

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        hasMore,
        nextPage: hasMore ? page + 1 : null,
      },
    });
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

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
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
