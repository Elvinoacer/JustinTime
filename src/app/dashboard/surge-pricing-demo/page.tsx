import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  SurgePricingBadge,
  SurgePricingIndicator,
} from "@/components/pricing/SurgePricingBadge";
import { getDynamicPrice } from "@/lib/pricing-engine";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { togglePremiumPricing } from "@/app/actions/taas";

export const dynamic = "force-dynamic";

type PageSearchParams = {
  updated?: string;
  error?: string;
};

async function updatePremiumPricingAction(formData: FormData) {
  "use server";

  const enabled = String(formData.get("enabled") || "") === "true";
  const result = await togglePremiumPricing(enabled);

  if (!result.success) {
    redirect(
      `/dashboard/surge-pricing-demo?error=${encodeURIComponent(result.error || "Unable to update premium pricing")}`,
    );
  }

  redirect("/dashboard/surge-pricing-demo?updated=1");
}

export default async function SurgePricingControlPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const resolvedSearchParams = (await searchParams) || {};

  const [provider, services] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
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
            tier: true,
          },
        },
      },
    }),
    prisma.service.findMany({
      where: {
        providerId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        price: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 12,
    }),
  ]);

  const premiumPricingEnabled =
    provider?.profile?.premiumPricingEnabled || false;
  const premiumMultiplier = provider?.profile?.premiumMultiplier || 1;
  const premiumEligible = provider?.trustScore?.premiumEligible || false;
  const trustTier = provider?.trustScore?.tier || "UNVERIFIED";

  const now = new Date();

  const tonight = new Date(now);
  tonight.setHours(22, 0, 0, 0);
  if (tonight.getTime() <= now.getTime()) {
    tonight.setDate(tonight.getDate() + 1);
  }

  const nextSaturday = new Date(now);
  const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
  nextSaturday.setDate(now.getDate() + daysUntilSaturday);
  nextSaturday.setHours(10, 0, 0, 0);

  const serviceSnapshots = await Promise.all(
    services.map(async (service) => {
      const [currentPricing, tonightPricing, weekendPricing] =
        await Promise.all([
          getDynamicPrice(service.id, now),
          getDynamicPrice(service.id, tonight),
          getDynamicPrice(service.id, nextSaturday),
        ]);

      const basePrice = Number(service.price);

      return {
        service,
        basePrice,
        currentPricing,
        tonightPricing,
        weekendPricing,
      };
    }),
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Dynamic Pricing Control Center
          </h1>
          <div className="flex items-center gap-2">
            <form action={updatePremiumPricingAction}>
              <input
                type="hidden"
                name="enabled"
                value={premiumPricingEnabled ? "false" : "true"}
              />
              <button
                type="submit"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition text-white ${
                  premiumPricingEnabled
                    ? "bg-slate-700 hover:bg-slate-800"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {premiumPricingEnabled
                  ? "Disable premium pricing"
                  : "Enable premium pricing"}
              </button>
            </form>

            <Link
              href="/dashboard/surge-pricing-demo"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Link>
          </div>
        </div>

        <p className="text-gray-600">
          Manage your premium pricing eligibility and review live surge
          snapshots across your active services.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Trust tier: <strong>{trustTier}</strong> | Premium eligible:{" "}
          <strong>{premiumEligible ? "Yes" : "No"}</strong> | Premium
          multiplier: <strong>{premiumMultiplier.toFixed(2)}x</strong>
        </p>
      </div>

      {resolvedSearchParams.updated && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Premium pricing settings have been updated.
        </div>
      )}

      {resolvedSearchParams.error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {resolvedSearchParams.error}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Pricing Policy Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-gray-500">Premium pricing</p>
            <p className="font-semibold text-gray-900">
              {premiumPricingEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-gray-500">Eligibility</p>
            <p className="font-semibold text-gray-900">
              {premiumEligible ? "Eligible" : "Not eligible yet"}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-gray-500">Applied multiplier</p>
            <p className="font-semibold text-gray-900">
              {premiumMultiplier.toFixed(2)}x
            </p>
          </div>
        </div>
      </div>

      {serviceSnapshots.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          No active services found. Publish at least one active service to start
          monitoring dynamic pricing behavior.
        </div>
      ) : (
        <div className="space-y-6">
          {serviceSnapshots.map(
            ({
              service,
              basePrice,
              currentPricing,
              tonightPricing,
              weekendPricing,
            }) => (
              <div
                key={service.id}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">
                      {service.title}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {service.category?.name || "Uncategorized"} - Base rate:
                      KES {basePrice.toLocaleString()}
                    </p>
                  </div>
                  <SurgePricingIndicator
                    multiplier={currentPricing.multiplier}
                    reason={currentPricing.reason}
                  />
                </div>

                {currentPricing.multiplier > 1 ? (
                  <SurgePricingBadge
                    multiplier={currentPricing.multiplier}
                    reason={currentPricing.reason}
                    basePrice={basePrice}
                    finalPrice={Number(
                      (basePrice * currentPricing.multiplier).toFixed(2),
                    )}
                  />
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    Standard pricing is active right now.
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Tonight window
                    </p>
                    <p className="text-sm text-gray-800 mb-2">
                      {tonight.toLocaleString("en-KE", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <SurgePricingIndicator
                      multiplier={tonightPricing.multiplier}
                      reason={tonightPricing.reason}
                    />
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Next weekend window
                    </p>
                    <p className="text-sm text-gray-800 mb-2">
                      {nextSaturday.toLocaleString("en-KE", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <SurgePricingIndicator
                      multiplier={weekendPricing.multiplier}
                      reason={weekendPricing.reason}
                    />
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
