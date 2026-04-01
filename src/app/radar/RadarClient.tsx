"use client";

import { type ComponentType, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Loader2,
  LocateFixed,
  Radar,
  UserRound,
  Wrench,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import BrowseStickyToolbar from "@/components/marketplace/BrowseStickyToolbar";
import LocationPicker from "@/components/LocationPicker";
import RadarBrowse, {
  type RadarBrowseItem,
} from "@/components/marketplace/RadarBrowse";
import { useHeroToolbarCompact } from "@/lib/hooks/useHeroToolbarCompact";
import { usePublicJobsInfinite } from "@/lib/api/hooks/usePublicJobs";
import { useProfessionals } from "@/lib/api/hooks/useProfessionals";
import { useServices } from "@/lib/api/hooks/useServices";
import { calculateBearing, calculateDistance } from "@/lib/utils/geolocation";

type RadarFilter = "all" | "jobs" | "services" | "professionals";

const FILTERS: Array<{
  id: RadarFilter;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "all", label: "All", icon: Radar },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "services", label: "Services", icon: Wrench },
  { id: "professionals", label: "Pros", icon: UserRound },
];

export default function RadarClient() {
  const heroRef = useRef<HTMLElement>(null);
  const toolbarCompact = useHeroToolbarCompact(heroRef);

  const [filter, setFilter] = useState<RadarFilter>("all");
  const [radiusKm, setRadiusKm] = useState(25);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  const { data: jobsData, isLoading: jobsLoading } = usePublicJobsInfinite({
    status: "OPEN",
    latitude: userLocation?.latitude,
    longitude: userLocation?.longitude,
    pageSize: 24,
  });

  const { data: professionalsData, isLoading: professionalsLoading } =
    useProfessionals({
      latitude: userLocation?.latitude,
      longitude: userLocation?.longitude,
      sortBy: userLocation ? "distance" : "rating",
      limit: 24,
      page: 1,
    });

  const { data: servicesData, isLoading: servicesLoading } = useServices({
    latitude: userLocation?.latitude,
    longitude: userLocation?.longitude,
    sort: userLocation ? "distance" : "relevance",
    limit: 24,
    page: 1,
  });

  const isLoading = jobsLoading || professionalsLoading || servicesLoading;

  const jobs = useMemo(
    () => jobsData?.pages.flatMap((page) => page.items) ?? [],
    [jobsData?.pages],
  );
  const professionals = useMemo(
    () => professionalsData?.items ?? [],
    [professionalsData?.items],
  );
  const services = useMemo(
    () => servicesData?.services ?? [],
    [servicesData?.services],
  );

  const allItems = useMemo<RadarBrowseItem[]>(() => {
    if (!userLocation) return [];

    const jobItems: RadarBrowseItem[] = jobs
      .filter((job) => job.latitude != null && job.longitude != null)
      .map((job) => {
        const distanceKm =
          job.distanceKm ??
          calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            job.latitude as number,
            job.longitude as number,
          );

        return {
          id: `job-${job.id}`,
          href: `/jobs/${job.id}`,
          name: job.title,
          subtitle: job.location ?? job.client?.name ?? "Location unknown",
          type: "job",
          typeLabel: job.category?.name ?? "General",
          colorKey: job.category?.slug ?? job.category?.name ?? "general",
          distanceKm,
          bearingDeg: calculateBearing(
            userLocation.latitude,
            userLocation.longitude,
            job.latitude as number,
            job.longitude as number,
          ),
        };
      });

    const professionalItems: RadarBrowseItem[] = professionals
      .filter((pro) => pro.latitude != null && pro.longitude != null)
      .map((pro) => {
        const distanceKm =
          pro.distance ??
          calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            pro.latitude as number,
            pro.longitude as number,
          );

        return {
          id: `professional-${pro.id}`,
          href: `/professionals/${pro.id}`,
          name: pro.name,
          subtitle: pro.location || "Location unknown",
          type: "professional",
          typeLabel: pro.title || pro.skills?.[0] || "General",
          colorKey: pro.title || pro.skills?.[0] || "general",
          distanceKm,
          bearingDeg: calculateBearing(
            userLocation.latitude,
            userLocation.longitude,
            pro.latitude as number,
            pro.longitude as number,
          ),
        };
      });

    const serviceItems: RadarBrowseItem[] = services
      .filter(
        (service) =>
          service.provider?.latitude != null &&
          service.provider?.longitude != null,
      )
      .map((service) => {
        const lat = service.provider?.latitude as number;
        const lon = service.provider?.longitude as number;
        const distanceKm =
          service.distance ??
          calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            lat,
            lon,
          );

        return {
          id: `service-${service.id}`,
          href: `/services/${service.id}`,
          name: service.title,
          subtitle:
            service.provider?.name ??
            service.provider?.location ??
            "Location unknown",
          type: "service",
          typeLabel: service.category?.name ?? "General",
          colorKey:
            service.category?.slug ?? service.category?.name ?? "general",
          distanceKm,
          bearingDeg: calculateBearing(
            userLocation.latitude,
            userLocation.longitude,
            lat,
            lon,
          ),
        };
      });

    return [...jobItems, ...serviceItems, ...professionalItems]
      .filter((item) => Number.isFinite(item.distanceKm))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [jobs, professionals, services, userLocation]);

  const filteredItems = useMemo(() => {
    const byType =
      filter === "all"
        ? allItems
        : allItems.filter((item) => {
            if (filter === "jobs") return item.type === "job";
            if (filter === "services") return item.type === "service";
            return item.type === "professional";
          });

    return byType.filter((item) => item.distanceKm <= radiusKm);
  }, [allItems, filter, radiusKm]);

  const counts = useMemo(() => {
    return {
      jobs: allItems.filter((item) => item.type === "job").length,
      services: allItems.filter((item) => item.type === "service").length,
      professionals: allItems.filter((item) => item.type === "professional")
        .length,
    };
  }, [allItems]);

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50">
      <Header />

      <div className="pt-[var(--public-header-h)]">
        <PageHeader
          ref={heroRef}
          variant="browse"
          headingId="unified-radar-heading"
          title="Radar Explore"
          description="See jobs, services, and professionals around you in one directional radar view with true distance and compass bearings."
        />

        <BrowseStickyToolbar compact={toolbarCompact}>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
            <div className="min-w-0">
              <LocationPicker
                compact={toolbarCompact}
                onLocationChange={setUserLocation}
              />
            </div>

            <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              {FILTERS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filter === id
                      ? "bg-emerald-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <label
                htmlFor="radar-radius"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
              >
                Radius ({radiusKm} km)
              </label>
              <input
                id="radar-radius"
                type="range"
                min={3}
                max={100}
                step={1}
                value={radiusKm}
                onChange={(event) => setRadiusKm(Number(event.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>
          </div>
        </BrowseStickyToolbar>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <section className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Jobs
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {counts.jobs}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Services
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {counts.services}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Professionals
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {counts.professionals}
              </p>
            </div>
          </section>

          {!userLocation ? (
            <section className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-6 py-10 text-center shadow-sm">
              <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <LocateFixed className="h-7 w-7" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Set your location to start radar
                </h2>
                <p className="text-sm text-slate-600 sm:text-base">
                  The radar uses your coordinates to compute precise distance
                  and compass bearings for jobs, services, and professionals.
                </p>
              </div>
            </section>
          ) : isLoading ? (
            <section className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 text-slate-700">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                <span className="text-sm font-medium">
                  Scanning nearby opportunities...
                </span>
              </div>
            </section>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon="radar"
              title="No radar matches"
              description="Try switching the entity filter or widening your radius to reveal more around you."
              buttonText="Show all types"
              onAction={() => {
                setFilter("all");
                setRadiusKm(100);
              }}
            />
          ) : (
            <RadarBrowse
              title="Unified radar"
              description="Jobs, services, and professionals in one directional canvas. Tap any marker to open details."
              items={filteredItems}
              hasUserLocation
              allowedTypes={
                filter === "all"
                  ? undefined
                  : [
                      filter === "jobs"
                        ? "job"
                        : filter === "services"
                          ? "service"
                          : "professional",
                    ]
              }
            />
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
