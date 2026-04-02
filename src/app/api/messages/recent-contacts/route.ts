import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBlockedCounterpartyIds } from "@/lib/messaging/blocking";
import { getConversationClearCutoffs } from "@/lib/messaging/clear-state";
import { handleError } from "@/lib/middleware/errorHandler";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const blockedIds = await getBlockedCounterpartyIds(userId);
    const clearCutoffs = await getConversationClearCutoffs(userId);

    const recentMessages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: "desc" },
      take: 150,
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

    const seen = new Set<string>();
    const contacts: Array<{
      id: string;
      name: string | null;
      image: string | null;
      role: string;
      phone: string | null;
    }> = [];

    for (const message of recentMessages) {
      const partner =
        message.senderId === userId ? message.receiver : message.sender;
      const cutoff = clearCutoffs.get(partner.id);

      if (cutoff && message.createdAt <= cutoff) {
        continue;
      }

      if (seen.has(partner.id) || blockedIds.has(partner.id)) {
        continue;
      }

      seen.add(partner.id);
      contacts.push({
        id: partner.id,
        name: partner.name,
        image: partner.image,
        role: partner.role,
        phone: partner.phone,
      });

      if (contacts.length >= 10) {
        break;
      }
    }

    return NextResponse.json({ contacts });
  } catch (error) {
    return handleError(error);
  }
}
