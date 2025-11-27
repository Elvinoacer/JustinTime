import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ otherUserId: string }> }
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
        { status: 400 }
      );
    }

    // Fetch conversation history
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
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

    // Mark messages as read
    // We do this asynchronously to not block the response
    // Only mark messages sent by the other user as read
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return handleError(error);
  }
}
