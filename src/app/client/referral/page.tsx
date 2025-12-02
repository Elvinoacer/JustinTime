"use client";

import { useState, useEffect } from "react";
import {
  Copy,
  Share2,
  Gift,
  Users,
  TrendingUp,
  CheckCircle,
  Award,
  Sparkles,
  ArrowRight,
  GiftIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useReferralData } from "@/lib/api/hooks/useReferral";

export default function ReferralPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [copied, setCopied] = useState(false);
  const { data: referralData, isLoading } = useReferralData();

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join JustInTime Services",
          text: "Get professional services at amazing rates! Use my referral code for special benefits.",
          url: referralLink,
        });
        toast.success("Shared successfully!");
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      copyToClipboard(referralLink);
    }
  };

  // Use data from API or show loading
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!referralData) {
    return (
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="text-center py-8">
          <p className="text-gray-500">Failed to load referral data</p>
        </div>
      </div>
    );
  }

  const { referralCode, referralLink, stats, recentReferrals, tiers } = referralData;

  const rewards = [
    {
      title: "Total Points",
      value: stats.totalPoints.toString(),
      icon: <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />,
      change: `${stats.completedReferrals} completed`,
      color: "from-emerald-50 to-emerald-100",
      border: "border-emerald-200",
    },
    {
      title: "Redeemable Value",
      value: `$${stats.redeemableValue}`,
      icon: <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />,
      change: "Available now",
      color: "from-blue-50 to-blue-100",
      border: "border-blue-200",
    },
    {
      title: "Friends Referred",
      value: stats.totalReferrals.toString(),
      icon: <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />,
      change: `${stats.pendingRewards} pending`,
      color: "from-purple-50 to-purple-100",
      border: "border-purple-200",
    },
    {
      title: "Pending Rewards",
      value: stats.pendingRewards.toString(),
      icon: <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />,
      change: "Processing",
      color: "from-amber-50 to-amber-100",
      border: "border-amber-200",
    },
  ];

  const referralTiers = tiers;

  const shareMethods = [
    { platform: "WhatsApp", icon: "💬", color: "bg-green-100 text-green-700" },
    { platform: "Facebook", icon: "📘", color: "bg-blue-100 text-blue-700" },
    { platform: "Twitter", icon: "🐦", color: "bg-sky-100 text-sky-700" },
    { platform: "Email", icon: "✉️", color: "bg-gray-100 text-gray-700" },
    { platform: "SMS", icon: "💬", color: "bg-purple-100 text-purple-700" },
    { platform: "Copy Link", icon: "📋", color: "bg-amber-100 text-amber-700" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8 lg:mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
          Exclusive Rewards Program
        </div>
        <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
          Invite Friends &{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600">
            Earn Rewards
          </span>
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto px-3 sm:px-0">
          Share your referral code and earn points for every friend who joins
          and books a service.
        </p>
      </div>

      {/* Main Content Grid - Mobile: Stacked, Desktop: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Left Column: Referral Card */}
        <div className="space-y-4 sm:space-y-6">
          {/* Referral Code Card */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xs sm:shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
                <GiftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                  Your Referral Code
                </h3>
              </div>

              {/* Code Display */}
              <div className="mb-4 sm:mb-6">
                <div className="inline-block bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-lg sm:rounded-xl px-4 sm:px-6 py-3 sm:py-4">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-mono font-bold text-emerald-700 tracking-wider">
                    {referralCode}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
                    Share this code or link
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  onClick={() => copyToClipboard(referralCode)}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Copy
                    className={`w-4 h-4 ${
                      copied ? "text-white" : "text-gray-500"
                    }`}
                  />
                  <span className="text-sm sm:text-base">
                    {copied ? "Copied!" : "Copy Code"}
                  </span>
                </button>
                <button
                  onClick={shareReferral}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg sm:rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm sm:text-base">Share</span>
                </button>
              </div>

              {/* Quick Share Links - Mobile Only */}
              {isMobile && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Share via:</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {shareMethods.slice(0, 4).map((method) => (
                      <button
                        key={method.platform}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${method.color}`}
                        onClick={() => copyToClipboard(referralLink)}
                      >
                        {method.icon} {method.platform}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Referral Link Section */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 sm:p-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Your Referral Link
                </label>
                <div className="flex gap-1.5 sm:gap-2">
                  <div className="flex-1 bg-white border border-gray-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 truncate">
                    {referralLink}
                  </div>
                  <button
                    onClick={() => copyToClipboard(referralLink)}
                    className="px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl font-medium transition-colors text-xs sm:text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works Card */}
          <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xs sm:shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              How It Works
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {[
                {
                  step: "1",
                  title: "Share Your Code",
                  description: "Send your referral code or link to friends",
                  icon: "🔗",
                },
                {
                  step: "2",
                  title: "Friend Registers",
                  description: "Your friend signs up using your code",
                  icon: "👤",
                },
                {
                  step: "3",
                  title: "They Book a Service",
                  description:
                    "Your friend books and completes their first service",
                  icon: "✅",
                },
                {
                  step: "4",
                  title: "You Earn Rewards",
                  description: "Receive points redeemable for credits",
                  icon: "💰",
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900">
                      {item.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Rewards & Progress */}
        <div className="space-y-4 sm:space-y-6">
          {/* Rewards Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
            {rewards.map((reward, idx) => (
              <div
                key={idx}
                className={`bg-gradient-to-br ${reward.color} border ${reward.border} rounded-lg sm:rounded-xl p-3 sm:p-4`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {reward.icon}
                  <h4 className="text-xs sm:text-sm font-medium text-gray-700">
                    {reward.title}
                  </h4>
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-0.5">
                  {reward.value}
                </div>
                <div className="text-[10px] xs:text-xs text-gray-600">
                  {reward.change}
                </div>
              </div>
            ))}
          </div>

          {/* Progress Card */}
          <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xs sm:shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                Your Progress
              </h3>
              <span className="text-xs sm:text-sm font-medium text-emerald-600">
                {stats.totalReferrals} of 25 referrals
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-4 sm:mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-2">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-teal-500 h-2 sm:h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((stats.totalReferrals / 25) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20</span>
                <span>25</span>
              </div>
            </div>

            {/* Milestones */}
            <div className="space-y-2 sm:space-y-3">
              {referralTiers.map((tier, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border ${
                    tier.completed
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ${
                        tier.completed
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {tier.completed ? (
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      ) : (
                        <span className="text-xs font-bold">
                          {tier.referrals}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {tier.referrals} Referral
                        {tier.referrals !== 1 ? "s" : ""}
                      </div>
                      <div className="text-xs text-gray-600">{tier.reward}</div>
                    </div>
                  </div>
                  {tier.completed ? (
                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Claimed
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      {Math.max(tier.referrals - stats.totalReferrals, 0)} to go
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: Quick Share Grid */}
          {!isMobile && (
            <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xs sm:shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                Quick Share Options
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {shareMethods.map((method) => (
                  <button
                    key={method.platform}
                    className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-sm font-medium transition-colors flex flex-col items-center justify-center gap-1.5 ${method.color}`}
                    onClick={() => copyToClipboard(referralLink)}
                  >
                    <span className="text-lg">{method.icon}</span>
                    <span>{method.platform}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reward History (Mobile: Accordion, Desktop: Table) */}
          {!isMobile ? (
            <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xs sm:shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                Recent Rewards
              </h3>
              <div className="space-y-2">
                {recentReferrals.length > 0 ? (
                  recentReferrals.map((referral, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {referral.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {referral.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(referral.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-emerald-600">
                        +{referral.points} pts
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No referrals yet
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4">
              <button className="w-full text-left flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  Recent Rewards
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Bottom Action Button */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <button
            onClick={shareReferral}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md"
          >
            <Share2 className="w-4 h-4" />
            Invite Friends & Earn Rewards
          </button>
        </div>
      )}
    </div>
  );
}
