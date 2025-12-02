import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSubscriptionActivationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verify webhook signature (IntaSend sends signature in headers)
    const signature = req.headers.get("x-intasend-signature");
    
    // Log webhook for debugging
    console.log("=== IntaSend Webhook Received ===");
    console.log("Payload:", JSON.stringify(body, null, 2));
    
    const {
      state,
      checkout_id,
      invoice_id,
      api_ref,
      value,
      account,
      failed_reason,
      meta,
      challenge,
    } = body;

    // CRITICAL: Validate challenge token
    const expectedChallenge = process.env.INTASEND_WEBHOOK_CHALLENGE;
    
    if (!expectedChallenge) {
      console.error("INTASEND_WEBHOOK_CHALLENGE not configured in environment");
      return NextResponse.json(
        { error: "Webhook not properly configured" },
        { status: 500 }
      );
    }

    if (challenge !== expectedChallenge) {
      console.error("Invalid challenge token received");
      console.error(`Expected: ${expectedChallenge}, Received: ${challenge}`);
      return NextResponse.json(
        { error: "Invalid challenge token" },
        { status: 401 }
      );
    }

    console.log("✅ Challenge token validated successfully");

    // Only process completed payments
    if (state !== "COMPLETE") {
      console.log(`Payment not complete. State: ${state}`);
      if (failed_reason) {
        console.log(`Failed reason: ${failed_reason}`);
      }
      return NextResponse.json({ message: "Payment not complete", state });
    }

    // Extract metadata - IntaSend uses 'meta' field
    const metadata = meta || {};
    const userId = metadata.userId;
    const plan = metadata.plan;

    if (!userId || !plan) {
      console.error("Missing userId or plan in webhook metadata:", metadata);
      return NextResponse.json(
        { error: "Invalid webhook data - missing userId or plan" },
        { status: 400 }
      );
    }

    console.log(`Processing subscription for user ${userId}, plan: ${plan}`);

    // Get user details for email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Calculate subscription end date (30 days from now)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 1 month = 30 days

    console.log(`Subscription period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Check if subscription already exists and is active to prevent duplicate processing
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (existingSubscription?.plan === plan && existingSubscription?.isActive) {
      console.log(`⚠️  Subscription already active for user ${userId} with plan ${plan}. Skipping duplicate webhook.`);
      return NextResponse.json({
        message: "Subscription already active - webhook already processed",
        subscription: existingSubscription,
      });
    }

    // Update or create subscription
    const subscription = await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: plan,
        startDate: startDate,
        endDate: endDate,
        isActive: true,
      },
      create: {
        userId,
        plan: plan,
        startDate: startDate,
        endDate: endDate,
        isActive: true,
      },
    });

    console.log(`Subscription updated successfully:`, subscription);

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId,
        title: "Subscription Activated",
        message: `Your ${plan} subscription has been activated successfully! Enjoy premium features for 30 days.`,
        type: "PAYMENT",
      },
    });

    // Send activation email
    if (user.email && user.name) {
      await sendSubscriptionActivationEmail(
        user.email,
        user.name,
        plan,
        endDate
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
      { status: 500 }
    );
  }
}
