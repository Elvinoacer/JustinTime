import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBlockedBetweenUsers } from "@/lib/messaging/blocking";
import { getConversationClearCutoff } from "@/lib/messaging/clear-state";
import { handleError } from "@/lib/middleware/errorHandler";
import { broadcastRealtimeEvent } from "@/lib/realtime-broadcast";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ otherUserId: string }> },
) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { otherUserId } = await params;

    if (!otherUserId) {
      return NextResponse.json(
        { error: "Other user ID is required" },
        { status: 400 },
      );
    }

    const usersBlocked = await isBlockedBetweenUsers(userId, otherUserId);
    if (usersBlocked) {
      return NextResponse.json(
        { error: "This conversation is unavailable" },
        { status: 403 },
      );
    }

    const clearedAt = await getConversationClearCutoff(userId, otherUserId);

    const participantsFilter = {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    };

    const visibilityFilter = clearedAt ? { createdAt: { gt: clearedAt } } : {};

    // Fetch conversation history
    const messages = await prisma.message.findMany({
      where: {
        ...participantsFilter,
        ...visibilityFilter,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    const unreadIncoming = await prisma.message.findMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false,
        ...(clearedAt ? { createdAt: { gt: clearedAt } } : {}),
      },
      select: { id: true },
    });

    if (unreadIncoming.length > 0) {
      const unreadIds = unreadIncoming.map((item) => item.id);

      await prisma.message.updateMany({
        where: {
          id: { in: unreadIds },
        },
        data: {
          isRead: true,
          isDelivered: true,
        },
      });

      void broadcastRealtimeEvent({
        event: "messages_read",
        data: {
          targetUserId: otherUserId,
          readerId: userId,
          messageIds: unreadIds,
        },
      });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    return handleError(error);
  }
}
