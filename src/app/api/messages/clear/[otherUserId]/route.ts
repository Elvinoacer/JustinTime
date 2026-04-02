import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { broadcastRealtimeEvent } from "@/lib/realtime-broadcast";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ otherUserId: string }> },
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otherUserId } = await params;
    const userId = session.user.id;

    if (!otherUserId || otherUserId === userId) {
      return NextResponse.json(
        { error: "Invalid conversation target" },
        { status: 400 },
      );
    }

    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true },
    });

    if (!otherUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const clearedAt = new Date();

    await prisma.messageConversationState.upsert({
      where: {
        userId_otherUserId: {
          userId,
          otherUserId,
        },
      },
      create: {
        userId,
        otherUserId,
        clearedAt,
      },
      update: {
        clearedAt,
      },
    });

    void broadcastRealtimeEvent({
      event: "conversation_cleared",
      data: {
        targetUserId: userId,
        clearedById: userId,
        partnerId: otherUserId,
      },
    });

    return NextResponse.json({ success: true, clearedAt });
  } catch (error) {
    return handleError(error);
  }
}
