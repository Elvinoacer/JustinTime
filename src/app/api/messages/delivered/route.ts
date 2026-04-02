import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleError } from "@/lib/middleware/errorHandler";
import { prisma } from "@/lib/prisma";
import { broadcastRealtimeEvent } from "@/lib/realtime-broadcast";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const messageId =
      typeof body?.messageId === "string" ? body.messageId.trim() : "";

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 },
      );
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        isDelivered: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.receiverId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!message.isDelivered) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          isDelivered: true,
        },
      });

      void broadcastRealtimeEvent({
        event: "message_delivered",
        data: {
          targetUserId: message.senderId,
          receiverId: session.user.id,
          messageId: message.id,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
