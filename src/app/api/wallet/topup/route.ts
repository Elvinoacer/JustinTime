import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { 
  getCollectionService, 
  getBaseUrl, 
  generateApiRef,
  PAYMENT_AMOUNTS 
} from "@/lib/intasend";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { amount } = body;

    if (!amount || amount < PAYMENT_AMOUNTS.MIN_TOPUP) {
      return NextResponse.json(
        { error: `Invalid amount. Minimum top-up is KES ${PAYMENT_AMOUNTS.MIN_TOPUP}.` },
        { status: 400 }
      );
    }

    // Generate API reference (alphanumeric + hyphens only)
    const apiRef = generateApiRef("TOPUP", session.user.id);
    
    // Simple redirect URL without query params (IntaSend is strict about URL format)
    const baseUrl = getBaseUrl();
    const redirectUrl = `${baseUrl}/dashboard/wallet/topup-complete`;
    
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
      amount: amount,
      currency: "KES",
      api_ref: apiRef,
      redirect_url: redirectUrl,
    });

    console.log("IntaSend topup checkout response:", response);

    return NextResponse.json({
      checkoutUrl: response.url,
      sessionId: response.id,
      apiRef: apiRef,
    });
  } catch (error: any) {
    console.error("[WALLET_TOPUP_INITIATE]", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate topup" },
      { status: 500 }
    );
  }
}

