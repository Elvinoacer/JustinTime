import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendSubscriptionExpirationEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user's subscription
    let subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    // If no subscription exists, create a FREE plan
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          plan: "FREE",
          isActive: true,
        },
      });
    }

    // Check if subscription is expired
    if (subscription.endDate && subscription.endDate < new Date() && subscription.isActive) {
      const previousPlan = subscription.plan;
      
      // Deactivate expired subscription
      subscription = await prisma.subscription.update({
        where: { userId: session.user.id },
        data: {
          isActive: false,
          plan: "FREE", // Downgrade to FREE
        },
      });

      // Get user details for email
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true },
      });

      // Notify user
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          title: "Subscription Expired",
          message: "Your premium subscription has expired. Upgrade to continue enjoying premium features.",
          type: "SYSTEM",
        },
      });

      // Send expiration email
      if (user?.email && user?.name) {
        await sendSubscriptionExpirationEmail(
          user.email,
          user.name,
          previousPlan
        );
        console.log(`Expiration email sent to ${user.email} for expired ${previousPlan} plan`);
      }
    }

    // Calculate days remaining
    let daysRemaining = null;
    if (subscription.endDate && subscription.isActive && subscription.plan !== "FREE") {
      const now = new Date();
      const diffTime = subscription.endDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      subscription: {
        plan: subscription.plan,
        isActive: subscription.isActive,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        daysRemaining,
        isPremium: subscription.plan !== "FREE" && subscription.isActive,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
