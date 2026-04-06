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
    const shouldWaive = waive === true;

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
      const paidOnboardingFee = await tx.transaction.findFirst({
        where: {
          wallet: {
            userId,
          },
          type: "ONBOARDING_FEE",
          status: "SETTLED",
          amount: {
            gt: 0,
          },
        },
        select: {
          id: true,
        },
      });

      const profileUpdate = await tx.profile.update({
        where: { userId },
        data: {
          onboardingFeeWaived: shouldWaive,
          onboardingFeeWaivedBy: shouldWaive ? session.user.id : null,
          onboardingFeeWaivedAt: shouldWaive ? new Date() : null,
          hasPaidOnboardingFee: shouldWaive ? true : Boolean(paidOnboardingFee),
        },
      });

      if (shouldWaive && !profile.onboardingFeeWaived) {
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
          action: shouldWaive ? "WAIVED_ONBOARDING_FEE" : "REVOKED_FEE_WAIVER",
          targetId: userId,
          details: {
            userName: profile.user.name,
            userEmail: profile.user.email,
            waived: shouldWaive,
            hasPaidOnboardingFeeAfter: profileUpdate.hasPaidOnboardingFee,
            waivedAt: shouldWaive ? new Date().toISOString() : null,
          },
        },
      });

      return profileUpdate;
    });

    return NextResponse.json({
      success: true,
      waived: updatedProfile.onboardingFeeWaived,
      hasPaidOnboardingFee: updatedProfile.hasPaidOnboardingFee,
      message: shouldWaive
        ? "Onboarding fee waived. Marketplace access is now unlocked."
        : "Fee waiver has been revoked.",
    });
  } catch (error: any) {
    console.error("[WAIVE_FEE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update waiver status" },
      { status: 500 },
    );
  }
}
