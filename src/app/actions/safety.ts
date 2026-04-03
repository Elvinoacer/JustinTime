"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { hasRole } from "@/lib/auth/roles";
import { normalizeKenyanPhone, isValidKenyanPhone } from "@/lib/utils/phone";
import { broadcastRealtimeEvent } from "@/lib/realtime-broadcast";

const MAX_TRUSTED_CONTACTS = 10;

function buildSosMessage(
  userName: string,
  latitude: number,
  longitude: number,
  details?: string,
) {
  const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
  const detailText = details ? `\nDetails: ${details}` : "";

  return `SOS ALERT from ${userName}. They may need urgent help.\nLocation: ${mapsUrl}${detailText}`;
}

async function sendViaTwilio(to: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    return { sent: false, provider: "TWILIO", reason: "not_configured" };
  }

  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: message,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!response.ok) {
    const payload = await response.text();
    return {
      sent: false,
      provider: "TWILIO",
      reason: payload || `http_${response.status}`,
    };
  }

  return { sent: true, provider: "TWILIO" };
}

async function sendViaAfricasTalking(to: string, message: string) {
  const username = process.env.AFRICAS_TALKING_USERNAME || "sandbox";
  const apiKey = process.env.AFRICAS_TALKING_API_KEY;
  const from = process.env.AFRICAS_TALKING_SENDER_ID;

  if (!apiKey) {
    return {
      sent: false,
      provider: "AFRICAS_TALKING",
      reason: "not_configured",
    };
  }

  const body = new URLSearchParams({
    username,
    to,
    message,
    ...(from ? { from } : {}),
  });

  const response = await fetch(
    "https://api.africastalking.com/version1/messaging",
    {
      method: "POST",
      headers: {
        apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!response.ok) {
    const payload = await response.text();
    return {
      sent: false,
      provider: "AFRICAS_TALKING",
      reason: payload || `http_${response.status}`,
    };
  }

  return { sent: true, provider: "AFRICAS_TALKING" };
}

async function sendSosSms(to: string, message: string) {
  const twilioAttempt = await sendViaTwilio(to, message);
  if (twilioAttempt.sent || twilioAttempt.reason !== "not_configured") {
    return twilioAttempt;
  }

  const africaAttempt = await sendViaAfricasTalking(to, message);
  if (africaAttempt.sent || africaAttempt.reason !== "not_configured") {
    return africaAttempt;
  }

  console.log(`[SOS_SMS_STUB] ${to}: ${message}`);
  return {
    sent: false,
    provider: "NONE",
    reason: "sms_provider_not_configured",
  };
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function requireAdmin() {
  const user = await requireUser();
  if (!hasRole(user, "ADMIN")) {
    throw new Error("Unauthorized");
  }
  return user;
}

// --- Trusted Contacts Management ---

export async function addTrustedContact(data: {
  name: string;
  phone: string;
  relation?: string;
}) {
  const user = await requireUser();

  const name = data.name?.trim();
  if (!name) {
    return { success: false, error: "Contact name is required" };
  }

  const normalizedPhone = normalizeKenyanPhone(data.phone || "");
  if (!isValidKenyanPhone(normalizedPhone)) {
    return { success: false, error: "Use a valid Kenyan phone number" };
  }

  try {
    const [existingContacts, currentUser] = await Promise.all([
      prisma.trustedContact.findMany({
        where: { userId: user.id },
        select: { id: true, phone: true },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { phone: true },
      }),
    ]);

    if (existingContacts.length >= MAX_TRUSTED_CONTACTS) {
      return {
        success: false,
        error: `You can only keep up to ${MAX_TRUSTED_CONTACTS} trusted contacts`,
      };
    }

    const isDuplicate = existingContacts.some(
      (contact) => normalizeKenyanPhone(contact.phone) === normalizedPhone,
    );

    if (isDuplicate) {
      return {
        success: false,
        error: "This phone number is already in your trusted contacts",
      };
    }

    const ownPhone = normalizeKenyanPhone(currentUser?.phone || "");
    if (ownPhone && ownPhone === normalizedPhone) {
      return {
        success: false,
        error: "You cannot add your own number as a trusted contact",
      };
    }

    const contact = await prisma.trustedContact.create({
      data: {
        userId: user.id,
        name,
        phone: normalizedPhone,
        relation: data.relation?.trim() || null,
      },
    });

    revalidatePath("/dashboard/safety");
    return { success: true, contact };
  } catch (error) {
    console.error("Failed to add trusted contact:", error);
    return { success: false, error: "Failed to add contact" };
  }
}

export async function removeTrustedContact(contactId: string) {
  const user = await requireUser();

  try {
    const contact = await prisma.trustedContact.findUnique({
      where: { id: contactId },
    });

    if (!contact || contact.userId !== user.id) {
      throw new Error("Unauthorized access to contact");
    }

    await prisma.trustedContact.delete({
      where: { id: contactId },
    });

    revalidatePath("/dashboard/safety");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove trusted contact:", error);
    return { success: false, error: "Failed to remove contact" };
  }
}

export async function getTrustedContacts() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  try {
    return await prisma.trustedContact.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch trusted contacts:", error);
    return [];
  }
}

// --- SOS Logic ---

export async function triggerSOS(location: {
  latitude: number;
  longitude: number;
  details?: string;
  accuracy?: number | null;
}) {
  const userSession = await requireUser();

  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    Math.abs(location.latitude) > 90 ||
    Math.abs(location.longitude) > 180
  ) {
    return { success: false, error: "Invalid SOS coordinates" };
  }

  try {
    const detailsWithAccuracy = [
      location.details,
      location.accuracy != null
        ? `Accuracy: ${Math.round(location.accuracy)}m`
        : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const alert = await prisma.sOSAlert.create({
      data: {
        userId: userSession.id,
        latitude: location.latitude,
        longitude: location.longitude,
        locationDetails: detailsWithAccuracy || null,
        status: "ACTIVE",
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userSession.id },
      include: { trustedContacts: true },
    });

    const contacts = user?.trustedContacts || [];
    const sosMessage = buildSosMessage(
      user?.name || "JustInTime user",
      location.latitude,
      location.longitude,
      detailsWithAccuracy,
    );

    const smsResults = await Promise.allSettled(
      contacts.map(async (contact) => {
        const smsResult = await sendSosSms(contact.phone, sosMessage);
        return {
          contactId: contact.id,
          name: contact.name,
          phone: contact.phone,
          ...smsResult,
        };
      }),
    );

    const admins = await prisma.user.findMany({
      where: {
        OR: [{ role: "ADMIN" }, { roles: { has: "ADMIN" } }],
      },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "Active SOS Alert",
          message: `${user?.name || "A user"} triggered SOS at ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}.`,
          type: "SOS_ALERT",
          isRead: false,
          priority: "URGENT",
        })),
      });
    }

    await broadcastRealtimeEvent({
      event: "sos_alert_update",
      data: {
        alertId: alert.id,
        userId: userSession.id,
        status: "ACTIVE",
      },
    });

    return {
      success: true,
      alertId: alert.id,
      contactsNotified: smsResults.length,
      dispatchSummary: smsResults.map((item) =>
        item.status === "fulfilled"
          ? item.value
          : { sent: false, provider: "NONE", reason: "dispatch_failed" },
      ),
    };
  } catch (error) {
    console.error("Failed to trigger SOS:", error);
    return { success: false, error: "Failed to trigger SOS" };
  }
}

export async function cancelSOS(alertId: string) {
  const user = await requireUser();

  try {
    const alert = await prisma.sOSAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert || alert.userId !== user.id) {
      throw new Error("Unauthorized access to alert");
    }

    await prisma.sOSAlert.update({
      where: { id: alertId },
      data: {
        status: "CANCELLED",
        resolvedAt: new Date(),
      },
    });

    await broadcastRealtimeEvent({
      event: "sos_alert_update",
      data: {
        alertId,
        userId: user.id,
        status: "CANCELLED",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to cancel SOS:", error);
    return { success: false, error: "Failed to cancel SOS" };
  }
}

export async function getActiveSOSAdmin() {
  await requireAdmin();

  const alerts = await prisma.sOSAlert.findMany({
    where: { status: "ACTIVE" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      triggeredAt: "desc",
    },
  });

  return alerts;
}

export async function resolveSOSByAdmin(
  alertId: string,
  resolutionNote?: string,
) {
  const admin = await requireAdmin();

  try {
    const alert = await prisma.sOSAlert.findUnique({
      where: { id: alertId },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!alert) {
      return { success: false, error: "SOS alert not found" };
    }

    if (alert.status !== "ACTIVE") {
      return { success: false, error: "SOS alert is no longer active" };
    }

    await prisma.sOSAlert.update({
      where: { id: alertId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });

    await prisma.notification.create({
      data: {
        userId: alert.userId,
        title: "SOS incident marked as resolved",
        message:
          resolutionNote?.trim() ||
          "An admin has marked your SOS incident as resolved. If you still need help, trigger SOS again immediately.",
        type: "SOS_ALERT",
        priority: "HIGH",
      },
    });

    await broadcastRealtimeEvent({
      event: "sos_alert_update",
      data: {
        alertId: alert.id,
        userId: alert.userId,
        status: "RESOLVED",
      },
    });

    revalidatePath("/admin/safety");
    return { success: true };
  } catch (error) {
    console.error("Failed to resolve SOS by admin:", error);
    return { success: false, error: "Failed to resolve SOS alert" };
  }
}

// --- Blocking (Safety Domain) ---

export async function blockUser(targetUserId: string, reason?: string) {
  const user = await requireUser();

  if (!targetUserId || targetUserId === user.id) {
    return { success: false, error: "Invalid target user" };
  }

  try {
    await prisma.blockedUser.upsert({
      where: {
        userId_blockedId: {
          userId: user.id,
          blockedId: targetUserId,
        },
      },
      update: {
        reason: reason?.trim() || null,
      },
      create: {
        userId: user.id,
        blockedId: targetUserId,
        reason: reason?.trim() || null,
      },
    });

    revalidatePath("/dashboard/safety");
    return { success: true };
  } catch (error) {
    console.error("Failed to block user:", error);
    return { success: false, error: "Failed to block user" };
  }
}

export async function unblockUser(targetUserId: string) {
  const user = await requireUser();

  try {
    await prisma.blockedUser.delete({
      where: {
        userId_blockedId: {
          userId: user.id,
          blockedId: targetUserId,
        },
      },
    });

    revalidatePath("/dashboard/safety");
    return { success: true };
  } catch (error) {
    console.error("Failed to unblock user:", error);
    return { success: false, error: "Failed to unblock user" };
  }
}

export async function getBlockedUsers() {
  const user = await requireUser();

  try {
    return await prisma.blockedUser.findMany({
      where: { userId: user.id },
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Failed to fetch blocked users:", error);
    return [];
  }
}

export async function getActiveSOS() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  try {
    const activeAlert = await prisma.sOSAlert.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
      },
      orderBy: { triggeredAt: "desc" },
    });
    return activeAlert;
  } catch (error) {
    console.error("Failed to get active SOS:", error);
    return null;
  }
}
