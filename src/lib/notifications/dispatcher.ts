import admin from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import {
  normalizeNotificationPreferences,
  shouldSendPushNotification,
} from "@/lib/notifications/preferences";
import { getNotificationActionUrl } from "@/lib/notifications/routing";

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

type DispatcherPayload =
  | NotificationPayload
  | {
      notification: {
        title: string;
        body: string;
        imageUrl?: string;
      };
      data?: Record<string, string>;
    };

/**
 * Sends a notification to a specific user across all their devices
 */
export async function sendNotificationToUser(
  userId: string,
  payload: DispatcherPayload,
) {
  try {
    // Handle both payload formats (direct and nested)
    const title =
      "notification" in payload ? payload.notification.title : payload.title;
    const body =
      "notification" in payload ? payload.notification.body : payload.body;
    const imageUrl =
      "notification" in payload
        ? payload.notification.imageUrl
        : payload.imageUrl;
    const data = payload.data || {};
    const notificationType = data.type;

    console.log("[FCM Dispatcher] Sending notification:", {
      title,
      body,
      imageUrl,
      userId,
      notificationType,
    });

    const [tokens, user] = await Promise.all([
      prisma.userToken.findMany({
        where: {
          userId,
          revokedAt: null,
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          notificationPreferences: true,
        },
      }),
    ]);

    const preferences = normalizeNotificationPreferences(
      user?.notificationPreferences,
    );

    const canSendPush = shouldSendPushNotification(
      preferences,
      notificationType,
    );
    if (!canSendPush) {
      console.log(
        "[FCM Dispatcher] Push delivery skipped due to notification preferences",
      );
      return { success: false, reason: "disabled_by_preferences" };
    }

    if (tokens.length === 0) {
      console.log(`[FCM Dispatcher] No tokens found for user ${userId}`);
      return { success: false, reason: "no_tokens" };
    }

    console.log(
      `[FCM Dispatcher] Found ${tokens.length} token(s) for user ${userId}`,
    );

    const resolvedUrl = getNotificationActionUrl(
      notificationType || "",
      user?.role,
      data.url,
    );

    const dataWithUrl = {
      ...data,
      url: resolvedUrl,
    };

    // 2. Prepare messages
    const messages = tokens.map((t) => ({
      token: t.token,
      notification: {
        title,
        body,
        imageUrl,
      },
      // Web push specific options
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/badge-72x72.png",
          image: imageUrl,
        },
        fcmOptions: {
          link: resolvedUrl,
        },
      },
      data: dataWithUrl,
    }));

    // 3. Send via Firebase Admin
    console.log("[FCM Dispatcher] Sending to Firebase...");
    const response = await admin.messaging().sendEach(messages);
    console.log(
      `[FCM Dispatcher] Sent: ${response.successCount} success, ${response.failureCount} failures`,
    );

    // 4. Cleanup invalid tokens
    const tokensToDelete: string[] = [];
    const successfulTokens: string[] = [];
    const errors: Array<{ token: string; code?: string; message?: string }> =
      [];

    response.responses.forEach((res, idx) => {
      if (res.success) {
        successfulTokens.push(tokens[idx].token);
        return;
      }

      const errorCode = res.error?.code;
      const errorMessage = res.error?.message;

      errors.push({
        token: tokens[idx].token,
        code: errorCode,
        message: errorMessage,
      });
      console.error(
        `[FCM Dispatcher] Failed to send to token ${idx}:`,
        errorMessage,
      );

      if (
        errorCode === "messaging/invalid-registration-token" ||
        errorCode === "messaging/registration-token-not-registered"
      ) {
        tokensToDelete.push(tokens[idx].token);
      }
    });

    if (successfulTokens.length > 0) {
      await prisma.userToken.updateMany({
        where: {
          token: {
            in: successfulTokens,
          },
        },
        data: {
          lastSeenAt: new Date(),
          revokedAt: null,
        },
      });
    }

    if (tokensToDelete.length > 0) {
      await prisma.userToken.updateMany({
        where: {
          token: {
            in: tokensToDelete,
          },
        },
        data: {
          revokedAt: new Date(),
        },
      });
      console.log(
        `[FCM Dispatcher] Revoked ${tokensToDelete.length} invalid token(s)`,
      );
    }

    // NOTE: We don't create notification in database here anymore
    // since adminNotifications.ts already creates it to avoid duplicates

    return {
      success: true,
      sentCount: response.successCount,
      failureCount: response.failureCount,
      errors,
    };
  } catch (error) {
    console.error("[FCM Dispatcher] Error sending notification:", error);
    return { success: false, error };
  }
}

/**
 * Sends a notification to multiple users
 */
export async function sendNotificationToUsers(
  userIds: string[],
  payload: NotificationPayload,
) {
  const results = await Promise.all(
    userIds.map((id) => sendNotificationToUser(id, payload)),
  );

  return results;
}
