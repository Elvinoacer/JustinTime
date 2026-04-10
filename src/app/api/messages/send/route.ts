import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { isBlockedBetweenUsers } from "@/lib/messaging/blocking";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";
import { broadcastRealtimeEvent } from "@/lib/realtime-broadcast";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId, content, fileUrl, fileType, clientTempId } =
      await request.json();

    if (!receiverId || (!content && !fileUrl)) {
      return NextResponse.json(
        { error: "Receiver ID and content (or file) are required" },
        { status: 400 },
      );
    }

    const usersBlocked = await isBlockedBetweenUsers(
      session.user.id,
      receiverId,
    );
    if (usersBlocked) {
      return NextResponse.json(
        { error: "Messaging is unavailable for this user" },
        { status: 403 },
      );
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "Receiver not found" },
        { status: 404 },
      );
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

    const messagePayload = {
      ...message,
      ...(typeof clientTempId === "string" ? { clientTempId } : {}),
    };

    void broadcastRealtimeEvent({
      event: "new_message",
      data: { message: messagePayload },
    });

    // Send notification to receiver
    try {
      const safeSenderName = escapeHtml(session.user.name || "Someone");
      const appUrl =
        process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
      const baseUrl = appUrl.replace(/\/+$/, "");
      const messagePath =
        receiver.role === "CLIENT"
          ? "/client/messages"
          : receiver.role === "ADMIN"
            ? "/admin/messages"
            : "/dashboard/messages";
      const params = new URLSearchParams({
        partnerId: session.user.id,
        partnerName: session.user.name || "Conversation",
      });

      if (session.user.image) {
        params.set("partnerImage", session.user.image);
      }

      const replyUrl = baseUrl
        ? `${baseUrl}${messagePath}?${params.toString()}`
        : messagePath;

      await sendComprehensiveNotification({
        userId: receiverId,
        title: `New Message from ${session.user.name || "Someone"}`,
        message: `${session.user.name || "Someone"} sent you a new message`,
        type: "MESSAGE",
        emailSubject: `New Message from ${session.user.name || "Someone"} - JustInTime`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">New Message</h2>
            <p><strong>${safeSenderName}</strong> sent you a new message.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              For your privacy, message previews are hidden.
            </div>
            <a href="${replyUrl}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reply Now</a>
          </div>
        `,
      });
    } catch (notifError) {
      console.error("Failed to send message notification:", notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ message: messagePayload });
  } catch (error) {
    return handleError(error);
  }
}
