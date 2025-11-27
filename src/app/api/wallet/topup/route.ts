import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { amount } = body;

    if (!amount || amount < 10) {
      return NextResponse.json(
        { error: "Invalid amount. Minimum top-up is KES 10." },
        { status: 400 }
      );
    }

    // IntaSend API configuration
    const intasendPublishableKey = process.env.INTASEND_PUBLISHABLE_KEY;
    const isTestMode = process.env.INTASEND_TEST_MODE === "true";

    if (!intasendPublishableKey) {
      console.error("IntaSend API keys not configured");
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 }
      );
    }

    const apiUrl = isTestMode
      ? "https://sandbox.intasend.com/api/v1/checkout/"
      : "https://payment.intasend.com/api/v1/checkout/";

    const apiRef = `TOPUP_${session.user.id}_${Date.now()}`;

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const url = new URL("/client/wallet", baseUrl);
    url.searchParams.append("payment_status", "success");
    url.searchParams.append("ref", apiRef);
    const redirect_url = url.toString();
    
    console.log("Generated Redirect URL:", redirect_url); // Debug log

    const checkoutData = {
      public_key: intasendPublishableKey,
      amount: amount,
      currency: "KES",
      email: session.user.email,
      first_name: session.user.name?.split(" ")[0] || "User",
      last_name: session.user.name?.split(" ").slice(1).join(" ") || "",
      redirect_url: redirect_url,
      api_ref: apiRef,
      meta: {
        userId: session.user.id,
        type: "wallet_topup",
      },
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(checkoutData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("IntaSend API error:", errorData);
      return NextResponse.json(
        { error: "Failed to create payment session" },
        { status: 500 }
      );
    }

    const checkoutSession = await response.json();

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      apiRef: apiRef,
    });
  } catch (error) {
    console.error("[WALLET_TOPUP_INITIATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
