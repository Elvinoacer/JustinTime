"use client";

import { useEffect, useState } from "react";
import {
  getDetailedSolarEstimate,
  getSolarInstallers,
  getSolarTemplates,
  requestSolarQuote,
} from "@/app/actions/solar";
import {
  Sun,
  Battery,
  Home,
  Zap,
  Calculator,
  ArrowRight,
  CheckCircle,
  ArrowLeft,
  AlertTriangle,
  ClipboardCheck,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type PropertyType = "residential" | "commercial" | "industrial";
type RoofType = "flat" | "pitched" | "metal_sheet";
type PanelType = "monocrystalline" | "polycrystalline";
type BatteryType = "lead_acid" | "lithium";

interface EstimateResult {
  recommendedSystemKw: number;
  panelCount: number;
  panelWattage: number;
  inverterSizeKw: number;
  batteryCapacityKwh: number | null;
  roofAreaLimited?: boolean;
  maxSystemKwByRoof?: number | null;
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
  assumptions?: {
    tariffPerKwh: number;
    countyMultiplier: number;
    baseMarkup: number;
    annualDegradation: number;
  };
  warnings?: string[];
}

interface InstallerOption {
  id: string;
  userId: string;
  name: string | null;
  location: string | null;
  averageRating: number;
  availableOnDate: boolean;
  withinRadius: boolean;
  distanceKm: number | null;
}

interface TemplateOption {
  id: string;
  name: string;
  description: string | null;
}

type FieldErrors = Record<string, string[] | undefined>;

function parseOptionalPositiveNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

export default function SolarEstimatePage() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [quoteSuccessProjectId, setQuoteSuccessProjectId] = useState<
    string | null
  >(null);

  // Estimate form state
  const [monthlyBill, setMonthlyBill] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("residential");
  const [roofType, setRoofType] = useState<RoofType>("pitched");
  const [roofArea, setRoofArea] = useState("");
  const [county, setCounty] = useState("");
  const [panelType, setPanelType] = useState<PanelType>("monocrystalline");
  const [wantsBattery, setWantsBattery] = useState(true);
  const [batteryType, setBatteryType] = useState<BatteryType>("lithium");
  const [backupHours, setBackupHours] = useState("8");
  const [isOffGrid, setIsOffGrid] = useState(false);

  // Quote form state
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [title, setTitle] = useState("Residential Solar Installation");
  const [siteAddress, setSiteAddress] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSpecialistId, setSelectedSpecialistId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [installers, setInstallers] = useState<InstallerOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  useEffect(() => {
    const bill = searchParams.get("monthlyBill");
    if (!bill) return;

    const parsed = Number.parseFloat(bill);
    if (Number.isFinite(parsed) && parsed > 0) {
      setMonthlyBill(String(Math.round(parsed)));
      setStep(2);
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      try {
        setLoadingOptions(true);

        const [installersResult, templatesResult] = await Promise.all([
          getSolarInstallers({ limit: 12 }),
          getSolarTemplates(),
        ]);

        if (!isMounted) return;

        if (installersResult.success && installersResult.specialists) {
          setInstallers(
            installersResult.specialists.map((specialist) => ({
              id: specialist.id,
              userId: specialist.userId,
              name: specialist.name,
              location: specialist.location,
              averageRating: specialist.averageRating,
              availableOnDate: specialist.availableOnDate,
              withinRadius: specialist.withinRadius,
              distanceKm: specialist.distanceKm,
            })),
          );
        }

        if (templatesResult.success && templatesResult.templates) {
          setTemplates(
            templatesResult.templates.map((template) => ({
              id: template.id,
              name: template.name,
              description: template.description,
            })),
          );
        }
      } finally {
        if (isMounted) {
          setLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isOffGrid && wantsBattery) {
      const parsed = Number.parseInt(backupHours || "0", 10);
      if (!Number.isFinite(parsed) || parsed < 24) {
        setBackupHours("48");
      }
    }
  }, [isOffGrid, wantsBattery, backupHours]);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(amount);

  const fieldError = (key: string) => fieldErrors[key]?.[0] || null;

  const runClientValidation = (): boolean => {
    const nextErrors: FieldErrors = {};

    const parsedBill = Number.parseFloat(monthlyBill);
    if (!Number.isFinite(parsedBill) || parsedBill < 500) {
      nextErrors.monthlyBill = [
        "Enter a valid monthly bill of at least KES 500",
      ];
    }

    if (roofArea.trim()) {
      const parsedRoofArea = Number.parseFloat(roofArea);
      if (!Number.isFinite(parsedRoofArea) || parsedRoofArea < 8) {
        nextErrors.roofArea = ["Roof area must be at least 8 m2 if provided"];
      }
    }

    if (county.trim() && county.trim().length < 2) {
      nextErrors.county = ["County name is too short"];
    }

    if (wantsBattery) {
      if (!batteryType) {
        nextErrors.batteryType = ["Select a battery type"];
      }

      const parsedBackupHours = Number.parseInt(backupHours, 10);
      if (
        !Number.isFinite(parsedBackupHours) ||
        parsedBackupHours < 1 ||
        parsedBackupHours > 120
      ) {
        nextErrors.backupHours = ["Backup hours must be between 1 and 120"];
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleEstimate = async () => {
    setError(null);
    setFieldErrors({});
    setQuoteSuccessProjectId(null);

    if (!runClientValidation()) {
      setError("Please fix the highlighted fields before continuing.");
      return;
    }

    setLoadingEstimate(true);

    try {
      const result = await getDetailedSolarEstimate({
        monthlyBill: Number.parseFloat(monthlyBill),
        propertyType,
        roofType,
        roofArea: parseOptionalPositiveNumber(roofArea),
        panelType,
        wantsBattery,
        batteryType: wantsBattery ? batteryType : undefined,
        backupHours: wantsBattery
          ? Number.parseInt(backupHours || (isOffGrid ? "48" : "8"), 10)
          : undefined,
        isOffGrid,
        county: county.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || "Could not calculate estimate. Please retry.");
        setFieldErrors(
          "fieldErrors" in result && result.fieldErrors
            ? result.fieldErrors
            : {},
        );
        return;
      }

      if (!("estimate" in result) || !result.estimate) {
        setError("Could not calculate estimate. Please retry.");
        return;
      }

      setEstimate(result.estimate);
      setShowQuoteForm(false);
      setStep(3);
    } catch {
      setError("Could not calculate estimate. Please retry.");
    } finally {
      setLoadingEstimate(false);
    }
  };

  const validateQuoteForm = (): boolean => {
    const nextErrors: FieldErrors = {};

    if (title.trim().length < 4) {
      nextErrors.title = ["Project title must be at least 4 characters"];
    }

    if (siteAddress.trim().length < 8) {
      nextErrors.siteAddress = ["Site address must be at least 8 characters"];
    }

    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const handleQuoteRequest = async () => {
    if (!estimate) return;

    setError(null);
    setFieldErrors({});

    if (!validateQuoteForm()) {
      setError("Please complete the quote request fields.");
      return;
    }

    setLoadingQuote(true);

    try {
      const result = await requestSolarQuote({
        title: title.trim(),
        description: description.trim() || undefined,
        siteAddress: siteAddress.trim(),
        propertyType,
        roofType,
        roofArea: parseOptionalPositiveNumber(roofArea),
        monthlyBill: Number.parseFloat(monthlyBill),
        panelType,
        wantsBattery,
        batteryType: wantsBattery ? batteryType : undefined,
        backupHours: wantsBattery
          ? Number.parseInt(backupHours || (isOffGrid ? "48" : "8"), 10)
          : undefined,
        isOffGrid,
        county: county.trim() || undefined,
        selectedSpecialistId: selectedSpecialistId || undefined,
        templateId: selectedTemplateId || undefined,
      });

      if (!result.success) {
        setError(result.error || "Failed to request quote");
        setFieldErrors(
          "fieldErrors" in result && result.fieldErrors
            ? result.fieldErrors
            : {},
        );
        return;
      }

      if (!("project" in result) || !result.project) {
        setError("Failed to request quote");
        return;
      }

      setQuoteSuccessProjectId(result.project.id);
      setShowQuoteForm(false);
    } catch {
      setError("Failed to request quote. Please try again.");
    } finally {
      setLoadingQuote(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-amber-50 to-white py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Link
            href="/solar"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Solar
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Solar System Calculator
          </h1>
          <p className="text-gray-600">
            Build a detailed estimate and request a real site assessment quote.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center font-medium ${
                  step >= s
                    ? "bg-amber-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-1 ${step > s ? "bg-amber-600" : "bg-gray-200"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="text-center mb-8">
                <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  What is your monthly electricity bill?
                </h2>
                <p className="text-gray-600">
                  We use this to size your baseline system capacity.
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
                    min={500}
                    step={100}
                    placeholder="15000"
                    className="w-full px-4 py-4 rounded-xl border border-gray-300 text-xl font-medium focus:ring-2 focus:ring-amber-500"
                  />
                  {fieldError("monthlyBill") && (
                    <p className="text-sm text-red-600 mt-2">
                      {fieldError("monthlyBill")}
                    </p>
                  )}
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

          {step === 2 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="text-center mb-8">
                <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Configure your property and system
                </h2>
                <p className="text-gray-600">
                  Add enough detail for a realistic estimate.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "residential", label: "Home", icon: "🏠" },
                      { value: "commercial", label: "Business", icon: "🏢" },
                      { value: "industrial", label: "Industrial", icon: "🏭" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setPropertyType(option.value as PropertyType)
                        }
                        className={`py-4 px-4 border rounded-xl text-center ${
                          propertyType === option.value
                            ? "border-amber-500 bg-amber-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-2xl block mb-1">
                          {option.icon}
                        </span>
                        <span className="text-sm font-medium">
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Roof Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "flat", label: "Flat" },
                      { value: "pitched", label: "Pitched" },
                      { value: "metal_sheet", label: "Metal Sheet" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRoofType(option.value as RoofType)}
                        className={`py-3 px-4 border rounded-xl text-center ${
                          roofType === option.value
                            ? "border-amber-500 bg-amber-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Roof Area (m2, optional)
                    </label>
                    <input
                      type="number"
                      value={roofArea}
                      onChange={(e) => setRoofArea(e.target.value)}
                      min={8}
                      step={0.1}
                      placeholder="120"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500"
                    />
                    {fieldError("roofArea") && (
                      <p className="text-sm text-red-600 mt-2">
                        {fieldError("roofArea")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      County / Region (optional)
                    </label>
                    <input
                      type="text"
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      placeholder="Nairobi"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500"
                    />
                    {fieldError("county") && (
                      <p className="text-sm text-red-600 mt-2">
                        {fieldError("county")}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Panel Quality
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPanelType("monocrystalline")}
                      className={`py-4 px-4 border rounded-xl ${
                        panelType === "monocrystalline"
                          ? "border-amber-500 bg-amber-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span className="font-medium block">Monocrystalline</span>
                      <span className="text-xs text-gray-500">
                        Premium efficiency
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPanelType("polycrystalline")}
                      className={`py-4 px-4 border rounded-xl ${
                        panelType === "polycrystalline"
                          ? "border-amber-500 bg-amber-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span className="font-medium block">Polycrystalline</span>
                      <span className="text-xs text-gray-500">
                        Lower upfront cost
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 border rounded-xl">
                    <MapPin className="h-6 w-6 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium">System Mode</p>
                      <p className="text-sm text-gray-500">
                        Choose whether you need full off-grid operation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOffGrid(!isOffGrid)}
                      className={`w-14 h-7 rounded-full transition-colors ${
                        isOffGrid ? "bg-amber-600" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className={`h-6 w-6 bg-white rounded-full shadow transition-transform ${
                          isOffGrid ? "translate-x-7" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {isOffGrid
                      ? "Off-grid selected: battery autonomy defaults to 48h unless you override it."
                      : "Grid-tied selected: battery backup remains optional."}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Battery Backup
                  </label>
                  <div className="flex items-center gap-4 p-4 border rounded-xl">
                    <Battery className="h-6 w-6 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium">Include Battery Storage?</p>
                      <p className="text-sm text-gray-500">
                        Required for off-grid and useful for blackout resilience
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWantsBattery(!wantsBattery)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        wantsBattery ? "bg-amber-600" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className={`h-5 w-5 bg-white rounded-full shadow transition-transform ${
                          wantsBattery ? "translate-x-6" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {wantsBattery && (
                    <div className="mt-3 grid md:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setBatteryType("lithium")}
                        className={`py-3 px-4 border rounded-xl ${
                          batteryType === "lithium"
                            ? "border-amber-500 bg-amber-50"
                            : "border-gray-200"
                        }`}
                      >
                        <span className="font-medium block">Lithium</span>
                        <span className="text-xs text-gray-500">
                          Long lifecycle
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatteryType("lead_acid")}
                        className={`py-3 px-4 border rounded-xl ${
                          batteryType === "lead_acid"
                            ? "border-amber-500 bg-amber-50"
                            : "border-gray-200"
                        }`}
                      >
                        <span className="font-medium block">Lead Acid</span>
                        <span className="text-xs text-gray-500">
                          Lower upfront
                        </span>
                      </button>
                      <div className="rounded-xl border border-gray-200 px-3 py-2">
                        <label className="block text-xs text-gray-500 mb-1">
                          Backup Hours
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={backupHours}
                          onChange={(e) => setBackupHours(e.target.value)}
                          className="w-full bg-transparent text-sm font-medium outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {fieldError("batteryType") && (
                    <p className="text-sm text-red-600 mt-2">
                      {fieldError("batteryType")}
                    </p>
                  )}
                  {fieldError("backupHours") && (
                    <p className="text-sm text-red-600 mt-2">
                      {fieldError("backupHours")}
                    </p>
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
                    onClick={handleEstimate}
                    disabled={loadingEstimate}
                    className="flex-1 py-4 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingEstimate
                      ? "Calculating..."
                      : "Get Detailed Estimate"}
                    <Calculator className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && estimate && (
            <div className="space-y-6">
              <div className="bg-linear-to-br from-amber-500 to-orange-600 rounded-2xl p-8 text-white">
                <div className="text-center mb-6">
                  <Sun className="h-12 w-12 mx-auto mb-3 opacity-90" />
                  <h2 className="text-3xl font-bold mb-2">Your Solar System</h2>
                  <p className="text-amber-100">
                    Recommended configuration based on your current inputs
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white/20 rounded-xl p-4">
                    <p className="text-3xl font-bold">
                      {estimate.recommendedSystemKw}
                    </p>
                    <p className="text-amber-100 text-sm">kW System</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4">
                    <p className="text-3xl font-bold">{estimate.panelCount}</p>
                    <p className="text-amber-100 text-sm">Solar Panels</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4">
                    <p className="text-3xl font-bold">
                      {estimate.batteryCapacityKwh || "N/A"}
                    </p>
                    <p className="text-amber-100 text-sm">kWh Battery</p>
                  </div>
                </div>
              </div>

              {estimate.warnings && estimate.warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Estimate Notes
                  </h3>
                  <ul className="space-y-2 text-sm text-amber-800">
                    {estimate.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900">
                    Investment & Returns
                  </h3>
                </div>

                <div className="divide-y divide-gray-100">
                  <div className="p-4 flex justify-between">
                    <span className="text-gray-600">
                      Solar Panels ({estimate.panelCount}x)
                    </span>
                    <span className="font-medium">
                      {formatAmount(estimate.panelsCost)}
                    </span>
                  </div>
                  <div className="p-4 flex justify-between">
                    <span className="text-gray-600">
                      Inverter ({estimate.inverterSizeKw}kW)
                    </span>
                    <span className="font-medium">
                      {formatAmount(estimate.inverterCost)}
                    </span>
                  </div>
                  {estimate.batteryCost > 0 && (
                    <div className="p-4 flex justify-between">
                      <span className="text-gray-600">
                        Battery ({estimate.batteryCapacityKwh}kWh)
                      </span>
                      <span className="font-medium">
                        {formatAmount(estimate.batteryCost)}
                      </span>
                    </div>
                  )}
                  <div className="p-4 flex justify-between">
                    <span className="text-gray-600">Installation & Wiring</span>
                    <span className="font-medium">
                      {formatAmount(estimate.laborCost + estimate.sundriesCost)}
                    </span>
                  </div>
                  <div className="p-4 flex justify-between bg-amber-50">
                    <span className="font-bold text-gray-900">
                      Total Investment
                    </span>
                    <span className="font-bold text-amber-600 text-xl">
                      {formatAmount(estimate.totalCost)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-6 w-6" />
                  Your Savings
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">
                      Monthly Savings
                    </p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatAmount(estimate.monthlySavings)}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Payback Period</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {estimate.paybackYears} years
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 col-span-2">
                    <p className="text-sm text-gray-500 mb-1">
                      20-Year Savings
                    </p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {formatAmount(estimate.twentyYearSavings)}
                    </p>
                  </div>
                </div>
              </div>

              {estimate.assumptions && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-600">
                  <p>
                    Tariff assumption:{" "}
                    {formatAmount(estimate.assumptions.tariffPerKwh)}/kWh,
                    county multiplier{" "}
                    {estimate.assumptions.countyMultiplier.toFixed(2)}, annual
                    degradation{" "}
                    {(estimate.assumptions.annualDegradation * 100).toFixed(2)}
                    %.
                  </p>
                </div>
              )}

              {quoteSuccessProjectId ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                  <h3 className="text-xl font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                    <ClipboardCheck className="h-6 w-6" />
                    Quote Request Submitted
                  </h3>
                  <p className="text-emerald-800 mb-4">
                    Your project request has been created and milestone tracking
                    is now active.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/client/solar/projects/${quoteSuccessProjectId}`}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
                    >
                      Open Client Project View
                    </Link>
                    <Link
                      href="/dashboard/solar/projects"
                      className="px-4 py-2 bg-white text-emerald-800 rounded-lg font-medium border border-emerald-300 hover:bg-emerald-100"
                    >
                      Open Provider Dashboard
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => setStep(2)}
                      className="px-6 py-4 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                    >
                      Adjust Inputs
                    </button>
                    <Link
                      href="/solar/installers"
                      className="px-6 py-4 border border-amber-300 text-amber-700 rounded-xl font-medium hover:bg-amber-50"
                    >
                      Browse Installers
                    </Link>
                    <button
                      onClick={() => setShowQuoteForm((prev) => !prev)}
                      className="flex-1 py-4 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700"
                    >
                      {showQuoteForm
                        ? "Hide Quote Request"
                        : "Request Site Assessment"}
                    </button>
                  </div>

                  {showQuoteForm && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Request Official Quote
                      </h3>
                      <p className="text-sm text-gray-600">
                        Submit this estimate into the project lifecycle for
                        specialist matching, milestone tracking, and proposal
                        follow-up.
                      </p>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Project Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500"
                        />
                        {fieldError("title") && (
                          <p className="text-sm text-red-600 mt-2">
                            {fieldError("title")}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Site Address
                        </label>
                        <input
                          type="text"
                          value={siteAddress}
                          onChange={(e) => setSiteAddress(e.target.value)}
                          placeholder="Estate, road, nearest landmark"
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500"
                        />
                        {fieldError("siteAddress") && (
                          <p className="text-sm text-red-600 mt-2">
                            {fieldError("siteAddress")}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Additional Notes (optional)
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                          placeholder="Access constraints, preferred timeline, special requirements"
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Preferred Installer (optional)
                          </label>
                          <select
                            value={selectedSpecialistId}
                            onChange={(e) =>
                              setSelectedSpecialistId(e.target.value)
                            }
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500"
                            disabled={loadingOptions}
                          >
                            <option value="">Auto-match best specialist</option>
                            {installers.map((installer) => (
                              <option key={installer.id} value={installer.id}>
                                {(installer.name || "Specialist").trim()} •
                                Rating {installer.averageRating.toFixed(1)}
                                {installer.location
                                  ? ` • ${installer.location}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Project Template (optional)
                          </label>
                          <select
                            value={selectedTemplateId}
                            onChange={(e) =>
                              setSelectedTemplateId(e.target.value)
                            }
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500"
                            disabled={loadingOptions}
                          >
                            <option value="">Use default milestone flow</option>
                            {templates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-gray-500">
                          By continuing, your estimate inputs are saved as a
                          project quote request.
                        </p>
                        <button
                          onClick={handleQuoteRequest}
                          disabled={loadingQuote}
                          className="px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 disabled:opacity-60"
                        >
                          {loadingQuote
                            ? "Submitting..."
                            : "Submit Quote Request"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
