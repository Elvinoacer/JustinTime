import admin from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

/**
 * Sends a notification to a specific user across all their devices
 */
export async function sendNotificationToUser(userId: string, payload: NotificationPayload) {
  try {
    // 1. Get all tokens for the user
    const tokens = await prisma.userToken.findMany({
      where: { userId },
    });

    if (tokens.length === 0) {
      console.log(`No tokens found for user ${userId}`);
      return { success: false, reason: "no_tokens" };
    }

    // 2. Prepare messages
    const messages = tokens.map((t) => ({
      token: t.token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data || {},
      // Web push specific options
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/badge-72x72.png",
        },
        fcmOptions: {
          link: payload.data?.url || "/",
        },
      },
    }));

    // 3. Send via Firebase Admin
    const response = await admin.messaging().sendEach(messages);

    // 4. Cleanup invalid tokens
    const tokensToDelete: string[] = [];
    
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const errorCode = res.error?.code;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          tokensToDelete.push(tokens[idx].token);
        }
      }
    });

    if (tokensToDelete.length > 0) {
      await prisma.userToken.deleteMany({
        where: {
          token: {
            in: tokensToDelete,
          },
        },
      });
      console.log(`Cleaned up ${tokensToDelete.length} invalid tokens`);
    }

    // 5. Store in database for history (optional but recommended)
    await prisma.notification.create({
      data: {
        userId,
        title: payload.title,
        message: payload.body,
        type: payload.data?.type || "SYSTEM",
        isRead: false,
      },
    });

    return { 
      success: true, 
      sentCount: response.successCount, 
      failureCount: response.failureCount 
    };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error };
  }
}

/**
 * Sends a notification to multiple users
 */
export async function sendNotificationToUsers(userIds: string[], payload: NotificationPayload) {
  const results = await Promise.all(
    userIds.map(id => sendNotificationToUser(id, payload))
  );
  
  return results;
}
