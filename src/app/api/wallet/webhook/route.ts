import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookChallenge } from "@/lib/intasend";

export async function POST(req: Request) {
  try {
    // Parse webhook payload
    const body = await req.json();
    
    console.log("=== IntaSend Wallet Topup Webhook ===");
    console.log("Payload:", JSON.stringify(body, null, 2));

    // Handle challenge verification
    if (body.challenge) {
      if (verifyWebhookChallenge(body.challenge)) {
        console.log("✅ Challenge verified successfully");
        return NextResponse.json({ challenge: body.challenge });
      } else {
        console.error("❌ Challenge verification failed");
        return NextResponse.json({ error: "Invalid challenge" }, { status: 401 });
      }
    }

    // Extract payment state and reference
    const state = body.state || body.invoice?.state;
    const apiRef = body.api_ref || body.invoice?.api_ref || "";
    const invoiceId = body.invoice_id || body.id;
    const amount = body.value || body.invoice?.value || body.amount || 0;

    console.log(`Processing webhook: state=${state}, api_ref=${apiRef}, amount=${amount}`);

    // Only process COMPLETE payments
    if (state !== "COMPLETE") {
      console.log(`Payment not complete (state: ${state}), acknowledging...`);
      return NextResponse.json({ received: true, state });
    }

    // Check if this is a topup payment
    const isTopupPayment = apiRef.startsWith("TOPUP-") || apiRef.startsWith("TOPUP_");

    if (!isTopupPayment) {
      console.log(`Not a topup payment (api_ref: ${apiRef}), skipping...`);
      return NextResponse.json({ received: true, skipped: true });
    }

    // Extract user ID from api_ref
    // Format: TOPUP-userIdPart-timestamp
    const parts = apiRef.split(/[-_]/);
    const userIdPart = parts[1];

    if (!userIdPart) {
      console.error("Could not extract userId from api_ref:", apiRef);
      return NextResponse.json({ received: true, error: "Invalid api_ref format" });
    }

    // Find user by matching the start of their ID
    const user = await prisma.user.findFirst({
      where: {
        id: { startsWith: userIdPart },
      },
    });

    if (!user) {
      console.error(`User not found for userIdPart: ${userIdPart}`);
      return NextResponse.json({ received: true, error: "User not found" });
    }

    // Process the topup
    await prisma.$transaction(async (tx) => {
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
          description: `Wallet Top-up (Ref: ${invoiceId || apiRef})`,
        },
      });
    });

    console.log(`✅ Wallet topup completed for user: ${user.id} (${user.email}), amount: ${amount}`);
    return NextResponse.json({ received: true, success: true, userId: user.id, amount });
  } catch (error) {
    console.error("[WALLET_TOPUP_WEBHOOK_ERROR]", error);
    // Return 200 to prevent IntaSend from retrying
    return NextResponse.json({ received: true, error: "Processing error" });
  }
}
