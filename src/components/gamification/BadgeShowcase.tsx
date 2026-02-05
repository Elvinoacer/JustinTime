"use client";

import { cn } from "@/lib/utils";

interface BadgeShowcaseProps {
  badges: Array<{
    slug: string;
    name: string;
    icon: string;
    color: string;
    points: number;
  }>;
  maxDisplay?: number;
  className?: string;
}

export function BadgeShowcase({ badges, maxDisplay = 3, className }: BadgeShowcaseProps) {
  // Sort by points (highest first) and take top N
  const topBadges = [...badges]
    .sort((a, b) => b.points - a.points)
    .slice(0, maxDisplay);

  if (topBadges.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {topBadges.map(badge => (
        <div
          key={badge.slug}
          className="relative group"
          title={`${badge.name} - ${badge.points} points`}
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full text-xl border-2 border-white shadow-md transition-transform hover:scale-110"
            style={{ backgroundColor: `${badge.color}` }}
          >
            {badge.icon}
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {badge.name}
          </div>
        </div>
      ))}

      {badges.length > maxDisplay && (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 border-2 border-white shadow-md text-xs font-semibold text-gray-600">
          +{badges.length - maxDisplay}
        </div>
      )}
    </div>
  );
}
