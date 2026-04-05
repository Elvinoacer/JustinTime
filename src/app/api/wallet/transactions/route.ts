import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  Prisma,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
  WalletTransactionCategory,
} from "@/generated/prisma/client";

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

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)),
    );
    const type = String(searchParams.get("type") || "")
      .trim()
      .toUpperCase();
    const status = String(searchParams.get("status") || "")
      .trim()
      .toUpperCase();
    const direction = String(searchParams.get("direction") || "")
      .trim()
      .toUpperCase();
    const category = String(searchParams.get("category") || "")
      .trim()
      .toUpperCase();
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const skip = (page - 1) * pageSize;

    const where: Prisma.TransactionWhereInput = {
      wallet: {
        is: { userId: session.user.id },
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
      where.createdAt = {};

      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }

      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
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

    return NextResponse.json({
      items: transactions,
      total,
      page,
      pageSize,
      hasMore: skip + transactions.length < total,
    });
  } catch (error) {
    console.error("[TRANSACTIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
