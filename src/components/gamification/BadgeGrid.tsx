"use client";

import { useState } from "react";
import { BadgeCard } from "./BadgeCard";
import { cn } from "@/lib/utils";

interface BadgeGridProps {
  badges: Array<{
    id?: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    points: number;
    category: string;
    earned: boolean;
    awardedAt?: Date | null;
    progress?: number;
    progressCurrent?: number;
    progressRequired?: number;
    progressPercent?: number;
    requirement?: any;
  }>;
}

const CATEGORIES = ["ALL", "MILESTONE", "PERFORMANCE", "ENGAGEMENT", "SPECIAL"];

export function BadgeGrid({ badges }: BadgeGridProps) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [showEarnedOnly, setShowEarnedOnly] = useState(false);

  const filteredBadges = badges.filter((badge) => {
    const categoryMatch =
      selectedCategory === "ALL" || badge.category === selectedCategory;
    const earnedMatch = !showEarnedOnly || badge.earned;
    return categoryMatch && earnedMatch;
  });

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const count =
              category === "ALL"
                ? badges.length
                : badges.filter((b) => b.category === category).length;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  selectedCategory === category
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                )}
              >
                {category} ({count})
              </button>
            );
          })}
        </div>

        {/* Toggle earned only */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showEarnedOnly}
            onChange={(e) => setShowEarnedOnly(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Earned Only ({earnedCount})
          </span>
        </label>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBadges.map((badge) => (
          <BadgeCard key={badge.slug} badge={badge} />
        ))}
      </div>

      {/* Empty state */}
      {filteredBadges.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No badges found</p>
          <p className="text-gray-400 text-sm mt-1">
            Try adjusting your filters
          </p>
        </div>
      )}
    </div>
  );
}
