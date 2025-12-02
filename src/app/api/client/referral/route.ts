import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";

// Generate a unique referral code
function generateReferralCode(): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "JIT-";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get or create referral code for user
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
      },
    });

    // If no referral code, generate one
    if (!user?.referralCode) {
      let referralCode = generateReferralCode();
      let isUnique = false;

      // Ensure uniqueness
      while (!isUnique) {
        const existing = await prisma.user.findUnique({
          where: { referralCode },
        });
        if (!existing) {
          isUnique = true;
        } else {
          referralCode = generateReferralCode();
        }
      }

      // Update user with referral code
      user = await prisma.user.update({
        where: { id: userId },
        data: { referralCode },
        select: { referralCode: true },
      });
    }

    const referralCode = user.referralCode!;

    // Get referral statistics
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referredUser: {
          select: {
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalReferrals = referrals.length;
    const completedReferrals = referrals.filter(
      (r) => r.status === "COMPLETED"
    ).length;
    const totalPoints = referrals.reduce((sum, r) => sum + r.points, 0);
    const pendingRewards = referrals.filter(
      (r) => r.status === "PENDING"
    ).length;

    // Calculate redeemable value (e.g., 100 points = $1)
    const redeemableValue = (totalPoints / 100).toFixed(2);

    // Recent referrals (last 5)
    const recentReferrals = referrals.slice(0, 5).map((r) => ({
      name: r.referredUser.name || "New User",
      date: r.createdAt,
      points: r.points,
      status: r.status,
    }));

    // Tier progress
    const tiers = [
      { referrals: 5, reward: "$5 credit", completed: totalReferrals >= 5 },
      {
        referrals: 10,
        reward: "$15 credit + premium badge",
        completed: totalReferrals >= 10,
      },
      {
        referrals: 25,
        reward: "$50 credit + priority support",
        completed: totalReferrals >= 25,
      },
      {
        referrals: 50,
        reward: "$150 credit + featured listing",
        completed: totalReferrals >= 50,
      },
    ];

    const baseUrl = process.env.NEXTAUTH_URL || "https://justintime.com";
    const referralLink = `${baseUrl}/join?ref=${referralCode}`;

    const responseData = {
      referralCode,
      referralLink,
      stats: {
        totalPoints,
        redeemableValue,
        totalReferrals,
        completedReferrals,
        pendingRewards,
      },
      recentReferrals,
      tiers,
    };

    return successResponse(responseData);
  } catch (error) {
    return handleError(error);
  }
}
