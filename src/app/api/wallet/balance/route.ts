import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getWalletSchemaOutOfSyncMessage,
  isWalletSchemaOutOfSyncError,
} from "@/lib/wallet/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    let wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: session.user.id,
          balance: 0,
          pendingBalance: 0,
          currency: "KES",
        },
      });
    }

    const pendingIncoming = await prisma.transaction.aggregate({
      where: {
        walletId: wallet.id,
        status: { in: ["PENDING", "PROCESSING"] },
        direction: "CREDIT",
      },
      _sum: {
        amount: true,
      },
    });

    return NextResponse.json({
      balance: wallet.balance,
      availableBalance: wallet.balance,
      pendingBalance: wallet.pendingBalance,
      pendingIncoming: pendingIncoming._sum.amount || wallet.pendingBalance,
      currency: wallet.currency || "KES",
    });
  } catch (error) {
    console.error("[WALLET_BALANCE]", error);

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
      { error: "Unable to load wallet balance right now" },
      { status: 500 },
    );
  }
}
