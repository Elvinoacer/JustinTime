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
import {
  getWalletSchemaOutOfSyncMessage,
  isWalletSchemaOutOfSyncError,
} from "@/lib/wallet/errors";

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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    }

    const amount = Number(body?.amount);
    const requestedReturnUrl = normalizeReturnPath(body?.returnUrl);

    if (!Number.isFinite(amount) || amount < PAYMENT_AMOUNTS.MIN_TOPUP) {
      return NextResponse.json(
        {
          error: `Invalid amount. Minimum top-up is KES ${PAYMENT_AMOUNTS.MIN_TOPUP}.`,
        },
        { status: 400 },
      );
    }

    const email = String(session.user.email || "")
      .trim()
      .toLowerCase();
    if (!email) {
      return NextResponse.json(
        {
          error:
            "Your account email is required before initiating wallet payments.",
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
      email,
      amount,
      currency: "KES",
      api_ref: apiRef,
      redirect_url: redirectUrl,
    });

    const checkoutUrl =
      response && typeof response.url === "string" ? response.url.trim() : "";

    if (!checkoutUrl) {
      return NextResponse.json(
        {
          error:
            "Payment provider did not return a checkout URL. Please try again.",
        },
        { status: 502 },
      );
    }

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
          checkoutUrl,
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
            checkoutUrl,
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
      checkoutUrl,
      sessionId: response.id,
      apiRef: apiRef,
      topUpId: topUp.id,
      status: topUp.status,
    });
  } catch (error: unknown) {
    console.error("[WALLET_TOPUP_INITIATE]", error);

    if (isWalletSchemaOutOfSyncError(error)) {
      return NextResponse.json(
        {
          error: getWalletSchemaOutOfSyncMessage(),
          code: "WALLET_SCHEMA_OUT_OF_SYNC",
        },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "";

    if (/IntaSend API keys not configured/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Wallet payments are temporarily unavailable. Please try again shortly.",
        },
        { status: 503 },
      );
    }

    if (/ECONN|ENOTFOUND|ETIMEDOUT|Network Error/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Payment provider is currently unreachable. Please retry in a moment.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Failed to initiate wallet top-up. Please try again." },
      { status: 500 },
    );
  }
}
