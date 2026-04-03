import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { TransactionType } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const type = searchParams.get("type");
    const skip = (page - 1) * pageSize;

    const where: {
      wallet: { userId: string };
      type?: TransactionType;
    } = {
      wallet: { userId: session.user.id },
    };

    if (
      type &&
      Object.values(TransactionType).includes(type as TransactionType)
    ) {
      where.type = type as TransactionType;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
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
