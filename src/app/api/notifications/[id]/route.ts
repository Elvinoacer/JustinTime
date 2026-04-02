import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      markClicked?: boolean;
      markUnread?: boolean;
    };

    const markUnread = body.markUnread === true;
    const markClicked = body.markClicked === true;

    const updated = await prisma.notification.updateMany({
      where: {
        id: id,
        userId: session.user.id,
        deletedAt: null,
      },
      data: markUnread
        ? {
            isRead: false,
            readAt: null,
          }
        : {
            isRead: true,
            readAt: new Date(),
            ...(markClicked ? { clickedAt: new Date() } : {}),
          },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      );
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/notifications/[id] - Delete a notification
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const deleted = await prisma.notification.updateMany({
      where: {
        id: id,
        userId: session.user.id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (deleted.count === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
