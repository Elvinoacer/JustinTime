import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getAvailablePartnerRewards,
  getLoyaltyLeaderboard,
  getLoyaltyStatus,
  getPointHistory,
  getRedemptionHistory,
  redeemPartnerReward,
} from "@/app/actions/loyalty";
import {
  Award,
  Gift,
  Medal,
  Sparkles,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";

export const dynamic = "force-dynamic";

type RewardView = {
  id: string;
  title: string;
  description: string;
  minTierRequired: string;
  partner?: { name?: string | null } | null;
  pointsCost?: number;
  remainingGlobal?: number;
  canRedeem?: boolean;
  activeRedemptionCode?: string | null;
};

type LeaderboardView = {
  id?: string;
  rank?: number;
  points?: number;
  currentTier?: string;
  user?: {
    id?: string;
    name?: string | null;
    profile?: {
      location?: string | null;
    } | null;
  } | null;
};

type HistoryView = {
  id: string;
  reason: string;
  points: number;
  createdAt: string | Date;
};

type RedemptionView = {
  id: string;
  code: string;
  status: string;
  effectiveStatus?: string;
  redeemedAt: string | Date;
  reward?: {
    title?: string | null;
  } | null;
};

function formatPoints(value: number | null | undefined) {
  return Number(value || 0).toLocaleString();
}

export default async function LoyaltyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const [
    loyaltyResult,
    rewardsResult,
    historyResult,
    redemptionResult,
    leaderboardResult,
  ] = await Promise.all([
    getLoyaltyStatus(),
    getAvailablePartnerRewards(),
    getPointHistory(15),
    getRedemptionHistory(),
    getLoyaltyLeaderboard(10),
  ]);

  if (!loyaltyResult.success || !loyaltyResult.loyalty) {
    return (
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <p className="text-red-600">Failed to load loyalty dashboard</p>
      </div>
    );
  }

  const loyalty = loyaltyResult.loyalty;
  const rewards = rewardsResult.success ? rewardsResult.rewards || [] : [];
  const history = historyResult.success ? historyResult.history || [] : [];
  const redemptions = redemptionResult.success
    ? redemptionResult.redemptions || []
    : [];
  const leaderboard = leaderboardResult.success
    ? leaderboardResult.leaderboard || []
    : [];

  const rewardsView = rewards as RewardView[];
  const historyView = history as HistoryView[];
  const redemptionsView = redemptions as RedemptionView[];
  const leaderboardView = leaderboard as LeaderboardView[];

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ✨ Loyalty Hub
        </h1>
        <p className="text-gray-600">
          Track points, tier progress, rewards, and leaderboard rank.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl p-6 text-white bg-linear-to-br from-emerald-500 to-emerald-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Wallet className="h-8 w-8" />
            <span className="text-2xl font-bold">
              {formatPoints(loyalty.points)}
            </span>
          </div>
          <p className="text-emerald-100 text-sm font-medium">
            Available Points
          </p>
        </div>

        <div className="rounded-xl p-6 text-white bg-linear-to-br from-blue-500 to-blue-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8" />
            <span className="text-2xl font-bold">
              {formatPoints(loyalty.lifetimePoints)}
            </span>
          </div>
          <p className="text-blue-100 text-sm font-medium">Lifetime Points</p>
        </div>

        <div className="rounded-xl p-6 text-white bg-linear-to-br from-amber-500 to-amber-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Medal className="h-8 w-8" />
            <span className="text-2xl font-bold">{loyalty.currentTier}</span>
          </div>
          <p className="text-amber-100 text-sm font-medium">Current Tier</p>
        </div>

        <div className="rounded-xl p-6 text-white bg-linear-to-br from-fuchsia-500 to-fuchsia-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Sparkles className="h-8 w-8" />
            <span className="text-2xl font-bold">
              {Math.round(Number(loyalty.progress || 0))}%
            </span>
          </div>
          <p className="text-fuchsia-100 text-sm font-medium">Tier Progress</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Progress to Next Tier
          </h2>
          <span className="text-sm text-gray-600">
            {loyalty.nextTier
              ? `${formatPoints(loyalty.pointsToNextTier)} points to ${loyalty.nextTier}`
              : "Max tier reached"}
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-200">
          <div
            className="h-3 rounded-full bg-linear-to-r from-emerald-500 to-emerald-700"
            style={{ width: `${Math.round(Number(loyalty.progress || 0))}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Reward Catalog
            </h2>
          </div>

          {rewards.length === 0 ? (
            <p className="text-sm text-gray-500">
              No rewards available for your tier yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewardsView.map((reward) => (
                <article
                  key={reward.id}
                  className="rounded-lg border border-gray-200 p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 leading-tight">
                      {reward.title}
                    </h3>
                    <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">
                      {reward.minTierRequired}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {reward.description}
                  </p>
                  <div className="text-xs text-gray-500 space-y-1 mb-4">
                    <p>Partner: {reward.partner?.name || "Partner"}</p>
                    <p>
                      Remaining:{" "}
                      {Number.isFinite(reward.remainingGlobal)
                        ? reward.remainingGlobal
                        : "Unlimited"}
                    </p>
                    {(reward.pointsCost ?? 0) > 0 && (
                      <p>Cost: {formatPoints(reward.pointsCost)} points</p>
                    )}
                    {reward.activeRedemptionCode && (
                      <p className="text-emerald-700 font-medium">
                        Active Code: {reward.activeRedemptionCode}
                      </p>
                    )}
                  </div>
                  <form action={redeemPartnerReward.bind(null, reward.id)}>
                    <button
                      type="submit"
                      disabled={!reward.canRedeem}
                      className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {reward.canRedeem ? "Redeem" : "Not Eligible"}
                    </button>
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Leaderboard</h2>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-500">No leaderboard data yet.</p>
          ) : (
            <ol className="space-y-3">
              {leaderboardView.map((entry, index: number) => (
                <li
                  key={entry.id || entry.user?.id || index}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      #{entry.rank || index + 1}{" "}
                      {entry.user?.name || "Anonymous"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.currentTier} ·{" "}
                      {entry.user?.profile?.location || "Unknown location"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">
                    {formatPoints(entry.points)} pts
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Points History
            </h2>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No points activity yet.</p>
          ) : (
            <div className="space-y-2">
              {historyView.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.reason}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      item.points >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {item.points >= 0 ? "+" : ""}
                    {formatPoints(item.points)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Redemption History
            </h2>
          </div>

          {redemptions.length === 0 ? (
            <p className="text-sm text-gray-500">No reward redemptions yet.</p>
          ) : (
            <div className="space-y-2">
              {redemptionsView.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">
                      {item.reward?.title || "Reward"}
                    </p>
                    <span className="text-xs rounded-full px-2 py-1 bg-gray-100 text-gray-700">
                      {item.effectiveStatus || item.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Code: {item.code}
                  </p>
                  <p className="text-xs text-gray-500">
                    Redeemed {new Date(item.redeemedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
