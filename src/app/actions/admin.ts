"use server";

import { prisma } from "@/lib/prisma";
import { getDefaultRolesForPrimaryRole, hasRole } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import crypto from "crypto";
import { Prisma } from "@/generated/prisma/client";
import {
  sendComprehensiveNotification,
  emailTemplates,
} from "@/lib/notifications/adminNotifications";
import {
  type AdminLogAccessType,
  type AdminLogFilters,
  type BookingFilters,
  type DisputeFilters,
  type SupportTicketFilters,
  type TransactionFilters,
  buildAdminLogsWhere,
  buildBackgroundCheckWhere,
  buildBookingsWhere,
  buildDisputesWhere,
  buildSupportTicketsWhere,
  buildTransactionsWhere,
  buildUsersWhere,
  buildWalletsWhere,
} from "./admin.helpers";
import { reviewIdentityVerificationRequest } from "./verification";
import {
  applySupportTicketLifecycleUpdate,
  SupportTicketLifecycleError,
} from "@/lib/support/ticket-lifecycle";

function normalizePage(page: number) {
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.floor(page);
}

function normalizeLimit(limit: number, fallback: number) {
  if (!Number.isFinite(limit) || limit < 1) {
    return fallback;
  }

  return Math.min(Math.floor(limit), 200);
}

function hasAdminRoleShape(user: {
  role?: string | null;
  roles?: Array<string> | null;
}) {
  return user.role === "ADMIN" || Boolean(user.roles?.includes("ADMIN"));
}

async function countActiveAdmins() {
  return prisma.user.count({
    where: {
      isBanned: false,
      deletionScheduledAt: null,
      OR: [{ role: "ADMIN" }, { roles: { has: "ADMIN" } }],
    },
  });
}

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

    const safePage = normalizePage(page);
    const safeLimit = normalizeLimit(limit, 10);
    const skip = (safePage - 1) * safeLimit;

    const where = buildUsersWhere(search, role, verificationStatus);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: safeLimit,
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
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      currentPage: safePage,
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
}

export async function getUserStats() {
  try {
    await checkAdmin();

    const providerWhere: Prisma.UserWhereInput = {
      OR: [{ role: "PROVIDER" }, { roles: { has: "PROVIDER" } }],
    };
    const clientWhere: Prisma.UserWhereInput = {
      OR: [{ role: "CLIENT" }, { roles: { has: "CLIENT" } }],
    };

    const [
      totalUsers,
      totalClients,
      totalProviders,
      bannedUsers,
      pendingVerifications,
      verifiedProviders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: clientWhere }),
      prisma.user.count({ where: providerWhere }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.profile.count({
        where: {
          verificationStatus: "PENDING",
          user: providerWhere,
        },
      }),
      prisma.profile.count({
        where: {
          verificationStatus: "VERIFIED",
          user: providerWhere,
        },
      }),
    ]);

    return {
      totalUsers,
      totalClients,
      totalProviders,
      bannedUsers,
      pendingVerifications,
      verifiedProviders,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    throw new Error("Failed to fetch user stats");
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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        roles: true,
        isBanned: true,
        deletionScheduledAt: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (newRole === "ADMIN" && !hasAdminRoleShape(user)) {
      return {
        success: false,
        error:
          "Direct admin promotion is disabled. Use the Admin Invite workflow instead.",
      };
    }

    const targetIsAdmin = hasAdminRoleShape(user);
    const targetWillRemainAdmin = newRole === "ADMIN";

    if (admin.id === userId && !targetWillRemainAdmin) {
      return {
        success: false,
        error: "You cannot remove your own admin access.",
      };
    }

    if (targetIsAdmin && !targetWillRemainAdmin) {
      const activeAdminCount = await countActiveAdmins();
      if (activeAdminCount <= 1) {
        return {
          success: false,
          error: "Cannot remove the last active admin account.",
        };
      }
    }

    const oldRole = user.role;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          role: newRole,
          roles: getDefaultRolesForPrimaryRole(newRole),
        },
      });

      if (newRole === "PROVIDER") {
        await tx.profile.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            skills: [],
            portfolio: [],
            verificationStatus: "PENDING",
          },
        });
      }

      if (newRole === "CLIENT") {
        await tx.profile.updateMany({
          where: { userId },
          data: {
            premiumPricingEnabled: false,
            premiumMultiplier: 1,
          },
        });
      }

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "UPDATED_USER_ROLE",
          targetId: userId,
          details: {
            newRole,
            oldRole,
            previousRoles: user.roles,
            wasBanned: user.isBanned,
            deletionScheduledAt: user.deletionScheduledAt,
            roleArtifactsReconciled: true,
          },
        },
      });
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
      select: {
        name: true,
        email: true,
        role: true,
        roles: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Get current subscription to log change
    const currentSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    const oldPlan = currentSubscription?.plan || "NONE";
    const isProviderLike =
      user.role === "PROVIDER" || Boolean(user.roles?.includes("PROVIDER"));

    const premiumPricingEnabled = newPlan !== "FREE";
    const premiumMultiplier =
      newPlan === "BUSINESS" ? 1.1 : newPlan === "PRO" ? 1.05 : 1.0;

    // Upsert subscription
    await prisma.$transaction(async (tx) => {
      await tx.subscription.upsert({
        where: { userId },
        update: {
          plan: newPlan,
          isActive: true,
          endDate: null, // Clear end date if any
        },
        create: {
          userId,
          plan: newPlan,
          isActive: true,
          startDate: new Date(),
        },
      });

      if (isProviderLike) {
        await tx.profile.upsert({
          where: { userId },
          update: {
            premiumPricingEnabled,
            premiumMultiplier,
          },
          create: {
            userId,
            skills: [],
            portfolio: [],
            verificationStatus: "PENDING",
            premiumPricingEnabled,
            premiumMultiplier,
          },
        });
      }

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "UPDATED_USER_PLAN",
          targetId: userId,
          details: {
            newPlan,
            oldPlan,
            premiumPricingEnabled,
            premiumMultiplier,
            entitlementsReconciled: isProviderLike,
          },
        },
      });
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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        roles: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (admin.id === userId) {
      return {
        success: false,
        error: "You cannot schedule deletion for your own account.",
      };
    }

    if (hasAdminRoleShape(user)) {
      const activeAdminCount = await countActiveAdmins();
      if (activeAdminCount <= 1) {
        return {
          success: false,
          error: "Cannot schedule deletion for the last active admin.",
        };
      }

      return {
        success: false,
        error:
          "Scheduling deletion for admin accounts is disabled in this workflow.",
      };
    }

    const [
      activeBookings,
      openDisputes,
      unresolvedSupportTickets,
      pendingPayments,
    ] = await Promise.all([
      prisma.booking.count({
        where: {
          OR: [{ clientId: userId }, { providerId: userId }],
          status: {
            in: [
              "PENDING",
              "CONFIRMED",
              "IN_PROGRESS",
              "AWAITING_CLIENT_CONFIRMATION",
              "DISPUTED",
            ],
          },
        },
      }),
      prisma.dispute.count({
        where: {
          OR: [{ creatorId: userId }, { defendantId: userId }],
          status: "OPEN",
        },
      }),
      prisma.supportTicket.count({
        where: {
          userId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      }),
      prisma.payment.count({
        where: {
          status: "PENDING",
          booking: {
            OR: [{ clientId: userId }, { providerId: userId }],
          },
        },
      }),
    ]);

    if (
      activeBookings > 0 ||
      openDisputes > 0 ||
      unresolvedSupportTickets > 0 ||
      pendingPayments > 0
    ) {
      return {
        success: false,
        error: `Cannot schedule deletion while obligations remain (bookings: ${activeBookings}, disputes: ${openDisputes}, support tickets: ${unresolvedSupportTickets}, pending payments: ${pendingPayments}).`,
      };
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
      select: {
        email: true,
        name: true,
        isBanned: true,
        deletionScheduledAt: true,
        role: true,
        roles: true,
      },
    });

    if (!user?.email) {
      return { success: false, error: "User has no email address" };
    }

    if (user.isBanned) {
      return {
        success: false,
        error: "Password reset is blocked for banned accounts.",
      };
    }

    if (user.deletionScheduledAt) {
      return {
        success: false,
        error: "Password reset is blocked for accounts scheduled for deletion.",
      };
    }

    if (hasAdminRoleShape(user) && admin.id !== userId) {
      return {
        success: false,
        error:
          "Password reset for admin accounts is disabled in this workflow.",
      };
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

    if (status === "PENDING") {
      return {
        success: false,
        error:
          "Direct status reset is disabled. Reopen the verification request from the Trust Center.",
      };
    }

    const request = await prisma.identityVerificationRequest.findFirst({
      where: {
        userId,
        status: {
          in: ["SUBMITTED", "UNDER_REVIEW"],
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!request) {
      return {
        success: false,
        error:
          "No pending identity verification request found for this provider.",
      };
    }

    const review = await reviewIdentityVerificationRequest({
      requestId: request.id,
      decision: status,
      reviewNotes: `Reviewed by admin ${admin.email || admin.id} from admin users workflow`,
    });

    if (!review.success) {
      return {
        success: false,
        error: review.error || "Failed to review identity verification request",
      };
    }

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: `IDENTITY_REVIEW_DELEGATED_${status}`,
        targetId: userId,
        details: {
          requestId: request.id,
          previousRequestStatus: request.status,
          nextStatus: status,
        },
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/verifications");
    revalidatePath("/admin/trust");
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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        roles: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (isBanned && admin.id === userId) {
      return {
        success: false,
        error: "You cannot ban your own account.",
      };
    }

    const targetIsAdmin = hasAdminRoleShape(user);
    if (isBanned && targetIsAdmin) {
      const activeAdminCount = await countActiveAdmins();
      if (activeAdminCount <= 1) {
        return {
          success: false,
          error: "Cannot ban the last active admin account.",
        };
      }

      return {
        success: false,
        error:
          "Banning admin accounts is disabled in this workflow. Use privileged security controls.",
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned,
        ...(isBanned ? { authInvalidatedAt: new Date() } : {}),
      },
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
    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
  } catch (error) {
    console.error("Error banning user:", error);
    return { success: false, error: "Failed to ban user" };
  }
}

export async function getBookings(
  page = 1,
  limit = 10,
  filters: BookingFilters = {},
) {
  try {
    await checkAdmin();

    const safePage = normalizePage(page);
    const safeLimit = normalizeLimit(limit, 10);
    const skip = (safePage - 1) * safeLimit;
    const where = buildBookingsWhere(filters);

    const [bookings, total, statusCounts] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: safeLimit,
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

    statusCounts.forEach((item) => {
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
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      currentPage: safePage,
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
    const where = buildBackgroundCheckWhere(status);

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

export async function getIdentityVerificationRequestsForAdmin(
  page = 1,
  limit = 12,
  search = "",
  status: "PENDING" | "VERIFIED" | "REJECTED" | "ALL" = "PENDING",
) {
  try {
    await checkAdmin();

    const safePage = normalizePage(page);
    const safeLimit = normalizeLimit(limit, 12);
    const skip = (safePage - 1) * safeLimit;
    const normalizedSearch = search.trim();

    let statusFilter: Prisma.IdentityVerificationRequestWhereInput["status"];
    if (status === "VERIFIED") {
      statusFilter = "VERIFIED";
    } else if (status === "REJECTED") {
      statusFilter = "REJECTED";
    } else if (status === "PENDING") {
      statusFilter = { in: ["SUBMITTED", "UNDER_REVIEW"] };
    } else {
      statusFilter = undefined;
    }

    const where: Prisma.IdentityVerificationRequestWhereInput = {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(normalizedSearch
        ? {
            OR: [
              {
                id: {
                  contains: normalizedSearch,
                  mode: "insensitive",
                },
              },
              {
                user: {
                  is: {
                    name: {
                      contains: normalizedSearch,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                user: {
                  is: {
                    email: {
                      contains: normalizedSearch,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [requests, total] = await Promise.all([
      prisma.identityVerificationRequest.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { submittedAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              profile: {
                select: {
                  bio: true,
                  location: true,
                  verificationStatus: true,
                },
              },
            },
          },
        },
      }),
      prisma.identityVerificationRequest.count({ where }),
    ]);

    return {
      requests,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      currentPage: safePage,
    };
  } catch (error) {
    console.error("Error fetching identity verification requests:", error);
    throw new Error("Failed to fetch identity verification requests");
  }
}

export async function getDisputes(
  page = 1,
  limit = 10,
  filters: DisputeFilters = {},
) {
  try {
    await checkAdmin();

    const safePage = normalizePage(page);
    const safeLimit = normalizeLimit(limit, 10);
    const skip = (safePage - 1) * safeLimit;
    const where = buildDisputesWhere(filters);

    const [disputes, total, statusCounts, resolvedDisputes] = await Promise.all(
      [
        prisma.dispute.findMany({
          where,
          skip,
          take: safeLimit,
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

    statusCounts.forEach((item) => {
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
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      currentPage: safePage,
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
  return resolveDisputeWithSettlement({
    disputeId,
    resolution,
    settlement: status === "CLOSED" ? "REFUND_CLIENT" : "RELEASE_PROVIDER",
  });
}

function roundCurrencyAmount(value: number) {
  return Math.round(value * 100) / 100;
}

async function creditWalletWithIdempotency(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    amount: number;
    type: "REFUND" | "EARNING";
    description: string;
    sourceType: string;
    sourceId: string;
    adminId: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  const amount = roundCurrencyAmount(Number(params.amount || 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { credited: false, ledgerEntryId: null as string | null };
  }

  const idempotencyKey = `${params.sourceType}:${params.sourceId}:${params.userId}:${params.type}`;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${idempotencyKey}, 0))`;

  const wallet = await tx.wallet.upsert({
    where: { userId: params.userId },
    update: {},
    create: {
      userId: params.userId,
      balance: 0,
      pendingBalance: 0,
      currency: "KES",
    },
  });

  const existingLedgerEntry = await tx.transaction.findFirst({
    where: {
      walletId: wallet.id,
      type: params.type,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      status: "SETTLED",
    },
    select: { id: true },
  });

  if (existingLedgerEntry) {
    return { credited: false, ledgerEntryId: existingLedgerEntry.id };
  }

  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: {
        increment: amount,
      },
    },
  });

  const ledgerEntry = await tx.transaction.create({
    data: {
      walletId: wallet.id,
      amount,
      type: params.type,
      status: "SETTLED",
      direction: "CREDIT",
      category: params.type === "REFUND" ? "REFUND" : "EARNING",
      currency: wallet.currency || "KES",
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      description: params.description,
      metadata: params.metadata,
      settledAt: new Date(),
      createdByType: "ADMIN",
      createdById: params.adminId,
    },
    select: { id: true },
  });

  return { credited: true, ledgerEntryId: ledgerEntry.id };
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
      const clientCredit = await creditWalletWithIdempotency(tx, {
        userId: dispute.booking.clientId,
        amount: clientAmount,
        type: "REFUND",
        description: `Dispute settlement refund for booking ${dispute.booking.id}`,
        sourceType: "DISPUTE_SETTLEMENT",
        sourceId: `${params.disputeId}:CLIENT`,
        adminId: admin.id,
        metadata: {
          disputeId: params.disputeId,
          bookingId: dispute.booking.id,
          settlement: params.settlement,
          recipient: "CLIENT",
        },
      });

      const providerCredit = await creditWalletWithIdempotency(tx, {
        userId: dispute.booking.providerId,
        amount: providerAmount,
        type: "EARNING",
        description: `Dispute settlement release for booking ${dispute.booking.id}`,
        sourceType: "DISPUTE_SETTLEMENT",
        sourceId: `${params.disputeId}:PROVIDER`,
        adminId: admin.id,
        metadata: {
          disputeId: params.disputeId,
          bookingId: dispute.booking.id,
          settlement: params.settlement,
          recipient: "PROVIDER",
        },
      });

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
            clientLedgerEntryId: clientCredit.ledgerEntryId,
            providerLedgerEntryId: providerCredit.ledgerEntryId,
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
  filters: SupportTicketFilters = {},
) {
  try {
    await checkAdmin();

    const safePage = normalizePage(page);
    const safeLimit = normalizeLimit(limit, 10);
    const skip = (safePage - 1) * safeLimit;
    const where = buildSupportTicketsWhere(filters);
    const resolvedTicketsWhere: Prisma.SupportTicketWhereInput = {
      ...where,
      status: { in: ["RESOLVED", "CLOSED"] },
    };

    const [tickets, total, statusCounts, priorityCounts, resolvedTickets] =
      await Promise.all([
        prisma.supportTicket.findMany({
          where,
          skip,
          take: safeLimit,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { name: true, email: true, role: true } },
            messages: {
              orderBy: { createdAt: "asc" },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        }),
        prisma.supportTicket.count({ where }),
        // Get status stats
        prisma.supportTicket.groupBy({
          where,
          by: ["status"],
          _count: true,
        }),
        // Get priority stats
        prisma.supportTicket.groupBy({
          where,
          by: ["priority"],
          _count: true,
        }),
        // Get resolved tickets for avg response time
        prisma.supportTicket.findMany({
          where: resolvedTicketsWhere,
          select: {
            createdAt: true,
            resolvedAt: true,
            messages: {
              where: {
                authorRole: "ADMIN",
              },
              orderBy: {
                createdAt: "asc",
              },
              take: 1,
              select: {
                createdAt: true,
              },
            },
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

    statusCounts.forEach((item) => {
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

    priorityCounts.forEach((item) => {
      if (item.priority === "URGENT") {
        stats.urgent = item._count;
      }
    });

    // Calculate average first-response time in hours from explicit support events.
    if (resolvedTickets.length > 0) {
      const responseDurations = resolvedTickets
        .map((ticket) => {
          const firstAdminResponseAt = ticket.messages[0]?.createdAt;
          const responseAt = firstAdminResponseAt || ticket.resolvedAt;

          if (!responseAt) {
            return null;
          }

          const created = new Date(ticket.createdAt).getTime();
          const responded = new Date(responseAt).getTime();

          if (!Number.isFinite(created) || !Number.isFinite(responded)) {
            return null;
          }

          return Math.max(0, responded - created);
        })
        .filter((duration): duration is number => duration !== null);

      const totalResponseTime = responseDurations.reduce((sum, duration) => {
        return sum + duration;
      }, 0);

      if (responseDurations.length > 0) {
        const avgTimeMs = totalResponseTime / responseDurations.length;
        stats.avgResponseTime = Math.round(avgTimeMs / (1000 * 60 * 60));
      }
    }

    return {
      tickets,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      currentPage: safePage,
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
    status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    adminNotes?: string;
    resolution?: string;
    replyMessage?: string;
  },
) {
  try {
    const admin = await checkAdmin();

    const result = await applySupportTicketLifecycleUpdate({
      ticketId,
      actorId: admin.id,
      isAdmin: true,
      payload: {
        action: "ADMIN_UPDATE",
        status: data.status,
        priority: data.priority,
        adminNotes: data.adminNotes,
        resolution: data.resolution,
        replyMessage: data.replyMessage,
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATED_SUPPORT_TICKET",
        targetId: ticketId,
        details: {
          ...data,
          lifecycleAction: result.action,
        },
      },
    });

    revalidatePath("/admin/support");
    return { success: true };
  } catch (error) {
    console.error("Error updating support ticket:", error);
    if (error instanceof SupportTicketLifecycleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to update support ticket" };
  }
}

export async function getFinanceSummary() {
  try {
    await checkAdmin();

    const [paymentAggregate, platformFeeSetting] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: {
          amount: true,
        },
      }),
      prisma.systemSetting.findUnique({
        where: { key: "platform_fee_percentage" },
        select: { value: true },
      }),
    ]);

    const totalPayments = Number(paymentAggregate._sum.amount || 0);
    const totalRevenue = totalPayments;

    const rawPlatformFeePercentage =
      typeof platformFeeSetting?.value === "number"
        ? platformFeeSetting.value
        : Number(platformFeeSetting?.value);
    const platformFeePercentage = Number.isFinite(rawPlatformFeePercentage)
      ? rawPlatformFeePercentage
      : 10;

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

    // Calculate platform fee from persisted setting.
    const platformFee = (totalPayments * platformFeePercentage) / 100;

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

    const [
      totalInvoices,
      failedInvoices,
      pendingInvoiceSubmissions,
      completedWithoutInvoice,
      invoiceWithoutCompletedBooking,
      completedPaymentWithoutInvoice,
      failedEtimsWithCompletedPayment,
      totalProviders,
      providersWithVerifiedKra,
    ] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: "FAILED" } }),
      prisma.invoice.count({
        where: { status: { in: ["GENERATED", "SUBMITTED"] } },
      }),
      prisma.booking.count({
        where: {
          status: "COMPLETED",
          invoice: {
            is: null,
          },
        },
      }),
      prisma.invoice.count({
        where: {
          booking: {
            status: {
              not: "COMPLETED",
            },
          },
        },
      }),
      prisma.payment.count({
        where: {
          status: "COMPLETED",
          booking: {
            invoice: {
              is: null,
            },
          },
        },
      }),
      prisma.invoice.count({
        where: {
          status: "FAILED",
          booking: {
            payment: {
              is: {
                status: "COMPLETED",
              },
            },
          },
        },
      }),
      prisma.user.count({ where: { role: "PROVIDER" } }),
      prisma.taxSettings.count({ where: { kraPinVerified: true } }),
    ]);

    const taxCoverage = totalProviders
      ? (providersWithVerifiedKra / totalProviders) * 100
      : 0;

    return {
      totalRevenue,
      totalPayments,
      pendingPayments,
      totalTransactions,
      totalWalletBalance,
      platformFee,
      platformFeePercentage,
      totalInvoices,
      failedInvoices,
      pendingInvoiceSubmissions,
      taxCoverage,
      complianceCoverage: {
        totalProviders,
        providersWithVerifiedKra,
      },
      reconciliation: {
        completedWithoutInvoice,
        invoiceWithoutCompletedBooking,
        completedPaymentWithoutInvoice,
        failedEtimsWithCompletedPayment,
      },
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
  filters: TransactionFilters = {},
) {
  try {
    await checkAdmin();

    const safePage = normalizePage(page);
    const safeLimit = normalizeLimit(limit, 10);
    const skip = (safePage - 1) * safeLimit;
    const where = buildTransactionsWhere(filters);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: safeLimit,
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
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      currentPage: safePage,
    };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw new Error("Failed to fetch transactions");
  }
}

export async function getWallets(page = 1, limit = 10, search = "") {
  try {
    await checkAdmin();

    const safePage = normalizePage(page);
    const safeLimit = normalizeLimit(limit, 10);
    const skip = (safePage - 1) * safeLimit;
    const where = buildWalletsWhere(search);

    const [wallets, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        skip,
        take: safeLimit,
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
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      currentPage: safePage,
    };
  } catch (error) {
    console.error("Error fetching wallets:", error);
    throw new Error("Failed to fetch wallets");
  }
}

export async function getPaymentLifecycleReconciliation(
  limit = 100,
  staleThresholdMinutes = 48 * 60,
) {
  try {
    await checkAdmin();

    const safeLimit = Math.min(Math.max(limit, 10), 250);
    const parsedThreshold = Number(staleThresholdMinutes);
    const safeStaleThresholdMinutes = Number.isFinite(parsedThreshold)
      ? Math.min(Math.max(Math.floor(parsedThreshold), 5), 60 * 24 * 14)
      : 48 * 60;
    const staleThresholdHours = Number(
      (safeStaleThresholdMinutes / 60).toFixed(2),
    );
    const staleBefore = new Date(
      Date.now() - safeStaleThresholdMinutes * 60 * 1000,
    );

    const mismatchedBookings = await prisma.booking.findMany({
      where: {
        payment: {
          isNot: null,
        },
        OR: [
          {
            status: "COMPLETED",
            payment: {
              is: {
                status: {
                  not: "COMPLETED",
                },
              },
            },
          },
          {
            status: "CANCELLED",
            payment: {
              is: {
                status: {
                  not: "REFUNDED",
                },
              },
            },
          },
          {
            status: {
              not: "CANCELLED",
            },
            payment: {
              is: {
                status: "REFUNDED",
              },
            },
          },
          {
            status: "DISPUTED",
            payment: {
              is: {
                status: "COMPLETED",
              },
            },
          },
          {
            status: "CONFIRMED",
            payment: {
              is: {
                status: "FAILED",
              },
            },
          },
          {
            status: "PENDING",
            payment: {
              is: {
                status: "COMPLETED",
              },
            },
          },
        ],
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: safeLimit,
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

    const mismatches = mismatchedBookings
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
        } else if (
          booking.status === "CONFIRMED" &&
          payment.status === "FAILED"
        ) {
          issue = "Booking is confirmed while payment is marked failed.";
          severity = "high";
        } else if (
          booking.status === "PENDING" &&
          payment.status === "COMPLETED"
        ) {
          issue = "Payment is completed but booking remains pending.";
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
          updatedAt: payment.updatedAt,
          issue,
          severity,
          clientName: booking.client?.name || booking.client?.email || null,
          providerName:
            booking.provider?.name || booking.provider?.email || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

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

    const staleTopUps = await prisma.walletTopUp.findMany({
      where: {
        initiatedAt: {
          lte: staleBefore,
        },
        status: {
          in: ["PENDING", "PROCESSING"],
        },
      },
      orderBy: {
        initiatedAt: "asc",
      },
      take: safeLimit,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const unresolvedTopUpEvents = staleTopUps.map((topUp) => {
      const hoursOpen = Math.floor(
        (Date.now() - new Date(topUp.initiatedAt).getTime()) / (60 * 60 * 1000),
      );

      return {
        entityType: "TOPUP",
        paymentId: topUp.id,
        topUpId: topUp.id,
        bookingId: null,
        jobId: null,
        jobTitle: null,
        bookingStatus: null,
        paymentStatus: topUp.status,
        amount: Number(topUp.amountExpected),
        amountReceived: topUp.amountReceived
          ? Number(topUp.amountReceived)
          : null,
        method: topUp.gateway,
        transactionId: topUp.apiRef,
        createdAt: topUp.initiatedAt,
        hoursOpen,
        issue: `Wallet top-up has remained ${topUp.status.toLowerCase()} for ${hoursOpen}h without terminal settlement.`,
        clientName: topUp.user.name || topUp.user.email || null,
        providerName: null,
        description: `Top-up Ref: ${topUp.apiRef}`,
        apiRef: topUp.apiRef,
        gatewayReference: topUp.gatewayInvoiceId,
        gatewaySessionId: topUp.gatewaySessionId,
        failureReason: topUp.failureReason,
        rawWebhookPayload: topUp.rawWebhookPayload,
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
      ...unresolvedTopUpEvents,
    ]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .slice(0, safeLimit * 2);

    return {
      generatedAt: new Date().toISOString(),
      staleThresholdHours,
      staleThresholdMinutes: safeStaleThresholdMinutes,
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
    const topUpId = String(formData.get("topUpId") || paymentId || "").trim();
    const bookingId = String(formData.get("bookingId") || "").trim();
    const requestedAction = String(formData.get("resolutionAction") || "")
      .trim()
      .toUpperCase();
    const reason = String(
      formData.get("reason") || "Manual reconciliation",
    ).trim();

    if (
      !["FORCE_SETTLE", "REFUND", "VOID", "MARK_TOPUP_RESOLVED"].includes(
        requestedAction,
      )
    ) {
      return { success: false, error: "Unsupported reconciliation action" };
    }

    if (requestedAction === "MARK_TOPUP_RESOLVED") {
      if (!topUpId) {
        return { success: false, error: "Missing top-up id" };
      }

      const topUp = await prisma.walletTopUp.findUnique({
        where: { id: topUpId },
        include: {
          wallet: {
            select: {
              pendingBalance: true,
            },
          },
        },
      });

      if (!topUp) {
        return { success: false, error: "Top-up not found" };
      }

      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${topUp.apiRef}, 0))`;

        if (["PENDING", "PROCESSING"].includes(topUp.status)) {
          const currentPending = Number(topUp.wallet.pendingBalance || 0);
          const releaseAmount = Math.min(
            currentPending,
            Number(topUp.amountExpected),
          );

          if (releaseAmount > 0) {
            await tx.wallet.update({
              where: { id: topUp.walletId },
              data: {
                pendingBalance: { decrement: releaseAmount },
              },
            });
          }
        }

        await tx.walletTopUp.update({
          where: { id: topUp.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            failureReason: reason,
            resolvedByAdminId: admin.id,
          },
        });

        await tx.transaction.updateMany({
          where: {
            topUpId: topUp.id,
            status: { in: ["PENDING", "PROCESSING"] },
          },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            failureReason: reason,
            createdByType: "ADMIN",
            createdById: admin.id,
          },
        });

        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "RECONCILIATION_MARK_TOPUP_RESOLVED",
            targetId: topUp.id,
            details: {
              topUpId: topUp.id,
              apiRef: topUp.apiRef,
              reason,
              previousStatus: topUp.status,
              newStatus: "CANCELLED",
            },
          },
        });
      });

      revalidatePath("/admin/reconciliation");
      return { success: true };
    }

    if (!paymentId) {
      return { success: false, error: "Missing payment id" };
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

          await creditWalletWithIdempotency(tx, {
            userId: payment.booking.clientId,
            amount: Number(payment.amount),
            type: "REFUND",
            description: `Reconciliation refund for booking ${payment.bookingId}`,
            sourceType: "RECONCILIATION_REFUND",
            sourceId: payment.id,
            adminId: admin.id,
            metadata: {
              paymentId: payment.id,
              bookingId: payment.bookingId,
              reason,
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

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: {
            services: true,
            jobs: true,
          },
        },
      },
    });

    if (!category) {
      return { success: false, error: "Category not found" };
    }

    if (category._count.services > 0 || category._count.jobs > 0) {
      return {
        success: false,
        error: `Cannot delete category with dependencies (services: ${category._count.services}, jobs: ${category._count.jobs}). Reassign records first.`,
      };
    }

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
  value: Prisma.InputJsonValue,
  description?: string,
) {
  try {
    const admin = await checkAdmin();

    if (typeof value === "number" && !Number.isFinite(value)) {
      return {
        success: false,
        error: "Numeric settings must be finite values.",
      };
    }

    if (key === "platform_fee_percentage" && typeof value === "number") {
      if (value < 0 || value > 100) {
        return {
          success: false,
          error: "Platform fee percentage must be between 0 and 100.",
        };
      }
    }

    if (
      [
        "min_withdrawal_amount",
        "max_file_upload_mb",
        "booking_cancellation_window_hours",
      ].includes(key) &&
      typeof value === "number" &&
      value < 0
    ) {
      return {
        success: false,
        error: "This setting must be zero or greater.",
      };
    }

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
  accessType: AdminLogAccessType = "ALL",
  filters: AdminLogFilters = {},
) {
  try {
    await checkAdmin();
    const safePage = normalizePage(page);
    const safeLimit = normalizeLimit(limit, 20);
    const skip = (safePage - 1) * safeLimit;

    const where = buildAdminLogsWhere(accessType, filters);

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        skip,
        take: safeLimit,
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
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      currentPage: safePage,
      accessType,
      filters,
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

    const normalizedAmount = roundCurrencyAmount(Number(amount));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return { success: false, error: "Refund amount must be greater than 0" };
    }

    // 1. Get booking and related payment
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        client: true,
      },
    });

    if (!booking) return { success: false, error: "Booking not found" };

    const bookingTotal = Number(booking.totalAmount || 0);
    if (normalizedAmount > bookingTotal) {
      return {
        success: false,
        error: "Refund amount cannot exceed the booking total.",
      };
    }

    // 2. Perform transaction in a multi-step update (Prisma transaction)
    await prisma.$transaction(async (tx) => {
      // Update Booking status
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          refundAmount: normalizedAmount,
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

      const walletCredit = await creditWalletWithIdempotency(tx, {
        userId: booking.clientId,
        amount: normalizedAmount,
        type: "REFUND",
        description: `Manual refund for booking ${bookingId}: ${reason}`,
        sourceType: "ADMIN_MANUAL_REFUND",
        sourceId: bookingId,
        adminId: admin.id,
        metadata: {
          bookingId,
          reason,
        },
      });

      // Create Admin Log
      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "MANUAL_REFUND_PROCESSED",
          targetId: bookingId,
          details: {
            amount: normalizedAmount,
            reason,
            clientId: booking.clientId,
            walletLedgerEntryId: walletCredit.ledgerEntryId,
          },
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

export async function processWalletManualAdjustmentAction(formData: FormData) {
  try {
    const admin = await checkAdmin();

    const targetUser = String(formData.get("targetUser") || "").trim();
    const direction = String(formData.get("direction") || "")
      .trim()
      .toUpperCase();
    const amount = Number(formData.get("amount") || 0);
    const reason = String(formData.get("reason") || "").trim();
    const sourceReference = String(formData.get("sourceReference") || "")
      .trim()
      .slice(0, 120);

    if (!targetUser) {
      return { success: false, error: "Target user (id or email) is required" };
    }

    if (!["CREDIT", "DEBIT"].includes(direction)) {
      return { success: false, error: "Direction must be CREDIT or DEBIT" };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: "Amount must be greater than zero" };
    }

    if (!reason || reason.length < 6) {
      return {
        success: false,
        error: "A clear adjustment reason is required (minimum 6 characters)",
      };
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: targetUser }, { email: targetUser }],
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return { success: false, error: "Target user not found" };
    }

    const adjustment = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          balance: 0,
          pendingBalance: 0,
          currency: "KES",
        },
      });

      const adjustmentLockKey = `wallet-adjustment:${wallet.id}`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${adjustmentLockKey}, 0))`;

      const lockedWallet = await tx.wallet.findUniqueOrThrow({
        where: { id: wallet.id },
        select: {
          id: true,
          balance: true,
          currency: true,
        },
      });

      const beforeBalance = Number(lockedWallet.balance);
      const adjustmentValue = Number(amount);

      if (direction === "DEBIT" && beforeBalance < adjustmentValue) {
        throw new Error("Insufficient wallet balance for debit adjustment");
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: lockedWallet.id },
        data: {
          balance:
            direction === "CREDIT"
              ? { increment: adjustmentValue }
              : { decrement: adjustmentValue },
        },
      });

      const ledgerEntry = await tx.transaction.create({
        data: {
          walletId: lockedWallet.id,
          amount: adjustmentValue,
          type: "ADJUSTMENT",
          status: "SETTLED",
          direction: direction as "CREDIT" | "DEBIT",
          category: "ADJUSTMENT",
          currency: lockedWallet.currency || "KES",
          sourceType: "ADMIN_ADJUSTMENT",
          sourceId: sourceReference || null,
          description: `Manual wallet adjustment (${direction}) - ${reason}`,
          metadata: {
            reason,
            sourceReference: sourceReference || null,
            adjustedByAdminId: admin.id,
            adjustedByAdminEmail: admin.email,
            targetUserId: user.id,
            targetUserEmail: user.email,
          },
          settledAt: new Date(),
          createdByType: "ADMIN",
          createdById: admin.id,
        },
      });

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "WALLET_MANUAL_ADJUSTMENT",
          targetId: wallet.id,
          details: {
            walletId: lockedWallet.id,
            ledgerEntryId: ledgerEntry.id,
            direction,
            amount: adjustmentValue,
            reason,
            sourceReference: sourceReference || null,
            beforeBalance,
            afterBalance: Number(updatedWallet.balance),
            userId: user.id,
            userEmail: user.email,
          },
        },
      });

      return {
        walletId: lockedWallet.id,
        ledgerEntryId: ledgerEntry.id,
        beforeBalance,
        afterBalance: Number(updatedWallet.balance),
      };
    });

    revalidatePath("/admin/reconciliation");
    revalidatePath("/admin/finance");

    return {
      success: true,
      userId: user.id,
      walletId: adjustment.walletId,
      ledgerEntryId: adjustment.ledgerEntryId,
      beforeBalance: adjustment.beforeBalance,
      afterBalance: adjustment.afterBalance,
    };
  } catch (error) {
    console.error("Error processing wallet manual adjustment:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to apply manual wallet adjustment",
    };
  }
}
