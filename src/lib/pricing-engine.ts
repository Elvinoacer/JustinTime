
export interface DynamicPricingResult {
  multiplier: number;
  reason: string | null;
  breakdown: {
    timeMultiplier: number;
    demandMultiplier: number;
    weatherMultiplier: number;
  };
}

export const getDynamicPrice = async (serviceId: string, _date: Date = new Date()): Promise<DynamicPricingResult> => {
  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  const date = new Date(_date);
  const hour = date.getHours();
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday

  let reason = null;
  let multiplier = 1.0;

  // 1. Time-based Pricing
  // Night shift (8 PM - 6 AM) or Weekends
  let timeMultiplier = 0.0;
  if (hour >= 20 || hour < 6) {
    timeMultiplier = 0.2; // +20% for night/early morning
    if (!reason) reason = "Night Hours";
  } else if (day === 0 || day === 6) {
    timeMultiplier = 0.1; // +10% for weekends
    if (!reason) reason = "Weekend Rate";
  }

  // 2. Demand Simulation (Randomized for demo)
  // 30% chance of high demand
  let demandMultiplier = 0.0;
  if (Math.random() < 0.3) {
    demandMultiplier = parseFloat((Math.random() * 0.4 + 0.1).toFixed(2)); // +10% to +50%
    if (!reason) reason = "High Demand";
  }

  // 3. Weather Simulation (Randomized for demo)
  // 10% chance of bad weather
  let weatherMultiplier = 0.0;
  if (Math.random() < 0.1) {
    weatherMultiplier = 0.3; // +30%
    if (!reason) reason = "Poor Weather Conditions";
  }
  
  multiplier = 1.0 + timeMultiplier + demandMultiplier + weatherMultiplier;

  // Round to 2 decimal places
  multiplier = parseFloat(multiplier.toFixed(2));

  return {
    multiplier,
    reason: multiplier > 1.0 ? (reason || "Dynamic Pricing") : null,
    breakdown: {
      timeMultiplier,
      demandMultiplier,
      weatherMultiplier,
    }
  };
};
