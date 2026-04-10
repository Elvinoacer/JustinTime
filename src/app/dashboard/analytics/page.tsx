import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BasicAnalytics from "@/components/dashboard/analytics/BasicAnalytics";
import AdvancedAnalytics from "@/components/dashboard/analytics/AdvancedAnalytics";
import { redirect } from "next/navigation";
import Link from "next/link";
import { hasRole } from "@/lib/auth/roles";
import {
  buildDailyEarningsSeries,
  buildMonthlySeries,
  calculateGrowthRate,
  resolveProviderNetAmount,
} from "@/lib/analytics/providerAnalytics";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Analytics | JustInTime",
  description: "Track your performance and earnings",
};

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/auth/login");
  }

  if (!hasRole(session.user, "PROVIDER")) {
    redirect("/client/dashboard");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      subscription: true,
      profile: {
        select: {
          location: true,
        },
      },
      services: {
        select: {
          categoryId: true,
        },
      },
      providerBookings: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          service: {
            select: {
              id: true,
              title: true,
            },
          },
          review: {
            select: {
              rating: true,
            },
          },
        },
      },
      receivedReviews: {
        select: {
          rating: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/auth/login");
  }

  const isPro =
    user.subscription?.plan === "PRO" || user.subscription?.plan === "BUSINESS";
  const isActive = user.subscription?.isActive ?? false;
  const showAdvanced = isPro && isActive;

  const terminalBookings = user.providerBookings.filter(
    (booking) =>
      booking.status === "COMPLETED" || booking.status === "CANCELLED",
  );

  const completedBookings = user.providerBookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const earningsRows = completedBookings.map((booking) => ({
    amount: resolveProviderNetAmount(booking),
    createdAt: booking.createdAt,
  }));

  const monthlyRevenue = buildMonthlySeries(
    completedBookings,
    (booking) => resolveProviderNetAmount(booking),
    () => 1,
    { months: 12 },
  );

  const sixMonthRevenue = monthlyRevenue.slice(-6).map((row) => ({
    name: row.month,
    monthKey: row.monthKey,
    earnings: row.earnings,
    bookings: row.bookings,
  }));

  const dailyEarnings = buildDailyEarningsSeries(completedBookings, {
    days: 7,
  });

  const latestMonth = monthlyRevenue[monthlyRevenue.length - 1]?.earnings || 0;
  const previousMonth =
    monthlyRevenue[monthlyRevenue.length - 2]?.earnings || 0;
  const monthlyGrowthRate = calculateGrowthRate(latestMonth, previousMonth);

  const uniqueClients = new Set(completedBookings.map((b) => b.clientId));
  const bookingsByClient = completedBookings.reduce((acc, booking) => {
    acc.set(booking.clientId, (acc.get(booking.clientId) || 0) + 1);
    return acc;
  }, new Map<string, number>());
  const returningClients = Array.from(bookingsByClient.values()).filter(
    (count) => count > 1,
  ).length;
  const retentionRate =
    uniqueClients.size > 0 ? (returningClients / uniqueClients.size) * 100 : 0;

  const averageRating =
    user.receivedReviews.length > 0
      ? user.receivedReviews.reduce((sum, review) => sum + review.rating, 0) /
        user.receivedReviews.length
      : 0;
  const customerSatisfaction = averageRating > 0 ? averageRating * 20 : 0;

  const timeBuckets = [
    { id: "6-9 AM", min: 6, max: 9, color: "#3b82f6" },
    { id: "9-12 PM", min: 9, max: 12, color: "#8b5cf6" },
    { id: "12-3 PM", min: 12, max: 15, color: "#f59e0b" },
    { id: "3-6 PM", min: 15, max: 18, color: "#ef4444" },
    { id: "6-9 PM", min: 18, max: 21, color: "#10b981" },
  ];

  const timeDistribution = timeBuckets.map((bucket) => ({
    time: bucket.id,
    bookings: 0,
    color: bucket.color,
  }));

  for (const booking of completedBookings) {
    let hour: number | null = null;
    if (booking.startTime && /^\d{2}:\d{2}/.test(booking.startTime)) {
      hour = Number(booking.startTime.split(":")[0]);
    }
    if (hour == null || Number.isNaN(hour)) {
      hour = new Date(booking.date).getHours();
    }

    const bucketIndex = timeBuckets.findIndex(
      (bucket) => hour >= bucket.min && hour < bucket.max,
    );
    if (bucketIndex >= 0) {
      timeDistribution[bucketIndex].bookings += 1;
    }
  }

  const servicePerformanceMap = new Map<
    string,
    {
      name: string;
      bookings: number;
      revenue: number;
      ratingSum: number;
      ratingCount: number;
    }
  >();

  for (const booking of completedBookings) {
    const serviceName = booking.service?.title || "Unknown Service";
    const existing = servicePerformanceMap.get(serviceName) || {
      name: serviceName,
      bookings: 0,
      revenue: 0,
      ratingSum: 0,
      ratingCount: 0,
    };

    const nextValue = {
      ...existing,
      bookings: existing.bookings + 1,
      revenue: existing.revenue + resolveProviderNetAmount(booking),
      ratingSum:
        existing.ratingSum +
        (typeof booking.review?.rating === "number"
          ? booking.review.rating
          : 0),
      ratingCount:
        existing.ratingCount +
        (typeof booking.review?.rating === "number" ? 1 : 0),
    };

    servicePerformanceMap.set(serviceName, nextValue);
  }

  const servicePerformance = Array.from(servicePerformanceMap.values())
    .map((entry) => ({
      name: entry.name,
      bookings: entry.bookings,
      revenue: entry.revenue,
      rating:
        entry.ratingCount > 0
          ? entry.ratingSum / entry.ratingCount
          : averageRating,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const providerCategoryIds = Array.from(
    new Set(user.services.map((service) => service.categoryId)),
  );

  let peerBenchmark = {
    peerCount: 0,
    averagePeerEarnings: 0,
    averagePeerRating: 0,
    earningsPercentile: 0,
    ratingPercentile: 0,
  };

  if (providerCategoryIds.length > 0) {
    const peers = await prisma.user.findMany({
      where: {
        id: { not: user.id },
        OR: [{ role: "PROVIDER" }, { roles: { has: "PROVIDER" } }],
        services: {
          some: {
            categoryId: { in: providerCategoryIds },
          },
        },
      },
      select: {
        providerBookings: {
          where: { status: "COMPLETED" },
          select: {
            basePrice: true,
            discountAmount: true,
            totalAmount: true,
            netAmount: true,
            createdAt: true,
            service: { select: { price: true } },
            job: { select: { budget: true } },
          },
        },
        receivedReviews: {
          select: { rating: true },
        },
      },
      take: 200,
    });

    const peerEarnings = peers.map((peer) =>
      peer.providerBookings.reduce(
        (sum, booking) => sum + resolveProviderNetAmount(booking),
        0,
      ),
    );
    const peerRatings = peers.map((peer) => {
      if (peer.receivedReviews.length === 0) return 0;
      return (
        peer.receivedReviews.reduce((sum, review) => sum + review.rating, 0) /
        peer.receivedReviews.length
      );
    });

    const providerEarnings = earningsRows.reduce(
      (sum, entry) => sum + Number(entry.amount || 0),
      0,
    );
    const providerRating = averageRating;

    const earningsRank =
      peerEarnings.length > 0
        ? peerEarnings.filter((value) => value <= providerEarnings).length /
          peerEarnings.length
        : 0;
    const ratingRank =
      peerRatings.length > 0
        ? peerRatings.filter((value) => value <= providerRating).length /
          peerRatings.length
        : 0;

    peerBenchmark = {
      peerCount: peers.length,
      averagePeerEarnings:
        peerEarnings.length > 0
          ? peerEarnings.reduce((sum, value) => sum + value, 0) /
            peerEarnings.length
          : 0,
      averagePeerRating:
        peerRatings.length > 0
          ? peerRatings.reduce((sum, value) => sum + value, 0) /
            peerRatings.length
          : 0,
      earningsPercentile: earningsRank * 100,
      ratingPercentile: ratingRank * 100,
    };
  }

  // Calculate stats for mobile view
  const totalBookings = user.providerBookings.length;
  const totalEarnings = earningsRows.reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0,
  );
  const completionRate =
    terminalBookings.length > 0
      ? (completedBookings.length / terminalBookings.length) * 100
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="mb-2 sm:mb-4">
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3">
          <div>
            <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900">
              Analytics Dashboard
            </h1>
            <p className="text-xs xs:text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
              Track your performance and growth
            </p>
          </div>

          {/* Quick Stats - Mobile Only */}
          <div className="xs:hidden mt-2 grid grid-cols-3 gap-2">
            <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 shadow-xs">
              <p className="text-xs text-gray-500 mb-0.5">Bookings</p>
              <p className="truncate text-base font-bold tabular-nums text-gray-900">
                {totalBookings}
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 shadow-xs">
              <p className="text-xs text-gray-500 mb-0.5">Earnings</p>
              <p className="truncate text-base font-bold tabular-nums text-emerald-600">
                ${totalEarnings.toFixed(0)}
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 shadow-xs">
              <p className="text-xs text-gray-500 mb-0.5">Rating</p>
              <p className="truncate text-base font-bold tabular-nums text-amber-500">
                {averageRating.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid - Mobile: 1 column, Desktop: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Basic Analytics - Takes full width on mobile, half on desktop */}
        <div className="lg:col-span-2">
          <BasicAnalytics
            bookings={user.providerBookings}
            earnings={earningsRows}
            reviews={user.receivedReviews}
            monthlySeries={sixMonthRevenue}
            completionRate={completionRate}
          />
        </div>

        {/* Advanced Analytics or Upgrade Card */}
        {showAdvanced ? (
          <div className="lg:col-span-2">
            <AdvancedAnalytics
              bookings={user.providerBookings}
              earnings={earningsRows}
              reviews={user.receivedReviews}
              monthlyRevenue={monthlyRevenue}
              dailyEarnings={dailyEarnings}
              monthlyGrowthRate={monthlyGrowthRate}
              retentionRate={retentionRate}
              customerSatisfaction={customerSatisfaction}
              timeDistribution={timeDistribution}
              servicePerformance={servicePerformance}
              peerBenchmark={peerBenchmark}
            />
          </div>
        ) : (
          <div className="lg:col-span-2 mt-4 sm:mt-6">
            <div className="bg-linear-to-r from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-center relative overflow-hidden shadow-lg">
              {/* Background Effects */}
              <div className="absolute top-0 right-0 -mt-6 sm:-mt-10 -mr-6 sm:-mr-10 w-24 h-24 sm:w-40 sm:h-40 bg-white opacity-5 rounded-full blur-xl sm:blur-3xl" />
              <div className="absolute bottom-0 left-0 -mb-6 sm:-mb-10 -ml-6 sm:-ml-10 w-24 h-24 sm:w-40 sm:h-40 bg-emerald-500 opacity-10 rounded-full blur-xl sm:blur-3xl" />

              {/* Content */}
              <div className="relative z-10 max-w-lg mx-auto">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-lg sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-xl sm:text-3xl text-amber-400">
                    workspace_premium
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 sm:mb-3">
                  Unlock Advanced Insights
                </h2>

                <p className="text-gray-300 text-xs sm:text-sm md:text-base mb-6 sm:mb-8">
                  Upgrade to Pro to access detailed customer retention metrics,
                  revenue growth charts, and service performance analysis.
                </p>

                {/* Features List - Mobile: Hidden, Tablet+: Grid */}
                <div className="hidden sm:grid grid-cols-2 gap-3 mb-6">
                  <div className="flex items-center gap-2 text-left">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">
                      insights
                    </span>
                    <span className="text-xs text-gray-300">
                      Revenue Charts
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-left">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">
                      trending_up
                    </span>
                    <span className="text-xs text-gray-300">
                      Growth Analytics
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-left">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">
                      group
                    </span>
                    <span className="text-xs text-gray-300">
                      Customer Retention
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-left">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">
                      bar_chart
                    </span>
                    <span className="text-xs text-gray-300">
                      Service Metrics
                    </span>
                  </div>
                </div>

                {/* Upgrade Button */}
                <Link
                  href="/dashboard/premium"
                  className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-linear-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/20 transform hover:scale-105 inline-flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                >
                  <span className="material-symbols-outlined text-sm sm:text-base">
                    rocket_launch
                  </span>
                  Upgrade to Pro
                </Link>

                {/* Mobile Only: Quick Feature Preview */}
                <div className="sm:hidden mt-6">
                  <p className="text-xs text-gray-400 mb-2">
                    Pro Features Include:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <span className="px-2 py-1 bg-white/10 text-[10px] text-gray-300 rounded-full">
                      Revenue Charts
                    </span>
                    <span className="px-2 py-1 bg-white/10 text-[10px] text-gray-300 rounded-full">
                      Growth Analytics
                    </span>
                    <span className="px-2 py-1 bg-white/10 text-[10px] text-gray-300 rounded-full">
                      Customer Insights
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Benefits - Desktop Only */}
      {!showAdvanced && (
        <div className="hidden lg:block mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-linear-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-white">
                    insights
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">Advanced Charts</h3>
              </div>
              <p className="text-sm text-gray-600">
                Detailed revenue growth charts, customer demographics, and
                service performance metrics.
              </p>
            </div>

            <div className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-white">
                    trending_up
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">Growth Analytics</h3>
              </div>
              <p className="text-sm text-gray-600">
                Track your business growth with month-over-month comparisons and
                trend analysis.
              </p>
            </div>

            <div className="bg-linear-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-white">
                    group
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">Customer Insights</h3>
              </div>
              <p className="text-sm text-gray-600">
                Understand customer behavior, retention rates, and service
                preferences.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
