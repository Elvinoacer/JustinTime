import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getWalletTransactionsForUser } from "@/lib/wallet/queries";
import {
  getWalletSchemaOutOfSyncMessage,
  isWalletSchemaOutOfSyncError,
} from "@/lib/wallet/errors";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const result = await getWalletTransactionsForUser(session.user.id, {
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
      type: searchParams.get("type") || undefined,
      status: searchParams.get("status") || undefined,
      direction: searchParams.get("direction") || undefined,
      category: searchParams.get("category") || undefined,
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[TRANSACTIONS_GET]", error);

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
      { error: "Unable to load wallet transactions right now" },
      { status: 500 },
    );
  }
}
