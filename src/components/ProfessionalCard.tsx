"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface ProfessionalCardProps {
  professional: {
    id: string;
    name: string;
    image?: string | null;
    coverImage?: string | null;
    title?: string;
    rating?: number | null;
    reviews?: number | null;
    hourlyRate?: number | null;
    location?: string | null;
    skills: string[];
    completedJobs?: number | null;
    memberSince: string;
    verified?: boolean;
    backgroundChecked?: boolean;
    certified?: boolean;
    trustBadges?: string[];
    subscription?: {
      plan: string;
      isActive: boolean;
    };
    distance?: number;
  };
}

const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ professional }) => {
  const displayName = (professional.name || "").trim() || "Unknown";
  const profession =
    (professional.title || "").trim() || "Service professional";
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

  const cover =
    typeof professional.coverImage === "string" && professional.coverImage
      ? professional.coverImage
      : null;
  const [coverAvailable, setCoverAvailable] = useState(Boolean(cover));
  const [avatarAvailable, setAvatarAvailable] = useState(Boolean(professional.image));

  useEffect(() => {
    setCoverAvailable(Boolean(cover));
  }, [cover]);

  useEffect(() => {
    setAvatarAvailable(Boolean(professional.image));
  }, [professional.image]);

  const formatDistance = (km?: number) => {
    if (km == null || !Number.isFinite(km)) return null;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };
  const distLabel = formatDistance(professional.distance);

  const skillsShown = skills.slice(0, 4);
  const skillsExtra = skills.length > 4 ? skills.length - 4 : 0;
  const trustBadges = Array.isArray(professional.trustBadges)
    ? professional.trustBadges.slice(0, 3)
    : [];

  return (
    <Link
      href={`/professionals/${professional.id}`}
      className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
    >
      <article className="flex min-h-[158px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_10px_36px_-24px_rgba(15,23,42,0.45)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-emerald-200/70 hover:shadow-[0_16px_44px_-22px_rgba(16,185,129,0.22)] sm:min-h-[168px] sm:flex-row">
        <div className="relative h-28 w-full shrink-0 overflow-hidden sm:h-auto sm:w-[42%] sm:min-w-[140px] sm:max-w-[220px]">
          {cover && coverAvailable ? (
            <Image
              src={cover}
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, 220px"
              unoptimized
              onError={() => setCoverAvailable(false)}
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-emerald-700 via-teal-700 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-linear-to-r from-slate-950/75 via-slate-950/3 to-transparent" />
          <div className="absolute left-2 right-2 top-2 flex items-start justify-between gap-1.5 sm:left-2.5 sm:right-2.5 sm:top-2.5">
            <div className="flex min-w-0 flex-wrap gap-1">
              {isPro ? (
                <span className="rounded-md bg-amber-400/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm">
                  Pro
                </span>
              ) : null}
              {isVerified && !isPro ? (
                <span className="flex items-center gap-0.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 shadow-sm backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  Verified
                </span>
              ) : null}
              {professional.backgroundChecked ? (
                <span className="rounded-md bg-slate-900/85 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                  Background checked
                </span>
              ) : null}
            </div>
          </div>
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center justify-end gap-1 sm:bottom-2.5 sm:left-2.5 sm:right-2.5">
            <span className="rounded-md border border-white/25 bg-black/30 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {reviews} reviews
            </span>
            {distLabel ? (
              <span className="rounded-md bg-emerald-600/92 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {distLabel}
              </span>
            ) : null}
          </div>
        </div>

        {/* Main panel */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex gap-2.5 sm:gap-3">
            <div className="relative -mt-9 h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-white bg-white shadow-md ring-1 ring-slate-200/80 sm:mt-0 sm:h-[3.25rem] sm:w-[3.25rem]">
              {professional.image && avatarAvailable ? (
                <Image
                  src={professional.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="52px"
                  unoptimized
                  onError={() => setAvatarAvailable(false)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-emerald-100 to-teal-100 text-lg font-bold text-emerald-700">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5 sm:pt-0">
              <h3 className="truncate text-[15px] font-bold leading-tight tracking-tight text-slate-950 sm:text-base">
                {displayName}
              </h3>
              <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-slate-600">
                {profession}
              </p>
              {skillsShown.length > 0 ? (
                <div className="mt-1.5 flex min-h-[1.5rem] flex-wrap gap-1">
                  {skillsShown.map((skill, idx) => (
                    <span
                      key={`${skill}-${idx}`}
                      className="max-w-[7rem] truncate rounded-md border border-emerald-100 bg-emerald-50/90 px-1.5 py-px text-[10px] font-medium text-emerald-800 sm:max-w-[8.5rem] sm:text-[11px]"
                      title={skill}
                    >
                      {skill}
                    </span>
                  ))}
                  {skillsExtra > 0 ? (
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-px text-[10px] font-medium text-slate-600 sm:text-[11px]">
                      +{skillsExtra}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {trustBadges.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {trustBadges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-md border border-sky-100 bg-sky-50/90 px-1.5 py-px text-[10px] font-medium text-sky-800 sm:text-[11px]"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 border-t border-slate-100/90 pt-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                From
              </p>
              <p className="text-lg font-bold tabular-nums leading-none text-emerald-800 sm:text-xl">
                KES {hourlyRate.toLocaleString()}
                <span className="text-xs font-semibold text-slate-500">/hr</span>
              </p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-0.5 tabular-nums text-slate-600">
                  <span
                    className="material-symbols-outlined text-[14px] text-amber-500"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    star
                  </span>
                  {rating.toFixed(1)}
                  <span className="text-slate-400">({reviews})</span>
                </span>
                {professional.location ? (
                  <>
                    <span className="text-slate-300" aria-hidden>
                      ·
                    </span>
                    <span className="line-clamp-1 max-w-[10rem] sm:max-w-[12rem]">
                      {professional.location}
                    </span>
                  </>
                ) : null}
                <span className="text-slate-300" aria-hidden>
                  ·
                </span>
                <span>{completedJobs} jobs</span>
                <span className="text-slate-300" aria-hidden>
                  ·
                </span>
                <span>Since {memberSinceYear}</span>
              </p>
            </div>
            <span className="flex h-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white shadow-sm transition-colors group-hover:bg-emerald-600 sm:h-10 sm:px-3.5">
              View
              <span className="material-symbols-outlined ml-0.5 text-[16px] transition-transform group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default ProfessionalCard;
