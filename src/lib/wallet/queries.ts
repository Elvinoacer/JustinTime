import prisma from "@/lib/prisma";
import {
  Prisma,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
  WalletTransactionCategory,
} from "@/generated/prisma/client";

const RECENT_SETTLED_LIMIT = 10;
const RECENT_PENDING_LIMIT = 10;

const ALLOWED_STATUSES: readonly TransactionStatus[] = [
  "PENDING",
  "PROCESSING",
  "SETTLED",
  "FAILED",
  "REVERSED",
  "CANCELLED",
];

const ALLOWED_DIRECTIONS: readonly TransactionDirection[] = ["CREDIT", "DEBIT"];

const ALLOWED_TYPES: readonly TransactionType[] = [
  "DEPOSIT",
  "WITHDRAWAL",
  "PAYMENT",
  "REFUND",
  "EARNING",
  "CREDIT_PURCHASE",
  "PROMOTION_PAYMENT",
  "ONBOARDING_FEE",
  "ADJUSTMENT",
];

const ALLOWED_CATEGORIES: readonly WalletTransactionCategory[] = [
  "TOPUP",
  "BOOKING_PAYMENT",
  "REFUND",
  "CREDIT_PURCHASE",
  "PROMOTION_PAYMENT",
  "EARNING",
  "ONBOARDING_FEE",
  "SUBSCRIPTION",
  "ADJUSTMENT",
  "OTHER",
];

export interface WalletTransactionFilters {
  page?: number | string;
  pageSize?: number | string;
  type?: string;
  status?: string;
  direction?: string;
  category?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export async function getWalletSummaryForUser(userId: string) {
  const wallet = await prisma.wallet.upsert({
    where: { userId },
    update: {
      currency: "KES",
    },
    create: {
      userId,
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

  return {
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
  };
}

function toPositiveInt(
  value: number | string | undefined,
  fallback: number,
): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function getWalletTransactionsForUser(
  userId: string,
  filters: WalletTransactionFilters = {},
) {
  const page = Math.max(1, toPositiveInt(filters.page, 1));
  const pageSize = Math.min(
    100,
    Math.max(1, toPositiveInt(filters.pageSize, 10)),
  );
  const type = String(filters.type || "")
    .trim()
    .toUpperCase();
  const status = String(filters.status || "")
    .trim()
    .toUpperCase();
  const direction = String(filters.direction || "")
    .trim()
    .toUpperCase();
  const category = String(filters.category || "")
    .trim()
    .toUpperCase();
  const dateFrom = filters.dateFrom;
  const dateTo = filters.dateTo;

  const skip = (page - 1) * pageSize;

  const where: Prisma.TransactionWhereInput = {
    wallet: {
      is: { userId },
    },
  };

  if (type && ALLOWED_TYPES.includes(type as TransactionType)) {
    where.type = type as TransactionType;
  }

  if (status) {
    if (status === "PENDING") {
      where.status = { in: ["PENDING", "PROCESSING"] };
    } else if (status === "FAILED") {
      where.status = { in: ["FAILED", "REVERSED", "CANCELLED"] };
    } else if (ALLOWED_STATUSES.includes(status as TransactionStatus)) {
      where.status = status as TransactionStatus;
    }
  }

  if (
    direction &&
    ALLOWED_DIRECTIONS.includes(direction as TransactionDirection)
  ) {
    where.direction = direction as TransactionDirection;
  }

  if (
    category &&
    ALLOWED_CATEGORIES.includes(category as WalletTransactionCategory)
  ) {
    where.category = category as WalletTransactionCategory;
  }

  if (dateFrom || dateTo) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    let hasCreatedAtFilter = false;

    if (dateFrom) {
      const parsedFrom = new Date(dateFrom);
      if (!Number.isNaN(parsedFrom.getTime())) {
        createdAtFilter.gte = parsedFrom;
        hasCreatedAtFilter = true;
      }
    }

    if (dateTo) {
      const parsedTo = new Date(dateTo);
      if (!Number.isNaN(parsedTo.getTime())) {
        createdAtFilter.lte = parsedTo;
        hasCreatedAtFilter = true;
      }
    }

    if (hasCreatedAtFilter) {
      where.createdAt = createdAtFilter;
    }
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        topUp: {
          select: {
            id: true,
            apiRef: true,
            status: true,
            amountExpected: true,
            amountReceived: true,
            gatewaySessionId: true,
            gatewayInvoiceId: true,
            failureReason: true,
          },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    items: transactions,
    total,
    page,
    pageSize,
    hasMore: skip + transactions.length < total,
  };
}
