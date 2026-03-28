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

const ServiceCard: React.FC<ServiceCardProps> = ({ service, index = 0 }) => {
  const [isFavorited, setIsFavorited] = useState(false);

  const formatDistance = (km?: number) => {
    if (!km) return null;
    if (km < 1) return `${Math.round(km * 1000)}m away`;
    return `${km.toFixed(1)}km away`;
  };

  const providerTier =
    service.provider?.subscription && service.provider.subscription !== "FREE"
      ? service.provider.subscription
      : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.04, ease: "easeOut" }}
      className="group h-full"
    >
      <Link href={`/services/${service.id}`} className="block h-full">
        <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-32px_rgba(15,23,42,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200/80 hover:shadow-[0_28px_60px_-30px_rgba(16,185,129,0.22)]">
          <div className="relative aspect-[16/10] min-h-[200px] overflow-hidden sm:min-h-[220px]">
            <Image
              src={service.imageUrl}
              alt={service.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

            <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap gap-2">
                <span className="max-w-[11rem] truncate rounded-full border border-white/40 bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800 shadow-sm backdrop-blur-md">
                  {service.category}
                </span>
                {service.isVerified && (
                  <span className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-950 shadow-sm">
                    Verified
                  </span>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  setIsFavorited((prev) => !prev);
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-all ${
                  isFavorited
                    ? "border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/30"
                    : "border-white/40 bg-white/90 text-gray-700"
                }`}
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: isFavorited ? '"FILL" 1' : '"FILL" 0' }}
                >
                  favorite
                </span>
              </button>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/12 px-4 py-3 text-white backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                  Starting at
                </p>
                <p className="mt-1 text-2xl font-bold">
                  KES {service.startingPrice.toLocaleString()}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                {service.distance && (
                  <span className="rounded-full bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                    {formatDistance(service.distance)}
                  </span>
                )}
                <span className="rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                  {service.reviewCount} reviews
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xl font-bold tracking-tight text-gray-950 transition-colors group-hover:text-emerald-700">
                    {service.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600">
                    {service.description ||
                      "Book this service with a trusted provider and compare clear pricing before you commit."}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-right">
                  <div className="flex items-center gap-1 text-amber-500">
                    <span
                      className="material-symbols-outlined text-base"
                      style={{ fontVariationSettings: '"FILL" 1' }}
                    >
                      star
                    </span>
                    <span className="text-sm font-bold text-gray-950">
                      {service.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
                    rating
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Category
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                    {service.category}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Trust
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                    {service.isVerified ? "Verified pro" : "Open listing"}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Price
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                    From KES {service.startingPrice.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
              {service.provider && (
                <div className="flex min-w-0 items-center gap-3">
                  {service.provider.image ? (
                    <div className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-white shadow-sm">
                      <Image
                        src={service.provider.image}
                        alt={service.provider.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-sm font-bold text-emerald-700">
                      {service.provider.name.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {service.provider.name}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {providerTier ? `${providerTier} provider` : "Service provider"}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200 transition-transform duration-300 group-hover:scale-105">
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
};

export default ServiceCard;
