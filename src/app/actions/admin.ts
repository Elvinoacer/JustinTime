'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

async function checkAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }
  return session.user;
}

export async function getUsers(page = 1, limit = 10, search = '', role = '', verificationStatus = '') {
  try {
    await checkAdmin();
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (role && role !== 'ALL') {
      where.role = role;
    }

    if (verificationStatus) {
      where.profile = {
        verificationStatus: verificationStatus
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: {
            select: {
              verificationStatus: true,
              isVerified: true,
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    return {
      users,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
}

export async function verifyProvider(userId: string, status: 'VERIFIED' | 'REJECTED') {
  try {
    const admin = await checkAdmin();
    
    await prisma.profile.update({
      where: { userId },
      data: {
        verificationStatus: status,
        isVerified: status === 'VERIFIED',
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: `VERIFIED_PROVIDER_${status}`,
        targetId: userId,
      }
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error verifying provider:', error);
    return { success: false, error: 'Failed to verify provider' };
  }
}

export async function toggleBanUser(userId: string, isBanned: boolean) {
  try {
    const admin = await checkAdmin();
    
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: isBanned ? 'BANNED_USER' : 'UNBANNED_USER',
        targetId: userId,
      }
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error banning user:', error);
    return { success: false, error: 'Failed to ban user' };
  }
}

export async function getBookings(page = 1, limit = 10, status = '') {
  try {
    await checkAdmin();
    
    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { name: true, email: true } },
          provider: { select: { name: true, email: true } },
          service: { select: { title: true } },
        }
      }),
      prisma.booking.count({ where })
    ]);

    return {
      bookings,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error('Error fetching bookings:', error);
    throw new Error('Failed to fetch bookings');
  }
}

export async function getDisputes(page = 1, limit = 10, status = '') {
  try {
    await checkAdmin();
    
    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              date: true,
              totalAmount: true,
              service: { select: { title: true } }
            }
          },
          creator: { select: { name: true, email: true, role: true } },
          defendant: { select: { name: true, email: true, role: true } },
        }
      }),
      prisma.dispute.count({ where })
    ]);

    return {
      disputes,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error('Error fetching disputes:', error);
    throw new Error('Failed to fetch disputes');
  }
}

export async function resolveDispute(disputeId: string, resolution: string, status: 'RESOLVED' | 'CLOSED') {
  try {
    const admin = await checkAdmin();
    
    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status,
        resolution,
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: `RESOLVED_DISPUTE_${status}`,
        targetId: disputeId,
        details: { resolution },
      }
    });

    revalidatePath('/admin/disputes');
    return { success: true };
  } catch (error) {
    console.error('Error resolving dispute:', error);
    return { success: false, error: 'Failed to resolve dispute' };
  }
}

export async function getSupportTickets(page = 1, limit = 10, status = '', priority = '') {
  try {
    await checkAdmin();
    
    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' }, // High priority first? Need to check enum values. 
          // Enum is usually string, so 'URGENT' > 'MEDIUM' alphabetically? No.
          // Let's just order by createdAt desc for now, or handle custom sort later.
          { createdAt: 'desc' }
        ],
        include: {
          user: { select: { name: true, email: true, role: true } }
        }
      }),
      prisma.supportTicket.count({ where })
    ]);

    return {
      tickets,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    throw new Error('Failed to fetch support tickets');
  }
}

export async function updateSupportTicket(ticketId: string, data: { status?: string; priority?: string; adminNotes?: string; resolution?: string }) {
  try {
    const admin = await checkAdmin();
    
    const updateData: any = { ...data };
    
    if (data.status === 'RESOLVED' || data.status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    }

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: `UPDATED_TICKET_${ticketId}`,
        targetId: ticketId,
        details: data,
      }
    });

    revalidatePath('/admin/support');
    return { success: true };
  } catch (error) {
    console.error('Error updating support ticket:', error);
    return { success: false, error: 'Failed to update support ticket' };
  }
}
