"use client";

import { motion } from "framer-motion";
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

const ServiceCard: React.FC<ServiceCardProps> = ({ service, index = 0 }) => {
  const [isFavorited, setIsFavorited] = useState(false);

  const formatDistance = (km?: number) => {
    if (!km) return null;
    if (km < 1) return `${Math.round(km * 1000)}m away`;
    return `${km.toFixed(1)}km away`;
  };

  const providerTier = tierLabel(service.provider?.subscription ?? null);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.03, ease: "easeOut" }}
      className="group h-full"
    >
      <Link href={`/services/${service.id}`} className="block h-full">
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_40px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200/80 hover:shadow-[0_20px_50px_-32px_rgba(16,185,129,0.2)] sm:rounded-3xl">
          <div className="relative aspect-[16/9] min-h-[140px] overflow-hidden sm:min-h-[168px]">
            <Image
              src={service.imageUrl}
              alt={service.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />

            <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2 sm:left-4 sm:right-4 sm:top-4">
              <div className="flex min-w-0 flex-wrap gap-1.5">
                <span className="max-w-[11rem] truncate rounded-full border border-white/35 bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-900 shadow-sm backdrop-blur-sm sm:text-xs">
                  {service.category}
                </span>
                {service.isVerified && (
                  <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-950 shadow-sm sm:text-xs">
                    Verified
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsFavorited((prev) => !prev);
                }}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-all sm:h-10 sm:w-10 ${
                  isFavorited
                    ? "border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/30"
                    : "border-white/40 bg-white/90 text-gray-700"
                }`}
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                <span
                  className="material-symbols-outlined text-base sm:text-lg"
                  style={{ fontVariationSettings: isFavorited ? '"FILL" 1' : '"FILL" 0' }}
                >
                  favorite
                </span>
              </button>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 sm:bottom-4 sm:left-4 sm:right-4">
              <div className="rounded-xl border border-white/15 bg-white/12 px-3 py-2 text-white backdrop-blur-md sm:rounded-2xl sm:px-4 sm:py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75 sm:text-[11px]">
                  Starting at
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums sm:text-2xl">
                  KES {service.startingPrice.toLocaleString()}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                {service.distance ? (
                  <span className="rounded-full bg-emerald-500/95 px-2 py-1 text-[10px] font-semibold text-white shadow-sm sm:px-3 sm:py-1.5 sm:text-xs">
                    {formatDistance(service.distance)}
                  </span>
                ) : null}
                <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm sm:text-xs">
                  {service.reviewCount} reviews
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4 sm:gap-3.5 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-base font-bold leading-snug tracking-tight text-slate-950 transition-colors group-hover:text-emerald-700 sm:text-lg">
                  {service.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                  {service.description ||
                    "Book with a trusted provider—clear pricing before you commit."}
                </p>
              </div>

              <div className="shrink-0 rounded-xl border border-amber-100 bg-amber-50 px-2 py-1.5 text-right sm:rounded-2xl sm:px-2.5 sm:py-2">
                <div className="flex items-center justify-end gap-0.5 text-amber-500">
                  <span
                    className="material-symbols-outlined text-sm sm:text-base"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    star
                  </span>
                  <span className="text-sm font-bold tabular-nums text-slate-950">
                    {service.rating.toFixed(1)}
                  </span>
                </div>
                <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:text-[10px]">
                  rating
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/90 px-2 py-2 sm:py-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.14em]">
                  Category
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-900 sm:text-sm">
                  {service.category}
                </p>
              </div>
              <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/90 px-2 py-2 sm:py-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.14em]">
                  Trust
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-900 sm:text-sm">
                  {service.isVerified ? "Verified" : "Standard"}
                </p>
              </div>
              <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/90 px-2 py-2 sm:py-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.14em]">
                  Price
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-900 sm:text-sm">
                  KES {service.startingPrice.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              {service.provider ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                      {service.provider.image ? (
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm sm:h-10 sm:w-10">
                          <Image
                            src={service.provider.image}
                            alt={service.provider.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-xs font-bold text-emerald-700 sm:h-10 sm:w-10 sm:text-sm">
                          {service.provider.name.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {service.provider.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {providerTier
                            ? `${providerTier} plan`
                            : "Service provider"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1" aria-hidden />
                  )}

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200/50 transition-transform duration-300 group-hover:scale-105 sm:h-10 sm:w-10">
                <span className="material-symbols-outlined text-lg sm:text-xl">
                  arrow_forward
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
};

export default ServiceCard;
