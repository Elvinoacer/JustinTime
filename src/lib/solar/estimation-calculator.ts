/**
 * Solar Estimation Calculator
 * Calculates system size, pricing, and ROI for solar installations
 */

export interface SolarPricingConfig {
  monocrystallinePerWatt: number;
  polycrystallinePerWatt: number;
  inverterPricePerKw: number;
  hybridInverterMarkup: number;
  leadAcidPerKwh: number;
  lithiumPerKwh: number;
  laborPerKw: number;
  sundriesPercent: number;
  defaultMargin: number;
  locationMultipliers?: Record<string, number>;
  baseMarkup?: number;
}

// Default pricing (KES) - these are used when DB config is missing/incomplete.
const DEFAULT_PRICING: Required<SolarPricingConfig> = {
  monocrystallinePerWatt: 45,
  polycrystallinePerWatt: 38,
  inverterPricePerKw: 25000,
  hybridInverterMarkup: 1.3,
  leadAcidPerKwh: 15000,
  lithiumPerKwh: 45000,
  laborPerKw: 8000,
  sundriesPercent: 0.15,
  defaultMargin: 0.25,
  locationMultipliers: {},
  baseMarkup: 1,
};

const DEFAULT_TARIFF_BY_PROPERTY: Record<
  SolarEstimationInput["propertyType"],
  number
> = {
  residential: 20,
  commercial: 18,
  industrial: 16,
};

const PROPERTY_LOAD_MULTIPLIER: Record<
  SolarEstimationInput["propertyType"],
  number
> = {
  residential: 1,
  commercial: 1.18,
  industrial: 1.3,
};

const ROOF_COMPLEXITY_MULTIPLIER: Record<
  SolarEstimationInput["roofType"],
  number
> = {
  flat: 1,
  pitched: 1.06,
  metal_sheet: 1.12,
};

const PANEL_AREA_M2: Record<SolarEstimationInput["panelType"], number> = {
  monocrystalline: 2.2,
  polycrystalline: 2.4,
};

// Solar irradiation factor for Kenya (hours of peak sun)
const PEAK_SUN_HOURS = 5.5;

// System efficiency loss
const SYSTEM_EFFICIENCY = 0.85;

const DEGRADATION_RATE = 0.006;
const ANNUAL_MAINTENANCE_RATE = 0.02;

export interface SolarEstimationInput {
  monthlyBill: number; // KES
  propertyType: "residential" | "commercial" | "industrial";
  roofType: "flat" | "pitched" | "metal_sheet";
  roofArea?: number; // m²
  panelType: "monocrystalline" | "polycrystalline";
  wantsBattery: boolean;
  batteryType?: "lead_acid" | "lithium";
  backupHours?: number; // Hours of backup needed
  isOffGrid: boolean;
  county?: string; // For location multipliers
}

export interface SolarEstimationResult {
  // System specs
  recommendedSystemKw: number;
  panelCount: number;
  panelWattage: number;
  inverterSizeKw: number;
  batteryCapacityKwh: number | null;
  roofAreaLimited: boolean;
  maxSystemKwByRoof: number | null;

  // Pricing breakdown
  panelsCost: number;
  inverterCost: number;
  batteryCost: number;
  laborCost: number;
  sundriesCost: number;
  subtotal: number;
  margin: number;
  totalCost: number;

  // ROI calculations
  monthlyGeneration: number; // kWh
  monthlySavings: number; // KES
  paybackYears: number;
  twentyYearSavings: number;

  // Comparison
  currentAnnualBill: number;
  solarAnnualCost: number; // Minimal maintenance
  annualSavings: number;

  assumptions: {
    tariffPerKwh: number;
    countyMultiplier: number;
    baseMarkup: number;
    annualDegradation: number;
  };

  warnings: string[];
}

function toFiniteNumber(value: unknown): number | null {
  const candidate =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(candidate)) {
    return null;
  }
  return candidate;
}

function sanitizePercentage(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return value;
}

function normalizeCountyKey(county: string): string {
  return county
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseLocationMultipliers(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const parsed: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const num = toFiniteNumber(raw);
    if (num && num > 0) {
      parsed[normalizeCountyKey(key)] = num;
    }
  }
  return parsed;
}

function normalizePricingConfig(
  overrides?: Partial<SolarPricingConfig>,
): Required<SolarPricingConfig> {
  const merged: Required<SolarPricingConfig> = {
    ...DEFAULT_PRICING,
    ...(overrides || {}),
    locationMultipliers: parseLocationMultipliers(
      overrides?.locationMultipliers,
    ),
    baseMarkup:
      toFiniteNumber(overrides?.baseMarkup ?? DEFAULT_PRICING.baseMarkup) ??
      DEFAULT_PRICING.baseMarkup,
  };

  merged.monocrystallinePerWatt =
    toFiniteNumber(merged.monocrystallinePerWatt) ??
    DEFAULT_PRICING.monocrystallinePerWatt;
  merged.polycrystallinePerWatt =
    toFiniteNumber(merged.polycrystallinePerWatt) ??
    DEFAULT_PRICING.polycrystallinePerWatt;
  merged.inverterPricePerKw =
    toFiniteNumber(merged.inverterPricePerKw) ??
    DEFAULT_PRICING.inverterPricePerKw;
  merged.hybridInverterMarkup =
    toFiniteNumber(merged.hybridInverterMarkup) ??
    DEFAULT_PRICING.hybridInverterMarkup;
  merged.leadAcidPerKwh =
    toFiniteNumber(merged.leadAcidPerKwh) ?? DEFAULT_PRICING.leadAcidPerKwh;
  merged.lithiumPerKwh =
    toFiniteNumber(merged.lithiumPerKwh) ?? DEFAULT_PRICING.lithiumPerKwh;
  merged.laborPerKw =
    toFiniteNumber(merged.laborPerKw) ?? DEFAULT_PRICING.laborPerKw;
  merged.sundriesPercent = sanitizePercentage(
    merged.sundriesPercent,
    DEFAULT_PRICING.sundriesPercent,
  );
  merged.defaultMargin = sanitizePercentage(
    merged.defaultMargin,
    DEFAULT_PRICING.defaultMargin,
  );
  merged.baseMarkup =
    toFiniteNumber(merged.baseMarkup) && (merged.baseMarkup as number) > 0
      ? (merged.baseMarkup as number)
      : DEFAULT_PRICING.baseMarkup;

  return merged;
}

function resolveCountyMultiplier(
  county: string | undefined,
  multipliers: Record<string, number>,
): number {
  if (!county) return 1;
  return multipliers[normalizeCountyKey(county)] ?? 1;
}

function getTariffPerKwh(
  propertyType: SolarEstimationInput["propertyType"],
): number {
  return DEFAULT_TARIFF_BY_PROPERTY[propertyType];
}

function getOffsetFactor(input: SolarEstimationInput): number {
  if (input.isOffGrid) return 1;
  if (input.propertyType === "industrial")
    return input.wantsBattery ? 0.9 : 0.84;
  if (input.propertyType === "commercial")
    return input.wantsBattery ? 0.93 : 0.87;
  return input.wantsBattery ? 0.95 : 0.9;
}

/**
 * Calculate recommended solar system size based on monthly bill
 */
export function calculateSystemSize(
  monthlyBill: number,
  propertyType: SolarEstimationInput["propertyType"] = "residential",
): number {
  const tariff = getTariffPerKwh(propertyType);
  // Convert bill to monthly kWh consumption.
  const monthlyKwh = monthlyBill / tariff;

  // Daily consumption
  const dailyKwh = monthlyKwh / 30;

  // Required system size accounting for profile-specific daytime usage patterns.
  const systemKw =
    (dailyKwh / (PEAK_SUN_HOURS * SYSTEM_EFFICIENCY)) *
    PROPERTY_LOAD_MULTIPLIER[propertyType];

  // Round up to nearest 0.5 kW
  return Math.ceil(systemKw * 2) / 2;
}

/**
 * Calculate panel count
 */
export function calculatePanelCount(
  systemKw: number,
  panelWattage: number = 550,
): number {
  const totalWatts = systemKw * 1000;
  return Math.ceil(totalWatts / panelWattage);
}

/**
 * Calculate battery capacity needed
 */
export function calculateBatteryCapacity(
  systemKw: number,
  backupHours: number,
  isOffGrid: boolean,
): number {
  const avgDailyLoad = systemKw * PEAK_SUN_HOURS * SYSTEM_EFFICIENCY;

  if (isOffGrid) {
    // Off-grid systems typically target at least ~1.5 days of autonomy.
    return avgDailyLoad * 1.5;
  }

  // Hybrid: just backup hours worth
  const hourlyLoad = avgDailyLoad / 24;
  return hourlyLoad * backupHours;
}

/**
 * Full solar estimation
 */
export function estimateSolarSystem(
  input: SolarEstimationInput,
  pricingOverrides?: Partial<SolarPricingConfig>,
): SolarEstimationResult {
  const pricing = normalizePricingConfig(pricingOverrides);
  const warnings: string[] = [];

  const targetSystemKw = calculateSystemSize(
    input.monthlyBill,
    input.propertyType,
  );

  // Panel specs
  const panelWattage = input.panelType === "monocrystalline" ? 550 : 450;
  const panelArea = PANEL_AREA_M2[input.panelType];

  let panelCount = calculatePanelCount(targetSystemKw, panelWattage);
  let roofAreaLimited = false;
  let maxSystemKwByRoof: number | null = null;

  if (input.roofArea && input.roofArea > 0) {
    const maxPanelsByRoof = Math.floor(input.roofArea / panelArea);
    if (maxPanelsByRoof <= 0) {
      throw new Error("Roof area is too small for the selected panel type");
    }
    maxSystemKwByRoof = (maxPanelsByRoof * panelWattage) / 1000;
    if (panelCount > maxPanelsByRoof) {
      panelCount = maxPanelsByRoof;
      roofAreaLimited = true;
      warnings.push(
        "System size was capped by available roof area. Consider carport or ground mounting for larger capacity.",
      );
    }
  }

  const actualSystemKw = (panelCount * panelWattage) / 1000;

  // Inverter sizing (10% more than system for headroom)
  const inverterSizeKw = Math.ceil(actualSystemKw * 1.1);

  // Battery calculation
  let batteryCapacityKwh: number | null = null;
  let batteryCost = 0;

  if (input.wantsBattery) {
    const backupHours = input.backupHours || (input.isOffGrid ? 48 : 8);
    batteryCapacityKwh = calculateBatteryCapacity(
      actualSystemKw,
      backupHours,
      input.isOffGrid,
    );
    batteryCapacityKwh = Math.ceil(batteryCapacityKwh); // Round up

    const perKwh =
      input.batteryType === "lithium"
        ? pricing.lithiumPerKwh
        : pricing.leadAcidPerKwh;

    batteryCost = batteryCapacityKwh * perKwh;
  }

  const countyMultiplier = resolveCountyMultiplier(
    input.county,
    pricing.locationMultipliers,
  );
  const roofComplexityMultiplier = ROOF_COMPLEXITY_MULTIPLIER[input.roofType];

  // Pricing calculations
  const pricePerWatt =
    input.panelType === "monocrystalline"
      ? pricing.monocrystallinePerWatt
      : pricing.polycrystallinePerWatt;

  const panelsCost =
    panelCount * panelWattage * pricePerWatt * countyMultiplier;

  const inverterMultiplier = input.wantsBattery
    ? pricing.hybridInverterMarkup
    : 1;
  const inverterCost =
    inverterSizeKw *
    pricing.inverterPricePerKw *
    inverterMultiplier *
    countyMultiplier;

  const laborCost =
    actualSystemKw *
    pricing.laborPerKw *
    roofComplexityMultiplier *
    countyMultiplier;

  const equipmentTotal = panelsCost + inverterCost + batteryCost;
  const sundriesCost = equipmentTotal * pricing.sundriesPercent;

  const subtotal = equipmentTotal + laborCost + sundriesCost;
  const margin = subtotal * pricing.defaultMargin;
  const preMarkupTotal = subtotal + margin;
  const totalCost = preMarkupTotal * pricing.baseMarkup;

  // Generation and savings
  const monthlyGeneration =
    actualSystemKw * PEAK_SUN_HOURS * 30 * SYSTEM_EFFICIENCY;
  const tariffPerKwh = getTariffPerKwh(input.propertyType);
  const monthlySavingsRaw =
    monthlyGeneration * tariffPerKwh * getOffsetFactor(input);
  const monthlySavingsCap = input.monthlyBill * (input.isOffGrid ? 1 : 0.95);
  const monthlySavings = Math.min(monthlySavingsRaw, monthlySavingsCap);

  // ROI
  const annualMaintenance = totalCost * ANNUAL_MAINTENANCE_RATE;
  const firstYearNetSavings = monthlySavings * 12 - annualMaintenance;
  const paybackYears =
    firstYearNetSavings > 0
      ? totalCost / firstYearNetSavings
      : Number.POSITIVE_INFINITY;

  let cumulativeSavings = -totalCost;
  for (let year = 0; year < 20; year += 1) {
    const degradedAnnualSavings =
      monthlySavings * 12 * (1 - DEGRADATION_RATE) ** year;
    cumulativeSavings += degradedAnnualSavings - annualMaintenance;
  }

  const currentAnnualBill = input.monthlyBill * 12;
  const solarAnnualCost = annualMaintenance;
  const annualSavings = Math.max(0, monthlySavings * 12 - solarAnnualCost);

  if (monthlySavings < input.monthlyBill * 0.6) {
    warnings.push(
      "Estimated offset is below 60% of your current bill; consider a larger roof area or reduced daytime load.",
    );
  }

  return {
    recommendedSystemKw: actualSystemKw,
    panelCount,
    panelWattage,
    inverterSizeKw,
    batteryCapacityKwh,
    roofAreaLimited,
    maxSystemKwByRoof,
    panelsCost,
    inverterCost,
    batteryCost,
    laborCost,
    sundriesCost,
    subtotal,
    margin,
    totalCost: Math.round(totalCost),
    monthlyGeneration,
    monthlySavings: Math.round(monthlySavings),
    paybackYears:
      Number.isFinite(paybackYears) && paybackYears > 0
        ? Math.round(paybackYears * 10) / 10
        : 99,
    twentyYearSavings: Math.round(cumulativeSavings),
    currentAnnualBill,
    solarAnnualCost: Math.round(solarAnnualCost),
    annualSavings: Math.round(annualSavings),
    assumptions: {
      tariffPerKwh,
      countyMultiplier,
      baseMarkup: pricing.baseMarkup,
      annualDegradation: DEGRADATION_RATE,
    },
    warnings,
  };
}

/**
 * Quick estimate for UI display
 */
export function quickEstimate(monthlyBill: number): {
  systemKw: number;
  priceRange: { min: number; max: number };
  paybackRange: { min: number; max: number };
} {
  if (!Number.isFinite(monthlyBill) || monthlyBill <= 0) {
    throw new Error("Monthly bill must be greater than zero");
  }

  const systemKw = calculateSystemSize(monthlyBill, "residential");

  const baselineInput: SolarEstimationInput = {
    monthlyBill,
    propertyType: "residential",
    roofType: "pitched",
    panelType: "polycrystalline",
    wantsBattery: false,
    isOffGrid: false,
  };

  const minScenario = estimateSolarSystem(baselineInput, { baseMarkup: 1 });
  const maxScenario = estimateSolarSystem(
    {
      ...baselineInput,
      panelType: "monocrystalline",
      wantsBattery: true,
      batteryType: "lithium",
      backupHours: 12,
    },
    { baseMarkup: 1.08 },
  );

  return {
    systemKw,
    priceRange: {
      min: Math.round(minScenario.totalCost / 1000) * 1000,
      max: Math.round(maxScenario.totalCost / 1000) * 1000,
    },
    paybackRange: {
      min: Math.min(minScenario.paybackYears, maxScenario.paybackYears),
      max: Math.max(minScenario.paybackYears, maxScenario.paybackYears),
    },
  };
}
