import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { hasClientAccess } from "@/lib/auth/clientAccess";
import { randomInt } from "crypto";

// Generate a unique referral code
function generateReferralCode(): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "JIT-";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(randomInt(characters.length));
  }
  return code;
}

async function createUniqueReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  if (existing?.referralCode) {
    return existing.referralCode;
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = generateReferralCode();
    const codeExists = await prisma.user.findUnique({
      where: { referralCode: candidate },
      select: { id: true },
    });

    if (codeExists) {
      continue;
    }

    const updated = await prisma.user.updateMany({
      where: {
        id: userId,
        referralCode: null,
      },
      data: { referralCode: candidate },
    });

    if (updated.count === 1) {
      return candidate;
    }

    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (current?.referralCode) {
      return current.referralCode;
    }
  }

  throw new Error("Failed to allocate unique referral code");
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasClientAccess(session.user)) {
      return NextResponse.json(
        { error: "Client profile required" },
        { status: 403 },
      );
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
      },
    });

    const [
      totalReferrals,
      completedReferrals,
      pendingReferrals,
      completedPoints,
      pendingPoints,
      recentReferrals,
    ] = await Promise.all([
      prisma.referral.count({
        where: { referrerId: userId },
      }),
      prisma.referral.count({
        where: { referrerId: userId, status: "COMPLETED" },
      }),
      prisma.referral.count({
        where: { referrerId: userId, status: "PENDING" },
      }),
      prisma.referral.aggregate({
        where: { referrerId: userId, status: "COMPLETED" },
        _sum: { points: true },
      }),
      prisma.referral.aggregate({
        where: { referrerId: userId, status: "PENDING" },
        _sum: { points: true },
      }),
      prisma.referral.findMany({
        where: { referrerId: userId },
        include: {
          referredUser: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const referralCode = user?.referralCode || null;
    const totalPoints = completedPoints._sum.points || 0;
    const queuedPoints = pendingPoints._sum.points || 0;
    const redeemableValue = (totalPoints / 100).toFixed(2);

    const recentReferralItems = recentReferrals.map((r) => ({
      name: r.referredUser.name || "New User",
      date: r.createdAt,
      points: r.points,
      status: r.status,
    }));

    const tiers = [
      {
        referrals: 5,
        reward: "KES 500 service credit",
        completed: completedReferrals >= 5,
      },
      {
        referrals: 10,
        reward: "KES 1,500 credit + premium badge",
        completed: completedReferrals >= 10,
      },
      {
        referrals: 25,
        reward: "KES 5,000 credit + priority support",
        completed: completedReferrals >= 25,
      },
      {
        referrals: 50,
        reward: "KES 15,000 credit + featured listing",
        completed: completedReferrals >= 50,
      },
    ];

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      new URL(request.url).origin;
    const referralLink = referralCode
      ? `${baseUrl}/auth/signup?ref=${encodeURIComponent(referralCode)}`
      : null;

    const responseData = {
      referralCode,
      referralLink,
      needsInitialization: !referralCode,
      stats: {
        totalPoints,
        earnedPoints: totalPoints,
        pendingPoints: queuedPoints,
        redeemableValue,
        totalReferrals,
        completedReferrals,
        pendingReferrals,
        pendingRewards: pendingReferrals,
      },
      recentReferrals: recentReferralItems,
      tiers,
    };

    return successResponse(responseData);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasClientAccess(session.user)) {
      return NextResponse.json(
        { error: "Client profile required" },
        { status: 403 },
      );
    }

    const userId = session.user.id;
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    const referralCode =
      current?.referralCode || (await createUniqueReferralCode(userId));
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      new URL(request.url).origin;

    return successResponse({
      referralCode,
      referralLink: `${baseUrl}/auth/signup?ref=${encodeURIComponent(referralCode)}`,
      initialized: true,
    });
  } catch (error) {
    return handleError(error);
  }
}
