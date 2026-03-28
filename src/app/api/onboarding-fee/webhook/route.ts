import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookChallenge, PAYMENT_AMOUNTS } from "@/lib/intasend";

export async function POST(req: Request) {
  try {
    // Parse webhook payload
    const body = await req.json();

    console.log("=== IntaSend Onboarding Webhook ===");
    console.log("Payload:", JSON.stringify(body, null, 2));

    // Handle challenge verification (IntaSend sends this to verify endpoint)
    if (body.challenge) {
      if (verifyWebhookChallenge(body.challenge)) {
        console.log("✅ Challenge verified successfully");
        return NextResponse.json({ challenge: body.challenge });
      } else {
        console.error("❌ Challenge verification failed");
        return NextResponse.json(
          { error: "Invalid challenge" },
          { status: 401 },
        );
      }
    }

    // Acknowledge receipt immediately (IntaSend expects quick 200 response)
    // Process the rest asynchronously in production

    // Extract payment state and reference
    const state = body.state || body.invoice?.state;
    const apiRef = body.api_ref || body.invoice?.api_ref || "";
    const invoiceId = body.invoice_id || body.id;

    console.log(
      `Processing webhook: state=${state}, api_ref=${apiRef}, invoice=${invoiceId}`,
    );

    // Only process COMPLETE payments
    if (state !== "COMPLETE") {
      console.log(`Payment not complete (state: ${state}), acknowledging...`);
      return NextResponse.json({ received: true, state });
    }

    // Check if this is an onboarding fee payment
    // New format: ONBOARD-xxxxxxxx-timestamp
    // Old format: ONBOARDING-xxxxxxxx-timestamp or ONBOARDING_xxxx_timestamp
    const isOnboardingPayment =
      apiRef.startsWith("ONBOARD-") ||
      apiRef.startsWith("ONBOARDING-") ||
      apiRef.startsWith("ONBOARDING_");

    if (!isOnboardingPayment) {
      console.log(
        `Not an onboarding payment (api_ref: ${apiRef}), skipping...`,
      );
      return NextResponse.json({ received: true, skipped: true });
    }

    // Extract user ID from api_ref
    // Format: PREFIX-userIdPart-timestamp
    const parts = apiRef.split(/[-_]/);
    const userIdPart = parts[1]; // Second part is the user ID portion

    if (!userIdPart) {
      console.error("Could not extract userId from api_ref:", apiRef);
      return NextResponse.json({
        received: true,
        error: "Invalid api_ref format",
      });
    }

    // Find user by matching the start of their ID
    const user = await prisma.user.findFirst({
      where: {
        id: { startsWith: userIdPart },
      },
      include: { profile: true },
    });

    if (!user) {
      console.error(`User not found for userIdPart: ${userIdPart}`);
      return NextResponse.json({ received: true, error: "User not found" });
    }

    // Check if already processed
    if (
      user.profile?.hasPaidOnboardingFee ||
      user.profile?.onboardingFeeWaived
    ) {
      console.log(`Onboarding already paid for user: ${user.id}`);
      return NextResponse.json({
        received: true,
        message: "Already processed",
      });
    }

    // Process the payment
    await prisma.$transaction(async (tx) => {
      // 1. Update profile to mark fee as paid and fully activated
      await tx.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          hasPaidOnboardingFee: true,
          verificationStatus: "VERIFIED",
          isVerified: true,
          premiumPricingEnabled: true,
          premiumMultiplier: 1.1,
        },
        update: {
          hasPaidOnboardingFee: true,
          verificationStatus: "VERIFIED",
          isVerified: true,
          premiumPricingEnabled: true,
          premiumMultiplier: 1.1,
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

      // 3. Record the transaction
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
          type: "ONBOARDING_FEE",
          description: `Provider Onboarding Fee Payment (Ref: ${invoiceId || apiRef})`,
        },
      });

      // 4. Record access grant in audit log for admin filtering/traceability
      await tx.adminLog.create({
        data: {
          adminId: user.id,
          action: "ONBOARDING_FEE_PAID_ACCESS_GRANTED",
          targetId: user.id,
          details: {
            source: "intasend_webhook",
            invoiceId: String(invoiceId || ""),
            apiRef,
          },
        },
      });
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
    // Return 200 to prevent IntaSend from retrying
    // Log the error for debugging
    return NextResponse.json({ received: true, error: "Processing error" });
  }
}
