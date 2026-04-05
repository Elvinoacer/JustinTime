import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getActiveSolarEstimationConfig,
  upsertSolarEstimationConfig,
} from "@/app/actions/solar";

export const dynamic = "force-dynamic";

export default async function SolarConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; message?: string }>;
}) {
  const query = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (!hasRole(session.user, "ADMIN")) {
    redirect("/dashboard/solar");
  }

  const configResult = await getActiveSolarEstimationConfig();

  const activeConfig = configResult.success ? configResult.config : null;

  const locationMultipliersText = JSON.stringify(
    activeConfig?.locationMultipliers || { Nairobi: 1.12, Mombasa: 1.08 },
    null,
    2,
  );

  async function saveConfigAction(formData: FormData) {
    "use server";

    const name = String(formData.get("name") || "").trim();
    const setActive = formData.get("setActive") === "on";
    const rawLocationMultipliers = String(
      formData.get("locationMultipliers") || "{}",
    ).trim();

    let locationMultipliers: Record<string, number> = {};
    try {
      const parsed = JSON.parse(rawLocationMultipliers);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        locationMultipliers = Object.fromEntries(
          Object.entries(parsed)
            .map(([key, value]) => [key, Number(value)])
            .filter(([, value]) => Number.isFinite(value as number)),
        ) as Record<string, number>;
      }
    } catch {
      redirect(
        "/dashboard/solar/config?status=error&message=Invalid%20JSON%20for%20location%20multipliers",
      );
    }

    const result = await upsertSolarEstimationConfig({
      name,
      monocrystallinePerWatt: Number(
        formData.get("monocrystallinePerWatt") || 0,
      ),
      polycrystallinePerWatt: Number(
        formData.get("polycrystallinePerWatt") || 0,
      ),
      inverterPricePerKw: Number(formData.get("inverterPricePerKw") || 0),
      hybridInverterMarkup: Number(formData.get("hybridInverterMarkup") || 0),
      leadAcidPerKwh: Number(formData.get("leadAcidPerKwh") || 0),
      lithiumPerKwh: Number(formData.get("lithiumPerKwh") || 0),
      laborPerKw: Number(formData.get("laborPerKw") || 0),
      sundriesPercent: Number(formData.get("sundriesPercent") || 0),
      defaultMargin: Number(formData.get("defaultMargin") || 0),
      locationMultipliers,
      setActive,
    });

    if (!result.success) {
      const message = encodeURIComponent(
        result.error || "Failed to save config",
      );
      redirect(`/dashboard/solar/config?status=error&message=${message}`);
    }

    redirect("/dashboard/solar/config?status=saved");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white border border-gray-200 p-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Solar Estimation Config
            </h1>
            <p className="text-gray-600">
              Configure active pricing assumptions used by both quick and
              detailed estimators.
            </p>
          </div>
          <Link
            href="/dashboard/solar"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Back to Solar Dashboard
          </Link>
        </div>

        {query.status === "saved" ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm">
            Config saved and activated.
          </div>
        ) : null}

        {query.status === "error" ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
            {query.message || "Failed to save config."}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl bg-white border border-gray-200 p-6">
        {!configResult.success ? (
          <p className="text-red-600">{configResult.error}</p>
        ) : (
          <form action={saveConfigAction} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Config Name
              </label>
              <input
                name="name"
                defaultValue={activeConfig?.name || "Kenya Solar Pricing"}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Monocrystalline / W
              </span>
              <input
                name="monocrystallinePerWatt"
                type="number"
                step="0.01"
                defaultValue={activeConfig?.monocrystallinePerWatt || 45}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Polycrystalline / W
              </span>
              <input
                name="polycrystallinePerWatt"
                type="number"
                step="0.01"
                defaultValue={activeConfig?.polycrystallinePerWatt || 38}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Inverter / kW
              </span>
              <input
                name="inverterPricePerKw"
                type="number"
                step="0.01"
                defaultValue={activeConfig?.inverterPricePerKw || 25000}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Hybrid Inverter Markup
              </span>
              <input
                name="hybridInverterMarkup"
                type="number"
                step="0.01"
                defaultValue={activeConfig?.hybridInverterMarkup || 1.3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Lead Acid / kWh
              </span>
              <input
                name="leadAcidPerKwh"
                type="number"
                step="0.01"
                defaultValue={activeConfig?.leadAcidPerKwh || 15000}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Lithium / kWh
              </span>
              <input
                name="lithiumPerKwh"
                type="number"
                step="0.01"
                defaultValue={activeConfig?.lithiumPerKwh || 45000}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Labor / kW
              </span>
              <input
                name="laborPerKw"
                type="number"
                step="0.01"
                defaultValue={activeConfig?.laborPerKw || 8000}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Sundries Percent (0-1)
              </span>
              <input
                name="sundriesPercent"
                type="number"
                step="0.01"
                defaultValue={activeConfig?.sundriesPercent || 0.15}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Default Margin (0-1)
              </span>
              <input
                name="defaultMargin"
                type="number"
                step="0.01"
                defaultValue={activeConfig?.defaultMargin || 0.25}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </label>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Multipliers (JSON object)
              </label>
              <textarea
                name="locationMultipliers"
                rows={6}
                defaultValue={locationMultipliersText}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
              />
            </div>

            <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="setActive" defaultChecked />
              Set this config as active
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700"
              >
                Save Config
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
