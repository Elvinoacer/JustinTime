import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendAccountDeletionConfirmedEmail } from "@/lib/email";
import { auth } from "@/auth";
import {
  AUTH_RATE_LIMIT_ERROR,
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";

const ACCOUNT_DELETION_BATCH_SIZE = 50;

function hasValidCronSecret(req: NextRequest): boolean {
  const configuredSecret = process.env.ACCOUNT_CLEANUP_SECRET;
  if (!configuredSecret) {
    return false;
  }

  const providedSecret = req.headers.get("x-cleanup-secret");
  return Boolean(providedSecret && providedSecret === configuredSecret);
}

// This endpoint can be called by a cron job or manually to clean up expired account deletions
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";
    const isAuthorizedCron = hasValidCronSecret(req);

    if (!isAdmin && !isAuthorizedCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientIp = getClientIpFromHeaders(req.headers);
    const rateLimitKey = clientIp || (isAuthorizedCron ? "cron-secret" : "admin");
    const limitResult = enforceRateLimits("account.cleanup-deletions", [
      {
        suffix: rateLimitKey,
        limit: 6,
        windowMs: 60 * 1000,
      },
    ]);

    if (!limitResult.ok) {
      return NextResponse.json(
        { error: AUTH_RATE_LIMIT_ERROR },
        {
          status: 429,
          headers: {
            "Retry-After": String(limitResult.retryAfterSeconds ?? 60),
          },
        },
      );
    }

    // Find all users with deletion scheduled in the past
    const usersToDelete = await prisma.user.findMany({
      where: {
        deletionScheduledAt: {
          lte: new Date(), // Deletion time has passed
        },
      },
      take: ACCOUNT_DELETION_BATCH_SIZE,
      orderBy: {
        deletionScheduledAt: "asc",
      },
      select: {
        id: true,
        email: true,
        name: true,
        deletionScheduledAt: true,
      },
    });

    if (usersToDelete.length === 0) {
      return NextResponse.json({
        message: "No accounts to delete",
        count: 0,
      });
    }

    console.log(`Found ${usersToDelete.length} accounts to delete`);

    // Delete each user account
    const deletionResults = [];
    for (const user of usersToDelete) {
      try {
        // Send deletion confirmation email before deleting
        if (user.email && user.name) {
          await sendAccountDeletionConfirmedEmail(user.email, user.name);
          console.log(`Deletion confirmed email sent to ${user.email}`);
        }

        // Delete user (cascade will handle related data)
        await prisma.user.delete({
          where: { id: user.id },
        });

        deletionResults.push({
          userId: user.id,
          email: user.email,
          success: true,
        });

        console.log(`Deleted account for user ${user.id} (${user.email})`);
      } catch (error) {
        console.error(`Failed to delete user ${user.id}:`, error);
        deletionResults.push({
          userId: user.id,
          email: user.email,
          success: false,
          error: String(error),
        });
      }
    }

    const successCount = deletionResults.filter((r) => r.success).length;

    return NextResponse.json({
      message: `Processed ${usersToDelete.length} account deletions`,
      successCount,
      failureCount: usersToDelete.length - successCount,
      batchSize: ACCOUNT_DELETION_BATCH_SIZE,
      results: deletionResults,
    });
  } catch (error) {
    console.error("Error in cleanup-deletions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
