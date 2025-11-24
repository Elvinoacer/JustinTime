import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// IntaSend pricing configuration
const SUBSCRIPTION_PRICES = {
  PRO: 2999, // KES per month
  BUSINESS: 9999, // KES per month
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { plan } = await req.json();

    // Validate plan
    if (!plan || !["PRO", "BUSINESS"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid subscription plan" },
        { status: 400 }
      );
    }

    // Get amount for the plan
    const amount = SUBSCRIPTION_PRICES[plan as keyof typeof SUBSCRIPTION_PRICES];

    // IntaSend API configuration
    const intasendPublishableKey = process.env.INTASEND_PUBLISHABLE_KEY;
    const intasendSecretKey = process.env.INTASEND_SECRET_KEY;
    const isTestMode = process.env.INTASEND_TEST_MODE === "true";

    if (!intasendPublishableKey || !intasendSecretKey) {
      console.error("IntaSend API keys not configured");
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 }
      );
    }

    // Create IntaSend checkout session
    // Note: For checkout, we only need the public key in the request body, not in headers
    const apiUrl = isTestMode 
      ? "https://sandbox.intasend.com/api/v1/checkout/"
      : "https://payment.intasend.com/api/v1/checkout/";

    const checkoutData = {
      public_key: intasendPublishableKey,
      amount: amount,
      currency: "KES",
      email: session.user.email,
      first_name: session.user.name?.split(" ")[0] || "User",
      last_name: session.user.name?.split(" ").slice(1).join(" ") || "",
      phone_number: "", // Optional
      redirect_url: `${process.env.NEXTAUTH_URL}/dashboard/profile?subscription=success`,
      api_ref: `SUB_${session.user.id}_${plan}_${Date.now()}`, // Unique reference
      meta: {
        userId: session.user.id,
        plan: plan,
        type: "subscription",
      },
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // No Authorization header needed for checkout creation - public key is in body
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
      amount: amount,
      plan: plan,
    });
  } catch (error) {
    console.error("Error initiating subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
