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

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
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
    const isTopupPayment =
      apiRef.startsWith("TOPUP-") || apiRef.startsWith("TOPUP_");

    if (!isTopupPayment) {
      console.log(`Not a topup payment (api_ref: ${apiRef}), skipping...`);
      return NextResponse.json({ received: true, skipped: true });
    }

    // Extract user ID from api_ref
    // Format: TOPUP-userIdPart-timestamp
    const parts = apiRef.split(/[-_]/);
    const userIdPart = parts[1];

    if (!userIdPart || userIdPart.length < 16) {
      console.error("Could not extract userId from api_ref:", apiRef);
      return NextResponse.json({
        received: true,
        error: "Invalid api_ref format",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userIdPart },
    });

    if (!user) {
      console.error(`User not found for userIdPart: ${userIdPart}`);
      return NextResponse.json({ received: true, error: "User not found" });
    }

    // Process the topup
    await prisma.$transaction(async (tx) => {
      const idempotencyRef = String(invoiceId || apiRef);
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${idempotencyRef}))`;

      const alreadyProcessed = await tx.transaction.findFirst({
        where: {
          description: {
            contains: `Ref: ${idempotencyRef}`,
          },
        },
      });

      if (alreadyProcessed) {
        return;
      }

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

      // 3. Record the transaction
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: amount,
          type: "DEPOSIT",
          description: `Wallet Top-up (Ref: ${idempotencyRef})`,
        },
      });
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
