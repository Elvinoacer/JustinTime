import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import cloudinary from "@/lib/cloudinary";

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

    // Delete file from Cloudinary if exists
    if (message.fileUrl) {
      try {
        // Extract publicId from URL
        // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/filename.jpg
        // Public ID: folder/filename
        const parts = message.fileUrl.split('/');
        const filename = parts[parts.length - 1];
        const publicId = `justintime/jobs/${filename.split('.')[0]}`; // Assuming folder structure from upload route
        
        // Better approach: store publicId in DB or use a regex to extract it more reliably
        // For now, let's try to extract it based on standard Cloudinary URL structure
        // URL: .../upload/v1234/justintime/jobs/xyz.jpg
        
        const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
        const match = message.fileUrl.match(regex);
        
        if (match && match[1]) {
           await cloudinary.uploader.destroy(match[1]);
        }
      } catch (err) {
        console.error("Failed to delete file from Cloudinary:", err);
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
