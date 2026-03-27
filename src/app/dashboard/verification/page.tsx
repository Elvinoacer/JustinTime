import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyVerificationStatus, requestVerificationBadge, checkMyAutomaticBadges, togglePremiumPricing } from "@/app/actions/taas";
import { VerificationBadge, GovernmentVerifiedBadge } from "@/components/taas/VerificationBadge";
import { TrustScoreDisplay } from "@/components/taas/TrustScoreDisplay";
import { Shield, Upload, RefreshCw, DollarSign, CheckCircle, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BadgeType } from "@/generated/prisma/client";

export const dynamic = 'force-dynamic';

const BADGE_INFO: Array<{
  type: BadgeType;
  title: string;
  description: string;
  requiresDocument: boolean;
  documentLabel?: string;
}> = [
  {
    type: 'KRA_VERIFIED',
    title: 'KRA PIN Verification',
    description: 'Verify your KRA PIN through Tax Settings',
    requiresDocument: false
  },
  {
    type: 'GOOD_CONDUCT',
    title: 'Police Good Conduct',
    description: 'Upload your Police Good Conduct Certificate',
    requiresDocument: true,
    documentLabel: 'Good Conduct Certificate (PDF/Image)'
  },
  {
    type: 'IDENTITY_VERIFIED',
    title: 'Government ID',
    description: 'Upload your National ID or Passport',
    requiresDocument: true,
    documentLabel: 'ID Document (Front & Back)'
  },
  {
    type: 'SKILLS_CERTIFIED',
    title: 'Professional Certification',
    description: 'Upload professional certificates or licenses',
    requiresDocument: true,
    documentLabel: 'Certificate/License'
  },
  {
    type: 'SOS_ENABLED',
    title: 'Emergency Contacts',
    description: 'Set up 2+ trusted contacts for SOS feature',
    requiresDocument: false
  },
  {
    type: 'TOP_RATED',
    title: 'Top Rated Status',
    description: 'Achieve 4.8+ rating with 50+ reviews',
    requiresDocument: false
  }
];

export default async function VerificationPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  // Trigger automatic badge checks
  await checkMyAutomaticBadges();

  const result = await getMyVerificationStatus();

  if (!result.success) {
    return <div className="p-8 text-red-600">Failed to load verification status</div>;
  }

  const { badges, trustScore, isGovernmentVerified, isPremiumEligible } = result;

  // Create badge lookup
  const badgeLookup = new Map(badges?.map(b => [b.type, b]) || []);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-600" />
            Trust & Verification
          </h1>
          <p className="text-gray-600">Build trust with clients through verified credentials</p>
        </div>
        
        {isGovernmentVerified && <GovernmentVerifiedBadge />}
      </div>

      {/* Trust Score */}
      <div className="mb-8">
        {trustScore ? (
          <TrustScoreDisplay
            identityScore={trustScore.identityScore}
            conductScore={trustScore.conductScore}
            performanceScore={trustScore.performanceScore}
            reliabilityScore={trustScore.reliabilityScore}
            complianceScore={trustScore.complianceScore}
            overallScore={trustScore.overallScore}
            tier={trustScore.tier}
            premiumEligible={trustScore.premiumEligible}
            premiumMultiplier={trustScore.premiumMultiplier}
          />
        ) : (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Complete verifications to build your Trust Score</p>
          </div>
        )}
      </div>

      {/* Premium Pricing Toggle */}
      {isPremiumEligible && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                Premium Pricing
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Your verified status allows you to charge up to +{Math.round(((trustScore?.premiumMultiplier || 1) - 1) * 100)}% more
              </p>
            </div>
            
            <form action={async () => {
              "use server";
              const { togglePremiumPricing } = await import("@/app/actions/taas");
              // Toggle based on current state
              const current = await import("@/app/actions/taas").then(m => m.getMyVerificationStatus());
              // This is a simplified toggle - in production you'd check current state
              await togglePremiumPricing(true);
            }}>
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Enable Premium
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Verification Checklist */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Verification Checklist</h2>
          <form action={async () => {
            "use server";
            const { checkMyAutomaticBadges, refreshMyTrustScore } = await import("@/app/actions/taas");
            await checkMyAutomaticBadges();
            await refreshMyTrustScore();
          }}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Status
            </button>
          </form>
        </div>

        <div className="divide-y divide-gray-100">
          {BADGE_INFO.map((info) => {
            const badge = badgeLookup.get(info.type);
            const isVerified = badge?.status === 'VERIFIED';
            const isPending = badge?.status === 'PENDING';

            return (
              <div key={info.type} className="p-4 flex items-center gap-4">
                {/* Status Icon */}
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  isVerified ? 'bg-emerald-100' : isPending ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  {isVerified ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  ) : isPending ? (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <Shield className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{info.title}</h3>
                  <p className="text-sm text-gray-500">{info.description}</p>
                  
                  {badge && (
                    <div className="mt-1">
                      <VerificationBadge type={info.type} status={badge.status} size="sm" />
                    </div>
                  )}
                </div>

                {/* Action */}
                {!isVerified && info.requiresDocument && (
                  <form action={async (formData: FormData) => {
                    "use server";
                    const { requestVerificationBadge } = await import("@/app/actions/taas");
                    const type = formData.get('type') as BadgeType;
                    // In production, this would handle file upload first
                    await requestVerificationBadge(type, undefined);
                  }}>
                    <input type="hidden" name="type" value={info.type} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                      disabled={isPending}
                    >
                      <Upload className="h-4 w-4" />
                      {isPending ? 'Pending Review' : 'Upload'}
                    </button>
                  </form>
                )}

                {!isVerified && !info.requiresDocument && info.type === 'SOS_ENABLED' && (
                  <Link
                    href="/dashboard/sos"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Set Up SOS
                  </Link>
                )}

                {!isVerified && !info.requiresDocument && info.type === 'KRA_VERIFIED' && (
                  <Link
                    href="/dashboard/settings/tax"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Verify KRA PIN
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Benefits of Verification</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/60 rounded-lg p-4">
            <p className="text-2xl mb-2">🛡️</p>
            <p className="font-medium text-gray-900">Trust Badge</p>
            <p className="text-sm text-gray-600">Stand out with Government-Verified status</p>
          </div>
          <div className="bg-white/60 rounded-lg p-4">
            <p className="text-2xl mb-2">💰</p>
            <p className="font-medium text-gray-900">Premium Pricing</p>
            <p className="text-sm text-gray-600">Charge up to 30% more for your services</p>
          </div>
          <div className="bg-white/60 rounded-lg p-4">
            <p className="text-2xl mb-2">🔝</p>
            <p className="font-medium text-gray-900">Higher Visibility</p>
            <p className="text-sm text-gray-600">Appear first in client searches</p>
          </div>
        </div>
      </div>
    </div>
  );
}
