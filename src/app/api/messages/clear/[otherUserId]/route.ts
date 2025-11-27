import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import cloudinary from "@/lib/cloudinary";

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

    // Fetch all messages in this conversation to delete files from Cloudinary
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
    });

    // Delete files from Cloudinary if they exist
    for (const message of messages) {
      if (message.fileUrl) {
        try {
          const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
          const match = message.fileUrl.match(regex);
          
          if (match && match[1]) {
            await cloudinary.uploader.destroy(match[1]);
          }
        } catch (err) {
          console.error("Failed to delete file from Cloudinary:", err);
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
