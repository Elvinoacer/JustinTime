'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

// --- Report User ---
export async function reportUser(data: {
  reportedId: string;
  reason: 'HARASSMENT' | 'SCAM' | 'INAPPROPRIATE_CONTENT' | 'SAFETY_CONCERN' | 'SPAM' | 'OTHER';
  details?: string;
  messageId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Prevent self-reporting
  if (data.reportedId === session.user.id) {
    return { success: false, error: 'Cannot report yourself' };
  }

  try {
    // Check for duplicate active report
    const existingReport = await prisma.messageReport.findFirst({
      where: {
        reporterId: session.user.id,
        reportedId: data.reportedId,
        status: 'PENDING',
      },
    });

    if (existingReport) {
      return { success: false, error: 'You already have a pending report for this user' };
    }

    const report = await prisma.messageReport.create({
      data: {
        reporterId: session.user.id,
        reportedId: data.reportedId,
        reason: data.reason,
        details: data.details,
        messageId: data.messageId,
      },
    });

    return { success: true, reportId: report.id };
  } catch (error) {
    console.error('Failed to create report:', error);
    return { success: false, error: 'Failed to submit report' };
  }
}

// --- Block User ---
export async function blockUser(blockedId: string, reason?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  if (blockedId === session.user.id) {
    return { success: false, error: 'Cannot block yourself' };
  }

  try {
    await prisma.blockedUser.upsert({
      where: {
        userId_blockedId: {
          userId: session.user.id,
          blockedId: blockedId,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        blockedId: blockedId,
        reason: reason,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to block user:', error);
    return { success: false, error: 'Failed to block user' };
  }
}

// --- Unblock User ---
export async function unblockUser(blockedId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.blockedUser.delete({
      where: {
        userId_blockedId: {
          userId: session.user.id,
          blockedId: blockedId,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to unblock user:', error);
    return { success: false, error: 'Failed to unblock user' };
  }
}

// --- Check if user is blocked ---
export async function isUserBlocked(targetId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  try {
    const blocked = await prisma.blockedUser.findUnique({
      where: {
        userId_blockedId: {
          userId: session.user.id,
          blockedId: targetId,
        },
      },
    });

    return !!blocked;
  } catch (error) {
    console.error('Failed to check block status:', error);
    return false;
  }
}

// --- Get blocked users list ---
export async function getBlockedUsers() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  try {
    const blockedUsers = await prisma.blockedUser.findMany({
      where: { userId: session.user.id },
      include: {
        blocked: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return blockedUsers;
  } catch (error) {
    console.error('Failed to get blocked users:', error);
    return [];
  }
}
