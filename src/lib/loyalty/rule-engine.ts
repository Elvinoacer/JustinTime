import { earnPoints, POINT_RULES } from "./tier-calculator";

export type LoyaltyRuleEvent =
  | {
      type: "BOOKING_COMPLETED";
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
    };

export async function applyLoyaltyRule(event: LoyaltyRuleEvent) {
  switch (event.type) {
    case "BOOKING_COMPLETED": {
      return earnPoints(
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

    default:
      return { success: false };
  }
}
