"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    description?: string;
    imageUrl: string;
    category: string;
    startingPrice: number;
    rating: number;
    reviewCount: number;
    provider?: {
      name: string;
      image?: string;
      verified?: boolean;
      subscription?: string | null;
    };
    isVerified?: boolean;
    distance?: number;
  };
  index?: number;
}

function tierLabel(sub: string | null | undefined): string | null {
  if (sub == null || sub === "" || sub === "FREE") return null;
  return sub;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const providerTier = tierLabel(service.provider?.subscription ?? null);

  const formatDistance = (km?: number) => {
    if (!km) return null;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };
  const distLabel = formatDistance(service.distance);

  return (
    <article className="group h-full">
      <Link href={`/services/${service.id}`} className="block h-full">
        <div className="flex h-full min-h-[156px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_10px_36px_-24px_rgba(15,23,42,0.45)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-emerald-200/70 hover:shadow-[0_16px_44px_-22px_rgba(16,185,129,0.2)] sm:min-h-[168px] sm:flex-row">
          <div className="relative h-28 w-full shrink-0 overflow-hidden sm:h-auto sm:w-[42%] sm:min-w-[140px] sm:max-w-[220px]">
            <Image
              src={service.imageUrl}
              alt={service.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, 220px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/3 to-transparent" />

            <div className="absolute left-2 right-2 top-2 flex items-start justify-between gap-1.5 sm:left-2.5 sm:right-2.5 sm:top-2.5">
              <div className="flex min-w-0 flex-wrap gap-1">
                <span className="max-w-[11rem] truncate rounded-md bg-white/92 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 shadow-sm backdrop-blur-sm">
                  {service.category}
                </span>
                {service.isVerified ? (
                  <span className="rounded-md bg-amber-400/95 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                    Verified
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsFavorited((prev) => !prev);
                }}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border backdrop-blur-md transition-colors ${
                  isFavorited
                    ? "border-red-500 bg-red-500 text-white"
                    : "border-white/45 bg-white/88 text-slate-700"
                }`}
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: isFavorited ? '"FILL" 1' : '"FILL" 0' }}
                >
                  favorite
                </span>
              </button>
            </div>

            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center justify-between gap-1 sm:bottom-2.5 sm:left-2.5 sm:right-2.5">
              <div className="rounded-lg border border-white/15 bg-black/35 px-2 py-1 text-white backdrop-blur-md">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-white/75">
                  From
                </p>
                <p className="text-base font-bold tabular-nums leading-tight sm:text-lg">
                  KES {service.startingPrice.toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1">
                {distLabel ? (
                  <span className="rounded-md bg-emerald-600/92 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {distLabel}
                  </span>
                ) : null}
                <span className="rounded-md border border-white/25 bg-black/30 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {service.reviewCount} reviews
                </span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-slate-950 sm:text-base">
                {service.name}
              </h3>
              <p className="mt-1 line-clamp-1 text-xs text-slate-600">
                {service.description ||
                  "Trusted provider · clear pricing before you book."}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-0.5 font-medium text-slate-700">
                  <span
                    className="material-symbols-outlined text-[15px] text-amber-500"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    star
                  </span>
                  {service.rating.toFixed(1)}
                  <span className="font-normal text-slate-400">rating</span>
                </span>
                <span className="text-slate-300">·</span>
                <span className="line-clamp-1" title={service.category}>
                  {service.category}
                </span>
                <span className="text-slate-300">·</span>
                <span>{service.isVerified ? "Verified listing" : "Standard"}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100/90 pt-2">
              {service.provider ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {service.provider.image ? (
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-200/80 bg-slate-100">
                      <Image
                        src={service.provider.image}
                        alt={service.provider.name}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 text-xs font-bold text-emerald-700">
                      {service.provider.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {service.provider.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {providerTier ? `${providerTier} · Provider` : "Provider"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1" aria-hidden />
              )}
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md transition-transform group-hover:scale-105">
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
};

export default ServiceCard;
