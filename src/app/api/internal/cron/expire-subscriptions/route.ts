import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { sendSubscriptionExpirationEmail } from "@/lib/email";

function hasSecretAccess(request: Request) {
  const expectedSecret = process.env.SUBSCRIPTION_EXPIRY_CRON_SECRET;
  if (!expectedSecret) {
    return false;
  }

  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  if (headerSecret && headerSecret === expectedSecret) {
    return true;
  }

  if (bearer && bearer.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim() === expectedSecret;
  }

  return false;
}

async function executeExpiryJob(request: Request) {
  const secretAuthorized = hasSecretAccess(request);

  if (!secretAuthorized) {
    const session = await auth();
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const now = new Date();

  const expiredSubscriptions = await prisma.subscription.findMany({
    where: {
      isActive: true,
      plan: {
        in: ["PRO", "BUSINESS"],
      },
      endDate: {
        not: null,
        lte: now,
      },
    },
    select: {
      id: true,
      userId: true,
      plan: true,
      endDate: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  if (expiredSubscriptions.length === 0) {
    return NextResponse.json({
      success: true,
      expiredCount: 0,
      notifiedCount: 0,
      emailsSent: 0,
    });
  }

  const subscriptionIds = expiredSubscriptions.map(
    (subscription) => subscription.id,
  );

  await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: {
        id: {
          in: subscriptionIds,
        },
      },
      data: {
        isActive: false,
        plan: "FREE",
      },
    });

    await tx.notification.createMany({
      data: expiredSubscriptions.map((subscription) => ({
        userId: subscription.userId,
        title: "Subscription Expired",
        message:
          "Your premium subscription has expired. Upgrade to continue enjoying premium features.",
        type: "SYSTEM",
      })),
    });
  });

  let emailsSent = 0;
  for (const subscription of expiredSubscriptions) {
    const userEmail = subscription.user?.email;
    const userName = subscription.user?.name;
    if (!userEmail || !userName) {
      continue;
    }

    const sent = await sendSubscriptionExpirationEmail(
      userEmail,
      userName,
      subscription.plan,
    );

    if (sent) {
      emailsSent += 1;
    }
  }

  return NextResponse.json({
    success: true,
    expiredCount: expiredSubscriptions.length,
    notifiedCount: expiredSubscriptions.length,
    emailsSent,
  });
}

export async function GET(request: Request) {
  try {
    return await executeExpiryJob(request);
  } catch (error) {
    console.error("[EXPIRE_SUBSCRIPTIONS_CRON_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await executeExpiryJob(request);
  } catch (error) {
    console.error("[EXPIRE_SUBSCRIPTIONS_CRON_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
