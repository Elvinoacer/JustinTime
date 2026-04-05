"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BadgeCardProps {
  badge: {
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
  };
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
}

export function BadgeCard({
  badge,
  size = "md",
  showProgress = true,
}: BadgeCardProps) {
  const earned = badge.earned;
  const requiredAmount =
    badge.progressRequired ??
    badge.requirement?.value ??
    badge.requirement?.minReviews ??
    0;
  const currentAmount = badge.progressCurrent ?? badge.progress ?? 0;
  const progressPercent =
    badge.progressPercent ??
    (requiredAmount > 0
      ? Math.min((currentAmount / requiredAmount) * 100, 100)
      : 0);

  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const iconSizes = {
    sm: "text-3xl",
    md: "text-4xl",
    lg: "text-5xl",
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 transition-all duration-300",
        sizeClasses[size],
        earned
          ? "bg-linear-to-br from-white to-gray-50 border-gray-200 shadow-md hover:shadow-lg hover:scale-105"
          : "bg-gray-50 border-gray-200 opacity-60 hover:opacity-80",
      )}
      style={earned ? { borderColor: badge.color } : undefined}
    >
      {/* Shine effect for earned badges */}
      {earned && (
        <div
          className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, transparent 0%, ${badge.color} 50%, transparent 100%)`,
          }}
        />
      )}

      {/* Lock icon for unearned badges */}
      {!earned && (
        <div className="absolute top-2 right-2">
          <Lock className="h-4 w-4 text-gray-400" />
        </div>
      )}

      <div className="relative flex flex-col items-center text-center space-y-2">
        {/* Icon */}
        <div
          className={cn(
            "flex items-center justify-center rounded-full w-16 h-16",
            iconSizes[size],
            earned ? "" : "grayscale",
          )}
          style={earned ? { backgroundColor: `${badge.color}20` } : undefined}
        >
          <span>{badge.icon}</span>
        </div>

        {/* Name */}
        <h3
          className={cn(
            "font-bold",
            size === "lg" ? "text-xl" : size === "md" ? "text-lg" : "text-base",
            earned ? "text-gray-900" : "text-gray-500",
          )}
        >
          {badge.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2">
          {badge.description}
        </p>

        {/* Category & Points */}
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              "px-2 py-1 rounded-full font-medium",
              earned
                ? "bg-gray-100 text-gray-700"
                : "bg-gray-200 text-gray-500",
            )}
          >
            {badge.category}
          </span>
          <span
            className={cn(
              "font-semibold",
              earned ? "text-gray-900" : "text-gray-500",
            )}
          >
            {badge.points} pts
          </span>
        </div>

        {/* Awarded date */}
        {earned && badge.awardedAt && (
          <p className="text-xs text-gray-500 italic">
            Earned {new Date(badge.awardedAt).toLocaleDateString()}
          </p>
        )}

        {/* Progress bar for unearned badges */}
        {!earned && showProgress && requiredAmount > 0 && (
          <div className="w-full mt-2">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>
                {currentAmount} / {requiredAmount}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: badge.color,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
