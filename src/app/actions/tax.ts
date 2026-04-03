"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { GavaConnect } from "@/lib/gava";
import { revalidatePath } from "next/cache";
import { validateKRAPin } from "@/lib/etims/tax-calculator";

type TaxSettingsInput = {
  kraPin?: string;
  tccNumber?: string;
  tccExpiry?: Date | null;
  vatRegistered?: boolean;
  preferredMethod?: string;
  businessName?: string;
};

function normalizeString(value?: string | null): string | null {
  const next = value?.trim();
  return next ? next : null;
}

function normalizePin(value?: string | null): string | null {
  const next = value?.trim().toUpperCase();
  return next ? next : null;
}

async function getOrCreateTaxSettingsForUser(userId: string) {
  const settings = await prisma.taxSettings.findUnique({
    where: { userId },
  });

  if (settings) {
    return settings;
  }

  return prisma.taxSettings.create({
    data: {
      userId,
    },
  });
}

export async function getTaxSettings() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const settings = await getOrCreateTaxSettingsForUser(session.user.id);
  return { success: true, settings };
}

export async function updateTaxSettings(data: TaxSettingsInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const existing = await getOrCreateTaxSettingsForUser(session.user.id);
  const hasKraPin = Object.prototype.hasOwnProperty.call(data, "kraPin");
  const normalizedKraPin = hasKraPin ? normalizePin(data.kraPin) : null;

  if (normalizedKraPin && !validateKRAPin(normalizedKraPin)) {
    return {
      success: false,
      error: "Invalid KRA PIN format. Expected: A000000000B",
    };
  }

  const updateData: Record<string, unknown> = {};

  if (hasKraPin) {
    updateData.kraPin = normalizedKraPin;
    const pinChanged = normalizedKraPin !== (existing.kraPin ?? null);
    if (pinChanged || !normalizedKraPin) {
      updateData.kraPinVerified = false;
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "tccNumber")) {
    updateData.tccNumber = normalizeString(data.tccNumber);
  }

  if (Object.prototype.hasOwnProperty.call(data, "tccExpiry")) {
    updateData.tccExpiry = data.tccExpiry ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(data, "vatRegistered")) {
    updateData.vatRegistered = Boolean(data.vatRegistered);
  }

  if (Object.prototype.hasOwnProperty.call(data, "preferredMethod")) {
    const preferredMethod = normalizeString(data.preferredMethod);
    updateData.preferredMethod = preferredMethod || "STANDARD";
  }

  if (Object.prototype.hasOwnProperty.call(data, "businessName")) {
    updateData.businessName = normalizeString(data.businessName);
  }

  const settings = await prisma.taxSettings.update({
    where: { userId: session.user.id },
    data: updateData,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/tax");
  revalidatePath("/dashboard/invoices");

  return { success: true, settings };
}

export async function verifyAndSaveKraDetails(pin: string, tcc: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const normalizedPin = normalizePin(pin);
  const normalizedTcc = normalizeString(tcc);

  if (!normalizedPin) {
    return { success: false, error: "KRA PIN is required" };
  }

  if (!validateKRAPin(normalizedPin)) {
    return {
      success: false,
      error: "Invalid KRA PIN format. Expected: A000000000B",
    };
  }

  if (!normalizedTcc) {
    return { success: false, error: "TCC number is required for verification" };
  }

  const pinResult = await GavaConnect.verifyPin(normalizedPin);
  if (!pinResult.isValid) {
    return { success: false, error: pinResult.message || "Invalid PIN" };
  }

  const tccResult = await GavaConnect.checkTccStatus(normalizedTcc);
  if (!tccResult.isValid) {
    return { success: false, error: tccResult.message || "Invalid TCC" };
  }

  try {
    await prisma.taxSettings.upsert({
      where: { userId: session.user.id },
      update: {
        kraPin: pinResult.pin,
        tccNumber: tccResult.number,
        tccExpiry: tccResult.expiryDate,
        kraPinVerified: true,
      },
      create: {
        userId: session.user.id,
        kraPin: pinResult.pin,
        tccNumber: tccResult.number,
        tccExpiry: tccResult.expiryDate,
        kraPinVerified: true,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/tax");
    revalidatePath("/dashboard/invoices");

    return { success: true };
  } catch (error) {
    console.error("Failed to update tax settings", error);
    return { success: false, error: "Database update failed" };
  }
}

export async function verifyKRAPin(pin: string, tccNumber?: string) {
  if (!tccNumber?.trim()) {
    return {
      success: false,
      error: "TCC number is required for PIN verification",
    };
  }

  return verifyAndSaveKraDetails(pin, tccNumber);
}

export async function fileNilReturnAction(period: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const settings = await getOrCreateTaxSettingsForUser(session.user.id);

  if (!settings.kraPin) {
    return {
      success: false,
      error: "KRA PIN not found. Please verify your tax details first.",
    };
  }

  const result = await GavaConnect.fileNilReturn(settings.kraPin, period);

  if (!result.success) {
    return { success: false, error: result.message };
  }

  try {
    await prisma.taxFiling.create({
      data: {
        providerId: session.user.id,
        period,
        type: "NIL",
        status: "FILED",
        ackNumber: result.ackNumber,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/tax");

    return { success: true, ackNumber: result.ackNumber };
  } catch (error) {
    console.error("Failed to record filing", error);
    return { success: false, error: "Filed but failed to record locally." };
  }
}

export async function getTaxFilings() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return await prisma.taxFiling.findMany({
    where: { providerId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

export async function getTaxProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const settings = await getOrCreateTaxSettingsForUser(session.user.id);

  return {
    kraPin: settings.kraPin,
    tccNumber: settings.tccNumber,
    tccExpiry: settings.tccExpiry,
    kraVerified: settings.kraPinVerified,
    vatRegistered: settings.vatRegistered,
    preferredMethod: settings.preferredMethod,
    businessName: settings.businessName,
  };
}

export async function getTaxComplianceStatus(userId?: string) {
  const session = await auth();
  const targetUserId = userId || session?.user?.id;

  if (!targetUserId) {
    return { compliant: false };
  }

  const settings =
    targetUserId === session?.user?.id
      ? await getOrCreateTaxSettingsForUser(targetUserId)
      : await prisma.taxSettings.findUnique({
          where: { userId: targetUserId },
        });

  if (!settings) {
    return { compliant: false };
  }

  const isTCCValid = settings.tccExpiry
    ? settings.tccExpiry > new Date()
    : false;
  const compliant =
    settings.kraPinVerified && Boolean(settings.tccNumber) && isTCCValid;

  return {
    compliant,
    hasPin: !!settings.kraPin,
    pinVerified: settings.kraPinVerified,
    hasTCC: !!settings.tccNumber,
    tccValid: isTCCValid,
    vatRegistered: settings.vatRegistered,
  };
}
