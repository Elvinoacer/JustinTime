import { prisma } from "@/lib/prisma";

type CompletionResult = {
  completed: number;
  rewarded: number;
};

const REFERRAL_REWARD_SOURCE_TYPE = "REFERRAL_REWARD_SIGNUP";

function toRewardAmount(points: number): number {
  // 100 points = 1 KES of wallet credit.
  return Number((points / 100).toFixed(2));
}

export async function completePendingSignupReferralsForUser(
  userId: string,
): Promise<CompletionResult> {
  const pendingReferrals = await prisma.referral.findMany({
    where: {
      referredUserId: userId,
      type: "SIGNUP",
      status: "PENDING",
    },
    select: {
      id: true,
      referrerId: true,
      points: true,
    },
  });

  let completed = 0;
  let rewarded = 0;

  for (const referral of pendingReferrals) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const completedReferral = await tx.referral.updateMany({
          where: {
            id: referral.id,
            status: "PENDING",
          },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

        if (completedReferral.count !== 1) {
          return { completed: false, rewarded: false };
        }

        const rewardAmount = toRewardAmount(referral.points);
        if (rewardAmount <= 0) {
          return { completed: true, rewarded: false };
        }

        const existingReward = await tx.transaction.findFirst({
          where: {
            sourceType: REFERRAL_REWARD_SOURCE_TYPE,
            sourceId: referral.id,
          },
          select: { id: true },
        });

        if (existingReward) {
          return { completed: true, rewarded: false };
        }

        const wallet = await tx.wallet.upsert({
          where: { userId: referral.referrerId },
          update: {},
          create: {
            userId: referral.referrerId,
            balance: 0,
            pendingBalance: 0,
            currency: "KES",
          },
          select: {
            id: true,
            currency: true,
          },
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: rewardAmount,
            },
          },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: rewardAmount,
            type: "EARNING",
            status: "SETTLED",
            direction: "CREDIT",
            category: "EARNING",
            currency: wallet.currency || "KES",
            sourceType: REFERRAL_REWARD_SOURCE_TYPE,
            sourceId: referral.id,
            description: "Referral signup reward credited",
            metadata: {
              referralId: referral.id,
              referrerId: referral.referrerId,
              referredUserId: userId,
              points: referral.points,
              creditedAmount: rewardAmount,
            },
            settledAt: new Date(),
            createdByType: "SYSTEM",
          },
        });

        return { completed: true, rewarded: true };
      });

      if (result.completed) {
        completed += 1;
      }
      if (result.rewarded) {
        rewarded += 1;
      }
    } catch (error) {
      console.error("[REFERRAL_SIGNUP_REWARD_ERROR]", {
        referralId: referral.id,
        referrerId: referral.referrerId,
        referredUserId: userId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { completed, rewarded };
}
