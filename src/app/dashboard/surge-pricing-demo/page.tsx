import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SurgePricingBadge, SurgePricingIndicator } from "@/components/pricing/SurgePricingBadge";
import { getDynamicPrice } from "@/lib/pricing-engine";
import { RefreshCw } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function SurgePricingDemoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Simulate different scenarios
  const now = new Date();
  const nightTime = new Date();
  nightTime.setHours(22, 0, 0); // 10 PM

  const weekend = new Date();
  weekend.setDate(weekend.getDate() + (6 - weekend.getDay())); // Next Saturday

  // Get pricing for different scenarios
  const currentPricing = await getDynamicPrice("demo-service", now);
  const nightPricing = await getDynamicPrice("demo-service", nightTime);
  const weekendPricing = await getDynamicPrice("demo-service", weekend);

  const basePrice = 1000; // KES 1000 base price

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Dynamic Surge Pricing Demo
          </h1>
          <Link 
            href="/dashboard/surge-pricing-demo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Link>
        </div>
        <p className="text-gray-600">
          See how pricing adjusts based on time, demand, and weather conditions
        </p>
      </div>

      <div className="space-y-6">
        {/* Current Time Pricing */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Current Time Pricing
            </h2>
            <p className="text-sm text-gray-500">
              {now.toLocaleString("en-KE", { 
                weekday: "long", 
                year: "numeric", 
                month: "long", 
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
          </div>
          
          {currentPricing.multiplier > 1.0 ? (
            <SurgePricingBadge
              multiplier={currentPricing.multiplier}
              reason={currentPricing.reason}
              basePrice={basePrice}
              finalPrice={basePrice * currentPricing.multiplier}
            />
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-emerald-900 font-medium">
                ✓ Standard Pricing - No surge currently active
              </p>
              <p className="text-emerald-700 text-sm mt-1">
                Price: KES {basePrice.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Night Time Scenario */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Night Hours (10 PM)
            </h2>
            <p className="text-sm text-gray-500">
              Simulated night-time pricing scenario
            </p>
          </div>
          
          <SurgePricingBadge
            multiplier={nightPricing.multiplier}
            reason={nightPricing.reason}
            basePrice={basePrice}
            finalPrice={basePrice * nightPricing.multiplier}
          />
        </div>

        {/* Weekend Scenario */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Weekend Rate
            </h2>
            <p className="text-sm text-gray-500">
              {weekend.toLocaleDateString("en-KE", { 
                weekday: "long", 
                year: "numeric", 
                month: "long", 
                day: "numeric"
              })}
            </p>
          </div>
          
          <SurgePricingBadge
            multiplier={weekendPricing.multiplier}
            reason={weekendPricing.reason}
            basePrice={basePrice}
            finalPrice={basePrice * weekendPricing.multiplier}
          />
        </div>

        {/* Compact Indicator Examples */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Compact Indicators (for lists)
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Service Booking #1234</span>
              <SurgePricingIndicator
                multiplier={1.3}
                reason="High Demand"
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Service Booking #1235</span>
              <SurgePricingIndicator
                multiplier={1.2}
                reason="Night Hours"
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Service Booking #1236</span>
              <SurgePricingIndicator
                multiplier={1.0}
                reason={null}
              />
            </div>
          </div>
        </div>

        {/* Algorithm Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            How It Works
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• <strong>Time-based:</strong> +20% for night hours (8PM-6AM), +10% for weekends</p>
            <p>• <strong>Demand-based:</strong> +10-50% during high demand periods (simulated)</p>
            <p>• <strong>Weather-based:</strong> +30% during poor weather conditions (simulated)</p>
            <p className="pt-2 text-blue-700 italic">
              Note: Demand and weather factors are currently simulated with random probability for demonstration purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
