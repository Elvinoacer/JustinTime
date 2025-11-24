import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
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
        },
      });
    }

    return NextResponse.json({
      balance: wallet.balance,
      currency: "KES",
    });
  } catch (error) {
    console.error("[WALLET_BALANCE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
