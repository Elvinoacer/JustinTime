import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const RECENT_SETTLED_LIMIT = 10;
const RECENT_PENDING_LIMIT = 10;

export async function GET(req: Request) {
  try {
    void req;

    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const wallet = await prisma.wallet.upsert({
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

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      recentSettledTransactions,
      recentPendingTransactions,
      pendingIncomingAgg,
      pendingOutgoingAgg,
      pendingTopUpsCount,
      processingTopUpsCount,
      failedTopUpsCount,
      monthlyDebitAgg,
      monthlyDebitCount,
    ] = await prisma.$transaction([
      prisma.transaction.findMany({
        where: {
          walletId: wallet.id,
          status: "SETTLED",
        },
        orderBy: { createdAt: "desc" },
        take: RECENT_SETTLED_LIMIT,
      }),
      prisma.transaction.findMany({
        where: {
          walletId: wallet.id,
          status: { in: ["PENDING", "PROCESSING"] },
        },
        orderBy: { createdAt: "desc" },
        take: RECENT_PENDING_LIMIT,
      }),
      prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          status: { in: ["PENDING", "PROCESSING"] },
          direction: "CREDIT",
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          status: { in: ["PENDING", "PROCESSING"] },
          direction: "DEBIT",
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.walletTopUp.count({
        where: {
          walletId: wallet.id,
          status: "PENDING",
        },
      }),
      prisma.walletTopUp.count({
        where: {
          walletId: wallet.id,
          status: "PROCESSING",
        },
      }),
      prisma.walletTopUp.count({
        where: {
          walletId: wallet.id,
          status: { in: ["FAILED", "CANCELLED", "REVERSED"] },
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          status: "SETTLED",
          direction: "DEBIT",
          createdAt: {
            gte: startOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.count({
        where: {
          walletId: wallet.id,
          status: "SETTLED",
          direction: "DEBIT",
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),
    ]);

    const monthlySpent = Number(monthlyDebitAgg._sum.amount || 0);
    const pendingIncoming = Number(
      pendingIncomingAgg._sum.amount || wallet.pendingBalance || 0,
    );
    const pendingOutgoing = Number(pendingOutgoingAgg._sum.amount || 0);

    return NextResponse.json({
      id: wallet.id,
      userId: wallet.userId,
      currency: wallet.currency || "KES",
      availableBalance: wallet.balance,
      balance: wallet.balance,
      pendingBalance: wallet.pendingBalance,
      pendingIncoming,
      pendingOutgoing,
      creditBalance: wallet.creditBalance,
      monthlyStats: {
        startOfMonth,
        spent: monthlySpent,
        transactionCount: monthlyDebitCount,
        averageSpent:
          monthlyDebitCount > 0 ? monthlySpent / monthlyDebitCount : 0,
      },
      topUpStats: {
        pendingCount: pendingTopUpsCount,
        processingCount: processingTopUpsCount,
        failedCount: failedTopUpsCount,
      },
      recentSettledTransactions,
      recentPendingTransactions,
      // Backward-compatible field for legacy consumers.
      transactions: recentSettledTransactions,
    });
  } catch (error) {
    console.error("[WALLET_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
