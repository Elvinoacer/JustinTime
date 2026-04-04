"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleTwoFactor(enabled: boolean) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        isTwoFactorEnabled: enabled,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/client/settings");
    
    return { success: true, enabled };
  } catch (error) {
    console.error("Error toggling 2FA:", error);
    throw new Error("Failed to update 2FA settings");
  }
}

export async function getTwoFactorStatus() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        isTwoFactorEnabled: true,
      },
    });

    return { enabled: user?.isTwoFactorEnabled || false };
  } catch (error) {
    console.error("Error fetching 2FA status:", error);
    throw new Error("Failed to fetch 2FA status");
  }
}
