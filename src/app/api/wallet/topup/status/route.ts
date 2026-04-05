import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getWalletSchemaOutOfSyncMessage,
  isWalletSchemaOutOfSyncError,
} from "@/lib/wallet/errors";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const apiRef = String(
      searchParams.get("apiRef") || searchParams.get("api_ref") || "",
    ).trim();
    const topUpId = String(searchParams.get("topUpId") || "").trim();

    if (!apiRef && !topUpId) {
      return NextResponse.json(
        { error: "Provide either apiRef or topUpId" },
        { status: 400 },
      );
    }

    const topUp = await prisma.walletTopUp.findFirst({
      where: {
        userId: session.user.id,
        ...(topUpId ? { id: topUpId } : { apiRef }),
      },
      include: {
        ledgerEntries: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!topUp) {
      return NextResponse.json({ error: "Top-up not found" }, { status: 404 });
    }

    const latestLedger = topUp.ledgerEntries[0] || null;
    const isTerminal = ["SETTLED", "FAILED", "CANCELLED", "REVERSED"].includes(
      topUp.status,
    );

    return NextResponse.json({
      topUpId: topUp.id,
      apiRef: topUp.apiRef,
      status: topUp.status,
      currency: topUp.currency,
      amountExpected: topUp.amountExpected,
      amountReceived: topUp.amountReceived,
      gateway: topUp.gateway,
      gatewaySessionId: topUp.gatewaySessionId,
      gatewayInvoiceId: topUp.gatewayInvoiceId,
      checkoutUrl: topUp.checkoutUrl,
      initiatedAt: topUp.initiatedAt,
      confirmedAt: topUp.confirmedAt,
      failedAt: topUp.failedAt,
      cancelledAt: topUp.cancelledAt,
      reversedAt: topUp.reversedAt,
      failureReason: topUp.failureReason,
      isTerminal,
      transaction: latestLedger
        ? {
            id: latestLedger.id,
            amount: latestLedger.amount,
            type: latestLedger.type,
            status: latestLedger.status,
            direction: latestLedger.direction,
            category: latestLedger.category,
            providerRef: latestLedger.providerRef,
            gatewayReference: latestLedger.gatewayReference,
            gatewaySessionId: latestLedger.gatewaySessionId,
            createdAt: latestLedger.createdAt,
            settledAt: latestLedger.settledAt,
            failedAt: latestLedger.failedAt,
            cancelledAt: latestLedger.cancelledAt,
            reversedAt: latestLedger.reversedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("[WALLET_TOPUP_STATUS_GET]", error);

    if (isWalletSchemaOutOfSyncError(error)) {
      return NextResponse.json(
        {
          error: getWalletSchemaOutOfSyncMessage(),
          code: "WALLET_SCHEMA_OUT_OF_SYNC",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Unable to fetch top-up status right now" },
      { status: 500 },
    );
  }
}
