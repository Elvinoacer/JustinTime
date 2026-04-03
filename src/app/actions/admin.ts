"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import crypto from "crypto";
import {
  sendComprehensiveNotification,
  emailTemplates,
} from "@/lib/notifications/adminNotifications";
import { hasRole } from "@/lib/auth/roles";

export async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    throw new Error("Unauthorized: Admin access required");
  }
  return session.user;
}

export async function getUsers(
  page = 1,
  limit = 10,
  search = "",
  role = "",
  verificationStatus = "",
) {
  try {
    await checkAdmin();

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role && role !== "ALL") {
      where.role = role;
    }

    if (verificationStatus) {
      where.profile = {
        verificationStatus: verificationStatus,
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          profile: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
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
              orderBy: { createdAt: "desc" },
            },
          },
        },
        bookings: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            service: { select: { title: true } },
            provider: { select: { name: true, email: true } },
            client: { select: { name: true, email: true } },
            payment: { select: { status: true, amount: true, method: true } },
          },
        },
        services: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            category: { select: { name: true } },
            _count: { select: { bookings: true } },
          },
        },
        jobs: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            category: { select: { name: true } },
            _count: { select: { proposals: true } },
          },
        },
        supportTickets: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        notifications: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        subscription: true,
        disputes: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            booking: {
              select: { id: true, service: { select: { title: true } } },
            },
            defendant: { select: { name: true, email: true } },
          },
        },
        disputesAgainst: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            booking: {
              select: { id: true, service: { select: { title: true } } },
            },
            creator: { select: { name: true, email: true } },
          },
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
            supportTickets: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Fetch all categories for skill mapping
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    // Serialize Decimal fields to numbers to avoid serialization errors in Client Components
    return {
      ...user,
      profile: user.profile
        ? {
            ...user.profile,
            hourlyRate: user.profile.hourlyRate
              ? Number(user.profile.hourlyRate)
              : null,
            skills: user.profile.skills.map(
              (skillId) => categoryMap.get(skillId) || skillId,
            ),
          }
        : null,
      wallet: user.wallet
        ? {
            ...user.wallet,
            balance: Number(user.wallet.balance),
            transactions: user.wallet.transactions.map((tx) => ({
              ...tx,
              amount: Number(tx.amount),
            })),
          }
        : null,
      bookings: user.bookings.map((booking) => ({
        ...booking,
        totalAmount: Number(booking.totalAmount),
        proposedPrice: booking.proposedPrice
          ? Number(booking.proposedPrice)
          : null,
        payment: booking.payment
          ? {
              ...booking.payment,
              amount: Number(booking.payment.amount),
            }
          : null,
      })),
      services: user.services.map((service) => ({
        ...service,
        price: Number(service.price),
      })),
      jobs: user.jobs.map((job) => ({
        ...job,
        budget: job.budget ? Number(job.budget) : null,
      })),
    };
  } catch (error) {
    console.error("Error fetching user details:", error);
    throw new Error("Failed to fetch user details");
  }
}

// Admin Actions for User Management
export async function updateUserRole(
  userId: string,
  newRole: "CLIENT" | "PROVIDER" | "ADMIN",
) {
  try {
    const admin = await checkAdmin();

    // Get user details and old role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const oldRole = user.role;

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATED_USER_ROLE",
        targetId: userId,
        details: { newRole, oldRole },
      },
    });

    // Send comprehensive notification
    const template = emailTemplates.roleChanged(
      user.name || "User",
      oldRole,
      newRole,
    );

    console.log(
      "[Admin Action] Sending role change notification to user:",
      userId,
      "from",
      oldRole,
      "to",
      newRole,
    );
    const notificationResult = await sendComprehensiveNotification({
      userId,
      title: "Account Role Updated",
      message: `Your account role has been changed from ${oldRole} to ${newRole}.`,
      type: "ROLE_CHANGED",
      emailSubject: template.subject,
      emailHtml: template.html,
    });
    console.log(
      "[Admin Action] Role change notification result:",
      notificationResult,
    );

    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}

export async function updateUserPlan(
  userId: string,
  newPlan: "FREE" | "PRO" | "BUSINESS",
) {
  try {
    const admin = await checkAdmin();

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Get current subscription to log change
    const currentSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    const oldPlan = currentSubscription?.plan || "NONE";

    // Upsert subscription
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: newPlan,
        isActive: true,
        startDate: new Date(), // Reset start date on plan change? Maybe keep original? Let's reset for now as it's a "new" plan
        endDate: null, // Clear end date if any
      },
      create: {
        userId,
        plan: newPlan,
        isActive: true,
        startDate: new Date(),
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATED_USER_PLAN",
        targetId: userId,
        details: { newPlan, oldPlan },
      },
    });

    // Send comprehensive notification
    // Note: We might want a specific template for plan changes, but for now we can use a generic one or adapt role changed
    // Let's use a generic system notification for now as we don't have a specific template in the import

    console.log(
      "[Admin Action] Sending plan change notification to user:",
      userId,
      "from",
      oldPlan,
      "to",
      newPlan,
    );
    const notificationResult = await sendComprehensiveNotification({
      userId,
      title: "Subscription Plan Updated",
      message: `Your subscription plan has been updated to ${newPlan}.`,
      type: "PLAN_CHANGED",
      // We'll skip email template for now or use a simple one if available,
      // but since we don't have a specific one imported, we'll rely on the notification system's default behavior if emailHtml is missing
      // or we could construct a simple one.
      emailSubject: "Your Subscription Plan Has Changed",
      emailHtml: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1>Subscription Plan Updated</h1>
          <p>Hello ${user.name || "User"},</p>
          <p>Your subscription plan has been updated from <strong>${oldPlan}</strong> to <strong>${newPlan}</strong>.</p>
          <p>If you have any questions, please contact support.</p>
        </div>
      `,
    });
    console.log(
      "[Admin Action] Plan change notification result:",
      notificationResult,
    );

    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating user plan:", error);
    return { success: false, error: "Failed to update user plan" };
  }
}

export async function scheduleUserDeletion(userId: string, reason: string) {
  try {
    const admin = await checkAdmin();

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30); // 30 days grace period

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletionScheduledAt: deletionDate,
        deletionReason: reason,
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "SCHEDULED_USER_DELETION",
        targetId: userId,
        details: { reason, deletionDate },
      },
    });

    // Send comprehensive notification
    const template = emailTemplates.accountDeletionScheduled(
      user.name || "User",
      reason,
      deletionDate,
    );

    console.log(
      "[Admin Action] Sending deletion scheduled notification to user:",
      userId,
    );
    const notificationResult = await sendComprehensiveNotification({
      userId,
      title: "Account Deletion Scheduled",
      message: `Your account has been scheduled for deletion on ${deletionDate.toLocaleDateString()}. You have 30 days to appeal this decision.`,
      type: "ACCOUNT_DELETION_SCHEDULED",
      emailSubject: template.subject,
      emailHtml: template.html,
    });
    console.log(
      "[Admin Action] Deletion scheduled notification result:",
      notificationResult,
    );

    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
  } catch (error) {
    console.error("Error scheduling user deletion:", error);
    return { success: false, error: "Failed to schedule user deletion" };
  }
}

export async function cancelUserDeletion(userId: string) {
  try {
    const admin = await checkAdmin();

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletionScheduledAt: null,
        deletionReason: null,
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "CANCELLED_USER_DELETION",
        targetId: userId,
      },
    });

    // Send comprehensive notification
    const template = emailTemplates.accountDeletionCancelled(
      user.name || "User",
    );

    console.log(
      "[Admin Action] Sending deletion cancelled notification to user:",
      userId,
    );
    const notificationResult = await sendComprehensiveNotification({
      userId,
      title: "Account Deletion Cancelled",
      message:
        "Good news! The scheduled deletion of your account has been cancelled. Your account remains active.",
      type: "ACCOUNT_DELETION_CANCELLED",
      emailSubject: template.subject,
      emailHtml: template.html,
    });
    console.log(
      "[Admin Action] Deletion cancelled notification result:",
      notificationResult,
    );

    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
  } catch (error) {
    console.error("Error cancelling user deletion:", error);
    return { success: false, error: "Failed to cancel user deletion" };
  }
}

export async function sendPasswordReset(userId: string) {
  try {
    const admin = await checkAdmin();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user?.email) {
      return { success: false, error: "User has no email address" };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 24); // 24 hours

    await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Generate reset link
    const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "SENT_PASSWORD_RESET",
        targetId: userId,
      },
    });

    // Send comprehensive notification
    const template = emailTemplates.passwordResetRequested(
      user.name || "User",
      resetLink,
    );

    console.log(
      "[Admin Action] Sending password reset notification to user:",
      userId,
    );
    const notificationResult = await sendComprehensiveNotification({
      userId,
      title: "Password Reset Requested",
      message:
        "A password reset has been requested for your account. Check your email for instructions.",
      type: "PASSWORD_RESET",
      emailSubject: template.subject,
      emailHtml: template.html,
    });
    console.log("[Admin Action] Notification result:", notificationResult);

    revalidatePath(`/admin/users/${userId}`);
    return { success: true, message: "Password reset link sent to user" };
  } catch (error) {
    console.error("Error sending password reset:", error);
    return { success: false, error: "Failed to send password reset" };
  }
}

export async function verifyProvider(
  userId: string,
  status: "VERIFIED" | "REJECTED" | "PENDING",
) {
  try {
    const admin = await checkAdmin();

    await prisma.profile.update({
      where: { userId },
      data: {
        verificationStatus: status,
        isVerified: status === "VERIFIED",
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: `VERIFIED_PROVIDER_${status}`,
        targetId: userId,
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error verifying provider:", error);
    return { success: false, error: "Failed to verify provider" };
  }
}

export async function toggleBanUser(userId: string, isBanned: boolean) {
  try {
    const admin = await checkAdmin();

    // Get user details for notifications
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isBanned },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: isBanned ? "BANNED_USER" : "UNBANNED_USER",
        targetId: userId,
      },
    });

    // Send comprehensive notification (Email + Push + Database)
    const template = isBanned
      ? emailTemplates.userBanned(user.name || "User")
      : emailTemplates.userUnbanned(user.name || "User");

    console.log(
      `[Admin Action] Sending ${isBanned ? "ban" : "unban"} notification to user:`,
      userId,
    );
    const notificationResult = await sendComprehensiveNotification({
      userId,
      title: isBanned ? "Account Suspended" : "Account Reinstated",
      message: isBanned
        ? "Your account has been temporarily restricted. Please check your email for more details."
        : "Your account has been reinstated. You can now access all features again.",
      type: isBanned ? "ACCOUNT_SUSPENDED" : "ACCOUNT_REINSTATED",
      emailSubject: template.subject,
      emailHtml: template.html,
    });
    console.log(
      "[Admin Action] Ban/Unban notification result:",
      notificationResult,
    );

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error banning user:", error);
    return { success: false, error: "Failed to ban user" };
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
  } = {},
) {
  try {
    await checkAdmin();

    const skip = (page - 1) * limit;
    const where: any = {};

    // Status filter
    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    // Search filter (search in service title, client name/email, provider name/email, booking ID)
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: "insensitive" } },
        {
          service: { title: { contains: filters.search, mode: "insensitive" } },
        },
        {
          client: {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { email: { contains: filters.search, mode: "insensitive" } },
            ],
          },
        },
        {
          provider: {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { email: { contains: filters.search, mode: "insensitive" } },
            ],
          },
        },
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
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { name: true, email: true } },
          provider: { select: { name: true, email: true } },
          service: { select: { title: true } },
        },
      }),
      prisma.booking.count({ where }),
      // Get stats for all bookings (not filtered)
      prisma.booking.groupBy({
        by: ["status"],
        _count: true,
        _sum: {
          totalAmount: true,
        },
      }),
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
        case "PENDING":
          stats.pending = item._count;
          break;
        case "CONFIRMED":
        case "IN_PROGRESS":
          stats.confirmed += item._count;
          break;
        case "COMPLETED":
          stats.completed = item._count;
          break;
        case "CANCELLED":
        case "DISPUTED":
          stats.cancelled += item._count;
          break;
      }
    });

    stats.avgBookingValue =
      stats.total > 0 ? Math.round(stats.totalRevenue / stats.total) : 0;

    return {
      bookings,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      stats,
    };
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw new Error("Failed to fetch bookings");
  }
}

export async function getBackgroundChecks(status?: string) {
  try {
    await checkAdmin();
    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const checks = await prisma.backgroundCheck.findMany({
      where,
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return checks;
  } catch (error) {
    console.error("Error fetching background checks:", error);
    return [];
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
  } = {},
) {
  try {
    await checkAdmin();

    const skip = (page - 1) * limit;
    const where: any = {};

    // Status filter
    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    // Search filter (dispute ID, reason, parties, booking)
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: "insensitive" } },
        { reason: { contains: filters.search, mode: "insensitive" } },
        {
          creator: {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { email: { contains: filters.search, mode: "insensitive" } },
            ],
          },
        },
        {
          defendant: {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { email: { contains: filters.search, mode: "insensitive" } },
            ],
          },
        },
        {
          booking: {
            service: {
              title: { contains: filters.search, mode: "insensitive" },
            },
          },
        },
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
    if (filters.creatorRole && filters.creatorRole !== "ALL") {
      where.creator = {
        role: filters.creatorRole,
      };
    }

    const [disputes, total, statusCounts, resolvedDisputes] = await Promise.all(
      [
        prisma.dispute.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            booking: {
              select: {
                id: true,
                date: true,
                totalAmount: true,
                service: { select: { title: true } },
              },
            },
            creator: { select: { name: true, email: true, role: true } },
            defendant: { select: { name: true, email: true, role: true } },
          },
        }),
        prisma.dispute.count({ where }),
        // Get overall stats
        prisma.dispute.groupBy({
          by: ["status"],
          _count: true,
        }),
        // Get resolved disputes for avg resolution time calculation
        prisma.dispute.findMany({
          where: {
            status: { in: ["RESOLVED", "CLOSED"] },
          },
          select: {
            createdAt: true,
            updatedAt: true,
          },
        }),
      ],
    );

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
        case "OPEN":
          stats.open = item._count;
          break;
        case "RESOLVED":
          stats.resolved = item._count;
          break;
        case "CLOSED":
          stats.closed = item._count;
          break;
      }
    });

    // Calculate resolution rate
    const resolvedCount = stats.resolved + stats.closed;
    stats.resolutionRate =
      stats.total > 0 ? Math.round((resolvedCount / stats.total) * 100) : 0;

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
    console.error("Error fetching disputes:", error);
    throw new Error("Failed to fetch disputes");
  }
}

export async function resolveDispute(
  disputeId: string,
  resolution: string,
  status: "RESOLVED" | "CLOSED",
) {
  try {
    const admin = await checkAdmin();

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: {
          select: {
            id: true,
            status: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        defendant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!dispute) {
      return { success: false, error: "Dispute not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status,
          resolution,
          assignedAdminId: admin.id,
          resolutionType: status === "CLOSED" ? "REFUND_CLIENT" : "OTHER",
          internalNotes: resolution,
          resolvedAt:
            status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
        },
      });

      if (status === "RESOLVED") {
        await tx.booking.update({
          where: { id: dispute.booking.id },
          data: {
            status:
              dispute.booking.status === "COMPLETED"
                ? "COMPLETED"
                : "IN_PROGRESS",
          },
        });
      }

      if (status === "CLOSED") {
        await tx.booking.update({
          where: { id: dispute.booking.id },
          data: {
            status: "CANCELLED",
          },
        });

        await tx.payment.updateMany({
          where: {
            bookingId: dispute.booking.id,
            status: {
              in: ["PENDING", "COMPLETED"],
            },
          },
          data: {
            status: "REFUNDED",
            transactionId: `dispute_refund_${dispute.booking.id}`,
          },
        });
      }
    });

    await Promise.all([
      sendComprehensiveNotification({
        userId: dispute.creator.id,
        title: "Dispute updated",
        message: `Your dispute has been ${status.toLowerCase()}.`,
        type: "SYSTEM",
        emailSubject: `Dispute update: ${status}`,
        emailHtml: `<p>Hello ${dispute.creator.name || "there"},</p><p>Your dispute has been <strong>${status.toLowerCase()}</strong>.</p><p><strong>Resolution:</strong> ${resolution}</p>`,
      }),
      sendComprehensiveNotification({
        userId: dispute.defendant.id,
        title: "Dispute updated",
        message: `A dispute involving your booking has been ${status.toLowerCase()}.`,
        type: "SYSTEM",
        emailSubject: `Dispute update: ${status}`,
        emailHtml: `<p>Hello ${dispute.defendant.name || "there"},</p><p>A dispute involving your booking has been <strong>${status.toLowerCase()}</strong>.</p><p><strong>Resolution:</strong> ${resolution}</p>`,
      }),
    ]);

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: `RESOLVED_DISPUTE_${status}`,
        targetId: disputeId,
        details: { resolution },
      },
    });

    revalidatePath("/admin/disputes");
    return { success: true };
  } catch (error) {
    console.error("Error resolving dispute:", error);
    return { success: false, error: "Failed to resolve dispute" };
  }
}

function roundCurrencyAmount(value: number) {
  return Math.round(value * 100) / 100;
}

export async function resolveDisputeWithSettlement(params: {
  disputeId: string;
  resolution: string;
  settlement: "REFUND_CLIENT" | "RELEASE_PROVIDER" | "SPLIT_ESCROW";
  clientSharePercent?: number;
}) {
  try {
    const admin = await checkAdmin();
    const resolution = params.resolution?.trim();

    if (!resolution) {
      return { success: false, error: "Resolution notes are required" };
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: params.disputeId },
      include: {
        booking: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            clientId: true,
            providerId: true,
            payment: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        defendant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!dispute) {
      return { success: false, error: "Dispute not found" };
    }

    if (dispute.status !== "OPEN") {
      return { success: false, error: "Only open disputes can be settled" };
    }

    const totalAmount = Number(dispute.booking.totalAmount || 0);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return { success: false, error: "Invalid booking amount for settlement" };
    }

    let clientSharePercent = 0;
    if (params.settlement === "REFUND_CLIENT") {
      clientSharePercent = 100;
    } else if (params.settlement === "RELEASE_PROVIDER") {
      clientSharePercent = 0;
    } else {
      clientSharePercent = Number(params.clientSharePercent ?? 50);
      if (
        !Number.isFinite(clientSharePercent) ||
        clientSharePercent < 0 ||
        clientSharePercent > 100
      ) {
        return {
          success: false,
          error: "Client share must be between 0 and 100 percent",
        };
      }
    }

    const clientAmount = roundCurrencyAmount(
      (totalAmount * clientSharePercent) / 100,
    );
    const providerAmount = roundCurrencyAmount(
      Math.max(totalAmount - clientAmount, 0),
    );

    if (clientAmount <= 0 && providerAmount <= 0) {
      return {
        success: false,
        error: "Settlement could not be calculated from booking amount",
      };
    }

    const settlementLabel =
      params.settlement === "REFUND_CLIENT"
        ? "Full refund to client"
        : params.settlement === "RELEASE_PROVIDER"
          ? "Full release to provider"
          : `Split escrow (${clientSharePercent}% client / ${100 - clientSharePercent}% provider)`;

    const bookingStatusAfterSettlement =
      dispute.booking.status === "CANCELLED"
        ? "CANCELLED"
        : clientAmount === totalAmount
          ? "CANCELLED"
          : "COMPLETED";
    const isCancelledAfterSettlement =
      bookingStatusAfterSettlement === "CANCELLED";

    await prisma.$transaction(async (tx) => {
      if (clientAmount > 0) {
        const clientWallet = await tx.wallet.upsert({
          where: { userId: dispute.booking.clientId },
          update: {
            balance: {
              increment: clientAmount,
            },
          },
          create: {
            userId: dispute.booking.clientId,
            balance: clientAmount,
          },
        });

        await tx.transaction.create({
          data: {
            walletId: clientWallet.id,
            amount: clientAmount,
            type: "REFUND",
            description: `Dispute settlement refund for booking ${dispute.booking.id}`,
          },
        });
      }

      if (providerAmount > 0) {
        const providerWallet = await tx.wallet.upsert({
          where: { userId: dispute.booking.providerId },
          update: {
            balance: {
              increment: providerAmount,
            },
          },
          create: {
            userId: dispute.booking.providerId,
            balance: providerAmount,
          },
        });

        await tx.transaction.create({
          data: {
            walletId: providerWallet.id,
            amount: providerAmount,
            type: "EARNING",
            description: `Dispute settlement release for booking ${dispute.booking.id}`,
          },
        });
      }

      if (dispute.booking.payment?.id) {
        await tx.payment.update({
          where: { id: dispute.booking.payment.id },
          data: {
            status: clientAmount === totalAmount ? "REFUNDED" : "COMPLETED",
          },
        });
      }

      await tx.booking.update({
        where: { id: dispute.booking.id },
        data: {
          status: bookingStatusAfterSettlement,
          refundAmount: clientAmount > 0 ? clientAmount : null,
          cancelledAt: isCancelledAfterSettlement ? new Date() : null,
          cancelledBy: isCancelledAfterSettlement ? admin.id : null,
          cancellationReason: isCancelledAfterSettlement
            ? `[Dispute Settlement] ${resolution}`
            : null,
        },
      });

      await tx.dispute.update({
        where: { id: params.disputeId },
        data: {
          status: "RESOLVED",
          assignedAdminId: admin.id,
          resolutionType: params.settlement,
          internalNotes: resolution,
          resolvedAt: new Date(),
          refundPreview: {
            bookingTotalAmount: totalAmount,
            settlement: params.settlement,
            clientAmount,
            providerAmount,
            clientSharePercent,
          },
          resolution: `${resolution}\n\nSettlement: ${settlementLabel}. Client: KES ${clientAmount.toLocaleString()}, Provider: KES ${providerAmount.toLocaleString()}.`,
        },
      });

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "RESOLVED_DISPUTE_SETTLEMENT",
          targetId: params.disputeId,
          details: {
            settlement: params.settlement,
            clientSharePercent,
            clientAmount,
            providerAmount,
          },
        },
      });
    });

    await Promise.all([
      sendComprehensiveNotification({
        userId: dispute.creator.id,
        title: "Dispute resolved with settlement",
        message: `Your dispute has been resolved. Client settlement: KES ${clientAmount.toLocaleString()}, provider settlement: KES ${providerAmount.toLocaleString()}.`,
        type: "SYSTEM",
        emailSubject: "Dispute settlement completed - JustInTime",
        emailHtml: `<p>Hello ${dispute.creator.name || "there"},</p><p>Your dispute has been resolved with this settlement:</p><ul><li>Client allocation: <strong>KES ${clientAmount.toLocaleString()}</strong></li><li>Provider allocation: <strong>KES ${providerAmount.toLocaleString()}</strong></li></ul><p><strong>Resolution notes:</strong> ${resolution}</p>`,
      }),
      sendComprehensiveNotification({
        userId: dispute.defendant.id,
        title: "Dispute resolved with settlement",
        message: `A dispute involving your booking has been resolved. Client settlement: KES ${clientAmount.toLocaleString()}, provider settlement: KES ${providerAmount.toLocaleString()}.`,
        type: "SYSTEM",
        emailSubject: "Dispute settlement completed - JustInTime",
        emailHtml: `<p>Hello ${dispute.defendant.name || "there"},</p><p>A dispute involving your booking has been resolved with this settlement:</p><ul><li>Client allocation: <strong>KES ${clientAmount.toLocaleString()}</strong></li><li>Provider allocation: <strong>KES ${providerAmount.toLocaleString()}</strong></li></ul><p><strong>Resolution notes:</strong> ${resolution}</p>`,
      }),
    ]);

    revalidatePath("/admin/disputes");
    revalidatePath("/admin/bookings");
    revalidatePath("/client/bookings");
    revalidatePath("/dashboard/bookings");

    return {
      success: true,
      settlement: {
        clientAmount,
        providerAmount,
        clientSharePercent,
      },
    };
  } catch (error) {
    console.error("Error resolving dispute with settlement:", error);
    return {
      success: false,
      error: "Failed to resolve dispute settlement",
    };
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
  } = {},
) {
  try {
    await checkAdmin();

    const skip = (page - 1) * limit;
    const where: any = {};

    // Status filter
    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    // Priority filter
    if (filters.priority && filters.priority !== "ALL") {
      where.priority = filters.priority;
    }

    // Category filter
    if (filters.category && filters.category !== "ALL") {
      where.category = filters.category;
    }

    // Search filter (ID, subject, description, user)
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: "insensitive" } },
        { subject: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        {
          user: {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { email: { contains: filters.search, mode: "insensitive" } },
            ],
          },
        },
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

    const [tickets, total, statusCounts, priorityCounts, resolvedTickets] =
      await Promise.all([
        prisma.supportTicket.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { name: true, email: true, role: true } },
          },
        }),
        prisma.supportTicket.count({ where }),
        // Get status stats
        prisma.supportTicket.groupBy({
          by: ["status"],
          _count: true,
        }),
        // Get priority stats
        prisma.supportTicket.groupBy({
          by: ["priority"],
          _count: true,
        }),
        // Get resolved tickets for avg response time
        prisma.supportTicket.findMany({
          where: {
            status: { in: ["RESOLVED", "CLOSED"] },
          },
          select: {
            createdAt: true,
            updatedAt: true,
          },
        }),
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
        case "OPEN":
          stats.open = item._count;
          break;
        case "IN_PROGRESS":
          stats.inProgress = item._count;
          break;
        case "RESOLVED":
        case "CLOSED":
          stats.resolved += item._count;
          break;
      }
    });

    priorityCounts.forEach((item: any) => {
      if (item.priority === "URGENT") {
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
    console.error("Error fetching support tickets:", error);
    throw new Error("Failed to fetch support tickets");
  }
}

export async function updateSupportTicket(
  ticketId: string,
  data: {
    status?: string;
    priority?: string;
    adminNotes?: string;
    resolution?: string;
  },
) {
  try {
    const admin = await checkAdmin();

    const updateData: any = { ...data };

    if (data.status === "RESOLVED" || data.status === "CLOSED") {
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
      },
    });

    revalidatePath("/admin/support");
    return { success: true };
  } catch (error) {
    console.error("Error updating support ticket:", error);
    return { success: false, error: "Failed to update support ticket" };
  }
}

export async function getFinanceSummary() {
  try {
    await checkAdmin();

    // Get total revenue from completed bookings
    const completedBookings = await prisma.booking.findMany({
      where: { status: "COMPLETED" },
      select: { totalAmount: true },
    });
    const totalRevenue = completedBookings.reduce(
      (sum, b) => sum + Number(b.totalAmount),
      0,
    );

    // Get successful payments
    const payments = await prisma.payment.findMany({
      where: { status: "COMPLETED" },
      select: { amount: true },
    });
    const totalPayments = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    // Get pending payments
    const pendingPayments = await prisma.payment.count({
      where: { status: "PENDING" },
    });

    // Get total transactions
    const totalTransactions = await prisma.transaction.count();

    // Get all wallets total balance
    const wallets = await prisma.wallet.findMany({
      select: { balance: true },
    });
    const totalWalletBalance = wallets.reduce(
      (sum, w) => sum + Number(w.balance),
      0,
    );

    // Calculate platform fees (assuming 10% fee - could be retrieved from SystemSettings)
    const platformFee = totalRevenue * 0.1;

    // Get recent transactions for trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        amount: true,
        type: true,
        createdAt: true,
      },
    });

    return {
      totalRevenue,
      totalPayments,
      pendingPayments,
      totalTransactions,
      totalWalletBalance,
      platformFee,
      recentTransactions: recentTransactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
    };
  } catch (error) {
    console.error("Error fetching finance summary:", error);
    throw new Error("Failed to fetch finance summary");
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
  } = {},
) {
  try {
    await checkAdmin();

    const skip = (page - 1) * limit;
    const where: any = {};

    // Type filter
    if (filters.type && filters.type !== "ALL") {
      where.type = filters.type;
    }

    // Search filter (Transaction ID, User Name, User Email)
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: "insensitive" } },
        {
          wallet: {
            user: {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                { email: { contains: filters.search, mode: "insensitive" } },
              ],
            },
          },
        },
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
        orderBy: { createdAt: "desc" },
        include: {
          wallet: {
            include: {
              user: { select: { name: true, email: true, role: true } },
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw new Error("Failed to fetch transactions");
  }
}

export async function getWallets(page = 1, limit = 10, search = "") {
  try {
    await checkAdmin();

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [wallets, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { balance: "desc" },
        include: {
          user: { select: { name: true, email: true, role: true } },
        },
      }),
      prisma.wallet.count({ where }),
    ]);

    return {
      wallets,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error("Error fetching wallets:", error);
    throw new Error("Failed to fetch wallets");
  }
}

export async function getPaymentLifecycleReconciliation(limit = 100) {
  try {
    await checkAdmin();

    const safeLimit = Math.min(Math.max(limit, 10), 250);
    const staleThresholdHours = 48;
    const staleBefore = new Date(
      Date.now() - staleThresholdHours * 60 * 60 * 1000,
    );

    const bookings = await prisma.booking.findMany({
      where: {
        payment: {
          isNot: null,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: safeLimit * 3,
      include: {
        payment: true,
        job: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        client: {
          select: {
            name: true,
            email: true,
          },
        },
        provider: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const mismatches = bookings
      .map((booking) => {
        const payment = booking.payment;
        if (!payment) {
          return null;
        }

        let issue: string | null = null;
        let severity: "high" | "medium" = "medium";

        if (booking.status === "COMPLETED" && payment.status !== "COMPLETED") {
          issue = "Booking is completed but payment is not marked completed.";
          severity = "high";
        } else if (
          booking.status === "CANCELLED" &&
          payment.status !== "REFUNDED"
        ) {
          issue = "Booking is cancelled but payment is not refunded.";
          severity = "high";
        } else if (
          payment.status === "REFUNDED" &&
          booking.status !== "CANCELLED"
        ) {
          issue = "Payment is refunded while booking is not cancelled.";
          severity = "high";
        } else if (
          booking.status === "DISPUTED" &&
          payment.status === "COMPLETED"
        ) {
          issue = "Disputed booking already has completed payment settlement.";
        }

        if (!issue) {
          return null;
        }

        return {
          bookingId: booking.id,
          jobId: booking.jobId,
          jobTitle: booking.job?.title || null,
          bookingStatus: booking.status,
          paymentId: payment.id,
          paymentStatus: payment.status,
          amount: Number(payment.amount),
          updatedAt: booking.updatedAt,
          issue,
          severity,
          clientName: booking.client?.name || booking.client?.email || null,
          providerName:
            booking.provider?.name || booking.provider?.email || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, safeLimit);

    const stalePendingPayments = await prisma.payment.findMany({
      where: {
        status: "PENDING",
        createdAt: {
          lte: staleBefore,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: safeLimit,
      include: {
        booking: {
          select: {
            id: true,
            status: true,
            date: true,
            jobId: true,
            job: {
              select: {
                title: true,
              },
            },
            client: {
              select: {
                name: true,
                email: true,
              },
            },
            provider: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const unresolvedFinancialEvents = stalePendingPayments.map((payment) => {
      const hoursOpen = Math.floor(
        (Date.now() - new Date(payment.createdAt).getTime()) / (60 * 60 * 1000),
      );

      return {
        entityType: "PAYMENT",
        paymentId: payment.id,
        bookingId: payment.bookingId,
        jobId: payment.booking?.jobId || null,
        jobTitle: payment.booking?.job?.title || null,
        bookingStatus: payment.booking?.status || null,
        paymentStatus: payment.status,
        amount: Number(payment.amount),
        method: payment.method,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt,
        hoursOpen,
        issue: `Pending payment has been open for ${hoursOpen}h without settlement.`,
        clientName:
          payment.booking?.client?.name ||
          payment.booking?.client?.email ||
          null,
        providerName:
          payment.booking?.provider?.name ||
          payment.booking?.provider?.email ||
          null,
      };
    });

    const stalePendingLedgerTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          lte: staleBefore,
        },
        OR: [
          {
            providerRef: {
              startsWith: "INTASEND:WALLET:PENDING:",
            },
          },
          {
            providerRef: {
              startsWith: "INTASEND:ONBOARDING:PENDING:",
            },
          },
          {
            providerRef: {
              startsWith: "INTASEND:SUBSCRIPTION:PENDING:",
            },
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
      take: safeLimit,
      include: {
        wallet: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const unresolvedLedgerEvents = stalePendingLedgerTransactions.map((tx) => {
      const hoursOpen = Math.floor(
        (Date.now() - new Date(tx.createdAt).getTime()) / (60 * 60 * 1000),
      );

      const description = tx.description || "Pending financial ledger event";
      const providerRef = tx.providerRef || "";
      const eventKind = providerRef.startsWith("INTASEND:WALLET:PENDING:")
        ? "wallet_topup"
        : providerRef.startsWith("INTASEND:ONBOARDING:PENDING:")
          ? "onboarding_fee"
          : "subscription";

      return {
        entityType: "TRANSACTION",
        paymentId: tx.id,
        bookingId: null,
        jobId: null,
        jobTitle: null,
        bookingStatus: null,
        paymentStatus: "PENDING",
        amount: Number(tx.amount),
        method: "LEDGER",
        transactionId: tx.id,
        createdAt: tx.createdAt,
        hoursOpen,
        issue: `Pending ${eventKind.replace("_", " ")} event has been open for ${hoursOpen}h without settlement confirmation.`,
        clientName: tx.wallet.user.name || tx.wallet.user.email || null,
        providerName: null,
        description,
      };
    });

    const walletDebitWindowDays = 30;
    const walletDebitSince = new Date(
      Date.now() - walletDebitWindowDays * 24 * 60 * 60 * 1000,
    );

    const walletDebitTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: walletDebitSince,
        },
        type: {
          in: ["CREDIT_PURCHASE", "PROMOTION_PAYMENT"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: safeLimit * 2,
      include: {
        wallet: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const walletDebitActivities = walletDebitTransactions.map((tx) => {
      const normalizedDescription = tx.description || "";
      const promoApplied = /\bwith promo\b/i.test(normalizedDescription);

      return {
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        createdAt: tx.createdAt,
        description: tx.description,
        promoApplied,
        userName: tx.wallet.user.name || tx.wallet.user.email || "Unknown user",
        userEmail: tx.wallet.user.email,
      };
    });

    const totalWalletDebitAmount = walletDebitActivities.reduce(
      (sum, row) => sum + row.amount,
      0,
    );
    const promoAppliedActivities = walletDebitActivities.filter(
      (row) => row.promoApplied,
    );
    const promoAppliedAmount = promoAppliedActivities.reduce(
      (sum, row) => sum + row.amount,
      0,
    );

    const promoImpactSummary = {
      evaluationWindowDays: walletDebitWindowDays,
      totalWalletDebitEvents: walletDebitActivities.length,
      totalWalletDebitAmount,
      promoAppliedEvents: promoAppliedActivities.length,
      promoAppliedAmount,
      creditPurchaseEvents: walletDebitActivities.filter(
        (row) => row.type === "CREDIT_PURCHASE",
      ).length,
      promotionPaymentEvents: walletDebitActivities.filter(
        (row) => row.type === "PROMOTION_PAYMENT",
      ).length,
    };

    const allUnresolvedFinancialEvents = [
      ...unresolvedFinancialEvents,
      ...unresolvedLedgerEvents,
    ]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .slice(0, safeLimit * 2);

    return {
      generatedAt: new Date().toISOString(),
      staleThresholdHours,
      mismatchCount: mismatches.length,
      unresolvedCount: allUnresolvedFinancialEvents.length,
      mismatches,
      unresolvedFinancialEvents: allUnresolvedFinancialEvents,
      walletDebitActivities,
      promoImpactSummary,
    };
  } catch (error) {
    console.error("Error fetching payment lifecycle reconciliation:", error);
    throw new Error("Failed to fetch reconciliation data");
  }
}

export async function resolveReconciliationEventAction(formData: FormData) {
  try {
    const admin = await checkAdmin();

    const paymentId = String(formData.get("paymentId") || "").trim();
    const bookingId = String(formData.get("bookingId") || "").trim();
    const requestedAction = String(formData.get("resolutionAction") || "")
      .trim()
      .toUpperCase();
    const reason = String(
      formData.get("reason") || "Manual reconciliation",
    ).trim();

    if (!paymentId) {
      return { success: false, error: "Missing payment id" };
    }

    if (!["FORCE_SETTLE", "REFUND", "VOID"].includes(requestedAction)) {
      return { success: false, error: "Unsupported reconciliation action" };
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: true,
      },
    });

    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    await prisma.$transaction(async (tx) => {
      if (requestedAction === "FORCE_SETTLE") {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "COMPLETED",
            transactionId:
              payment.transactionId || `manual-settle-${Date.now()}`,
          },
        });

        if (payment.bookingId && payment.booking?.status === "PENDING") {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: "CONFIRMED",
            },
          });
        }
      }

      if (requestedAction === "REFUND") {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "REFUNDED",
          },
        });

        if (payment.bookingId) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: "CANCELLED",
              refundAmount: payment.amount,
              cancellationReason: `[Admin Reconciliation Refund] ${reason}`,
              cancelledAt: new Date(),
              cancelledBy: admin.id,
            },
          });
        }
      }

      if (requestedAction === "VOID") {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "FAILED",
          },
        });
      }

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: `RECONCILIATION_${requestedAction}`,
          targetId: paymentId,
          details: {
            bookingId: bookingId || payment.bookingId,
            reason,
            previousStatus: payment.status,
            newStatus:
              requestedAction === "FORCE_SETTLE"
                ? "COMPLETED"
                : requestedAction === "REFUND"
                  ? "REFUNDED"
                  : "FAILED",
          },
        },
      });
    });

    revalidatePath("/admin/reconciliation");
    return { success: true };
  } catch (error) {
    console.error("Error resolving reconciliation event:", error);
    return { success: false, error: "Failed to resolve reconciliation event" };
  }
}

// Category Management
export async function getCategories() {
  try {
    await checkAdmin();

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { services: true, jobs: true },
        },
      },
    });

    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw new Error("Failed to fetch categories");
  }
}

export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
}) {
  try {
    const admin = await checkAdmin();

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        image: data.image,
        parentId: data.parentId || null,
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "CREATED_CATEGORY",
        targetId: category.id,
        details: { name: data.name },
      },
    });

    revalidatePath("/admin/settings");
    return { success: true, category };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false, error: "Failed to create category" };
  }
}

export async function updateCategory(
  categoryId: string,
  data: { name?: string; slug?: string; description?: string; image?: string },
) {
  try {
    const admin = await checkAdmin();

    const category = await prisma.category.update({
      where: { id: categoryId },
      data,
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATED_CATEGORY",
        targetId: categoryId,
        details: data,
      },
    });

    revalidatePath("/admin/settings");
    return { success: true, category };
  } catch (error) {
    console.error("Error updating category:", error);
    return { success: false, error: "Failed to update category" };
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    const admin = await checkAdmin();

    await prisma.category.delete({
      where: { id: categoryId },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "DELETED_CATEGORY",
        targetId: categoryId,
        details: {},
      },
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: "Failed to delete category" };
  }
}

// System Settings Management
export async function getSystemSettings() {
  try {
    await checkAdmin();

    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });

    return settings;
  } catch (error) {
    console.error("Error fetching system settings:", error);
    throw new Error("Failed to fetch system settings");
  }
}

export async function updateSystemSetting(
  key: string,
  value: any,
  description?: string,
) {
  try {
    const admin = await checkAdmin();

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATED_SYSTEM_SETTING",
        targetId: key,
        details: { value },
      },
    });

    revalidatePath("/admin/settings");
    return { success: true, setting };
  } catch (error) {
    console.error("Error updating system setting:", error);
    return { success: false, error: "Failed to update system setting" };
  }
}

// Moderation & Audit Logs
export async function getAdminLogs(
  page = 1,
  limit = 20,
  accessType: "ALL" | "PAID" | "WAIVED" = "ALL",
) {
  try {
    await checkAdmin();
    const skip = (page - 1) * limit;

    const where: any = {};
    if (accessType === "PAID") {
      where.action = "ONBOARDING_FEE_PAID_ACCESS_GRANTED";
    } else if (accessType === "WAIVED") {
      where.action = "WAIVED_ONBOARDING_FEE";
    }

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          admin: { select: { name: true, email: true, image: true } },
        },
      }),
      prisma.adminLog.count({ where }),
    ]);

    return {
      logs,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      accessType,
    };
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    throw new Error("Failed to fetch admin logs");
  }
}

export async function processManualRefund(
  bookingId: string,
  amount: number,
  reason: string,
) {
  try {
    const admin = await checkAdmin();

    // 1. Get booking and related payment
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        client: {
          include: { wallet: true },
        },
      },
    });

    if (!booking) return { success: false, error: "Booking not found" };

    // 2. Perform transaction in a multi-step update (Prisma transaction)
    await prisma.$transaction(async (tx) => {
      // Update Booking status
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          refundAmount: amount,
          cancellationReason: `[Admin Manual Refund] ${reason}`,
          cancelledAt: new Date(),
          cancelledBy: admin.id,
        },
      });

      // Update Payment status if exists
      if (booking.payment) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: "REFUNDED" },
        });
      }

      // Update Wallet
      if (booking.client.wallet) {
        await tx.wallet.update({
          where: { id: booking.client.wallet.id },
          data: {
            balance: { increment: amount },
          },
        });

        // Record Wallet Transaction
        await tx.transaction.create({
          data: {
            walletId: booking.client.wallet.id,
            amount: amount,
            type: "REFUND",
            description: `Manual refund for booking ${bookingId}: ${reason}`,
          },
        });
      }

      // Create Admin Log
      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "MANUAL_REFUND_PROCESSED",
          targetId: bookingId,
          details: { amount, reason, clientId: booking.clientId },
        },
      });
    });

    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/users/${booking.clientId}`);

    return { success: true };
  } catch (error) {
    console.error("Error processing manual refund:", error);
    return { success: false, error: "Failed to process manual refund" };
  }
}
