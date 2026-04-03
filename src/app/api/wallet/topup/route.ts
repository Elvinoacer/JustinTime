import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import {
  getCollectionService,
  getBaseUrl,
  generateApiRef,
  PAYMENT_AMOUNTS,
} from "@/lib/intasend";

function normalizeReturnPath(path?: string): string | null {
  if (!path || typeof path !== "string") {
    return null;
  }

  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const amount = Number(body?.amount);
    const requestedReturnUrl = normalizeReturnPath(body?.returnUrl);

    if (!amount || amount < PAYMENT_AMOUNTS.MIN_TOPUP) {
      return NextResponse.json(
        {
          error: `Invalid amount. Minimum top-up is KES ${PAYMENT_AMOUNTS.MIN_TOPUP}.`,
        },
        { status: 400 },
      );
    }

    // Generate API reference (alphanumeric + hyphens only)
    const apiRef = generateApiRef("TOPUP", session.user.id);

    // Simple redirect URL without query params (IntaSend is strict about URL format)
    const baseUrl = getBaseUrl();
    const defaultReturnPath = hasRole(session.user, "PROVIDER")
      ? "/dashboard/wallet/topup-complete"
      : "/client/wallet/topup-complete";
    const redirectUrl = `${baseUrl}${requestedReturnUrl || defaultReturnPath}`;

    console.log("Initiating wallet topup:", {
      apiRef,
      redirectUrl,
      amount,
    });

    // Use IntaSend SDK collection service
    const collection = getCollectionService();

    // Create checkout session using SDK
    const response = await collection.charge({
      first_name: session.user.name?.split(" ")[0] || "User",
      last_name: session.user.name?.split(" ").slice(1).join(" ") || "",
      email: session.user.email || "",
      amount,
      currency: "KES",
      api_ref: apiRef,
      redirect_url: redirectUrl,
    });

    console.log("IntaSend topup checkout response:", response);

    await prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({
        where: { userId: session.user.id },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: session.user.id,
            balance: 0,
          },
        });
      }

      const pendingProviderRef = `INTASEND:WALLET:PENDING:${apiRef}`;
      const existingPending = await tx.transaction.findFirst({
        where: {
          walletId: wallet.id,
          type: "DEPOSIT",
          providerRef: pendingProviderRef,
        },
      });

      if (!existingPending) {
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount,
            type: "DEPOSIT",
            providerRef: pendingProviderRef,
            description: `Wallet Top-up Pending [Ref:${apiRef}]`,
          },
        });
      }
    });

    return NextResponse.json({
      checkoutUrl: response.url,
      sessionId: response.id,
      apiRef: apiRef,
    });
  } catch (error: any) {
    console.error("[WALLET_TOPUP_INITIATE]", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate topup" },
      { status: 500 },
    );
  }
}
