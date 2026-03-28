"use client";

import Image from "next/image";
import Link from "next/link";

interface ProfessionalCardProps {
  professional: {
    id: string;
    name: string;
    title?: string;
    image?: string | null;
    rating?: number | null;
    reviews?: number | null;
    hourlyRate?: number | null;
    location?: string | null;
    skills: string[];
    completedJobs?: number | null;
    memberSince: string;
    verified?: boolean;
    subscription?: {
      plan: string;
      isActive: boolean;
    };
    distance?: number;
  };
}

const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ professional }) => {
  const displayName = (professional.name || "").trim() || "Unknown";
  const isPro =
    professional.subscription?.plan &&
    ["PRO", "BUSINESS"].includes(professional.subscription.plan) &&
    professional.subscription.isActive;

  const isVerified = professional.verified;
  const hourlyRate = Number.isFinite(Number(professional.hourlyRate))
    ? Number(professional.hourlyRate)
    : 0;
  const rating = Number.isFinite(Number(professional.rating))
    ? Number(professional.rating)
    : 0;
  const reviews = Number.isFinite(Number(professional.reviews))
    ? Number(professional.reviews)
    : 0;
  const completedJobs = Number.isFinite(Number(professional.completedJobs))
    ? Number(professional.completedJobs)
    : 0;
  const skills = Array.isArray(professional.skills) ? professional.skills : [];
  const memberSinceYear = Number.isNaN(
    new Date(professional.memberSince).getFullYear(),
  )
    ? new Date().getFullYear()
    : new Date(professional.memberSince).getFullYear();

  const formatDistance = (km?: number) => {
    if (km == null || !Number.isFinite(km)) return null;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  const distLabel = formatDistance(professional.distance);

  return (
    <Link
      href={`/professionals/${professional.id}`}
      className="group block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-emerald-200/60 hover:shadow-lg sm:rounded-3xl">
        <div className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 px-4 pb-12 pt-6">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-2xl" />
            <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/20 blur-2xl" />
          </div>

          <div className="relative mb-4 flex min-h-[36px] flex-wrap items-start justify-between gap-2">
            {isPro ? (
              <div className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 shadow-md">
                <span className="flex items-center gap-1 text-xs font-bold tracking-wide text-white">
                  <span className="material-symbols-outlined text-sm">
                    workspace_premium
                  </span>
                  PRO
                </span>
              </div>
            ) : null}
            {isVerified && !isPro ? (
              <div className="rounded-full bg-white/90 px-3 py-1.5 shadow-md backdrop-blur-md">
                <span className="flex items-center gap-1 text-xs font-bold tracking-wide text-emerald-700">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Verified
                </span>
              </div>
            ) : null}
            {distLabel ? (
              <div className="ml-auto rounded-full bg-white/90 px-3 py-1.5 shadow-md backdrop-blur-md">
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                  <span className="material-symbols-outlined text-sm">near_me</span>
                  {distLabel}
                </span>
              </div>
            ) : null}
          </div>

          <div className="absolute right-4 top-4">
            <div className="rounded-xl border border-white/50 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                From
              </p>
              <p className="text-lg font-bold leading-none text-emerald-700">
                KES {hourlyRate.toLocaleString()}
                <span className="text-xs font-medium text-gray-500">/hr</span>
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-10 flex justify-center">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 p-[3px] shadow-lg shadow-emerald-500/30">
              <div className="h-full w-full rounded-full bg-white" />
            </div>
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-white shadow-xl sm:h-24 sm:w-24">
              {professional.image ? (
                <Image
                  src={professional.image}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 80px, 96px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                  <span className="text-3xl font-bold text-emerald-600 sm:text-4xl">
                    {displayName.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-grow flex-col p-4 text-center sm:p-5">
          <h3 className="mb-1 text-lg font-bold text-gray-900 transition-colors group-hover:text-emerald-700 sm:text-xl">
            {displayName}
          </h3>
          {professional.title ? (
            <p className="mb-3 line-clamp-1 text-sm text-gray-500">
              {professional.title}
            </p>
          ) : null}

          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`material-symbols-outlined text-base ${
                    i < Math.floor(rating)
                      ? "text-amber-400"
                      : i < rating
                        ? "text-amber-300"
                        : "text-gray-200"
                  }`}
                  style={{
                    fontVariationSettings: i < rating ? '"FILL" 1' : '"FILL" 0',
                  }}
                >
                  star
                </span>
              ))}
            </div>
            <span className="text-sm font-bold text-gray-900">{rating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({reviews} reviews)</span>
          </div>

          {professional.location ? (
            <div className="mb-3 flex items-center justify-center gap-1 text-sm text-gray-500">
              <span className="material-symbols-outlined text-sm">location_on</span>
              <span className="max-w-[180px] truncate">{professional.location}</span>
            </div>
          ) : null}

          {skills.length > 0 ? (
            <div className="mb-4 flex flex-wrap justify-center gap-1.5">
              {skills.slice(0, 3).map((skill, idx) => (
                <span
                  key={`${skill}-${idx}`}
                  className="rounded-full border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                >
                  {skill}
                </span>
              ))}
              {skills.length > 3 ? (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  +{skills.length - 3}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mb-4 flex items-center justify-center gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-emerald-500">
                verified_user
              </span>
              <span>{completedJobs} jobs</span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-gray-400">
                calendar_month
              </span>
              <span>Since {memberSinceYear}</span>
            </div>
          </div>

          <div className="relative mt-auto overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition-shadow group-hover:shadow-emerald-500/40">
            <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative flex items-center justify-center gap-2">
              View profile
              <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProfessionalCard;
