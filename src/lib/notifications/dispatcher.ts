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
export async function sendNotificationToUser(
  userId: string, 
  payload: NotificationPayload | { notification: { title: string; body: string; imageUrl?: string }; data?: Record<string, string> }
) {
  try {
    // Handle both payload formats (direct and nested)
    const title = 'notification' in payload ? payload.notification.title : payload.title;
    const body = 'notification' in payload ? payload.notification.body : payload.body;
    const imageUrl = 'notification' in payload ? payload.notification.imageUrl : payload.imageUrl;
    const data = payload.data || {};

    console.log('[FCM Dispatcher] Sending notification:', { title, body, imageUrl, userId });

    // 1. Get all tokens for the user
    const tokens = await prisma.userToken.findMany({
      where: { userId },
    });

    if (tokens.length === 0) {
      console.log(`[FCM Dispatcher] No tokens found for user ${userId}`);
      return { success: false, reason: "no_tokens" };
    }

    console.log(`[FCM Dispatcher] Found ${tokens.length} token(s) for user ${userId}`);

    // 2. Prepare messages
    const messages = tokens.map((t) => ({
      token: t.token,
      notification: {
        title,
        body,
        imageUrl,
      },
      data,
      // Web push specific options
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/badge-72x72.png",
          image: imageUrl,
        },
        fcmOptions: {
          link: data?.url || "/",
        },
      },
    }));

    // 3. Send via Firebase Admin
    console.log('[FCM Dispatcher] Sending to Firebase...');
    const response = await admin.messaging().sendEach(messages);
    console.log(`[FCM Dispatcher] Sent: ${response.successCount} success, ${response.failureCount} failures`);

    // 4. Cleanup invalid tokens
    const tokensToDelete: string[] = [];
    
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const errorCode = res.error?.code;
        console.error(`[FCM Dispatcher] Failed to send to token ${idx}:`, res.error?.message);
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
      console.log(`[FCM Dispatcher] Cleaned up ${tokensToDelete.length} invalid tokens`);
    }

    // NOTE: We don't create notification in database here anymore
    // since adminNotifications.ts already creates it to avoid duplicates

    return { 
      success: true, 
      sentCount: response.successCount, 
      failureCount: response.failureCount 
    };
  } catch (error) {
    console.error("[FCM Dispatcher] Error sending notification:", error);
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
