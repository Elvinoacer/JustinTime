import prisma from "@/lib/prisma";
import { ChurnInterventionChannel, ChurnRiskLevel } from "@/generated/prisma/client";
import { buildAppUrl } from "@/lib/app-url";

function isMissingIsCurrentColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    code?: string;
    message?: string;
    meta?: { column?: unknown };
  };

  if (
    maybeError.code === "P2022" &&
    typeof maybeError.meta?.column === "string" &&
    maybeError.meta.column.includes("ChurnScore.isCurrent")
  ) {
    return true;
  }

  return (
    typeof maybeError.message === "string" &&
    maybeError.message.includes("ChurnScore.isCurrent") &&
    maybeError.message.includes("does not exist")
  );
}

interface ReEngagementStrategy {
  type: string;
  channel: ChurnInterventionChannel;
  template: string;
  discountPercent: number;
  priority: number;
  requiresManualExecution?: boolean;
}

interface TriggerReEngagementOptions {
  force?: boolean;
  cooldownDays?: number;
}

interface TriggerReEngagementResult {
  success: boolean;
  interventionId?: string;
  error?: string;
  skipped?: boolean;
}

const DEFAULT_RE_ENGAGEMENT_COOLDOWN_DAYS = 14;

const RE_ENGAGEMENT_STRATEGIES: Record<ChurnRiskLevel, ReEngagementStrategy> = {
  LOW: {
    type: "NONE",
    channel: "MANUAL_OUTREACH",
    template: "",
    discountPercent: 0,
    priority: 0,
  },
  MEDIUM: {
    type: "EMAIL",
    channel: "EMAIL",
    template: "churn-medium",
    discountPercent: 10,
    priority: 1,
  },
  HIGH: {
    type: "EMAIL_NOTIFICATION",
    channel: "EMAIL",
    template: "churn-high",
    discountPercent: 20,
    priority: 2,
  },
  CRITICAL: {
    type: "PERSONAL_CALL",
    channel: "CALL",
    template: "churn-critical",
    discountPercent: 30,
    priority: 3,
    requiresManualExecution: true,
  },
};

/**
 * Trigger re-engagement campaign for at-risk user.
 */
export async function triggerReEngagement(
  userId: string,
  churnScoreId: string,
  riskLevel: ChurnRiskLevel,
  options: TriggerReEngagementOptions = {},
): Promise<TriggerReEngagementResult> {
  const strategy = RE_ENGAGEMENT_STRATEGIES[riskLevel];
  const cooldownDays = options.cooldownDays ?? DEFAULT_RE_ENGAGEMENT_COOLDOWN_DAYS;

  if (strategy.type === "NONE") {
    return {
      success: false,
      skipped: true,
      error: "LOW risk does not require re-engagement",
    };
  }

  const existingIntervention = await prisma.churnIntervention.findFirst({
    where: {
      userId,
      churnScoreId,
      type: strategy.type,
      status: {
        in: ["DRAFT", "SCHEDULED", "EXECUTING", "SENT", "RESPONDED", "CONVERTED"],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingIntervention) {
    return {
      success: true,
      skipped: true,
      interventionId: existingIntervention.id,
    };
  }

  if (!options.force) {
    const cooldownThreshold = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);

    const recentIntervention = await prisma.churnIntervention.findFirst({
      where: {
        userId,
        createdAt: { gte: cooldownThreshold },
        status: {
          in: ["SCHEDULED", "EXECUTING", "SENT", "RESPONDED", "CONVERTED"],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentIntervention) {
      return {
        success: false,
        skipped: true,
        interventionId: recentIntervention.id,
        error: `Cooldown active. Last intervention was ${recentIntervention.createdAt.toISOString()}`,
      };
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user || !user.email) {
    return { success: false, error: "Cannot re-engage user without email" };
  }

  let discountCode: string | null = null;
  if (strategy.discountPercent > 0) {
    discountCode = await createDiscountCode(userId, strategy.discountPercent, riskLevel);
  }

  const message = buildReEngagementMessage(
    user.name || "Valued Professional",
    riskLevel,
    strategy.discountPercent,
    discountCode,
  );

  const intervention = await prisma.churnIntervention.create({
    data: {
      churnScoreId,
      userId,
      type: strategy.type,
      channel: strategy.channel,
      status: strategy.requiresManualExecution ? "SCHEDULED" : "EXECUTING",
      message,
      executed: false,
      successful: null,
      deliveryOk: null,
    },
  });

  try {
    if (!strategy.requiresManualExecution) {
      if (strategy.type.includes("EMAIL")) {
        await sendReEngagementEmail(user.email, user.name || "Professional", riskLevel, message, discountCode);
      }

      if (strategy.type.includes("NOTIFICATION")) {
        await sendReEngagementNotification(userId, riskLevel, message);
      }

      await prisma.churnIntervention.update({
        where: { id: intervention.id },
        data: {
          status: "SENT",
          executed: true,
          executedAt: new Date(),
          successful: null,
          deliveryOk: true,
        },
      });
    }

    return { success: true, interventionId: intervention.id };
  } catch (error) {
    console.error(`Error executing re-engagement for user ${userId}:`, error);

    await prisma.churnIntervention.update({
      where: { id: intervention.id },
      data: {
        status: "FAILED",
        executed: true,
        executedAt: new Date(),
        successful: false,
        deliveryOk: false,
        response: error instanceof Error ? error.message : String(error),
      },
    });

    return {
      success: false,
      interventionId: intervention.id,
      error: error instanceof Error ? error.message : "Failed to execute re-engagement",
    };
  }
}

async function createDiscountCode(userId: string, discountPercent: number, riskLevel: ChurnRiskLevel): Promise<string> {
  const code = `COMEBACK${riskLevel}${Date.now().toString().slice(-6)}`;

  await prisma.promoCode.create({
    data: {
      code,
      description: `Re-engagement offer for ${riskLevel} risk user`,
      type: "PERCENTAGE",
      value: discountPercent,
      minOrderAmount: 0,
      usageLimit: 1,
      perUserLimit: 1,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  return code;
}

function buildReEngagementMessage(
  userName: string,
  riskLevel: ChurnRiskLevel,
  discountPercent: number,
  discountCode: string | null,
): string {
  const messages: Record<ChurnRiskLevel, string> = {
    LOW: "",
    MEDIUM: `Hi ${userName},\n\nWe noticed you haven't been as active lately. We miss having you on our platform!\n\nAs a thank you for being part of our community, here's ${discountPercent}% off your next service booking.\n\nUse code: ${discountCode}\n\nLet's get you back in action!`,
    HIGH: `Dear ${userName},\n\nWe really value your presence on JustInTime and noticed you've been less active recently.\n\nWe want to make sure you're getting the most out of our platform. Here's a special ${discountPercent}% discount to help you get back on track.\n\nCode: ${discountCode}\n\nPlus, our support team is here to help with anything you need. Just reach out!`,
    CRITICAL: `${userName},\n\nYour account is important to us. Our team has noticed a significant drop in your activity.\n\nWe'd love to understand what's happening and how we can help. As a gesture of goodwill, we're offering you ${discountPercent}% off your next booking.\n\nCode: ${discountCode}\n\nOne of our account managers will reach out to you personally to discuss how we can better support your success.\n\nLooking forward to hearing from you.`,
  };

  return messages[riskLevel];
}

async function sendReEngagementEmail(
  email: string,
  name: string,
  riskLevel: ChurnRiskLevel,
  message: string,
  discountCode: string | null,
): Promise<void> {
  const { sendEmail } = await import("@/lib/email");

  const subject =
    riskLevel === "CRITICAL"
      ? "Action Needed: Your JustInTime account"
      : riskLevel === "HIGH"
        ? "We miss you on JustInTime"
        : "Come back to JustInTime";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">We Miss You</h1>
      </div>

      <div style="padding: 30px; background: #f9fafb;">
        ${message
          .split("\n")
          .map((line) => `<p style="color: #374151; line-height: 1.6;">${line}</p>`)
          .join("")}

        ${
          discountCode
            ? `
          <div style="background: white; border: 2px dashed #10b981; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Exclusive Code</p>
            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 2px;">${discountCode}</p>
            <p style="margin: 0; color: #6b7280; font-size: 12px;">Valid for 30 days</p>
          </div>
        `
            : ""
        }

        <div style="text-align: center; margin-top: 30px;">
          <a href="${buildAppUrl("/dashboard")}" style="background: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Continue on JustInTime
          </a>
        </div>
      </div>

      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>You're receiving this because we value your presence on JustInTime.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject,
    html,
  });
}

async function sendReEngagementNotification(userId: string, riskLevel: ChurnRiskLevel, message: string): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      title: riskLevel === "CRITICAL" ? "Special offer for you" : "We miss you",
      message: message.substring(0, 200) + "...",
      type: "CHURN_RE_ENGAGEMENT",
    },
  });
}

/**
 * Auto-trigger re-engagement for recent high-risk users.
 */
export async function autoTriggerReEngagement(options?: { cooldownDays?: number; maxUsers?: number }): Promise<{
  triggered: number;
  successful: number;
  failed: number;
  skipped: number;
}> {
  const cooldownDays = options?.cooldownDays ?? DEFAULT_RE_ENGAGEMENT_COOLDOWN_DAYS;
  const maxUsers = options?.maxUsers ?? 200;

  let highRiskScores: Array<{
    id: string;
    userId: string;
    riskLevel: ChurnRiskLevel;
  }>;

  try {
    highRiskScores = await prisma.churnScore.findMany({
      where: {
        isCurrent: true,
        riskLevel: { in: ["HIGH", "CRITICAL"] },
        calculatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { score: "desc" },
      take: maxUsers,
      select: {
        id: true,
        userId: true,
        riskLevel: true,
      },
    });
  } catch (error) {
    if (!isMissingIsCurrentColumnError(error)) {
      throw error;
    }

    // Compatibility fallback for environments where the isCurrent column is not yet migrated.
    const fallbackScores = await prisma.churnScore.findMany({
      where: {
        riskLevel: { in: ["HIGH", "CRITICAL"] },
        calculatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: [{ calculatedAt: "desc" }, { score: "desc" }],
      take: Math.max(maxUsers * 5, maxUsers),
      select: {
        id: true,
        userId: true,
        riskLevel: true,
      },
    });

    const seenUsers = new Set<string>();
    highRiskScores = [];

    for (const score of fallbackScores) {
      if (seenUsers.has(score.userId)) {
        continue;
      }
      seenUsers.add(score.userId);
      highRiskScores.push(score);

      if (highRiskScores.length >= maxUsers) {
        break;
      }
    }
  }

  const results = {
    triggered: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  };

  for (const score of highRiskScores) {
    const result = await triggerReEngagement(score.userId, score.id, score.riskLevel, {
      cooldownDays,
    });

    if (result.skipped) {
      results.skipped++;
      continue;
    }

    results.triggered++;

    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
    }
  }

  return results;
}
