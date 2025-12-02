import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";

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

    // Send notification to receiver
    try {
      await sendComprehensiveNotification({
        userId: receiverId,
        title: `New Message from ${session.user.name}`,
        message: content ? (content.length > 50 ? content.substring(0, 50) + "..." : content) : "Sent a file",
        type: "MESSAGE",
        emailSubject: `New Message from ${session.user.name} - JustInTime`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">New Message</h2>
            <p><strong>${session.user.name}</strong> sent you a message:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              ${content || "<i>Sent a file</i>"}
            </div>
            <a href="${process.env.NEXTAUTH_URL}/dashboard/messages?conversation=${session.user.id}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reply Now</a>
          </div>
        `
      });
    } catch (notifError) {
      console.error("Failed to send message notification:", notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ message });
  } catch (error) {
    return handleError(error);
  }
}
