import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserBadges } from "@/app/actions/gamification";
import { BadgeGrid } from "@/components/gamification/BadgeGrid";
import { Trophy, Star, Target, TrendingUp } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AchievementsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const result = await getUserBadges();
  
  if (!result.success || !result.badges || !result.stats) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-red-600">Failed to load achievements</p>
      </div>
    );
  }

  const { badges, stats } = result;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🏆 Achievements
        </h1>
        <p className="text-gray-600">
          Track your progress and unlock badges as you provide exceptional service
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="h-8 w-8" />
            <span className="text-2xl font-bold">{stats.earnedBadges}</span>
          </div>
          <p className="text-emerald-100 text-sm font-medium">Badges Earned</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Star className="h-8 w-8" />
            <span className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</span>
          </div>
          <p className="text-blue-100 text-sm font-medium">Total Points</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-8 w-8" />
            <span className="text-2xl font-bold">{stats.totalBadges}</span>
          </div>
          <p className="text-purple-100 text-sm font-medium">Total Available</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8" />
            <span className="text-2xl font-bold">{stats.completionPercentage}%</span>
          </div>
          <p className="text-amber-100 text-sm font-medium">Completion</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Overall Progress</h2>
          <span className="text-sm text-gray-600">
            {stats.earnedBadges} / {stats.totalBadges} badges
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${stats.completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Motivational Message */}
      {stats.earnedBadges === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🚀 Start Your Journey!
          </h3>
          <p className="text-blue-800">
            Complete your first job to earn your first badge and start climbing the ranks!
          </p>
        </div>
      )}

      {/* Badge Grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          All Badges
        </h2>
        <BadgeGrid badges={badges} />
      </div>

      {/* Tips */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-purple-900 mb-3">
          💡 Pro Tips
        </h3>
        <ul className="space-y-2 text-purple-800">
          <li>• Complete more jobs to unlock milestone badges</li>
          <li>• Maintain high ratings to earn performance badges</li>
          <li>• Fill out your profile completely for engagement badges</li>
          <li>• Check back regularly - new badges are added seasonally!</li>
        </ul>
      </div>
    </div>
  );
}
