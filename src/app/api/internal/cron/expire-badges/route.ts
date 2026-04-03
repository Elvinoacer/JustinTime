import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { processExpiredBadges } from "@/lib/taas/badge-manager";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";

const EXPIRY_WARNING_DAYS = [30, 14, 3] as const;

function hasSecretAccess(request: Request) {
  const expectedSecret = process.env.BADGE_EXPIRY_CRON_SECRET;
  if (!expectedSecret) {
    return false;
  }

  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  if (headerSecret && headerSecret === expectedSecret) {
    return true;
  }

  if (bearer && bearer.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim() === expectedSecret;
  }

  return false;
}

async function executeBadgeExpiryJob(request: Request) {
  const secretAuthorized = hasSecretAccess(request);

  if (!secretAuthorized) {
    const session = await auth();
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const now = new Date();
  const maxWarningWindowMs =
    Math.max(...EXPIRY_WARNING_DAYS) * 24 * 60 * 60 * 1000;
  const warningWindowEnd = new Date(now.getTime() + maxWarningWindowMs);

  const badgesNearExpiry = await prisma.verificationBadge.findMany({
    where: {
      status: "VERIFIED",
      expiresAt: {
        not: null,
        lte: warningWindowEnd,
        gt: now,
      },
    },
    select: {
      id: true,
      userId: true,
      type: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  let warningsSent = 0;

  for (const badge of badgesNearExpiry) {
    if (!badge.expiresAt) continue;

    const daysRemaining = Math.ceil(
      (badge.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (
      !EXPIRY_WARNING_DAYS.includes(
        daysRemaining as (typeof EXPIRY_WARNING_DAYS)[number],
      )
    ) {
      continue;
    }

    const reasonKey = `badge:${badge.id}:days:${daysRemaining}`;

    const existingWarning = await prisma.verificationAudit.findFirst({
      where: {
        userId: badge.userId,
        action: "BADGE_EXPIRY_WARNING",
        badgeType: badge.type,
        reason: reasonKey,
      },
      select: { id: true },
    });

    if (existingWarning) {
      continue;
    }

    await sendComprehensiveNotification({
      userId: badge.userId,
      title: "Verification badge expiring soon",
      message: `Your ${badge.type} badge expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. Please renew to keep full trust benefits.`,
      type: "BADGE_EXPIRY_WARNING",
      emailSubject: "Verification badge expiry reminder - JustInTime",
      emailHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111827;">Badge expiry reminder</h2>
          <p>Hello ${badge.user.name || "there"},</p>
          <p>Your <strong>${badge.type}</strong> badge will expire in <strong>${daysRemaining} day${daysRemaining === 1 ? "" : "s"}</strong>.</p>
          <p>Please submit renewal documents to avoid trust score and visibility impacts.</p>
        </div>
      `,
    });

    await prisma.verificationAudit.create({
      data: {
        userId: badge.userId,
        action: "BADGE_EXPIRY_WARNING",
        badgeType: badge.type,
        performedBy: "SYSTEM",
        reason: reasonKey,
        previousValue: "VERIFIED",
        newValue: `EXPIRING_IN_${daysRemaining}_DAYS`,
      },
    });

    warningsSent += 1;
  }

  const expiredBadgesCount = await processExpiredBadges();

  const overdueBackgroundChecks = await prisma.backgroundCheck.updateMany({
    where: {
      status: "APPROVED",
      expiresAt: {
        lt: now,
      },
    },
    data: {
      renewalStatus: "OVERDUE",
    },
  });

  return NextResponse.json({
    success: true,
    warningsSent,
    expiredBadgesCount,
    overdueBackgroundChecksCount: overdueBackgroundChecks.count,
  });
}

export async function GET(request: Request) {
  try {
    return await executeBadgeExpiryJob(request);
  } catch (error) {
    console.error("[EXPIRE_BADGES_CRON_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await executeBadgeExpiryJob(request);
  } catch (error) {
    console.error("[EXPIRE_BADGES_CRON_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
