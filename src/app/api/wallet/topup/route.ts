import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import {
  getCollectionService,
  getBaseUrl,
  generateApiRef,
  PAYMENT_AMOUNTS,
} from "@/lib/intasend";

function normalizeReturnPath(path?: string): string | null {
  if (!path || typeof path !== "string") {
    return null;
  }

  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const amount = Number(body?.amount);
    const requestedReturnUrl = normalizeReturnPath(body?.returnUrl);

    if (!amount || amount < PAYMENT_AMOUNTS.MIN_TOPUP) {
      return NextResponse.json(
        {
          error: `Invalid amount. Minimum top-up is KES ${PAYMENT_AMOUNTS.MIN_TOPUP}.`,
        },
        { status: 400 },
      );
    }

    // Generate API reference (alphanumeric + hyphens only)
    const apiRef = generateApiRef("TOPUP", session.user.id);

    // Simple redirect URL without query params (IntaSend is strict about URL format)
    const baseUrl = getBaseUrl();
    const defaultReturnPath = hasRole(session.user, "PROVIDER")
      ? "/dashboard/wallet/topup-complete"
      : "/client/wallet/topup-complete";
    const redirectUrl = `${baseUrl}${requestedReturnUrl || defaultReturnPath}`;

    console.log("Initiating wallet topup:", {
      apiRef,
      redirectUrl,
      amount,
    });

    // Use IntaSend SDK collection service
    const collection = getCollectionService();

    // Create checkout session using SDK
    const response = await collection.charge({
      first_name: session.user.name?.split(" ")[0] || "User",
      last_name: session.user.name?.split(" ").slice(1).join(" ") || "",
      email: session.user.email || "",
      amount,
      currency: "KES",
      api_ref: apiRef,
      redirect_url: redirectUrl,
    });

    console.log("IntaSend topup checkout response:", response);

    const topUp = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: session.user.id },
        update: {
          currency: "KES",
        },
        create: {
          userId: session.user.id,
          balance: 0,
          pendingBalance: 0,
          currency: "KES",
        },
      });

      const existingTopUp = await tx.walletTopUp.findUnique({
        where: { apiRef },
      });

      if (existingTopUp) {
        return existingTopUp;
      }

      const createdTopUp = await tx.walletTopUp.create({
        data: {
          userId: session.user.id,
          walletId: wallet.id,
          amountExpected: amount,
          currency: "KES",
          status: "PENDING",
          gateway: "INTASEND",
          apiRef,
          gatewaySessionId: response.id ? String(response.id) : null,
          checkoutUrl: response.url || null,
          initiatedAt: new Date(),
          rawInitiationPayload: response,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          topUpId: createdTopUp.id,
          amount,
          type: "DEPOSIT",
          status: "PENDING",
          direction: "CREDIT",
          category: "TOPUP",
          currency: "KES",
          gateway: "INTASEND",
          gatewayReference: apiRef,
          gatewaySessionId: response.id ? String(response.id) : null,
          providerRef: `INTASEND:WALLET:TOPUP:${apiRef}`,
          sourceType: "WALLET_TOPUP",
          sourceId: createdTopUp.id,
          createdByType: "USER",
          description: `Wallet Top-up initiated [Ref:${apiRef}]`,
          metadata: {
            apiRef,
            checkoutUrl: response.url,
          },
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: { increment: amount },
        },
      });

      return createdTopUp;
    });

    return NextResponse.json({
      checkoutUrl: response.url,
      sessionId: response.id,
      apiRef: apiRef,
      topUpId: topUp.id,
      status: topUp.status,
    });
  } catch (error: unknown) {
    console.error("[WALLET_TOPUP_INITIATE]", error);
    const message =
      error instanceof Error ? error.message : "Failed to initiate topup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
