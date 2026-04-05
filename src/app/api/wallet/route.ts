import { auth } from "@/auth";
import { getWalletSummaryForUser } from "@/lib/wallet/queries";
import { NextResponse } from "next/server";
import {
  getWalletSchemaOutOfSyncMessage,
  isWalletSchemaOutOfSyncError,
} from "@/lib/wallet/errors";

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
      { error: "Unable to load wallet summary right now" },
      { status: 500 },
    );
  }
}
