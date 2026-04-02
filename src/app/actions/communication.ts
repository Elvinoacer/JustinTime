"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { addHours, isAfter } from "date-fns";
import { isBlockedBetweenUsers } from "@/lib/messaging/blocking";

type ProvisionedSecureLine = {
  virtualNumber: string;
  accessCode: string;
  expiresAt: Date;
};

function isCommunicationWindowOpen(status: string, bookingDate: Date): boolean {
  if (status === "CANCELLED") {
    return false;
  }

  if (status === "COMPLETED") {
    return isAfter(addHours(bookingDate, 72), new Date());
  }

  return true;
}

async function requestExternalSecureLine(
  bookingId: string,
  userId: string,
): Promise<ProvisionedSecureLine | null> {
  const webhookUrl = process.env.SECURE_CALL_PROVIDER_WEBHOOK_URL;
  if (!webhookUrl) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (process.env.SECURE_CALL_PROVIDER_TOKEN) {
      headers.Authorization = `Bearer ${process.env.SECURE_CALL_PROVIDER_TOKEN}`;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ bookingId, userId }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (
      typeof payload?.virtualNumber !== "string" ||
      typeof payload?.accessCode !== "string"
    ) {
      return null;
    }

    const expiresAt = payload.expiresAt
      ? new Date(payload.expiresAt)
      : addHours(new Date(), 2);

    return {
      virtualNumber: payload.virtualNumber,
      accessCode: payload.accessCode,
      expiresAt,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function provisionSecureLine(
  bookingId: string,
  userId: string,
): Promise<ProvisionedSecureLine | null> {
  const externalProvision = await requestExternalSecureLine(bookingId, userId);
  if (externalProvision) {
    return externalProvision;
  }

  const configuredVirtualNumber = process.env.SECURE_CALL_VIRTUAL_NUMBER;
  if (!configuredVirtualNumber) {
    return null;
  }

  return {
    virtualNumber: configuredVirtualNumber,
    accessCode: Math.floor(1000 + Math.random() * 9000).toString(),
    expiresAt: addHours(new Date(), 2),
  };
}

// --- Phone Anonymization / Proxy Logic ---

/**
 * Initiates or retrieves a secure proxy session for a booking/context.
 * Allows users to call each other without exchanging real numbers.
 */
export async function initiateSecureCall(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        clientId: true,
        providerId: true,
        status: true,
        date: true,
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    const userId = session.user.id;
    const isParticipant =
      booking.clientId === userId || booking.providerId === userId;
    if (!isParticipant) {
      return { success: false, error: "You cannot access this secure line" };
    }

    const usersBlocked = await isBlockedBetweenUsers(
      booking.clientId,
      booking.providerId,
    );
    if (usersBlocked) {
      return {
        success: false,
        error: "Secure line is unavailable for this booking",
      };
    }

    if (!isCommunicationWindowOpen(booking.status, booking.date)) {
      return {
        success: false,
        error: "Secure line is no longer available for this booking",
      };
    }

    // 1. Check for existing active session
    const existingSession = await prisma.proxySession.findUnique({
      where: { bookingId },
    });

    if (existingSession && existingSession.activeUntil > new Date()) {
      return {
        success: true,
        data: {
          virtualNumber: existingSession.virtualNumber,
          accessCode: existingSession.accessCode,
          expiresAt: existingSession.activeUntil.toISOString(),
        },
      };
    }

    const provisionedLine = await provisionSecureLine(bookingId, userId);
    if (!provisionedLine) {
      return {
        success: false,
        error: "Secure line provider is not configured",
      };
    }

    // Cleanup old session if exists (expired)
    if (existingSession) {
      await prisma.proxySession.delete({ where: { bookingId } });
    }

    const newSession = await prisma.proxySession.create({
      data: {
        bookingId,
        virtualNumber: provisionedLine.virtualNumber,
        accessCode: provisionedLine.accessCode,
        activeUntil: provisionedLine.expiresAt,
      },
    });

    return {
      success: true,
      data: {
        virtualNumber: newSession.virtualNumber,
        accessCode: newSession.accessCode,
        expiresAt: newSession.activeUntil.toISOString(),
      },
    };
  } catch (error) {
    console.error("Failed to initiate secure call:", error);
    return { success: false, error: "Failed to connect secure line" };
  }
}
