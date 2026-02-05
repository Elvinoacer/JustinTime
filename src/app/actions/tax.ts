
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { GavaConnect } from "@/lib/gava";
import { revalidatePath } from "next/cache";

export async function verifyAndSaveKraDetails(pin: string, tcc: string) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    // 1. Verify PIN
    const pinResult = await GavaConnect.verifyPin(pin);
    if (!pinResult.isValid) {
        return { success: false, error: pinResult.message || "Invalid PIN" };
    }

    // 2. Verify TCC
    const tccResult = await GavaConnect.checkTccStatus(tcc);
    // Note: We might allow saving even if expired, but mark as unverified? 
    // Let's implement strict verification for now.
    if (!tccResult.isValid) {
        return { success: false, error: tccResult.message || "Invalid TCC" };
    }

    // 3. Update Profile
    try {
        await prisma.profile.update({
            where: { userId: session.user.id },
            data: {
                kraPin: pinResult.pin,
                tccNumber: tccResult.number,
                tccExpiry: tccResult.expiryDate,
                kraVerified: true
            }
        });
        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to update tax profile", error);
        return { success: false, error: "Database update failed" };
    }
}

export async function fileNilReturnAction(period: string) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    // 1. Get User Profile for PIN
    const profile = await prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: { kraPin: true }
    });

    if (!profile?.kraPin) {
        return { success: false, error: "KRA PIN not found. Please verify your tax details first." };
    }

    // 2. File Return
    const result = await GavaConnect.fileNilReturn(profile.kraPin, period);

    if (!result.success) {
        return { success: false, error: result.message };
    }

    // 3. Record Filing
    try {
        await prisma.taxFiling.create({
            data: {
                providerId: session.user.id,
                period,
                type: "NIL",
                status: "FILED",
                ackNumber: result.ackNumber
            }
        });
        revalidatePath("/dashboard/settings");
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
        orderBy: { createdAt: 'desc' },
        take: 10
    });
}

export async function getTaxProfile() {
    const session = await auth();
    if (!session?.user?.id) return null;

    return await prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: {
            kraPin: true,
            tccNumber: true,
            tccExpiry: true,
            kraVerified: true
        }
    });
}
