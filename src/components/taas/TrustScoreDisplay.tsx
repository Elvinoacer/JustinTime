"use client";

import { TrendingUp, Shield, Target, Clock, FileCheck } from "lucide-react";

interface TrustScoreDisplayProps {
  identityScore: number;
  conductScore: number;
  performanceScore: number;
  reliabilityScore: number;
  complianceScore: number;
  overallScore: number;
  tier: string;
  premiumEligible: boolean;
  premiumMultiplier: number;
  compact?: boolean;
}

const TIER_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  ELITE: {
    label: '🏆 Elite',
    color: 'text-yellow-600',
    bgColor: 'bg-gradient-to-r from-yellow-100 to-amber-100',
    borderColor: 'border-yellow-300',
    description: 'Top-tier verified professional'
  },
  PREMIUM: {
    label: '⭐ Premium',
    color: 'text-purple-600',
    bgColor: 'bg-gradient-to-r from-purple-100 to-pink-100',
    borderColor: 'border-purple-300',
    description: 'Highly trusted professional'
  },
  VERIFIED: {
    label: '✓ Verified',
    color: 'text-emerald-600',
    bgColor: 'bg-gradient-to-r from-emerald-100 to-teal-100',
    borderColor: 'border-emerald-300',
    description: 'Verified professional'
  },
  BASIC: {
    label: '◐ Basic',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Partially verified'
  },
  UNVERIFIED: {
    label: '○ Unverified',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'Not yet verified'
  }
};

export function TrustScoreDisplay({
  identityScore,
  conductScore,
  performanceScore,
  reliabilityScore,
  complianceScore,
  overallScore,
  tier,
  premiumEligible,
  premiumMultiplier,
  compact = false
}: TrustScoreDisplayProps) {
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.UNVERIFIED;

  const scoreItems = [
    { label: 'Identity', score: identityScore, icon: Shield, color: 'bg-purple-500' },
    { label: 'Conduct', score: conductScore, icon: FileCheck, color: 'bg-blue-500' },
    { label: 'Performance', score: performanceScore, icon: TrendingUp, color: 'bg-emerald-500' },
    { label: 'Reliability', score: reliabilityScore, icon: Clock, color: 'bg-amber-500' },
    { label: 'Compliance', score: complianceScore, icon: Target, color: 'bg-pink-500' }
  ];

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${tierConfig.bgColor} border ${tierConfig.borderColor}`}>
        <div className="relative h-8 w-8">
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
            <circle
              className="stroke-gray-200"
              strokeWidth="3"
              fill="none"
              cx="18"
              cy="18"
              r="15"
            />
            <circle
              className={`${tier === 'ELITE' ? 'stroke-yellow-500' : tier === 'PREMIUM' ? 'stroke-purple-500' : tier === 'VERIFIED' ? 'stroke-emerald-500' : 'stroke-gray-400'}`}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              cx="18"
              cy="18"
              r="15"
              strokeDasharray={`${overallScore} 100`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
            {overallScore}
          </span>
        </div>
        <span className={`font-semibold ${tierConfig.color}`}>{tierConfig.label}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${tierConfig.borderColor} overflow-hidden`}>
      {/* Header */}
      <div className={`${tierConfig.bgColor} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-bold ${tierConfig.color}`}>{tierConfig.label}</h3>
            <p className="text-sm text-gray-600">{tierConfig.description}</p>
          </div>
          
          {/* Score Circle */}
          <div className="relative h-16 w-16">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
              <circle
                className="stroke-white/50"
                strokeWidth="3"
                fill="none"
                cx="18"
                cy="18"
                r="15"
              />
              <circle
                className={`${tier === 'ELITE' ? 'stroke-yellow-500' : tier === 'PREMIUM' ? 'stroke-purple-500' : tier === 'VERIFIED' ? 'stroke-emerald-500' : 'stroke-gray-400'}`}
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                cx="18"
                cy="18"
                r="15"
                strokeDasharray={`${overallScore} 100`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-900">
              {overallScore}
            </span>
          </div>
        </div>

        {/* Premium Pricing Indicator */}
        {premiumEligible && (
          <div className="mt-3 px-3 py-2 bg-white/60 rounded-lg">
            <p className="text-sm font-medium text-gray-900">
              💰 Premium Pricing Available: +{Math.round((premiumMultiplier - 1) * 100)}%
            </p>
          </div>
        )}
      </div>

      {/* Score Breakdown */}
      <div className="bg-white p-4 space-y-3">
        {scoreItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <item.icon className="h-5 w-5 text-gray-400" />
            <span className="w-24 text-sm text-gray-600">{item.label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${item.color} rounded-full transition-all`}
                style={{ width: `${item.score}%` }}
              />
            </div>
            <span className="w-8 text-right text-sm font-medium text-gray-700">
              {item.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple tier badge
export function TierBadge({ tier }: { tier: string }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.UNVERIFIED;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}>
      {config.label}
    </span>
  );
}
