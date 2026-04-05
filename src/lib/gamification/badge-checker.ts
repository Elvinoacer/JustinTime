import {
  awardBadge,
  awardEligibleBadges,
  evaluateBadgeProgress,
  syncBadgeDefinitions,
  type BadgeEvaluationTrigger,
} from "./badge-service";

export { awardBadge, evaluateBadgeProgress, syncBadgeDefinitions };

/**
 * Backward-compatible badge check entrypoint.
 * Uses event-driven awarding with explicit trigger metadata.
 */
export async function checkAndAwardBadges(
  userId: string,
  context: {
    trigger?: BadgeEvaluationTrigger;
    eventId?: string | null;
    actorUserId?: string | null;
  } = {},
) {
  return awardEligibleBadges(userId, context);
}
