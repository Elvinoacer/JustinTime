import prisma from "@/lib/prisma";

export interface DynamicPricingResult {
  multiplier: number;
  reason: string | null;
  breakdown: {
    timeMultiplier: number;
    demandMultiplier: number;
    weatherMultiplier: number;
    providerMultiplier?: number;
    trustMultiplier?: number;
  };
}

const PRICING_TIMEZONE = "Africa/Nairobi";
const MAX_MULTIPLIER = 3.0;

function toPricingTimezoneDate(sourceDate: Date): Date {
  return new Date(
    sourceDate.toLocaleString("en-US", {
      timeZone: PRICING_TIMEZONE,
    }),
  );
}

function getDemandMultiplier(demandCount: number): number {
  if (demandCount >= 40) return 0.35;
  if (demandCount >= 20) return 0.2;
  if (demandCount >= 10) return 0.1;
  return 0;
}

function roundToTwo(value: number): number {
  return Number(value.toFixed(2));
}

export const getDynamicPrice = async (
  serviceId: string,
  pricingDate: Date = new Date(),
): Promise<DynamicPricingResult> => {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      providerId: true,
      provider: {
        select: {
          profile: {
            select: {
              premiumPricingEnabled: true,
              premiumMultiplier: true,
            },
          },
          trustScore: {
            select: {
              premiumEligible: true,
              premiumMultiplier: true,
            },
          },
        },
      },
    },
  });

  if (!service) {
    return {
      multiplier: 1,
      reason: null,
      breakdown: {
        timeMultiplier: 0,
        demandMultiplier: 0,
        weatherMultiplier: 0,
        providerMultiplier: 0,
        trustMultiplier: 0,
      },
    };
  }

  const localizedDate = toPricingTimezoneDate(pricingDate);
  const hour = localizedDate.getHours();
  const day = localizedDate.getDay();
  const month = localizedDate.getMonth() + 1;

  let timeMultiplier = 0;
  if (hour >= 20 || hour < 6) {
    timeMultiplier = 0.2;
  } else if (day === 0 || day === 6) {
    timeMultiplier = 0.1;
  }

  const demandWindowStart = new Date(localizedDate);
  demandWindowStart.setDate(demandWindowStart.getDate() - 30);

  const demandCount = await prisma.booking.count({
    where: {
      providerId: service.providerId,
      serviceId,
      createdAt: {
        gte: demandWindowStart,
      },
      status: {
        in: [
          "PENDING",
          "CONFIRMED",
          "IN_PROGRESS",
          "AWAITING_CLIENT_CONFIRMATION",
          "COMPLETED",
        ],
      },
    },
  });

  const demandMultiplier = getDemandMultiplier(demandCount);

  const providerMultiplier =
    service.provider.profile?.premiumPricingEnabled &&
    (service.provider.profile?.premiumMultiplier || 1) > 1
      ? Math.max((service.provider.profile?.premiumMultiplier || 1) - 1, 0)
      : 0;

  const trustMultiplier =
    service.provider.trustScore?.premiumEligible &&
    (service.provider.trustScore?.premiumMultiplier || 1) > 1
      ? Math.max((service.provider.trustScore?.premiumMultiplier || 1) - 1, 0)
      : 0;

  // Deterministic seasonal uplift for rainy months in the region.
  const rainySeasonMonths = new Set([3, 4, 5, 10, 11, 12]);
  const weatherMultiplier = rainySeasonMonths.has(month) ? 0.05 : 0;

  const rawMultiplier =
    1 +
    timeMultiplier +
    demandMultiplier +
    weatherMultiplier +
    providerMultiplier +
    trustMultiplier;
  const multiplier = roundToTwo(Math.min(rawMultiplier, MAX_MULTIPLIER));

  const reasons: string[] = [];
  if (demandMultiplier > 0) reasons.push("Service Demand");
  if (timeMultiplier > 0)
    reasons.push(hour >= 20 || hour < 6 ? "Night Hours" : "Weekend Rate");
  if (providerMultiplier > 0) reasons.push("Provider Premium Rate");
  if (trustMultiplier > 0) reasons.push("Trust Tier Premium");
  if (weatherMultiplier > 0) reasons.push("Seasonal Conditions");

  return {
    multiplier,
    reason: multiplier > 1 ? reasons.slice(0, 2).join(" + ") : null,
    breakdown: {
      timeMultiplier: roundToTwo(timeMultiplier),
      demandMultiplier: roundToTwo(demandMultiplier),
      weatherMultiplier: roundToTwo(weatherMultiplier),
      providerMultiplier: roundToTwo(providerMultiplier),
      trustMultiplier: roundToTwo(trustMultiplier),
    },
  };
};
