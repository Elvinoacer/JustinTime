import { z } from "zod";

export const JOBS_EVENT_NAMES = [
  "job_post_started",
  "job_post_minimal_submitted",
  "job_post_details_completed",
  "job_post_published",
  "proposal_first_received",
  "proposal_card_viewed",
  "proposal_compare_opened",
  "proposal_accepted",
  "provider_apply_started",
  "provider_apply_submitted",
  "pricing_hint_seen",
  "pricing_hint_applied",
  "risk_badge_seen",
  "proposal_recommendation_impression",
  "proposal_recommendation_clicked",
] as const;

export type JobsEventName = (typeof JOBS_EVENT_NAMES)[number];

export const jobsEventSchema = z.object({
  event: z.enum(JOBS_EVENT_NAMES),
  userRole: z.enum(["CLIENT", "PROVIDER", "ADMIN", "GUEST"]).optional(),
  jobCategory: z.string().max(80).optional(),
  budgetBand: z.string().max(40).optional(),
  locationBand: z.string().max(80).optional(),
  sourcePage: z.string().max(120).optional(),
  experimentVariant: z.string().max(80).optional(),
  timestamp: z.number().int().positive().optional(),
  jobId: z.string().max(64).optional(),
  proposalId: z.string().max(64).optional(),
  recommendationLabel: z.string().max(120).optional(),
  isRecommended: z.boolean().optional(),
  url: z.string().max(220).optional(),
  referrer: z.string().max(220).optional(),
});
