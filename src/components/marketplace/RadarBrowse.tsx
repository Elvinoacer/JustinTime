"use client";

import Link from "next/link";
import { bearingToCompass, formatDistance } from "@/lib/utils/geolocation";

type RadarEntityType = "job" | "service" | "professional";

export interface RadarBrowseItem {
  id: string;
  href: string;
  name: string;
  subtitle?: string | null;
  type: RadarEntityType;
  distanceKm: number;
  bearingDeg: number;
}

interface RadarBrowseProps {
  title: string;
  description: string;
  items: RadarBrowseItem[];
  hasUserLocation: boolean;
}

const TYPE_COLORS: Record<RadarEntityType, string> = {
  job: "bg-sky-500",
  service: "bg-emerald-500",
  professional: "bg-amber-500",
};

const TYPE_LABELS: Record<RadarEntityType, string> = {
  job: "Job",
  service: "Service",
  professional: "Professional",
};

function pointPosition(
  distanceKm: number,
  bearingDeg: number,
  maxDistanceKm: number,
) {
  const radiusPct = (Math.min(distanceKm, maxDistanceKm) / maxDistanceKm) * 44;
  const angle = ((bearingDeg - 90) * Math.PI) / 180;
  return {
    x: 50 + radiusPct * Math.cos(angle),
    y: 50 + radiusPct * Math.sin(angle),
  };
}

export default function RadarBrowse({
  title,
  description,
  items,
  hasUserLocation,
}: RadarBrowseProps) {
  if (!hasUserLocation) {
    return (
      <section className="overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-sm">
        <h3 className="text-xl font-bold tracking-tight text-slate-900">
          Radar mode
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Enable location to visualize nearby results on a directional radar
          with true distance and bearing.
        </p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold tracking-tight text-slate-900">
          Radar mode
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          No location-ready results match current filters.
        </p>
      </section>
    );
  }

  const sorted = [...items].sort((a, b) => a.distanceKm - b.distanceKm);
  const maxDistanceKm = Math.max(
    5,
    Math.min(100, sorted[Math.min(sorted.length - 1, 24)].distanceKm),
  );

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_48px_-28px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 px-5 py-4 text-white sm:px-6">
        <h3 className="text-lg font-semibold sm:text-xl">{title}</h3>
        <p className="mt-1 text-xs text-emerald-100/90 sm:text-sm">
          {description}
        </p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(340px,1.1fr)_minmax(0,0.9fr)]">
        <div className="p-4 sm:p-6">
          <div className="relative mx-auto aspect-square w-full max-w-[560px] overflow-hidden rounded-[2rem] border border-emerald-300/40 bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#052e2b_58%,_#031716_100%)]">
            <div className="absolute inset-[9%] rounded-full border border-emerald-200/25" />
            <div className="absolute inset-[22%] rounded-full border border-emerald-200/25" />
            <div className="absolute inset-[35%] rounded-full border border-emerald-200/25" />
            <div className="absolute inset-[48%] rounded-full border border-emerald-200/25" />
            <div className="absolute left-1/2 top-[8%] h-[84%] w-px -translate-x-1/2 bg-emerald-200/20" />
            <div className="absolute left-[8%] top-1/2 h-px w-[84%] -translate-y-1/2 bg-emerald-200/20" />

            <div className="pointer-events-none absolute inset-0 animate-[spin_9s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,rgba(16,185,129,0)_0deg,rgba(16,185,129,0.38)_44deg,rgba(16,185,129,0)_88deg)]" />

            <div className="absolute left-1/2 top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.9)]" />

            {sorted.slice(0, 60).map((item) => {
              const pos = pointPosition(
                item.distanceKm,
                item.bearingDeg,
                maxDistanceKm,
              );
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group absolute z-30"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  aria-label={`${TYPE_LABELS[item.type]} ${item.name}, ${formatDistance(item.distanceKm)}, ${bearingToCompass(item.bearingDeg)}`}
                >
                  <span
                    className={`block h-3.5 w-3.5 rounded-full border border-white/70 ${TYPE_COLORS[item.type]} shadow-[0_0_12px_rgba(255,255,255,0.35)] transition-transform duration-200 group-hover:scale-125`}
                  />
                </Link>
              );
            })}

            <div className="absolute left-1/2 top-2 -translate-x-1/2 text-xs font-semibold tracking-widest text-emerald-100/90">
              N
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-semibold tracking-widest text-emerald-100/90">
              S
            </div>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold tracking-widest text-emerald-100/90">
              W
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold tracking-widest text-emerald-100/90">
              E
            </div>

            <div className="absolute bottom-3 right-3 rounded-lg border border-emerald-200/25 bg-slate-900/70 px-2.5 py-1 text-xs text-emerald-50">
              Scale: {formatDistance(maxDistanceKm)}
            </div>
          </div>
        </div>

        <aside className="max-h-[680px] overflow-y-auto border-t border-slate-100 bg-slate-50/75 p-4 lg:border-l lg:border-t-0 lg:p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            <span>Nearest</span>
          </div>
          <div className="space-y-2.5">
            {sorted.slice(0, 30).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/45"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.name}
                    </p>
                    {item.subtitle ? (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {item.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    {TYPE_LABELS[item.type]}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-emerald-700">
                    {formatDistance(item.distanceKm)}
                  </span>
                  <span>•</span>
                  <span>
                    {Math.round(item.bearingDeg)}°{" "}
                    {bearingToCompass(item.bearingDeg)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
