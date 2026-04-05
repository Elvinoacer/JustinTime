import { getSolarInstallers } from "@/app/actions/solar";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MapPin, Search, Star, Sun } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = {
  search?: string;
  county?: string;
  date?: string;
  limit?: string;
};

export default async function SolarInstallersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const search = params.search?.trim() || undefined;
  const county = params.county?.trim() || undefined;
  const date = params.date?.trim() || undefined;
  const limit = Number.parseInt(params.limit || "18", 10);

  const result = await getSolarInstallers({
    search,
    county,
    date,
    limit: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 36)) : 18,
  });

  return (
    <div className="min-h-screen bg-linear-to-b from-amber-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <Link
            href="/solar"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Solar
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Solar Installers Directory
          </h1>
          <p className="text-gray-600">
            Browse verified installers by specialty, location, and current
            availability.
          </p>
        </div>

        <form className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 mb-8 grid md:grid-cols-4 gap-3">
          <label className="sr-only" htmlFor="search">
            Search installer
          </label>
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search"
              name="search"
              defaultValue={search || ""}
              placeholder="Name, location, specialization"
              className="w-full rounded-xl border border-gray-300 pl-9 pr-4 py-3"
            />
          </div>

          <input
            name="county"
            defaultValue={county || ""}
            placeholder="County (optional)"
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
          />

          <input
            name="date"
            type="date"
            defaultValue={date || ""}
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
          />

          <div className="md:col-span-4 flex items-center gap-3">
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700"
            >
              Apply Filters
            </button>
            <Link
              href="/solar/installers"
              className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
            >
              Reset
            </Link>
            <Link
              href="/solar/estimate"
              className="ml-auto inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800"
            >
              Get Estimate
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </form>

        {!result.success ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {result.error || "Unable to load installers right now."}
          </div>
        ) : result.specialists.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <Sun className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No installers match your filters yet
            </h2>
            <p className="text-gray-600 mb-6">
              Submit your quote and we will match you with the next suitable
              verified specialist.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/solar/estimate"
                className="px-5 py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700"
              >
                Request Quote
              </Link>
              <Link
                href="/dashboard/verticals/solar/apply"
                className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Apply as Specialist
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {result.specialists.map((specialist) => (
              <article
                key={specialist.id}
                className="rounded-2xl bg-white border border-gray-200 p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-amber-100 grid place-items-center font-bold text-amber-700">
                    {(specialist.name || "S").charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">
                      {specialist.name || "Solar Specialist"}
                    </h2>
                    <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                      <MapPin className="h-3.5 w-3.5" />
                      {specialist.location || "Kenya"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>{specialist.averageRating.toFixed(1)}</span>
                  <span>•</span>
                  <span>{specialist.projectsCompleted} projects</span>
                  <span>•</span>
                  <span>{specialist.experienceYears}+ yrs</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      specialist.availableOnDate
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {specialist.availableOnDate
                      ? "Available"
                      : "Check schedule"}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      specialist.withinRadius
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {specialist.withinRadius
                      ? "In service radius"
                      : "Outside radius"}
                  </span>
                  {specialist.distanceKm != null && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {specialist.distanceKm} km away
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {specialist.specializations.slice(0, 3).map((spec) => (
                    <span
                      key={spec}
                      className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/professionals/${specialist.userId}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 text-white px-4 py-2.5 font-medium hover:bg-amber-700"
                >
                  View Profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
