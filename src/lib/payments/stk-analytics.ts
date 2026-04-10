import { persistMarketingEvent } from "@/lib/analytics/event-store";
import { maskPhoneForDisplay } from "@/lib/utils/phone";

export type StkFlowKind = "wallet_topup" | "onboarding_fee" | "subscription";
export type StkFlowOutcome = "initiated" | "failed";

interface TrackStkPhoneEventInput {
  flow: StkFlowKind;
  outcome: StkFlowOutcome;
  userId?: string | null;
  apiRef?: string | null;
  amount?: number | null;
  initiatedPhoneNumber?: string | null;
  profilePhoneNumber?: string | null;
  overrideProvided?: boolean;
  overrideUsed?: boolean;
  errorMessage?: string | null;
}

export function trackStkPhoneEvent(input: TrackStkPhoneEventInput) {
  const eventName = `stk_phone_${input.flow}_${input.outcome}`;

  void persistMarketingEvent({
    channel: "payments",
    event: eventName,
    payload: {
      flow: input.flow,
      outcome: input.outcome,
      userId: input.userId || null,
      apiRef: input.apiRef || null,
      amount: input.amount ?? null,
      initiatedPhoneMasked: input.initiatedPhoneNumber
        ? maskPhoneForDisplay(input.initiatedPhoneNumber)
        : null,
      profilePhoneMasked: input.profilePhoneNumber
        ? maskPhoneForDisplay(input.profilePhoneNumber)
        : null,
      overrideProvided: Boolean(input.overrideProvided),
      overrideUsed: Boolean(input.overrideUsed),
      errorMessage: input.errorMessage || null,
      timestamp: Date.now(),
    },
  });
}
