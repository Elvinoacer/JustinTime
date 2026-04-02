export const SUBSCRIPTION_PLANS = ["FREE", "PRO", "BUSINESS"] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SERVICE_PRICING_UNITS = ["fixed", "hourly"] as const;
export type ServicePricingUnit = (typeof SERVICE_PRICING_UNITS)[number];

export const SERVICE_LOCATION_TYPES = [
  "PROVIDER_LOCATION",
  "CLIENT_LOCATION",
  "NEGOTIABLE",
  "REMOTE",
] as const;
export type ServiceLocationType = (typeof SERVICE_LOCATION_TYPES)[number];

export const SERVICE_CANCELLATION_POLICIES = [
  "FLEXIBLE",
  "MODERATE",
  "STRICT",
] as const;
export type ServiceCancellationPolicy =
  (typeof SERVICE_CANCELLATION_POLICIES)[number];

export const SERVICE_LIMITS_BY_PLAN: Record<SubscriptionPlan, number> = {
  FREE: 5,
  PRO: Number.POSITIVE_INFINITY,
  BUSINESS: Number.POSITIVE_INFINITY,
};

const DEFAULT_SERVICE_LIMIT = SERVICE_LIMITS_BY_PLAN.FREE;

export function getServiceLimitForPlan(plan?: string | null): number {
  if (!plan) {
    return DEFAULT_SERVICE_LIMIT;
  }

  const normalizedPlan = plan.toUpperCase() as SubscriptionPlan;
  return SERVICE_LIMITS_BY_PLAN[normalizedPlan] ?? DEFAULT_SERVICE_LIMIT;
}
