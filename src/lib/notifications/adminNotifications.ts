import { prisma } from "@/lib/prisma";
import type {
  NotificationDeliveryChannel,
  NotificationOutboxStatus,
  Prisma,
} from "@/generated/prisma/client";
import {
  normalizeNotificationPreferences,
  shouldSendPushNotification,
  shouldStoreInAppNotification,
} from "@/lib/notifications/preferences";
import { getNotificationActionUrl } from "@/lib/notifications/routing";
import { processNotificationOutboxBatch } from "@/lib/notifications/outbox";

interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  metadata?: Prisma.InputJsonValue;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  emailSubject?: string;
  emailHtml?: string;
}

/**
 * Send comprehensive notification (Push + Email + Database)
 * @param payload Notification details
 */
export async function sendComprehensiveNotification(
  payload: NotificationPayload,
) {
  const {
    userId,
    title,
    message,
    type,
    actionUrl,
    entityType,
    entityId,
    actorId,
    metadata,
    priority,
    emailSubject,
    emailHtml,
  } = payload;

  console.log(
    "[Notification] Starting comprehensive notification for user:",
    userId,
    "Type:",
    type,
  );

  try {
    // Get user details WITH notification preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        role: true,
        notificationPreferences: true,
      },
    });

    if (!user) {
      console.error("[Notification] User not found:", userId);
      throw new Error("User not found");
    }

    console.log("[Notification] User found:", user.email);

    // Parse notification preferences (stored as JSON)
    const prefs = normalizeNotificationPreferences(
      user.notificationPreferences,
    );
    console.log("[Notification] User preferences:", prefs);

    const categoryEnabled = shouldStoreInAppNotification(prefs, type);
    if (!categoryEnabled) {
      console.log(
        "[Notification] Notification category disabled by user preferences, skipping all channels",
      );
      return {
        success: true,
        skippedByPreferences: true,
      };
    }

    const resolvedActionUrl = getNotificationActionUrl(
      type,
      user.role,
      actionUrl,
    );

    // Map notification type to email preference key
    const getEmailPreferenceKey = (
      notifType: string,
    ):
      | "emailBookings"
      | "emailMessages"
      | "emailReviews"
      | "emailJobAlerts"
      | null => {
      if (notifType === "BOOKING_CREATED") return "emailBookings";
      if (notifType === "MESSAGE") return "emailMessages";
      if (notifType === "REVIEW") return "emailReviews";
      if (notifType === "JOB_ALERT") return "emailJobAlerts";
      if (notifType === "NEW_PROPOSAL") return "emailJobAlerts";
      if (notifType === "PROPOSAL_STATUS_UPDATE") return "emailJobAlerts";
      return null; // For admin actions, always send
    };

    const shouldSendPush = shouldSendPushNotification(prefs, type);
    const emailPrefKey = getEmailPreferenceKey(type);
    const emailRequested = Boolean(emailSubject && emailHtml);
    const shouldSendEmail =
      emailRequested &&
      Boolean(user.email) &&
      (!emailPrefKey || prefs[emailPrefKey]);

    const outboxChannels: NotificationDeliveryChannel[] = [];
    if (shouldSendPush) {
      outboxChannels.push("PUSH");
    }
    if (shouldSendEmail) {
      outboxChannels.push("EMAIL");
    }

    const outboxPayload: Prisma.InputJsonValue = {
      type,
      channels: outboxChannels,
      ...(shouldSendPush
        ? {
            push: {
              title,
              body: message,
              data: {
                type,
                url: resolvedActionUrl,
                ...(entityType ? { entityType } : {}),
                ...(entityId ? { entityId } : {}),
              },
            },
          }
        : {}),
      ...(shouldSendEmail
        ? {
            email: {
              to: user.email as string,
              subject: emailSubject as string,
              html: emailHtml as string,
            },
          }
        : {}),
    };

    const now = new Date();
    const deliveryStatus: NotificationOutboxStatus =
      outboxChannels.length > 0 ? "PENDING" : "DELIVERED";

    console.log("[Notification] Creating DB notification and delivery records");
    const dbNotification = await prisma.$transaction(async (tx) => {
      const createdNotification = await tx.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          isRead: false,
          actionUrl: resolvedActionUrl,
          entityType,
          entityId,
          actorId,
          metadata,
          priority: priority || "NORMAL",
          deliveryStatus,
          deliveredAt: deliveryStatus === "DELIVERED" ? now : null,
          lastDeliveryAttemptAt: deliveryStatus === "DELIVERED" ? now : null,
          deliveryAttempts: 0,
        },
      });

      await tx.notificationDelivery.create({
        data: {
          notificationId: createdNotification.id,
          channel: "IN_APP",
          status: "SENT",
          attempt: 1,
          attemptedAt: now,
          sentAt: now,
          providerMetadata: {
            source: "notification-db-create",
          },
        },
      });

      if (outboxChannels.length > 0) {
        await tx.notificationOutbox.create({
          data: {
            notificationId: createdNotification.id,
            userId,
            status: "PENDING",
            attempts: 0,
            maxAttempts: 5,
            nextAttemptAt: now,
            payload: outboxPayload,
          },
        });
      }

      return createdNotification;
    });

    if (outboxChannels.length > 0) {
      // Fire-and-forget immediate processing; retries are handled by the outbox worker.
      void processNotificationOutboxBatch({
        limit: 1,
        notificationId: dbNotification.id,
        processorId: "inline-sendComprehensiveNotification",
      }).catch((error) => {
        console.error(
          "[Notification] Inline outbox processing failed; worker retry will handle it",
          error,
        );
      });
    }

    console.log("[Notification] Notification queued successfully");
    return {
      success: true,
      notificationId: dbNotification.id,
      queuedChannels: outboxChannels,
      deliveryStatus,
    };
  } catch (error) {
    console.error(
      "[Notification] Failed to send comprehensive notification:",
      error,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate email templates for different admin actions
 */
export const emailTemplates = {
  userBanned: (userName: string, reason?: string) => ({
    subject: "Account Status Update - JustInTime",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Account Status Update</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              
              <div class="alert">
                <strong>⚠️ Your account has been temporarily restricted</strong>
              </div>
              
              <p>Your JustInTime account has been suspended due to a violation of our community guidelines or terms of service.</p>
              
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
              
              <p>During this suspension:</p>
              <ul>
                <li>You cannot access your account</li>
                <li>Your profile is hidden from other users</li>
                <li>All active bookings and services are paused</li>
              </ul>
              
              <p>If you believe this is a mistake or would like to appeal, please contact our support team.</p>
              
              <a href="${process.env.NEXTAUTH_URL}/contact" class="button">Contact Support</a>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  userUnbanned: (userName: string) => ({
    subject: "Welcome Back - Account Reinstated - JustInTime",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎉 Welcome Back!</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              
              <div class="success">
                <strong>✓ Your account has been reinstated</strong>
              </div>
              
              <p>Good news! Your JustInTime account has been fully restored and you can now access all features again.</p>
              
              <p>You can now:</p>
              <ul>
                <li>Access your account and profile</li>
                <li>Resume all services and bookings</li>
                <li>Connect with clients and providers</li>
              </ul>
              
              <p>Thank you for your patience and understanding.</p>
              
              <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">Go to Dashboard</a>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  roleChanged: (userName: string, oldRole: string, newRole: string) => ({
    subject: "Your Account Role Has Been Updated - JustInTime",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .role-badge { background: #3b82f6; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; font-weight: bold; }
            .button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Account Role Updated</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              
              <div class="info">
                <strong>Your account role has been changed</strong>
              </div>
              
              <p>Your role on JustInTime has been updated:</p>
              <p>
                <span style="text-decoration: line-through; opacity: 0.6;">${oldRole}</span>
                →
                <span class="role-badge">${newRole}</span>
              </p>
              
              <p>This change may affect:</p>
              <ul>
                <li>Access to certain features</li>
                <li>Dashboard layout and options</li>
                <li>Permissions and capabilities</li>
              </ul>
              
              <p>Please log in to explore your updated account.</p>
              
              <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">View Dashboard</a>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  accountDeletionScheduled: (
    userName: string,
    reason: string,
    deletionDate: Date,
  ) => ({
    subject: "Account Deletion Scheduled - JustInTime",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .countdown { background: white; border: 2px solid #f59e0b; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; }
            .button { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">⚠️ Account Deletion Scheduled</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              
              <div class="warning">
                <strong>Your account has been scheduled for deletion</strong>
              </div>
              
              <p>Your JustInTime account has been marked for removal by an administrator.</p>
              
              <p><strong>Reason:</strong> ${reason}</p>
              
              <div class="countdown">
                <h2 style="margin: 0; color: #f59e0b;">Deletion scheduled for:</h2>
                <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">${deletionDate.toLocaleString()}</p>
              </div>
              
              <p>You have until the scheduled date to:</p>
              <ul>
                <li>Export your data</li>
                <li>Contact support if you believe this is an error</li>
                <li>Appeal the decision</li>
              </ul>
              
              <p><strong>This action can still be reversed by contacting our support team.</strong></p>
              
              <a href="${process.env.NEXTAUTH_URL}/contact" class="button">Contact Support</a>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  accountDeletionCancelled: (userName: string) => ({
    subject: "Account Deletion Cancelled - JustInTime",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✓ Deletion Cancelled</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              
              <div class="success">
                <strong>Good news! Your account deletion has been cancelled</strong>
              </div>
              
              <p>The scheduled deletion of your JustInTime account has been cancelled. Your account remains active and fully functional.</p>
              
              <p>You can continue using all features of the platform as normal.</p>
              
              <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">Go to Dashboard</a>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  passwordResetRequested: (userName: string, resetLink: string) => ({
    subject: "Password Reset Request - JustInTime",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info { background: #ede9fe; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            .warning { color: #dc2626; font-size: 12px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔐 Password Reset</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              
              <div class="info">
                <strong>A password reset has been requested for your account</strong>
              </div>
              
              <p>An administrator has initiated a password reset for your JustInTime account. Click the button below to set a new password:</p>
              
              <a href="${resetLink}" class="button">Reset Password</a>
              
              <p class="warning">This link will expire in 24 hours. If you didn't request this reset, please contact support immediately.</p>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  newBooking: (
    providerName: string,
    clientName: string,
    serviceTitle: string,
    bookingDate: Date,
    startTime: string,
    endTime: string,
    location: string,
    totalAmount: number,
    notes: string,
    bookingId: string,
  ) => ({
    subject: `New Booking: ${serviceTitle} - JustInTime`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .booking-details { background: white; border: 2px solid #10b981; padding: 20px; border-radius: 10px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .detail-value { color: #111827; }
            .button { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px; }
            .button-secondary { background: #3b82f6; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            .notes-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎉 New Booking Received!</h1>
            </div>
            <div class="content">
              <p>Hello ${providerName},</p>
              
              <div class="alert">
                <strong>✓ You have received a new booking request</strong>
              </div>
              
              <p>Great news! <strong>${clientName}</strong> has booked your service. Here are the details:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span class="detail-value">${serviceTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Client:</span>
                  <span class="detail-value">${clientName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${bookingDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${startTime} - ${endTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span class="detail-value">${location}</span>
                </div>
                <div class="detail-row" style="border-bottom: none;">
                  <span class="detail-label">Total Amount:</span>
                  <span class="detail-value" style="color: #10b981; font-weight: bold; font-size: 18px;">Kes ${totalAmount.toLocaleString()}</span>
                </div>
              </div>
              
              ${
                notes
                  ? `
              <div class="notes-box">
                <strong>📝 Client Notes:</strong><br/>
                <p style="margin: 10px 0 0 0;">${notes}</p>
              </div>
              `
                  : ""
              }
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Review the booking details</li>
                <li>Accept or modify the booking if needed</li>
                <li>Contact the client to confirm</li>
              </ul>
              
              <div style="text-align: center; margin-top: 25px;">
                <a href="${process.env.NEXTAUTH_URL}/provider/bookings/${bookingId}" class="button">View Booking</a>
                <a href="${process.env.NEXTAUTH_URL}/provider/bookings/${bookingId}?action=accept" class="button button-secondary">Accept</a>
              </div>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
};
