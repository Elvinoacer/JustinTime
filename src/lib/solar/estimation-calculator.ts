/**
 * Solar Estimation Calculator
 * Calculates system size, pricing, and ROI for solar installations
 */

// Default pricing (KES) - can be overridden by SolarEstimationConfig
const DEFAULT_PRICING = {
  monocrystallinePerWatt: 45,     // KES per watt
  polycrystallinePerWatt: 38,
  inverterPricePerKw: 25000,
  hybridInverterMarkup: 1.3,      // 30% more for hybrid
  leadAcidPerKwh: 15000,
  lithiumPerKwh: 45000,
  laborPerKw: 8000,               // Installation labor per kW
  sundriesPercent: 0.15,          // 15% for wiring, mounting, etc.
  defaultMargin: 0.25             // 25% profit margin
};

// Average monthly kWh consumption by bill amount (KES)
const BILL_TO_KWH_FACTOR = 0.055; // Roughly KES 18/kWh average

// Solar irradiation factor for Kenya (hours of peak sun)
const PEAK_SUN_HOURS = 5.5;

// System efficiency loss
const SYSTEM_EFFICIENCY = 0.85;

export interface SolarEstimationInput {
  monthlyBill: number;           // KES
  propertyType: 'residential' | 'commercial' | 'industrial';
  roofType: 'flat' | 'pitched' | 'metal_sheet';
  roofArea?: number;             // m²
  panelType: 'monocrystalline' | 'polycrystalline';
  wantsBattery: boolean;
  batteryType?: 'lead_acid' | 'lithium';
  backupHours?: number;          // Hours of backup needed
  isOffGrid: boolean;
  county?: string;               // For location multipliers
}

export interface SolarEstimationResult {
  // System specs
  recommendedSystemKw: number;
  panelCount: number;
  panelWattage: number;
  inverterSizeKw: number;
  batteryCapacityKwh: number | null;
  
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
  monthlyGeneration: number;     // kWh
  monthlySavings: number;        // KES
  paybackYears: number;
  twentyYearSavings: number;
  
  // Comparison
  currentAnnualBill: number;
  solarAnnualCost: number;       // Minimal maintenance
  annualSavings: number;
}

/**
 * Calculate recommended solar system size based on monthly bill
 */
export function calculateSystemSize(monthlyBill: number): number {
  // Convert bill to kWh consumption
  const monthlyKwh = monthlyBill * BILL_TO_KWH_FACTOR;
  
  // Daily consumption
  const dailyKwh = monthlyKwh / 30;
  
  // Required system size (accounting for efficiency and peak sun)
  const systemKw = dailyKwh / (PEAK_SUN_HOURS * SYSTEM_EFFICIENCY);
  
  // Round up to nearest 0.5 kW
  return Math.ceil(systemKw * 2) / 2;
}

/**
 * Calculate panel count
 */
export function calculatePanelCount(systemKw: number, panelWattage: number = 550): number {
  const totalWatts = systemKw * 1000;
  return Math.ceil(totalWatts / panelWattage);
}

/**
 * Calculate battery capacity needed
 */
export function calculateBatteryCapacity(
  systemKw: number,
  backupHours: number,
  isOffGrid: boolean
): number {
  // Average load = system size * peak hours / 24 hours * backup hours
  const avgDailyLoad = systemKw * PEAK_SUN_HOURS;
  
  if (isOffGrid) {
    // Off-grid needs 2-3 days autonomy
    return avgDailyLoad * 2;
  }
  
  // Hybrid: just backup hours worth
  const hourlyLoad = avgDailyLoad / 12; // Assume 12 hours of active use
  return hourlyLoad * backupHours;
}

/**
 * Full solar estimation
 */
export function estimateSolarSystem(input: SolarEstimationInput): SolarEstimationResult {
  // Calculate system size
  const recommendedSystemKw = calculateSystemSize(input.monthlyBill);
  
  // Panel specs
  const panelWattage = input.panelType === 'monocrystalline' ? 550 : 450;
  const panelCount = calculatePanelCount(recommendedSystemKw, panelWattage);
  const actualSystemKw = (panelCount * panelWattage) / 1000;
  
  // Inverter sizing (10% more than system for headroom)
  const inverterSizeKw = Math.ceil(actualSystemKw * 1.1);
  
  // Battery calculation
  let batteryCapacityKwh: number | null = null;
  let batteryCost = 0;
  
  if (input.wantsBattery) {
    const backupHours = input.backupHours || (input.isOffGrid ? 48 : 8);
    batteryCapacityKwh = calculateBatteryCapacity(actualSystemKw, backupHours, input.isOffGrid);
    batteryCapacityKwh = Math.ceil(batteryCapacityKwh); // Round up
    
    const perKwh = input.batteryType === 'lithium' 
      ? DEFAULT_PRICING.lithiumPerKwh 
      : DEFAULT_PRICING.leadAcidPerKwh;
    
    batteryCost = batteryCapacityKwh * perKwh;
  }
  
  // Pricing calculations
  const pricePerWatt = input.panelType === 'monocrystalline'
    ? DEFAULT_PRICING.monocrystallinePerWatt
    : DEFAULT_PRICING.polycrystallinePerWatt;
  
  const panelsCost = panelCount * panelWattage * pricePerWatt;
  
  const inverterMultiplier = input.wantsBattery ? DEFAULT_PRICING.hybridInverterMarkup : 1;
  const inverterCost = inverterSizeKw * DEFAULT_PRICING.inverterPricePerKw * inverterMultiplier;
  
  const laborCost = actualSystemKw * DEFAULT_PRICING.laborPerKw;
  
  const equipmentTotal = panelsCost + inverterCost + batteryCost;
  const sundriesCost = equipmentTotal * DEFAULT_PRICING.sundriesPercent;
  
  const subtotal = equipmentTotal + laborCost + sundriesCost;
  const margin = subtotal * DEFAULT_PRICING.defaultMargin;
  const totalCost = subtotal + margin;
  
  // Generation and savings
  const monthlyGeneration = actualSystemKw * PEAK_SUN_HOURS * 30 * SYSTEM_EFFICIENCY;
  const monthlySavings = monthlyGeneration * (1 / BILL_TO_KWH_FACTOR); // Convert back to KES
  
  // ROI
  const paybackYears = totalCost / (monthlySavings * 12);
  const twentyYearSavings = (monthlySavings * 12 * 20) - totalCost;
  
  const currentAnnualBill = input.monthlyBill * 12;
  const solarAnnualCost = totalCost * 0.02; // ~2% annual maintenance
  const annualSavings = currentAnnualBill - solarAnnualCost;
  
  return {
    recommendedSystemKw: actualSystemKw,
    panelCount,
    panelWattage,
    inverterSizeKw,
    batteryCapacityKwh,
    panelsCost,
    inverterCost,
    batteryCost,
    laborCost,
    sundriesCost,
    subtotal,
    margin,
    totalCost,
    monthlyGeneration,
    monthlySavings,
    paybackYears: Math.round(paybackYears * 10) / 10,
    twentyYearSavings: Math.round(twentyYearSavings),
    currentAnnualBill,
    solarAnnualCost: Math.round(solarAnnualCost),
    annualSavings: Math.round(annualSavings)
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
  const systemKw = calculateSystemSize(monthlyBill);
  
  // Price range (monocrystalline hybrid to polycrystalline basic)
  const minPrice = systemKw * 80000;  // Basic poly without battery
  const maxPrice = systemKw * 180000; // Mono with lithium battery
  
  // Payback range
  const monthlySavings = monthlyBill * 0.9; // Assume 90% offset
  const minPayback = minPrice / (monthlySavings * 12);
  const maxPayback = maxPrice / (monthlySavings * 12);
  
  return {
    systemKw,
    priceRange: { 
      min: Math.round(minPrice / 1000) * 1000, 
      max: Math.round(maxPrice / 1000) * 1000 
    },
    paybackRange: {
      min: Math.round(minPayback * 10) / 10,
      max: Math.round(maxPayback * 10) / 10
    }
  };
}
