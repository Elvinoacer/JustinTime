"use client";

import { cn } from "@/lib/utils";
import { ChurnRiskLevel } from "@/generated/prisma/client";
import { AlertTriangle, TrendingDown, Activity, Check } from "lucide-react";

interface ChurnRiskBadgeProps {
  riskLevel: ChurnRiskLevel;
  score?: number;
  className?: string;
}

const RISK_CONFIG = {
  LOW: {
    label: 'Low Risk',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: Check,
    iconColor: 'text-green-600'
  },
  MEDIUM: {
    label: 'Medium Risk',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Activity,
    iconColor: 'text-yellow-600'
  },
  HIGH: {
    label: 'High Risk',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: TrendingDown,
    iconColor: 'text-orange-600'
  },
  CRITICAL: {
    label: 'Critical Risk',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertTriangle,
    iconColor: 'text-red-600'
  }
};

export function ChurnRiskBadge({ riskLevel, score, className }: ChurnRiskBadgeProps) {
  const config = RISK_CONFIG[riskLevel];
  const Icon = config.icon;

  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg font-medium text-sm", config.color, className)}>
      <Icon className={cn("h-4 w-4", config.iconColor)} />
      <span>{config.label}</span>
      {score !== undefined && (
        <span className="text-xs opacity-75">
          ({Math.round(score * 100)}%)
        </span>
      )}
    </div>
  );
}
