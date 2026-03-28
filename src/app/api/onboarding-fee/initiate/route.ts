import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCollectionService,
  getBaseUrl,
  generateApiRef,
  PAYMENT_AMOUNTS,
} from "@/lib/intasend";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user already paid
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (
      profile?.hasPaidOnboardingFee ||
      profile?.onboardingFeeWaived ||
      profile?.verificationStatus === "VERIFIED" ||
      profile?.isVerified
    ) {
      return NextResponse.json(
        {
          error: "Verification access is already active for this account",
          alreadyActivated: true,
        },
        { status: 400 },
      );
    }

    // Generate API reference (alphanumeric + hyphens only)
    const apiRef = generateApiRef("ONBOARD", session.user.id);

    // Simple redirect URL without query params (IntaSend is strict about URL format)
    const baseUrl = getBaseUrl();
    const redirectUrl = `${baseUrl}/dashboard/onboarding-complete`;

    console.log("Initiating onboarding fee payment:", {
      apiRef,
      redirectUrl,
      amount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
    });

    // Use IntaSend SDK collection service
    const collection = getCollectionService();

    // Create checkout session using SDK
    const response = await collection.charge({
      first_name: session.user.name?.split(" ")[0] || "User",
      last_name: session.user.name?.split(" ").slice(1).join(" ") || "",
      email: session.user.email || "",
      amount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
      currency: "KES",
      api_ref: apiRef,
      redirect_url: redirectUrl,
    });

    console.log("IntaSend checkout response:", response);

    // Ensure wallet exists for the user (create if not)
    const wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    });

    if (!wallet) {
      await prisma.wallet.create({
        data: {
          userId: session.user.id,
          balance: 0,
        },
      });
    }

    // Store the pending payment reference for webhook matching
    // The SDK returns the checkout URL in response.url
    return NextResponse.json({
      checkoutUrl: response.url,
      sessionId: response.id,
      apiRef: apiRef,
      amount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
    });
  } catch (error: any) {
    console.error("[ONBOARDING_FEE_INITIATE]", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate payment" },
      { status: 500 },
    );
  }
}
