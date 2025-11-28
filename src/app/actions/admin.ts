'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import crypto from 'crypto';
import { sendComprehensiveNotification, emailTemplates } from '@/lib/notifications/adminNotifications';

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

export async function getUserDetails(userId: string) {
  try {
    await checkAdmin();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        wallet: {
          include: {
            transactions: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        bookings: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            service: { select: { title: true } },
            provider: { select: { name: true, email: true } },
            client: { select: { name: true, email: true } },
            payment: { select: { status: true, amount: true, method: true } }
          }
        },
        services: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { name: true } },
            _count: { select: { bookings: true } }
          }
        },
        jobs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { name: true } },
            _count: { select: { proposals: true } }
          }
        },
        supportTickets: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        notifications: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        subscription: true,
        disputes: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            booking: { select: { id: true, service: { select: { title: true } } } },
            defendant: { select: { name: true, email: true } }
          }
        },
        disputesAgainst: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            booking: { select: { id: true, service: { select: { title: true } } } },
            creator: { select: { name: true, email: true } }
          }
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
            receivedReviews: true,
            services: true,
            jobs: true,
            sentMessages: true,
            receivedMessages: true,
            notifications: true,
            supportTickets: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Serialize Decimal fields to numbers to avoid serialization errors in Client Components
    return {
      ...user,
      profile: user.profile ? {
        ...user.profile,
        hourlyRate: user.profile.hourlyRate ? Number(user.profile.hourlyRate) : null,
      } : null,
      wallet: user.wallet ? {
        ...user.wallet,
        balance: Number(user.wallet.balance),
        transactions: user.wallet.transactions.map(tx => ({
          ...tx,
          amount: Number(tx.amount),
        })),
      } : null,
      bookings: user.bookings.map(booking => ({
        ...booking,
        totalAmount: Number(booking.totalAmount),
        proposedPrice: booking.proposedPrice ? Number(booking.proposedPrice) : null,
        payment: booking.payment ? {
          ...booking.payment,
          amount: Number(booking.payment.amount),
        } : null,
      })),
      services: user.services.map(service => ({
        ...service,
        price: Number(service.price),
      })),
      jobs: user.jobs.map(job => ({
        ...job,
        budget: job.budget ? Number(job.budget) : null,
      })),
    };
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw new Error('Failed to fetch user details');
  }
}

// Admin Actions for User Management
export async function updateUserRole(userId: string, newRole: 'CLIENT' | 'PROVIDER' | 'ADMIN') {
  try {
    const admin = await checkAdmin();
    
    // Get user details and old role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const oldRole = user.role;
    
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'UPDATED_USER_ROLE',
        targetId: userId,
        details: { newRole, oldRole }
      }
    });

    // Send comprehensive notification
    const template = emailTemplates.roleChanged(user.name || 'User', oldRole, newRole);

    console.log('[Admin Action] Sending role change notification to user:', userId, 'from', oldRole, 'to', newRole);
    const notificationResult = await sendComprehensiveNotification({
      userId,
      title: 'Account Role Updated',
      message: `Your account role has been changed from ${oldRole} to ${newRole}.`,
      type: 'ROLE_CHANGED',
      emailSubject: template.subject,
      emailHtml: template.html
    });
    console.log('[Admin Action] Role change notification result:', notificationResult);

    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: 'Failed to update user role' };
  }
}

export async function scheduleUserDeletion(userId: string, reason: string) {
  try {
    const admin = await checkAdmin();
    
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30); // 30 days grace period

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletionScheduledAt: deletionDate,
        deletionReason: reason
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'SCHEDULED_USER_DELETION',
        targetId: userId,
        details: { reason, deletionDate }
      }
    });

    // Send comprehensive notification
    const template = emailTemplates.accountDeletionScheduled(user.name || 'User', reason, deletionDate);

    console.log('[Admin Action] Sending deletion scheduled notification to user:', userId);
    const notificationResult = await sendComprehensiveNotification({
      userId,
      title: 'Account Deletion Scheduled',
      message: `Your account has been scheduled for deletion on ${deletionDate.toLocaleDateString()}. You have 30 days to appeal this decision.`,
      type: 'ACCOUNT_DELETION_SCHEDULED',
      emailSubject: template.subject,
      emailHtml: template.html
    });
    console.log('[Admin Action] Deletion scheduled notification result:', notificationResult);

    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error scheduling user deletion:', error);
    return { success: false, error: 'Failed to schedule user deletion' };
  }
}

export async function cancelUserDeletion(userId: string) {
  try {
    const admin = await checkAdmin();
    
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletionScheduledAt: null,
        deletionReason: null
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'CANCELLED_USER_DELETION',
        targetId: userId
      }
    });

    // Send comprehensive notification
    const template = emailTemplates.accountDeletionCancelled(user.name || 'User');

    console.log('[Admin Action] Sending deletion cancelled notification to user:', userId);
    const notificationResult = await sendComprehensiveNotification({
      userId,
      title: 'Account Deletion Cancelled',
      message: 'Good news! The scheduled deletion of your account has been cancelled. Your account remains active.',
      type: 'ACCOUNT_DELETION_CANCELLED',
      emailSubject: template.subject,
      emailHtml: template.html
    });
    console.log('[Admin Action] Deletion cancelled notification result:', notificationResult);

    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error cancelling user deletion:', error);
    return { success: false, error: 'Failed to cancel user deletion' };
  }
}

export async function sendPasswordReset(userId: string) {
  try {
    const admin = await checkAdmin();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user?.email) {
      return { success: false, error: 'User has no email address' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 24); // 24 hours

    await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Generate reset link
    const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'SENT_PASSWORD_RESET',
        targetId: userId
      }
    });

    // Send comprehensive notification
    const template = emailTemplates.passwordResetRequested(user.name || 'User', resetLink);

    console.log('[Admin Action] Sending password reset notification to user:', userId);
    const notificationResult = await sendComprehensiveNotification({
      userId,
      title: 'Password Reset Requested',
      message: 'A password reset has been requested for your account. Check your email for instructions.',
      type: 'PASSWORD_RESET',
      emailSubject: template.subject,
      emailHtml: template.html
    });
    console.log('[Admin Action] Notification result:', notificationResult);

    revalidatePath(`/admin/users/${userId}`);
    return { success: true, message: 'Password reset link sent to user' };
  } catch (error) {
    console.error('Error sending password reset:', error);
    return { success: false, error: 'Failed to send password reset' };
  }
}


export async function verifyProvider(userId: string, status: 'VERIFIED' | 'REJECTED' | 'PENDING') {
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
    
    // Get user details for notifications
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
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

    // Send comprehensive notification (Email + Push + Database)
    const template = isBanned 
      ? emailTemplates.userBanned(user.name || 'User')
      : emailTemplates.userUnbanned(user.name || 'User');

    console.log(`[Admin Action] Sending ${isBanned ? 'ban' : 'unban'} notification to user:`, userId);
    const notificationResult = await sendComprehensiveNotification({
      userId,
      title: isBanned ? 'Account Suspended' : 'Account Reinstated',
      message: isBanned 
        ? 'Your account has been temporarily restricted. Please check your email for more details.'
        : 'Your account has been reinstated. You can now access all features again.',
      type: isBanned ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_REINSTATED',
      emailSubject: template.subject,
      emailHtml: template.html
    });
    console.log('[Admin Action] Ban/Unban notification result:', notificationResult);

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error banning user:', error);
    return { success: false, error: 'Failed to ban user' };
  }
}

export async function getBookings(
  page = 1, 
  limit = 10, 
  filters: {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: string;
    maxAmount?: string;
  } = {}
) {
  try {
    await checkAdmin();
    
    const skip = (page - 1) * limit;
    const where: any = {};
    
    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    // Search filter (search in service title, client name/email, provider name/email, booking ID)
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { service: { title: { contains: filters.search, mode: 'insensitive' } } },
        { client: { 
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } }
          ]
        }},
        { provider: { 
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } }
          ]
        }},
      ];
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.date.lte = new Date(filters.dateTo);
      }
    }

    // Amount range filter
    if (filters.minAmount || filters.maxAmount) {
      where.totalAmount = {};
      if (filters.minAmount) {
        where.totalAmount.gte = parseFloat(filters.minAmount);
      }
      if (filters.maxAmount) {
        where.totalAmount.lte = parseFloat(filters.maxAmount);
      }
    }

    const [bookings, total, statusCounts] = await Promise.all([
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
      prisma.booking.count({ where }),
      // Get stats for all bookings (not filtered)
      prisma.booking.groupBy({
        by: ['status'],
        _count: true,
        _sum: {
          totalAmount: true
        }
      })
    ]);

    // Calculate stats
    const stats = {
      total: 0,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      totalRevenue: 0,
      avgBookingValue: 0,
    };

    statusCounts.forEach((item: any) => {
      stats.total += item._count;
      const revenue = Number(item._sum.totalAmount || 0);
      stats.totalRevenue += revenue;

      switch (item.status) {
        case 'PENDING':
          stats.pending = item._count;
          break;
        case 'CONFIRMED':
        case 'IN_PROGRESS':
          stats.confirmed += item._count;
          break;
        case 'COMPLETED':
          stats.completed = item._count;
          break;
        case 'CANCELLED':
        case 'DISPUTED':
          stats.cancelled += item._count;
          break;
      }
    });

    stats.avgBookingValue = stats.total > 0 ? Math.round(stats.totalRevenue / stats.total) : 0;

    return {
      bookings,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      stats,
    };
  } catch (error) {
    console.error('Error fetching bookings:', error);
    throw new Error('Failed to fetch bookings');
  }
}


export async function getDisputes(
  page = 1, 
  limit = 10, 
  filters: {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    creatorRole?: string;
  } = {}
) {
  try {
    await checkAdmin();
    
    const skip = (page - 1) * limit;
    const where: any = {};
    
    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    // Search filter (dispute ID, reason, parties, booking)
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { reason: { contains: filters.search, mode: 'insensitive' } },
        { creator: { 
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } }
          ]
        }},
        { defendant: { 
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } }
          ]
        }},
        { booking: {
          service: { title: { contains: filters.search, mode: 'insensitive' } }
        }},
      ];
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    // Creator role filter
    if (filters.creatorRole && filters.creatorRole !== 'ALL') {
      where.creator = {
        role: filters.creatorRole
      };
    }

    const [disputes, total, statusCounts, resolvedDisputes] = await Promise.all([
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
      prisma.dispute.count({ where }),
      // Get overall stats
      prisma.dispute.groupBy({
        by: ['status'],
        _count: true
      }),
      // Get resolved disputes for avg resolution time calculation
      prisma.dispute.findMany({
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] }
        },
        select: {
          createdAt: true,
          updatedAt: true
        }
      })
    ]);

    // Calculate stats
    const stats = {
      total: 0,
      open: 0,
      resolved: 0,
      closed: 0,
      resolutionRate: 0,
      avgResolutionTime: 0,
    };

    statusCounts.forEach((item: any) => {
      stats.total += item._count;
      switch (item.status) {
        case 'OPEN':
          stats.open = item._count;
          break;
        case 'RESOLVED':
          stats.resolved = item._count;
          break;
        case 'CLOSED':
          stats.closed = item._count;
          break;
      }
    });

    // Calculate resolution rate
    const resolvedCount = stats.resolved + stats.closed;
    stats.resolutionRate = stats.total > 0 ? Math.round((resolvedCount / stats.total) * 100) : 0;

    // Calculate average resolution time in days
    if (resolvedDisputes.length > 0) {
      const totalResolutionTime = resolvedDisputes.reduce((sum, dispute) => {
        const created = new Date(dispute.createdAt).getTime();
        const resolved = new Date(dispute.updatedAt).getTime();
        return sum + (resolved - created);
      }, 0);
      
      const avgTimeMs = totalResolutionTime / resolvedDisputes.length;
      stats.avgResolutionTime = Math.round(avgTimeMs / (1000 * 60 * 60 * 24)); // Convert to days
    }

    return {
      disputes,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      stats,
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

export async function getSupportTickets(
  page = 1, 
  limit = 10, 
  filters: {
    status?: string;
    priority?: string;
    search?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
) {
  try {
    await checkAdmin();
    
    const skip = (page - 1) * limit;
    const where: any = {};
    
    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }
    
    // Priority filter
    if (filters.priority && filters.priority !== 'ALL') {
      where.priority = filters.priority;
    }

    // Category filter
    if (filters.category && filters.category !== 'ALL') {
      where.category = filters.category;
    }

    // Search filter (ID, subject, description, user)
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { user: { 
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } }
          ]
        }}
      ];
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const [tickets, total, statusCounts, priorityCounts, resolvedTickets] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true, role: true } }
        }
      }),
      prisma.supportTicket.count({ where }),
      // Get status stats
      prisma.supportTicket.groupBy({
        by: ['status'],
        _count: true
      }),
      // Get priority stats
      prisma.supportTicket.groupBy({
        by: ['priority'],
        _count: true
      }),
      // Get resolved tickets for avg response time
      prisma.supportTicket.findMany({
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] }
        },
        select: {
          createdAt: true,
          updatedAt: true
        }
      })
    ]);

    // Calculate stats
    const stats = {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      urgent: 0,
      avgResponseTime: 0,
    };

    statusCounts.forEach((item: any) => {
      stats.total += item._count;
      switch (item.status) {
        case 'OPEN':
          stats.open = item._count;
          break;
        case 'IN_PROGRESS':
          stats.inProgress = item._count;
          break;
        case 'RESOLVED':
        case 'CLOSED':
          stats.resolved += item._count;
          break;
      }
    });

    priorityCounts.forEach((item: any) => {
      if (item.priority === 'URGENT') {
        stats.urgent = item._count;
      }
    });

    // Calculate average response time in hours
    if (resolvedTickets.length > 0) {
      const totalResponseTime = resolvedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.createdAt).getTime();
        const resolved = new Date(ticket.updatedAt).getTime();
        return sum + (resolved - created);
      }, 0);
      
      const avgTimeMs = totalResponseTime / resolvedTickets.length;
      stats.avgResponseTime = Math.round(avgTimeMs / (1000 * 60 * 60)); // Convert to hours
    }

    return {
      tickets,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      stats,
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

export async function getFinanceSummary() {
  try {
    await checkAdmin();
    
    // Get total revenue from completed bookings
    const completedBookings = await prisma.booking.findMany({
      where: { status: 'COMPLETED' },
      select: { totalAmount: true }
    });
    const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    
    // Get successful payments
    const payments = await prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      select: { amount: true }
    });
    const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    
    // Get pending payments
    const pendingPayments = await prisma.payment.count({
      where: { status: 'PENDING' }
    });
    
    // Get total transactions
    const totalTransactions = await prisma.transaction.count();
    
    // Get all wallets total balance
    const wallets = await prisma.wallet.findMany({
      select: { balance: true }
    });
    const totalWalletBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
    
    // Calculate platform fees (assuming 10% fee - could be retrieved from SystemSettings)
    const platformFee = totalRevenue * 0.10;
    
    // Get recent transactions for trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        amount: true,
        type: true,
        createdAt: true
      }
    });

    return {
      totalRevenue,
      totalPayments,
      pendingPayments,
      totalTransactions,
      totalWalletBalance,
      platformFee,
      recentTransactions: recentTransactions.map(t => ({
        ...t,
        amount: Number(t.amount)
      }))
    };
  } catch (error) {
    console.error('Error fetching finance summary:', error);
    throw new Error('Failed to fetch finance summary');
  }
}

export async function getTransactions(
  page = 1, 
  limit = 10, 
  filters: {
    type?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: string;
    maxAmount?: string;
  } = {}
) {
  try {
    await checkAdmin();
    
    const skip = (page - 1) * limit;
    const where: any = {};
    
    // Type filter
    if (filters.type && filters.type !== 'ALL') {
      where.type = filters.type;
    }

    // Search filter (Transaction ID, User Name, User Email)
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { wallet: {
          user: {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } }
            ]
          }
        }}
      ];
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    // Amount range filter
    if (filters.minAmount || filters.maxAmount) {
      where.amount = {};
      if (filters.minAmount) {
        where.amount.gte = parseFloat(filters.minAmount);
      }
      if (filters.maxAmount) {
        where.amount.lte = parseFloat(filters.maxAmount);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: {
            include: {
              user: { select: { name: true, email: true, role: true } }
            }
          }
        }
      }),
      prisma.transaction.count({ where })
    ]);

    return {
      transactions,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw new Error('Failed to fetch transactions');
  }
}

export async function getWallets(
  page = 1, 
  limit = 10,
  search = ''
) {
  try {
    await checkAdmin();
    
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [wallets, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { balance: 'desc' },
        include: {
          user: { select: { name: true, email: true, role: true } }
        }
      }),
      prisma.wallet.count({ where })
    ]);

    return {
      wallets,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error('Error fetching wallets:', error);
    throw new Error('Failed to fetch wallets');
  }
}


// Category Management
export async function getCategories() {
  try {
    await checkAdmin();
    
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { services: true, jobs: true }
        }
      }
    });

    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw new Error('Failed to fetch categories');
  }
}

export async function createCategory(data: { name: string; slug: string; description?: string; image?: string; parentId?: string }) {
  try {
    const admin = await checkAdmin();
    
    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        image: data.image,
        parentId: data.parentId || null,
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'CREATED_CATEGORY',
        targetId: category.id,
        details: { name: data.name },
      }
    });

    revalidatePath('/admin/settings');
    return { success: true, category };
  } catch (error) {
    console.error('Error creating category:', error);
    return { success: false, error: 'Failed to create category' };
  }
}

export async function updateCategory(categoryId: string, data: { name?: string; slug?: string; description?: string; image?: string }) {
  try {
    const admin = await checkAdmin();
    
    const category = await prisma.category.update({
      where: { id: categoryId },
      data
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'UPDATED_CATEGORY',
        targetId: categoryId,
        details: data,
      }
    });

    revalidatePath('/admin/settings');
    return { success: true, category };
  } catch (error) {
    console.error('Error updating category:', error);
    return { success: false, error: 'Failed to update category' };
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    const admin = await checkAdmin();
    
    await prisma.category.delete({
      where: { id: categoryId }
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'DELETED_CATEGORY',
        targetId: categoryId,
        details: {},
      }
    });

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: 'Failed to delete category' };
  }
}

// System Settings Management
export async function getSystemSettings() {
  try {
    await checkAdmin();
    
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' }
    });

    return settings;
  } catch (error) {
    console.error('Error fetching system settings:', error);
    throw new Error('Failed to fetch system settings');
  }
}

export async function updateSystemSetting(key: string, value: any, description?: string) {
  try {
    const admin = await checkAdmin();
    
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description }
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'UPDATED_SYSTEM_SETTING',
        targetId: key,
        details: { value },
      }
    });

    revalidatePath('/admin/settings');
    return { success: true, setting };
  } catch (error) {
    console.error('Error updating system setting:', error);
    return { success: false, error: 'Failed to update system setting' };
  }
}
