export type PublicTrustSignals = {
  verificationStatus?: string | null;
  trustTier?: string | null;
  overallScore?: number | null;
};

const VERIFIED_TRUST_TIERS = new Set(["VERIFIED", "PREMIUM", "ELITE"]);

/**
 * Canonical public-facing verification resolver.
 *
 * Preference order:
 * 1) Explicit account verification status
 * 2) Trust tier/score
 * 3) Minimum score threshold
 */
export function isPubliclyVerified(signals: PublicTrustSignals): boolean {
  if (signals.verificationStatus === "VERIFIED") {
    return true;
  }

  if (signals.trustTier && VERIFIED_TRUST_TIERS.has(signals.trustTier)) {
    return true;
  }

  if (
    typeof signals.overallScore === "number" &&
    Number.isFinite(signals.overallScore) &&
    signals.overallScore >= 60
  ) {
    return true;
  }

  return false;
}