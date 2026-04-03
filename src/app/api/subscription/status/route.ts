import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    const now = new Date();
    const hasStoredSubscription = Boolean(subscription);
    const isExpired = Boolean(
      subscription?.endDate && subscription.endDate.getTime() <= now.getTime(),
    );
    const isActive = Boolean(subscription?.isActive) && !isExpired;
    const effectivePlan =
      hasStoredSubscription && isActive ? subscription!.plan : "FREE";

    let daysRemaining = null;
    if (subscription?.endDate && isActive && effectivePlan !== "FREE") {
      const diffTime = subscription.endDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      subscription: {
        plan: effectivePlan,
        isActive,
        startDate: subscription?.startDate || null,
        endDate: subscription?.endDate || null,
        daysRemaining,
        isPremium: effectivePlan !== "FREE" && isActive,
        hasExpired: isExpired,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
