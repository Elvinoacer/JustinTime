import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSubscriptionActivationEmail } from "@/lib/email";
import { verifyWebhookChallenge, verifyWebhookSignature } from "@/lib/intasend";
import { SubscriptionPlan } from "@/generated/prisma/client";
import {
  IntaSendWebhookPayload,
  parseIntaSendWebhook,
} from "@/lib/intasend-webhook";

function parseSubscriptionRef(apiRef: string) {
  const normalized = String(apiRef || "").trim();
  if (!normalized) {
    return {
      userId: null as string | null,
      plan: null as SubscriptionPlan | null,
    };
  }

  // New format: SUB-PLAN-userid-timestamp
  const hyphenParts = normalized.split("-");
  if (hyphenParts.length >= 4 && hyphenParts[0] === "SUB") {
    const possiblePlan = hyphenParts[1]?.toUpperCase();
    const possibleUserId = hyphenParts[2];
    if (
      possibleUserId &&
      (possiblePlan === "PRO" || possiblePlan === "BUSINESS")
    ) {
      return {
        userId: possibleUserId,
        plan: possiblePlan as SubscriptionPlan,
      };
    }
  }

  // Legacy format: SUB_userid_PLAN_timestamp
  const underscoreParts = normalized.split("_");
  if (underscoreParts.length >= 4 && underscoreParts[0] === "SUB") {
    const possibleUserId = underscoreParts[1];
    const possiblePlan = underscoreParts[2]?.toUpperCase();
    if (
      possibleUserId &&
      (possiblePlan === "PRO" || possiblePlan === "BUSINESS")
    ) {
      return {
        userId: possibleUserId,
        plan: possiblePlan as SubscriptionPlan,
      };
    }
  }

  return {
    userId: null as string | null,
    plan: null as SubscriptionPlan | null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody) as IntaSendWebhookPayload;

    if (body.challenge) {
      if (verifyWebhookChallenge(body.challenge)) {
        return NextResponse.json({ challenge: body.challenge });
      }

      return NextResponse.json({ error: "Invalid challenge" }, { status: 401 });
    }

    // Verify webhook signature (IntaSend sends signature in headers)
    const signature = req.headers.get("x-intasend-signature");
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("Invalid IntaSend webhook signature");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    // Log webhook for debugging
    console.log("=== IntaSend Webhook Received ===");
    console.log("Payload:", JSON.stringify(body, null, 2));

    const webhook = parseIntaSendWebhook(body);
    const canonicalRef = String(
      webhook.apiRef || webhook.primaryReference || "",
    ).trim();
    const invoiceId = webhook.invoiceId || webhook.sessionId;

    if (!canonicalRef) {
      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        skipped: true,
        reason: "missing_api_ref",
        invoiceId: invoiceId ? String(invoiceId) : null,
      });
    }

    const gatewayState = webhook.state;

    // Persist intermediate/failed/cancelled states to avoid stale pending entries.
    if (gatewayState !== "SETTLED") {
      const pendingProviderRef = `INTASEND:SUBSCRIPTION:PENDING:${canonicalRef}`;
      const settledProviderRef = `INTASEND:SUBSCRIPTION:SETTLED:${canonicalRef}`;

      const candidates = await prisma.transaction.findMany({
        where: {
          type: "PAYMENT",
          providerRef: {
            in: [pendingProviderRef, settledProviderRef],
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

      const now = new Date();
      let updatedCount = 0;
      let skippedCount = 0;

      for (const entry of candidates) {
        if (
          entry.status === "SETTLED" &&
          !["SETTLED", "REVERSED"].includes(gatewayState)
        ) {
          skippedCount += 1;
          continue;
        }

        await prisma.transaction.update({
          where: { id: entry.id },
          data: {
            status: gatewayState,
            failureReason:
              gatewayState === "FAILED" ||
              gatewayState === "CANCELLED" ||
              gatewayState === "REVERSED"
                ? webhook.failureReason ||
                  (gatewayState === "REVERSED"
                    ? "Gateway reversal"
                    : `Gateway state: ${webhook.rawState || gatewayState}`)
                : null,
            failedAt: gatewayState === "FAILED" ? now : null,
            cancelledAt: gatewayState === "CANCELLED" ? now : null,
            reversedAt: gatewayState === "REVERSED" ? now : null,
            createdByType: "WEBHOOK",
            gatewayReference: invoiceId ? String(invoiceId) : canonicalRef,
            gatewaySessionId: invoiceId ? String(invoiceId) : null,
          },
        });

        updatedCount += 1;
      }

      console.log(`Payment not settled. State: ${gatewayState}`);
      return NextResponse.json({
        message: "Payment not settled",
        state: gatewayState,
        updatedTransactions: updatedCount,
        skippedTransactions: skippedCount,
      });
    }

    const metadata = ((body.meta as unknown) ||
      webhook.invoice?.meta ||
      {}) as {
      userId?: string;
      plan?: string;
    };
    const parsedApiRef = parseSubscriptionRef(canonicalRef);
    const pendingProviderRef = `INTASEND:SUBSCRIPTION:PENDING:${canonicalRef}`;
    const pendingSubscription = await prisma.transaction.findFirst({
      where: {
        type: "PAYMENT",
        providerRef: pendingProviderRef,
      },
      include: {
        wallet: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!pendingSubscription) {
      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        skipped: true,
        reason: "missing_pending_provider_reference",
        apiRef: canonicalRef,
      });
    }

    const userId =
      metadata.userId ||
      parsedApiRef.userId ||
      pendingSubscription?.wallet.userId;
    const normalizedPlan = (metadata.plan || parsedApiRef.plan || "")
      .toString()
      .toUpperCase();
    const plan =
      normalizedPlan === "PRO" || normalizedPlan === "BUSINESS"
        ? (normalizedPlan as SubscriptionPlan)
        : null;

    if (!userId || !plan) {
      console.error("Missing userId or plan in webhook metadata:", metadata);
      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        error: "Missing userId or plan in webhook payload",
      });
    }

    console.log(`Processing subscription for user ${userId}, plan: ${plan}`);

    // Get user details for email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const amount = webhook.amount;

    if (!Number.isFinite(amount) || (amount || 0) <= 0) {
      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        skipped: true,
        reason: "invalid_amount_for_settlement",
        apiRef: canonicalRef,
      });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    console.log(
      `Subscription period: ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    const subscription = await prisma.$transaction(async (tx) => {
      const lockRef = canonicalRef;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockRef}, 0))`;
      const refForKeys = lockRef;
      const pendingSubscriptionProviderRef = `INTASEND:SUBSCRIPTION:PENDING:${refForKeys}`;
      const settledSubscriptionProviderRef = `INTASEND:SUBSCRIPTION:SETTLED:${refForKeys}`;

      let wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId,
            balance: 0,
            pendingBalance: 0,
            currency: "KES",
          },
        });
      }

      const settledDescription = `Subscription payment settled (${plan}) [Ref:${refForKeys}]`;
      const existingSettled = await tx.transaction.findFirst({
        where: {
          walletId: wallet.id,
          type: "PAYMENT",
          providerRef: settledSubscriptionProviderRef,
        },
      });

      if (existingSettled) {
        return tx.subscription.upsert({
          where: { userId },
          update: {
            plan,
            startDate,
            endDate,
            isActive: true,
          },
          create: {
            userId,
            plan,
            startDate,
            endDate,
            isActive: true,
          },
        });
      }

      const subscriptionRecord = await tx.subscription.upsert({
        where: { userId },
        update: {
          plan,
          startDate,
          endDate,
          isActive: true,
        },
        create: {
          userId,
          plan,
          startDate,
          endDate,
          isActive: true,
        },
      });

      const pendingRecord = await tx.transaction.findFirst({
        where: {
          walletId: wallet.id,
          type: "PAYMENT",
          providerRef: pendingSubscriptionProviderRef,
        },
      });

      if (pendingRecord) {
        await tx.transaction.update({
          where: { id: pendingRecord.id },
          data: {
            amount:
              Number.isFinite(amount) && amount > 0
                ? amount
                : pendingRecord.amount,
            status: "SETTLED",
            direction: "DEBIT",
            category: "SUBSCRIPTION",
            currency: "KES",
            gateway: "INTASEND",
            gatewayReference: invoiceId ? String(invoiceId) : refForKeys,
            gatewaySessionId: invoiceId ? String(invoiceId) : null,
            providerRef: settledSubscriptionProviderRef,
            sourceType: "SUBSCRIPTION",
            sourceId: subscriptionRecord.id,
            createdByType: "WEBHOOK",
            description: settledDescription,
            settledAt: new Date(),
            failureReason: null,
            failedAt: null,
            cancelledAt: null,
          },
        });
      } else {
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
            type: "PAYMENT",
            status: "SETTLED",
            direction: "DEBIT",
            category: "SUBSCRIPTION",
            currency: "KES",
            gateway: "INTASEND",
            gatewayReference: invoiceId ? String(invoiceId) : refForKeys,
            gatewaySessionId: invoiceId ? String(invoiceId) : null,
            providerRef: settledSubscriptionProviderRef,
            sourceType: "SUBSCRIPTION",
            sourceId: subscriptionRecord.id,
            createdByType: "WEBHOOK",
            description: settledDescription,
            settledAt: new Date(),
          },
        });
      }

      await tx.notification.create({
        data: {
          userId,
          title: "Subscription Activated",
          message: `Your ${plan} subscription has been activated successfully! Enjoy premium features for one month.`,
          type: "PAYMENT",
        },
      });

      return subscriptionRecord;
    });

    console.log(`Subscription updated successfully:`, subscription);

    // Send activation email
    if (user.email && user.name) {
      await sendSubscriptionActivationEmail(
        user.email,
        user.name,
        plan,
        endDate,
      );
      console.log(`Activation email sent to ${user.email}`);
    }

    return NextResponse.json({
      message: "Webhook processed successfully",
      subscription: {
        userId: subscription.userId,
        plan: subscription.plan,
        isActive: subscription.isActive,
        endDate: subscription.endDate,
      },
    });
  } catch (error) {
    console.error("=== Webhook Error ===");
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
