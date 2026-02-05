"use client";

import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SurgePricingBadgeProps {
  multiplier: number;
  reason: string | null;
  basePrice: number;
  finalPrice: number;
  className?: string;
  showBreakdown?: boolean;
}

export function SurgePricingBadge({
  multiplier,
  reason,
  basePrice,
  finalPrice,
  className,
  showBreakdown = true,
}: SurgePricingBadgeProps) {
  const isSurge = multiplier > 1.0;
  
  if (!isSurge) {
    return null;
  }

  const surgeAmount = finalPrice - basePrice;
  const surgePercentage = ((multiplier - 1) * 100).toFixed(0);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Surge Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="relative">
          <Zap className="h-4 w-4 text-amber-600 fill-amber-600" />
          <div className="absolute inset-0 bg-amber-400 blur-sm opacity-50 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-amber-900">
            Surge Pricing Active
          </span>
          <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
            +{surgePercentage}%
          </span>
        </div>
      </div>

      {/* Reason */}
      {reason && (
        <p className="text-sm text-gray-600 flex items-center gap-1">
          <span className="font-medium">Reason:</span>
          <span>{reason}</span>
        </p>
      )}

      {/* Price Breakdown */}
      {showBreakdown && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between items-center text-gray-700">
            <span>Base Price:</span>
            <span className="font-medium">KES {basePrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-amber-700">
            <span>Surge ({multiplier}x):</span>
            <span className="font-semibold">+ KES {surgeAmount.toLocaleString()}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-gray-900">
            <span className="font-semibold">Total:</span>
            <span className="font-bold text-lg">KES {finalPrice.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Info Message */}
      <p className="text-xs text-gray-500 italic">
        Higher rates help ensure service availability during peak times
      </p>
    </div>
  );
}

/* Compact version for list items */
export function SurgePricingIndicator({
  multiplier,
  reason,
}: {
  multiplier: number;
  reason: string | null;
}) {
  if (multiplier <= 1.0) {
    return null;
  }

  const surgePercentage = ((multiplier - 1) * 100).toFixed(0);

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs">
      <Zap className="h-3 w-3 text-amber-600 fill-amber-600" />
      <span className="font-semibold text-amber-900">+{surgePercentage}%</span>
      {reason && <span className="text-amber-700 ml-1">({reason})</span>}
    </div>
  );
}
