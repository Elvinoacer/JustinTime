import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { deleteFile } from "@/lib/s3";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { otherUserId: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otherUserId } = await params;
    const userId = session.user.id;

    // Fetch all messages in this conversation to delete files from storage
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
    });

    // Delete files from storage if they exist
    for (const message of messages) {
      if (message.fileUrl) {
        try {
          await deleteFile(message.fileUrl);
        } catch (err) {
          console.error("Failed to delete file from storage:", err);
          // Continue deletion even if file delete fails
        }
      }
    }

    // Delete all messages in this conversation
    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
