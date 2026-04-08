import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getCollectionService, getBaseUrl } from "@/lib/intasend";
import { SUBSCRIPTION_PRICES } from "@/lib/constants/pricing";
import { ensureSubscriptionPaymentIntent } from "@/lib/payments/payment-intents";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();

    // Validate plan
    if (!plan || !["PRO", "BUSINESS"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid subscription plan" },
        { status: 400 },
      );
    }

    // Get amount for the plan
    const amount =
      SUBSCRIPTION_PRICES[plan as keyof typeof SUBSCRIPTION_PRICES];

    const collection = getCollectionService();
    const normalizedUserId = session.user.id.replace(/[^a-zA-Z0-9]/g, "");
    const apiRef = `SUB-${plan}-${normalizedUserId}-${Date.now().toString(36)}`;
    const redirectUrl = `${getBaseUrl()}/dashboard/premium/complete`;

    const checkoutSession = await collection.charge({
      first_name: session.user.name?.split(" ")[0] || "User",
      last_name: session.user.name?.split(" ").slice(1).join(" ") || "",
      email: session.user.email || "",
      amount,
      currency: "KES",
      api_ref: apiRef,
      redirect_url: redirectUrl,
      meta: {
        userId: session.user.id,
        plan,
        type: "subscription",
      },
    });

    await prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({
        where: { userId: session.user.id },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: session.user.id,
            balance: 0,
            pendingBalance: 0,
            currency: "KES",
          },
        });
      }

      const pendingProviderRef = `INTASEND:SUBSCRIPTION:PENDING:${apiRef}`;

      const pendingTx = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: "PAYMENT",
          status: "PENDING",
          direction: "DEBIT",
          category: "SUBSCRIPTION",
          currency: "KES",
          gateway: "INTASEND",
          gatewayReference: apiRef,
          gatewaySessionId: checkoutSession.id
            ? String(checkoutSession.id)
            : null,
          providerRef: pendingProviderRef,
          sourceType: "SUBSCRIPTION",
          sourceId: plan,
          createdByType: "USER",
          description: `Subscription payment pending (${plan}) [Ref:${apiRef}]`,
        },
      });

      await ensureSubscriptionPaymentIntent(tx, {
        userId: session.user.id,
        walletId: wallet.id,
        apiRef,
        amountExpected: amount,
        currency: "KES",
        sourceId: pendingTx.id,
        gatewaySessionId: checkoutSession.id
          ? String(checkoutSession.id)
          : null,
        providerRef: pendingProviderRef,
        initiationPayload: checkoutSession,
        metadata: {
          apiRef,
          plan,
          source: "subscription_initiate",
          checkoutUrl: checkoutSession.url || null,
        },
      });
    });

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      amount,
      plan,
      apiRef,
    });
  } catch (error) {
    console.error("Error initiating subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
