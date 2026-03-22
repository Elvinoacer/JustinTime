import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { deleteFile } from '@/lib/s3';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId } = await params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Only sender can delete their message
    if (message.senderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete file from storage if exists
    if (message.fileUrl) {
      try {
        await deleteFile(message.fileUrl);
      } catch (err) {
        console.error("Failed to delete file from storage:", err);
        // Continue to delete message from DB even if file delete fails
      }
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
