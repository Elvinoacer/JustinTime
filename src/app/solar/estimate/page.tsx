"use client";

import { useState } from "react";
import { getDetailedSolarEstimate } from "@/app/actions/solar";
import { Sun, Battery, Home, Zap, Calculator, ArrowRight, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

type PropertyType = 'residential' | 'commercial' | 'industrial';
type RoofType = 'flat' | 'pitched' | 'metal_sheet';
type PanelType = 'monocrystalline' | 'polycrystalline';
type BatteryType = 'lead_acid' | 'lithium';

interface EstimateResult {
  recommendedSystemKw: number;
  panelCount: number;
  panelWattage: number;
  inverterSizeKw: number;
  batteryCapacityKwh: number | null;
  panelsCost: number;
  inverterCost: number;
  batteryCost: number;
  laborCost: number;
  sundriesCost: number;
  subtotal: number;
  margin: number;
  totalCost: number;
  monthlyGeneration: number;
  monthlySavings: number;
  paybackYears: number;
  twentyYearSavings: number;
  currentAnnualBill: number;
  solarAnnualCost: number;
  annualSavings: number;
}

export default function SolarEstimatePage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);

  // Form state
  const [monthlyBill, setMonthlyBill] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("residential");
  const [roofType, setRoofType] = useState<RoofType>("pitched");
  const [panelType, setPanelType] = useState<PanelType>("monocrystalline");
  const [wantsBattery, setWantsBattery] = useState(true);
  const [batteryType, setBatteryType] = useState<BatteryType>("lithium");
  const [backupHours, setBackupHours] = useState("8");
  const [isOffGrid, setIsOffGrid] = useState(false);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES', 
      maximumFractionDigits: 0 
    }).format(amount);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await getDetailedSolarEstimate({
        monthlyBill: parseFloat(monthlyBill),
        propertyType,
        roofType,
        panelType,
        wantsBattery,
        batteryType,
        backupHours: parseInt(backupHours),
        isOffGrid
      });

      if (result.success && result.estimate) {
        setEstimate(result.estimate);
        setStep(3);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/solar" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Solar
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Solar System Calculator
          </h1>
          <p className="text-gray-600">
            Get an instant estimate for your home or business
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-medium ${
                step >= s ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`w-12 h-1 ${step > s ? 'bg-amber-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Step 1: Monthly Bill */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="text-center mb-8">
                <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  What's your monthly electricity bill?
                </h2>
                <p className="text-gray-600">
                  We'll calculate the perfect system size for your needs
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Average Monthly Bill (KES)
                  </label>
                  <input
                    type="number"
                    value={monthlyBill}
                    onChange={(e) => setMonthlyBill(e.target.value)}
                    placeholder="15000"
                    className="w-full px-4 py-4 rounded-xl border border-gray-300 text-xl font-medium focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[10000, 15000, 25000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setMonthlyBill(amount.toString())}
                      className="py-2 px-4 border border-gray-200 rounded-lg hover:bg-amber-50 hover:border-amber-300 text-sm font-medium"
                    >
                      {formatAmount(amount)}/mo
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!monthlyBill}
                  className="w-full py-4 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: System Options */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="text-center mb-8">
                <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Tell us about your property
                </h2>
              </div>

              <div className="space-y-6">
                {/* Property Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'residential', label: 'Home', icon: '🏠' },
                      { value: 'commercial', label: 'Business', icon: '🏢' },
                      { value: 'industrial', label: 'Industrial', icon: '🏭' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPropertyType(option.value as PropertyType)}
                        className={`py-4 px-4 border rounded-xl text-center ${
                          propertyType === option.value 
                            ? 'border-amber-500 bg-amber-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-2xl block mb-1">{option.icon}</span>
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Panel Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Panel Quality
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPanelType('monocrystalline')}
                      className={`py-4 px-4 border rounded-xl ${
                        panelType === 'monocrystalline' 
                          ? 'border-amber-500 bg-amber-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium block">Monocrystalline</span>
                      <span className="text-xs text-gray-500">Premium, 25% efficiency</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPanelType('polycrystalline')}
                      className={`py-4 px-4 border rounded-xl ${
                        panelType === 'polycrystalline' 
                          ? 'border-amber-500 bg-amber-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium block">Polycrystalline</span>
                      <span className="text-xs text-gray-500">Budget, 20% efficiency</span>
                    </button>
                  </div>
                </div>

                {/* Battery */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Battery Backup
                  </label>
                  <div className="flex items-center gap-4 p-4 border rounded-xl">
                    <Battery className="h-6 w-6 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium">Include Battery Storage?</p>
                      <p className="text-sm text-gray-500">Power during blackouts</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWantsBattery(!wantsBattery)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        wantsBattery ? 'bg-amber-600' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`h-5 w-5 bg-white rounded-full shadow transition-transform ${
                        wantsBattery ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {wantsBattery && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBatteryType('lithium')}
                        className={`py-3 px-4 border rounded-xl ${
                          batteryType === 'lithium' 
                            ? 'border-amber-500 bg-amber-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <span className="font-medium block">Lithium</span>
                        <span className="text-xs text-gray-500">10+ year life</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatteryType('lead_acid')}
                        className={`py-3 px-4 border rounded-xl ${
                          batteryType === 'lead_acid' 
                            ? 'border-amber-500 bg-amber-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <span className="font-medium block">Lead Acid</span>
                        <span className="text-xs text-gray-500">3-5 year life</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-4 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-4 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Calculating...' : 'Get Estimate'}
                    <Calculator className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 3 && estimate && (
            <div className="space-y-6">
              {/* System Summary */}
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-8 text-white">
                <div className="text-center mb-6">
                  <Sun className="h-12 w-12 mx-auto mb-3 opacity-90" />
                  <h2 className="text-3xl font-bold mb-2">
                    Your Solar System
                  </h2>
                  <p className="text-amber-100">Recommended configuration for your needs</p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white/20 rounded-xl p-4">
                    <p className="text-3xl font-bold">{estimate.recommendedSystemKw}</p>
                    <p className="text-amber-100 text-sm">kW System</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4">
                    <p className="text-3xl font-bold">{estimate.panelCount}</p>
                    <p className="text-amber-100 text-sm">Solar Panels</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4">
                    <p className="text-3xl font-bold">{estimate.batteryCapacityKwh || 'N/A'}</p>
                    <p className="text-amber-100 text-sm">kWh Battery</p>
                  </div>
                </div>
              </div>

              {/* Investment & Returns */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900">Investment & Returns</h3>
                </div>

                <div className="divide-y divide-gray-100">
                  <div className="p-4 flex justify-between">
                    <span className="text-gray-600">Solar Panels ({estimate.panelCount}x)</span>
                    <span className="font-medium">{formatAmount(estimate.panelsCost)}</span>
                  </div>
                  <div className="p-4 flex justify-between">
                    <span className="text-gray-600">Inverter ({estimate.inverterSizeKw}kW)</span>
                    <span className="font-medium">{formatAmount(estimate.inverterCost)}</span>
                  </div>
                  {estimate.batteryCost > 0 && (
                    <div className="p-4 flex justify-between">
                      <span className="text-gray-600">Battery ({estimate.batteryCapacityKwh}kWh)</span>
                      <span className="font-medium">{formatAmount(estimate.batteryCost)}</span>
                    </div>
                  )}
                  <div className="p-4 flex justify-between">
                    <span className="text-gray-600">Installation & Wiring</span>
                    <span className="font-medium">{formatAmount(estimate.laborCost + estimate.sundriesCost)}</span>
                  </div>
                  <div className="p-4 flex justify-between bg-amber-50">
                    <span className="font-bold text-gray-900">Total Investment</span>
                    <span className="font-bold text-amber-600 text-xl">{formatAmount(estimate.totalCost)}</span>
                  </div>
                </div>
              </div>

              {/* Savings */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-6 w-6" />
                  Your Savings
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Monthly Savings</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatAmount(estimate.monthlySavings)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Payback Period</p>
                    <p className="text-2xl font-bold text-emerald-600">{estimate.paybackYears} years</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 col-span-2">
                    <p className="text-sm text-gray-500 mb-1">20-Year Savings</p>
                    <p className="text-3xl font-bold text-emerald-600">{formatAmount(estimate.twentyYearSavings)}</p>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-4 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                >
                  Adjust Options
                </button>
                <Link
                  href="/solar/installers"
                  className="flex-1 py-4 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 text-center"
                >
                  Find Installers Near You
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
