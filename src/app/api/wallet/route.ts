import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 10, // Get last 10 transactions
        },
      },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: session.user.id,
          balance: 0,
        },
        include: {
          transactions: true,
        },
      });
    }

    return NextResponse.json(wallet);
  } catch (error) {
    console.error("[WALLET_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
