'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

// --- Background Check Logic ---

export async function submitBackgroundCheck(data: { dciCertificateUrl: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    const check = await prisma.backgroundCheck.create({
      data: {
        providerId: session.user.id,
        dciCertificateUrl: data.dciCertificateUrl,
        status: 'SUBMITTED',
      },
    });
    
    revalidatePath('/dashboard/verification'); // Assuming this is where status is shown
    return { success: true, check };
  } catch (error) {
    console.error('Failed to submit background check:', error);
    return { success: false, error: 'Failed to submit check' };
  }
}

export async function getProviderBackgroundCheck(providerId?: string) {
    const session = await auth();
    // usage: if providerId is null, get for current user
    const targetId = providerId || session?.user?.id;
    
    if (!targetId) return null;

    try {
        // Get the latest one
        const check = await prisma.backgroundCheck.findFirst({
            where: { providerId: targetId },
            orderBy: { submittedAt: 'desc' }
        });
        return check;
    } catch (error) {
        return null;
    }
}

// --- Admin Actions ---

export async function approveBackgroundCheck(checkId: string) {
  const session = await auth();
  // TODO: Add strict admin check
  if (!session?.user?.id) { // && session.user.role === 'ADMIN'
     throw new Error('Unauthorized');
  }

  try {
    const check = await prisma.backgroundCheck.update({
      where: { id: checkId },
      data: {
        status: 'CLEARED',
        clearedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Valid for 1 year
      },
    });
    
    // Optional: Also mark profile as generally verified?
    // For now, we keep Background Check separate from Identity Verification
    
    revalidatePath('/admin/verifications');
    return { success: true, check };
  } catch (error) {
    console.error('Failed to approve check:', error);
    return { success: false, error: 'Failed to approve' };
  }
}

export async function rejectBackgroundCheck(checkId: string, reason: string) {
  const session = await auth();
   // TODO: Add strict admin check
   if (!session?.user?.id) {
     throw new Error('Unauthorized');
  }

  try {
    const check = await prisma.backgroundCheck.update({
      where: { id: checkId },
      data: {
        status: 'REJECTED',
        adminNotes: reason,
      },
    });

    revalidatePath('/admin/verifications');
    return { success: true, check };
  } catch (error) {
    console.error('Failed to reject check:', error);
    return { success: false, error: 'Failed to reject' };
  }
}

export async function getExpiringChecks() {
    const session = await auth();
     // TODO: Add strict admin check
    if (!session?.user?.id) {
         throw new Error('Unauthorized');
    }

    try {
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        const checks = await prisma.backgroundCheck.findMany({
            where: {
                status: 'CLEARED',
                expiresAt: {
                    lte: thirtyDaysFromNow,
                    not: null
                }
            },
            include: {
                provider: {
                    include: {
                        profile: true
                    }
                }
            },
            orderBy: { expiresAt: 'asc' }
        });
        return checks;
    } catch (error) {
        console.error("Error fetching expiring checks:", error);
        return [];
    }
}
