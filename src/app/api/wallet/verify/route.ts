import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    void req;
    return NextResponse.json(
      {
        error:
          "This endpoint is disabled. Wallet credits are applied only by verified payment webhooks.",
      },
      { status: 410 },
    );
  } catch (error) {
    console.error("[WALLET_VERIFY]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
