import { auth } from "@/auth";
import { getWalletSummaryForUser } from "@/lib/wallet/queries";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    void req;

    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const summary = await getWalletSummaryForUser(session.user.id);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[WALLET_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
