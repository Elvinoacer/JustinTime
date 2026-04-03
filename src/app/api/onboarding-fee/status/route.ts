import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        hasPaidOnboardingFee: true,
        onboardingFeeWaived: true,
        verificationStatus: true,
      },
    });

    const hasPaidOnboardingFee = Boolean(profile?.hasPaidOnboardingFee);
    const onboardingFeeWaived = Boolean(profile?.onboardingFeeWaived);

    return NextResponse.json({
      hasPaidOnboardingFee,
      onboardingFeeWaived,
      verificationStatus: profile?.verificationStatus || "PENDING",
      isSettled: hasPaidOnboardingFee || onboardingFeeWaived,
    });
  } catch (error) {
    console.error("[ONBOARDING_FEE_STATUS]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
