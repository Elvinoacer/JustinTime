import { getMarketplaceSearchTerms } from "@/lib/search/normalizeMarketplaceQuery";
import { calculateDistance } from "@/lib/utils/geolocation";

export type RecommendationSignals = {
  interests?: string[];
  skills?: string[];
  bio?: string;
  historyTerms?: string[];
  latitude?: number | null;
  longitude?: number | null;
};

export type ScoringTarget = {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  completedCount?: number | null;
  createdAt?: Date | string | null;
  availableNow?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toTerms(value: string) {
  return getMarketplaceSearchTerms(value, 20);
}

function uniqueTerms(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const key = value.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }

  return out;
}

export function buildUserTerms(signals: RecommendationSignals): string[] {
  const interestTerms = (signals.interests || []).flatMap((entry) =>
    toTerms(entry || ""),
  );
  const skillTerms = (signals.skills || []).flatMap((entry) =>
    toTerms(entry || ""),
  );
  const bioTerms = toTerms(signals.bio || "");
  const historyTerms = (signals.historyTerms || []).flatMap((entry) =>
    toTerms(entry || ""),
  );

  return uniqueTerms([
    ...interestTerms,
    ...skillTerms,
    ...bioTerms,
    ...historyTerms,
  ]);
}

export function scoreTarget(
  signals: RecommendationSignals,
  target: ScoringTarget,
): { score: number; reasons: string[] } {
  const userTerms = buildUserTerms(signals);
  const targetText =
    `${target.title || ""} ${target.description || ""} ${target.category || ""}`
      .toLowerCase()
      .trim();
  const targetTerms = uniqueTerms(toTerms(targetText));

  const reasons: string[] = [];
  let score = 0;

  if (userTerms.length > 0 && targetTerms.length > 0) {
    const overlap = userTerms.filter((term) => targetTerms.includes(term));
    const ratio = overlap.length / Math.max(userTerms.length, 1);
    const overlapScore = clamp(ratio * 45, 0, 45);
    score += overlapScore;
    if (overlap.length > 0) {
      reasons.push("interest-match");
    }
  }

  if (
    typeof signals.latitude === "number" &&
    typeof signals.longitude === "number" &&
    typeof target.latitude === "number" &&
    typeof target.longitude === "number"
  ) {
    const distanceKm = calculateDistance(
      signals.latitude,
      signals.longitude,
      target.latitude,
      target.longitude,
    );

    const distanceScore = clamp(35 - distanceKm, 0, 35);
    score += distanceScore;

    if (distanceKm <= 15) {
      reasons.push("nearby");
    }
  }

  const rating = Number(target.rating || 0);
  if (Number.isFinite(rating) && rating > 0) {
    const ratingScore = clamp(rating * 3, 0, 15);
    score += ratingScore;
  }

  const reviewCount = Number(target.reviewCount || 0);
  if (Number.isFinite(reviewCount) && reviewCount > 0) {
    const confidenceScore = clamp((reviewCount / 50) * 8, 0, 8);
    score += confidenceScore;
  }

  const completedCount = Number(target.completedCount || 0);
  if (Number.isFinite(completedCount) && completedCount > 0) {
    const reliabilityScore = clamp((completedCount / 80) * 10, 0, 10);
    score += reliabilityScore;
    if (completedCount >= 10) {
      reasons.push("reliable-history");
    }
  }

  if (target.availableNow) {
    score += 4;
    reasons.push("available");
  }

  if (target.createdAt) {
    const createdDate = new Date(target.createdAt);
    if (!Number.isNaN(createdDate.getTime())) {
      const ageDays =
        (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = clamp(8 - ageDays / 4, 0, 8);
      score += recencyScore;
    }
  }

  return {
    score: Number(score.toFixed(3)),
    reasons: uniqueTerms(reasons),
  };
}
