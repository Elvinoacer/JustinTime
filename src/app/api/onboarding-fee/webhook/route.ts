import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  verifyWebhookChallenge,
  verifyWebhookSignature,
  PAYMENT_AMOUNTS,
} from "@/lib/intasend";

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
    const body = JSON.parse(rawBody);

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
    const state = body.state || body.invoice?.state;
    const apiRef = body.api_ref || body.invoice?.api_ref || "";
    const invoiceId = body.invoice_id || body.id;
    const amount = Number(
      body.value || body.invoice?.value || body.amount || 0,
    );
    const canonicalRef = String(apiRef || "").trim();

    if (!canonicalRef) {
      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        skipped: true,
        reason: "missing_api_ref",
        invoiceId: invoiceId ? String(invoiceId) : null,
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({
        received: true,
        skipped: true,
        reason: "invalid_amount",
      });
    }

    console.log(
      `Processing webhook: state=${state}, api_ref=${apiRef}, invoice=${invoiceId}`,
    );

    // Only process COMPLETE payments
    if (state !== "COMPLETE") {
      console.log(`Payment not complete (state: ${state}), acknowledging...`);
      return NextResponse.json({ received: true, state });
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
            },
          });
        }

        if (pendingPayment) {
          await tx.transaction.update({
            where: { id: pendingPayment.id },
            data: {
              amount,
              providerRef: partialPaymentProviderRef,
              description: partialDescription,
            },
          });
        } else {
          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              amount,
              type: "ONBOARDING_FEE",
              providerRef: partialPaymentProviderRef,
              description: partialDescription,
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
                apiRef,
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
          },
        });
      }

      // 3. Mark pending transaction as settled, or create one if pending is missing.
      if (pendingPayment) {
        await tx.transaction.update({
          where: { id: pendingPayment.id },
          data: {
            amount,
            providerRef: settledPaymentProviderRef,
            description: successfulDescription,
          },
        });
      } else {
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount,
            type: "ONBOARDING_FEE",
            providerRef: settledPaymentProviderRef,
            description: successfulDescription,
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
              apiRef,
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
