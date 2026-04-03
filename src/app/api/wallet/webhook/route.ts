import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookChallenge, verifyWebhookSignature } from "@/lib/intasend";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-intasend-signature");
    const body = JSON.parse(rawBody);

    console.log("=== IntaSend Wallet Topup Webhook ===");
    console.log("Payload:", JSON.stringify(body, null, 2));

    // Handle challenge verification before enforcing signed event payloads.
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
      `Processing webhook: state=${state}, api_ref=${apiRef}, amount=${amount}`,
    );

    // Only process COMPLETE payments
    if (state !== "COMPLETE") {
      console.log(`Payment not complete (state: ${state}), acknowledging...`);
      return NextResponse.json({ received: true, state });
    }

    // Check if this is a topup payment
    const pendingProviderRef = `INTASEND:WALLET:PENDING:${canonicalRef}`;
    const pendingTopup = await prisma.transaction.findFirst({
      where: {
        type: "DEPOSIT",
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

    if (!pendingTopup) {
      console.log(
        `No pending top-up found for providerRef ${pendingProviderRef}; skipping auto-settlement`,
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
      where: { id: pendingTopup.wallet.userId },
    });

    if (!user) {
      console.error(`User not found for pending topup ref: ${canonicalRef}`);
      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        error: "User not found",
      });
    }

    // Process the topup
    await prisma.$transaction(async (tx) => {
      const lockRef = canonicalRef;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockRef}, 0))`;
      const refForKeys = lockRef;
      const topupSettledDescription = `Wallet Top-up Settled [Ref:${refForKeys}]`;
      const topupPendingProviderRef = `INTASEND:WALLET:PENDING:${refForKeys}`;
      const topupSettledProviderRef = `INTASEND:WALLET:SETTLED:${refForKeys}`;

      const alreadyProcessed = await tx.transaction.findFirst({
        where: {
          providerRef: topupSettledProviderRef,
          type: "DEPOSIT",
        },
      });

      if (alreadyProcessed) {
        return;
      }

      const pendingEntry = await tx.transaction.findFirst({
        where: {
          type: "DEPOSIT",
          providerRef: topupPendingProviderRef,
        },
      });

      // 1. Get or create wallet
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

      // 2. Credit the wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
        },
      });

      // 3. Update pending record to settled, or create settled record if missing.
      if (pendingEntry) {
        await tx.transaction.update({
          where: { id: pendingEntry.id },
          data: {
            amount,
            providerRef: topupSettledProviderRef,
            description: topupSettledDescription,
          },
        });
      } else {
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount,
            type: "DEPOSIT",
            providerRef: topupSettledProviderRef,
            description: topupSettledDescription,
          },
        });
      }
    });

    console.log(
      `✅ Wallet topup completed for user: ${user.id} (${user.email}), amount: ${amount}`,
    );
    return NextResponse.json({
      received: true,
      success: true,
      userId: user.id,
      amount,
    });
  } catch (error) {
    console.error("[WALLET_TOPUP_WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }
}
