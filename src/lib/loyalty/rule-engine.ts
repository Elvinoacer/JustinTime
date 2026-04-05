import prisma from "@/lib/prisma";
import {
  earnPoints,
  POINT_RULES,
  checkPerfectWeekAchievement,
} from "./tier-calculator";

export type LoyaltyRuleEvent =
  | {
      type: "ACCOUNT_CREATED";
      userId: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "BOOKING_COMPLETED";
      userId: string;
      bookingId: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "REVENUE_SETTLED";
      userId: string;
      bookingId: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "REVIEW_CREATED";
      userId: string;
      reviewId: string;
      bookingId: string;
      rating: number;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "PROFILE_UPDATED";
      userId: string;
      metadata?: Record<string, unknown>;
    };

export async function applyLoyaltyRule(event: LoyaltyRuleEvent) {
  switch (event.type) {
    case "ACCOUNT_CREATED": {
      // Reserved trigger for future onboarding bonuses.
      return { success: true, tierUpgrade: false, idempotent: true };
    }

    case "BOOKING_COMPLETED": {
      const result = await earnPoints(
        event.userId,
        "Booking Completion",
        POINT_RULES.JOB_COMPLETION,
        {
          reasonCode: "BOOKING_COMPLETION",
          sourceType: "BOOKING",
          sourceId: event.bookingId,
          idempotencyKey: `loyalty:${event.userId}:booking-completion:${event.bookingId}`,
          metadata: event.metadata,
        },
      );

      // Opportunistically evaluate weekly performance bonus after a completion event.
      await checkPerfectWeekAchievement(event.userId).catch((error) => {
        console.error("[LOYALTY_RULE_PERFECT_WEEK]", error);
      });

      return result;
    }

    case "REVENUE_SETTLED": {
      const booking = await prisma.booking.findUnique({
        where: { id: event.bookingId },
        select: {
          clientId: true,
          providerId: true,
          status: true,
        },
      });

      if (!booking || booking.providerId !== event.userId) {
        return { success: false };
      }

      const completedWithClient = await prisma.booking.count({
        where: {
          providerId: event.userId,
          clientId: booking.clientId,
          status: "COMPLETED",
        },
      });

      if (completedWithClient >= 2) {
        return earnPoints(
          event.userId,
          "Repeat Client Milestone",
          POINT_RULES.REPEAT_CLIENT,
          {
            reasonCode: "REPEAT_CLIENT",
            sourceType: "CLIENT_RELATIONSHIP",
            sourceId: booking.clientId,
            idempotencyKey: `loyalty:${event.userId}:repeat-client:${booking.clientId}`,
            metadata: {
              ...event.metadata,
              clientId: booking.clientId,
              completedWithClient,
              bookingId: event.bookingId,
            },
          },
        );
      }

      return { success: true, tierUpgrade: false, idempotent: true };
    }

    case "REVIEW_CREATED": {
      const roundedRating = Math.max(1, Math.min(5, Math.round(event.rating)));

      if (roundedRating >= 5) {
        return earnPoints(
          event.userId,
          "5-Star Review",
          POINT_RULES.FIVE_STAR_REVIEW,
          {
            reasonCode: "FIVE_STAR_REVIEW",
            sourceType: "REVIEW",
            sourceId: event.reviewId,
            idempotencyKey: `loyalty:${event.userId}:review:${event.reviewId}:5-star`,
            metadata: {
              ...event.metadata,
              rating: roundedRating,
              bookingId: event.bookingId,
            },
          },
        );
      }

      if (roundedRating >= 4) {
        return earnPoints(
          event.userId,
          "4-Star Review",
          POINT_RULES.FOUR_STAR_REVIEW,
          {
            reasonCode: "FOUR_STAR_REVIEW",
            sourceType: "REVIEW",
            sourceId: event.reviewId,
            idempotencyKey: `loyalty:${event.userId}:review:${event.reviewId}:4-star`,
            metadata: {
              ...event.metadata,
              rating: roundedRating,
              bookingId: event.bookingId,
            },
          },
        );
      }

      return { success: true, tierUpgrade: false, idempotent: true };
    }

    case "PROFILE_UPDATED": {
      const profile = await prisma.profile.findUnique({
        where: { userId: event.userId },
        select: {
          bio: true,
          hourlyRate: true,
          location: true,
          idDocument: true,
          skills: true,
          portfolio: true,
        },
      });

      if (!profile) {
        return { success: true, tierUpgrade: false, idempotent: true };
      }

      const completedFields = [
        Boolean(profile.bio?.trim()),
        profile.hourlyRate != null,
        Boolean(profile.location?.trim()),
        Boolean(profile.idDocument?.trim()),
        Array.isArray(profile.skills) && profile.skills.length > 0,
        Array.isArray(profile.portfolio) && profile.portfolio.length > 0,
      ].filter(Boolean).length;

      const completeness = Math.round((completedFields / 6) * 100);
      if (completeness >= 80) {
        return earnPoints(
          event.userId,
          "Profile Completed",
          POINT_RULES.PROFILE_COMPLETE,
          {
            reasonCode: "PROFILE_COMPLETE",
            sourceType: "PROFILE",
            sourceId: event.userId,
            idempotencyKey: `loyalty:${event.userId}:profile-complete`,
            metadata: {
              ...event.metadata,
              completeness,
            },
          },
        );
      }

      return { success: true, tierUpgrade: false, idempotent: true };
    }

    default:
      return { success: false };
  }
}
