import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId, content, fileUrl, fileType } = await request.json();

    if (!receiverId || (!content && !fileUrl)) {
      return NextResponse.json(
        { error: "Receiver ID and content (or file) are required" },
        { status: 400 }
      );
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content: content || "",
        fileUrl,
        fileType,
        isRead: false,
        isDelivered: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    return handleError(error);
  }
}
