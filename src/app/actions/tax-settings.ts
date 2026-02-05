"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { validateKRAPin } from "@/lib/etims/tax-calculator";
import { revalidatePath } from "next/cache";

/**
 * Get user's tax settings
 */
export async function getTaxSettings() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  let settings = await prisma.taxSettings.findUnique({
    where: { userId: session.user.id }
  });

  // Create default settings if not exists
  if (!settings) {
    settings = await prisma.taxSettings.create({
      data: { userId: session.user.id }
    });
  }

  return { success: true, settings };
}

/**
 * Update tax settings
 */
export async function updateTaxSettings(data: {
  kraPin?: string;
  tccNumber?: string;
  tccExpiry?: Date;
  vatRegistered?: boolean;
  preferredMethod?: string;
  businessName?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate KRA PIN format if provided
  if (data.kraPin && !validateKRAPin(data.kraPin)) {
    return { success: false, error: "Invalid KRA PIN format. Expected: A000000000B" };
  }

  const settings = await prisma.taxSettings.upsert({
    where: { userId: session.user.id },
    update: {
      ...data,
      kraPin: data.kraPin?.toUpperCase(),
      kraPinVerified: false // Reset verification when PIN changes
    },
    create: {
      userId: session.user.id,
      ...data,
      kraPin: data.kraPin?.toUpperCase()
    }
  });

  revalidatePath('/dashboard/settings/tax');
  return { success: true, settings };
}

/**
 * Verify KRA PIN (mock - would call GavaConnect API)
 */
export async function verifyKRAPin(pin: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!validateKRAPin(pin)) {
    return { success: false, error: "Invalid KRA PIN format" };
  }

  // Mock verification (in production, call KRA GavaConnect API)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock: 95% success rate
  const isVerified = Math.random() > 0.05;

  if (isVerified) {
    await prisma.taxSettings.upsert({
      where: { userId: session.user.id },
      update: {
        kraPin: pin.toUpperCase(),
        kraPinVerified: true
      },
      create: {
        userId: session.user.id,
        kraPin: pin.toUpperCase(),
        kraPinVerified: true
      }
    });

    revalidatePath('/dashboard/settings/tax');
    return { success: true, verified: true, message: "KRA PIN verified successfully" };
  }

  return { success: false, error: "PIN verification failed. Please check with KRA." };
}

/**
 * Get tax compliance status for profile badge
 */
export async function getTaxComplianceStatus(userId?: string) {
  const session = await auth();
  const targetUserId = userId || session?.user?.id;
  
  if (!targetUserId) {
    return { compliant: false };
  }

  const settings = await prisma.taxSettings.findUnique({
    where: { userId: targetUserId }
  });

  if (!settings) {
    return { compliant: false };
  }

  const isTCCValid = settings.tccExpiry ? settings.tccExpiry > new Date() : false;
  const compliant = settings.kraPinVerified && isTCCValid;

  return {
    compliant,
    hasPin: !!settings.kraPin,
    pinVerified: settings.kraPinVerified,
    hasTCC: !!settings.tccNumber,
    tccValid: isTCCValid,
    vatRegistered: settings.vatRegistered
  };
}
