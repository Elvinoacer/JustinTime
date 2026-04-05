import { z } from "zod";

export const LANDING_EVENT_NAMES = [
  "landing:variant_assigned",
  "landing:variant_switched",
  "landing:cta_clicked",
  "landing:search_initiated",
  "landing:secondary_cta_clicked",
] as const;

export type LandingEventName = (typeof LANDING_EVENT_NAMES)[number];

export const landingEventSchema = z.object({
  event: z.enum(LANDING_EVENT_NAMES),
  variant: z.enum(["booking", "pro"]).optional(),
  ctaLabel: z.string().max(120).optional(),
  ctaLocation: z.enum(["hero", "final_cta", "narrative_rail"]).optional(),
  searchQuery: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  country: z.string().max(8).optional(),
  timestamp: z.number().int().positive().optional(),
  url: z.string().max(220).optional(),
  referrer: z.string().max(220).optional(),
});
