import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBlockedCounterpartyIds } from "@/lib/messaging/blocking";
import { getConversationClearCutoffs } from "@/lib/messaging/clear-state";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const blockedIds = await getBlockedCounterpartyIds(userId);
    const clearCutoffs = await getConversationClearCutoffs(userId);

    // Fetch all messages where current user is sender or receiver
    // We fetch enough to likely cover all recent conversations
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            phone: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            phone: true,
          },
        },
      },
    });

    // Group by conversation partner
    const conversationsMap = new Map();

    messages.forEach((message) => {
      const isSender = message.senderId === userId;
      const partner = isSender ? message.receiver : message.sender;
      const partnerId = partner.id;

      if (blockedIds.has(partnerId)) {
        return;
      }

      const clearedAt = clearCutoffs.get(partnerId);
      if (clearedAt && message.createdAt <= clearedAt) {
        return;
      }

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          partner,
          lastMessage: {
            content: message.content,
            createdAt: message.createdAt,
            isRead: message.isRead,
            isOwn: isSender,
          },
          unreadCount: !isSender && !message.isRead ? 1 : 0,
        });
      } else {
        // Update unread count if applicable
        if (!isSender && !message.isRead) {
          const conv = conversationsMap.get(partnerId);
          conv.unreadCount += 1;
        }
      }
    });

    const conversations = Array.from(conversationsMap.values());

    return NextResponse.json({ conversations });
  } catch (error) {
    return handleError(error);
  }
}
