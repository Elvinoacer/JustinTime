import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/auth/roles";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    // Only admins can waive fees
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: userId } = await params;
    const { waive } = await req.json();

    // Find the user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    const updatedProfile = await prisma.$transaction(async (tx) => {
      const profileUpdate = await tx.profile.update({
        where: { userId },
        data: {
          onboardingFeeWaived: waive,
          onboardingFeeWaivedBy: waive ? session.user.id : null,
          onboardingFeeWaivedAt: waive ? new Date() : null,
          hasPaidOnboardingFee: waive ? true : profile.hasPaidOnboardingFee,
          verificationStatus: waive ? "VERIFIED" : profile.verificationStatus,
          premiumPricingEnabled: waive ? true : profile.premiumPricingEnabled,
          premiumMultiplier: waive ? 1.1 : profile.premiumMultiplier,
        },
      });

      if (waive && !profile.onboardingFeeWaived) {
        let wallet = await tx.wallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              userId,
              balance: 0,
            },
          });
        }

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: 0,
            type: "ONBOARDING_FEE",
            description: `Onboarding Fee Waiver [Admin:${session.user.id}]`,
          },
        });
      }

      await tx.adminLog.create({
        data: {
          adminId: session.user.id,
          action: waive ? "WAIVED_ONBOARDING_FEE" : "REVOKED_FEE_WAIVER",
          targetId: userId,
          details: {
            userName: profile.user.name,
            userEmail: profile.user.email,
            autoVerified: waive,
            waivedAt: waive ? new Date().toISOString() : null,
          },
        },
      });

      return profileUpdate;
    });

    return NextResponse.json({
      success: true,
      waived: updatedProfile.onboardingFeeWaived,
      isVerified: updatedProfile.verificationStatus === "VERIFIED",
      verificationStatus: updatedProfile.verificationStatus,
      message: waive
        ? "Onboarding fee waived. Verification access and privileges granted."
        : "Fee waiver has been revoked",
    });
  } catch (error: any) {
    console.error("[WAIVE_FEE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update waiver status" },
      { status: 500 },
    );
  }
}
