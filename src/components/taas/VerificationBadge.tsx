"use client";

import { BadgeType, BadgeStatus } from "@/generated/prisma/client";
import { Shield, CheckCircle, Clock, AlertCircle, Crown, Star, FileCheck, Phone, CreditCard, Award, Lock } from "lucide-react";

interface VerificationBadgeProps {
  type: BadgeType;
  status: BadgeStatus;
  verifiedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const BADGE_CONFIG: Record<BadgeType, {
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  description: string;
}> = {
  KRA_VERIFIED: {
    label: 'KRA Verified',
    icon: FileCheck,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Tax PIN verified with KRA'
  },
  GOOD_CONDUCT: {
    label: 'Police Cleared',
    icon: Shield,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Police Good Conduct certificate verified'
  },
  SOS_ENABLED: {
    label: 'SOS Ready',
    icon: Phone,
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Emergency contacts set up'
  },
  IDENTITY_VERIFIED: {
    label: 'ID Verified',
    icon: Lock,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    description: 'Government ID verified'
  },
  SKILLS_CERTIFIED: {
    label: 'Certified Pro',
    icon: Award,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    description: 'Professional certification verified'
  },
  INSURANCE_ACTIVE: {
    label: 'Insured',
    icon: CreditCard,
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    description: 'Active insurance coverage'
  },
  TOP_RATED: {
    label: 'Top Rated',
    icon: Star,
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    description: '4.8+ rating with 50+ reviews'
  },
  PREMIUM_MEMBER: {
    label: 'Premium',
    icon: Crown,
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
    description: 'Active subscription'
  }
};

const SIZE_CLASSES = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base'
};

export function VerificationBadge({ 
  type, 
  status, 
  verifiedAt, 
  expiresAt,
  size = 'md',
  showLabel = true 
}: VerificationBadgeProps) {
  const config = BADGE_CONFIG[type];
  if (!config) return null;

  const Icon = config.icon;
  const isVerified = status === 'VERIFIED';
  const isExpired = status === 'EXPIRED';
  const isPending = status === 'PENDING';

  // Check if expiring soon (within 30 days)
  const expiringSoon = expiresAt && 
    new Date(expiresAt).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  if (!isVerified && !showLabel) return null;

  return (
    <div 
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
        isVerified ? config.bgColor : 'bg-gray-100'
      } ${isExpired ? 'opacity-50' : ''}`}
      title={config.description}
    >
      <Icon className={`${SIZE_CLASSES[size]} ${isVerified ? config.color : 'text-gray-400'}`} />
      
      {showLabel && (
        <span className={`font-medium ${isVerified ? config.color : 'text-gray-500'}`}>
          {config.label}
        </span>
      )}

      {/* Status indicator */}
      {isVerified && !expiringSoon && (
        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
      )}
      {isPending && (
        <Clock className="h-3.5 w-3.5 text-yellow-600" />
      )}
      {(isExpired || expiringSoon) && (
        <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
      )}
    </div>
  );
}

// Compact badge display for profile
export function BadgeRow({ badges }: { badges: Array<{ type: BadgeType; status: BadgeStatus }> }) {
  const verifiedBadges = badges.filter(b => b.status === 'VERIFIED');

  if (verifiedBadges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {verifiedBadges.map(badge => (
        <VerificationBadge 
          key={badge.type} 
          type={badge.type} 
          status={badge.status} 
          size="sm"
          showLabel={false}
        />
      ))}
    </div>
  );
}

// Government Verified premium badge
export function GovernmentVerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 bg-linear-to-r from-emerald-500 to-teal-600 text-white px-3 py-1.5 rounded-full font-semibold text-sm shadow-md ${className}`}>
      <Shield className="h-4 w-4" />
      <span>Government-Verified ✓</span>
    </div>
  );
}
