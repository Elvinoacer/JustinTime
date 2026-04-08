import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  verifyWebhookChallenge,
  verifyWebhookSignature,
  PAYMENT_AMOUNTS,
} from "@/lib/intasend";
import {
  IntaSendWebhookPayload,
  parseIntaSendWebhook,
} from "@/lib/intasend-webhook";

async function resolveSystemAdminId(tx: Prisma.TransactionClient) {
  const actor = await tx.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  return actor?.id ?? null;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-intasend-signature");
    const body = JSON.parse(rawBody) as IntaSendWebhookPayload;

    console.log("=== IntaSend Onboarding Webhook ===");
    console.log("Payload:", JSON.stringify(body, null, 2));

    // Handle challenge verification (IntaSend sends this to verify endpoint)
    if (body.challenge) {
      if (verifyWebhookChallenge(body.challenge)) {
        console.log("✅ Challenge verified successfully");
        return NextResponse.json({ challenge: body.challenge });
      }

      console.error("❌ Challenge verification failed");
      return NextResponse.json({ error: "Invalid challenge" }, { status: 401 });
    }

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("❌ Invalid IntaSend webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Acknowledge receipt immediately (IntaSend expects quick 200 response)
    // Process the rest asynchronously in production

    // Extract payment state and reference
    const webhook = parseIntaSendWebhook(body);
    const gatewayState = webhook.state;
    const canonicalRef = String(
      webhook.apiRef || webhook.primaryReference || "",
    ).trim();
    const invoiceId = webhook.invoiceId || webhook.sessionId;
    const amount = webhook.amount;

    if (!canonicalRef) {
      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        skipped: true,
        reason: "missing_api_ref",
        invoiceId: invoiceId ? String(invoiceId) : null,
      });
    }

    console.log(
      `Processing webhook: state=${gatewayState}, api_ref=${canonicalRef}, invoice=${invoiceId}`,
    );

    if (gatewayState !== "SETTLED") {
      const pendingProviderRef = `INTASEND:ONBOARDING:PENDING:${canonicalRef}`;
      const partialProviderRef = `INTASEND:ONBOARDING:PARTIAL:${canonicalRef}`;
      const settledProviderRef = `INTASEND:ONBOARDING:SETTLED:${canonicalRef}`;

      const candidates = await prisma.transaction.findMany({
        where: {
          type: "ONBOARDING_FEE",
          providerRef: {
            in: [pendingProviderRef, partialProviderRef, settledProviderRef],
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

      console.log(
        `Payment not settled (state: ${gatewayState}), acknowledging...`,
      );

      return NextResponse.json({
        received: true,
        state: gatewayState,
        updatedTransactions: updatedCount,
        skippedTransactions: skippedCount,
      });
    }

    if (!Number.isFinite(amount) || (amount || 0) <= 0) {
      return NextResponse.json({
        received: true,
        skipped: true,
        requiresManualResolution: true,
        reason: "invalid_amount_for_settlement",
        apiRef: canonicalRef,
      });
    }

    const pendingProviderRef = `INTASEND:ONBOARDING:PENDING:${canonicalRef}`;
    const pendingOnboarding = await prisma.transaction.findFirst({
      where: {
        type: "ONBOARDING_FEE",
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

    if (!pendingOnboarding) {
      console.log(
        `No pending onboarding transaction found for providerRef ${pendingProviderRef}; skipping auto-settlement`,
      );
      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        skipped: true,
        reason: "missing_pending_provider_reference",
        apiRef: canonicalRef,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: pendingOnboarding.wallet.userId },
      include: { profile: true },
    });

    if (!user) {
      console.error(
        `User not found for pending onboarding ref: ${canonicalRef}`,
      );
      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        error: "User not found",
      });
    }

    // Process the payment
    await prisma.$transaction(async (tx) => {
      const lockRef = canonicalRef;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockRef}, 0))`;
      const refForKeys = lockRef;

      const successfulDescription = `Onboarding Fee Payment Settled [Ref:${refForKeys}]`;
      const partialDescription = `Onboarding Fee Partial Payment [Ref:${refForKeys}]`;
      const pendingPaymentProviderRef = `INTASEND:ONBOARDING:PENDING:${refForKeys}`;
      const partialPaymentProviderRef = `INTASEND:ONBOARDING:PARTIAL:${refForKeys}`;
      const settledPaymentProviderRef = `INTASEND:ONBOARDING:SETTLED:${refForKeys}`;

      const existingTx = await tx.transaction.findFirst({
        where: {
          type: "ONBOARDING_FEE",
          OR: [
            { providerRef: settledPaymentProviderRef },
            { providerRef: partialPaymentProviderRef },
          ],
        },
      });

      if (existingTx) {
        return;
      }

      const pendingPayment = await tx.transaction.findFirst({
        where: {
          type: "ONBOARDING_FEE",
          providerRef: pendingPaymentProviderRef,
        },
      });

      // Check if already processed
      const existingProfile = await tx.profile.findUnique({
        where: { userId: user.id },
        select: {
          hasPaidOnboardingFee: true,
          onboardingFeeWaived: true,
        },
      });

      if (
        existingProfile?.hasPaidOnboardingFee ||
        existingProfile?.onboardingFeeWaived
      ) {
        return;
      }

      const systemAdminId = await resolveSystemAdminId(tx);

      if (amount < PAYMENT_AMOUNTS.ONBOARDING_FEE) {
        let wallet = await tx.wallet.findUnique({
          where: { userId: user.id },
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              userId: user.id,
              balance: 0,
              pendingBalance: 0,
              currency: "KES",
            },
          });
        }

        if (pendingPayment) {
          await tx.transaction.update({
            where: { id: pendingPayment.id },
            data: {
              amount,
              status: "FAILED",
              direction: "DEBIT",
              category: "ONBOARDING_FEE",
              currency: "KES",
              gateway: "INTASEND",
              gatewayReference: invoiceId ? String(invoiceId) : refForKeys,
              gatewaySessionId: invoiceId ? String(invoiceId) : null,
              providerRef: partialPaymentProviderRef,
              sourceType: "ONBOARDING_FEE",
              sourceId: user.id,
              createdByType: "WEBHOOK",
              description: partialDescription,
              failedAt: new Date(),
              failureReason: "Partial onboarding payment",
            },
          });
        } else {
          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              amount,
              type: "ONBOARDING_FEE",
              status: "FAILED",
              direction: "DEBIT",
              category: "ONBOARDING_FEE",
              currency: "KES",
              gateway: "INTASEND",
              gatewayReference: invoiceId ? String(invoiceId) : refForKeys,
              gatewaySessionId: invoiceId ? String(invoiceId) : null,
              providerRef: partialPaymentProviderRef,
              sourceType: "ONBOARDING_FEE",
              sourceId: user.id,
              createdByType: "WEBHOOK",
              description: partialDescription,
              failedAt: new Date(),
              failureReason: "Partial onboarding payment",
            },
          });
        }

        if (systemAdminId) {
          await tx.adminLog.create({
            data: {
              adminId: systemAdminId,
              action: "ONBOARDING_FEE_PARTIAL_PAYMENT_REQUIRES_RESOLUTION",
              targetId: user.id,
              details: {
                source: "intasend_webhook",
                invoiceId: String(lockRef),
                apiRef: canonicalRef,
                expectedAmount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
                paidAmount: amount,
                actorUserId: user.id,
              },
            },
          });
        }

        return;
      }

      // Mark payment state only; verification must be granted by Trust & Safety review.
      await tx.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          hasPaidOnboardingFee: true,
        },
        update: {
          hasPaidOnboardingFee: true,
        },
      });

      // 2. Get or create wallet
      let wallet = await tx.wallet.findUnique({
        where: { userId: user.id },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
            pendingBalance: 0,
            currency: "KES",
          },
        });
      }

      // 3. Mark pending transaction as settled, or create one if pending is missing.
      if (pendingPayment) {
        await tx.transaction.update({
          where: { id: pendingPayment.id },
          data: {
            amount,
            status: "SETTLED",
            direction: "DEBIT",
            category: "ONBOARDING_FEE",
            currency: "KES",
            gateway: "INTASEND",
            gatewayReference: invoiceId ? String(invoiceId) : refForKeys,
            gatewaySessionId: invoiceId ? String(invoiceId) : null,
            providerRef: settledPaymentProviderRef,
            sourceType: "ONBOARDING_FEE",
            sourceId: user.id,
            createdByType: "WEBHOOK",
            description: successfulDescription,
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
            amount,
            type: "ONBOARDING_FEE",
            status: "SETTLED",
            direction: "DEBIT",
            category: "ONBOARDING_FEE",
            currency: "KES",
            gateway: "INTASEND",
            gatewayReference: invoiceId ? String(invoiceId) : refForKeys,
            gatewaySessionId: invoiceId ? String(invoiceId) : null,
            providerRef: settledPaymentProviderRef,
            sourceType: "ONBOARDING_FEE",
            sourceId: user.id,
            createdByType: "WEBHOOK",
            description: successfulDescription,
            settledAt: new Date(),
          },
        });
      }

      if (systemAdminId) {
        await tx.adminLog.create({
          data: {
            adminId: systemAdminId,
            action: "ONBOARDING_FEE_PAID_ACCESS_GRANTED",
            targetId: user.id,
            details: {
              source: "intasend_webhook",
              invoiceId: String(lockRef),
              apiRef: canonicalRef,
              actorUserId: user.id,
            },
          },
        });
      }
    });

    console.log(
      `✅ Onboarding fee processed for user: ${user.id} (${user.email})`,
    );
    return NextResponse.json({
      received: true,
      success: true,
      userId: user.id,
    });
  } catch (error) {
    console.error("[ONBOARDING_WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }
}
