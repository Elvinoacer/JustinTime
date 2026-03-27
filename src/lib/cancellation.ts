import { CancellationPolicy } from "@/generated/prisma/client";

interface RefundResult {
  refundAmount: number;
  penaltyAmount: number;
  refundPercentage: number;
  policyUsed: CancellationPolicy;
}

/**
 * Calculates the refund amount based on the cancellation policy and time remaining.
 *
 * @param totalAmount - The total amount paid for the booking
 * @param bookingDate - The date/time the booking is scheduled for
 * @param policy - The cancellation policy (FLEXIBLE, MODERATE, STRICT)
 * @param cancellationDate - The date/time of cancellation (default: now)
 */
export function calculateRefund(
  totalAmount: number,
  bookingDate: Date,
  policy: CancellationPolicy,
  cancellationDate: Date = new Date(),
): RefundResult {
  const timeDifferenceMs = bookingDate.getTime() - cancellationDate.getTime();
  const hoursRemaining = timeDifferenceMs / (1000 * 60 * 60);

  let refundPercentage = 0;

  switch (policy) {
    case "FLEXIBLE":
      // Full refund > 24h. 50% refund > 4h. No refund < 4h.
      if (hoursRemaining >= 24) {
        refundPercentage = 100;
      } else if (hoursRemaining >= 4) {
        refundPercentage = 50;
      } else {
        refundPercentage = 0;
      }
      break;

    case "MODERATE":
      // Full refund > 48h. 50% refund > 12h. No refund < 12h.
      if (hoursRemaining >= 48) {
        refundPercentage = 100;
      } else if (hoursRemaining >= 12) {
        refundPercentage = 50;
      } else {
        refundPercentage = 0;
      }
      break;

    case "STRICT":
      // 50% refund > 48h. No refund < 48h.
      if (hoursRemaining >= 48) {
        refundPercentage = 50;
      } else {
        refundPercentage = 0;
      }
      break;

    default:
      refundPercentage = 0;
  }

  // Ensure negative hours (cancelled after start) result in 0 refund
  if (hoursRemaining < 0) {
    refundPercentage = 0;
  }

  const refundAmount = (totalAmount * refundPercentage) / 100;
  const penaltyAmount = totalAmount - refundAmount;

  return {
    refundAmount,
    penaltyAmount,
    refundPercentage,
    policyUsed: policy,
  };
}

export function getPolicyDescription(policy: CancellationPolicy): string {
  switch (policy) {
    case "FLEXIBLE":
      return "Free cancellation up to 24 hours before start. 50% refund up to 4 hours before.";
    case "MODERATE":
      return "Free cancellation up to 48 hours before start. 50% refund up to 12 hours before.";
    case "STRICT":
      return "50% refund up to 48 hours before start. No refund thereafter.";
    default:
      return "";
  }
}
