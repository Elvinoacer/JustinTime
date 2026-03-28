"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Building,
  Calendar,
  CheckCircle,
  DollarSign,
  FileText,
  MapPin,
  Navigation,
} from "lucide-react";
import type { JobListClient } from "@/lib/api/contracts/public-listings";

type JobCardProps = {
  job: JobListClient;
  priority?: boolean;
};

export default function JobCard({ job, priority = false }: JobCardProps) {
  const budgetLabel =
    job.budget != null
      ? `KES ${job.budget.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : "Budget open";
  const cover =
    Array.isArray(job.images) && job.images.length > 0 && job.images[0]
      ? job.images[0]
      : null;

  return (
    <article className="group flex min-h-[156px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_10px_36px_-24px_rgba(15,23,42,0.45)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-emerald-200/70 hover:shadow-[0_16px_44px_-22px_rgba(16,185,129,0.18)] sm:min-h-[168px] sm:flex-row">
      <div className="relative h-24 w-full shrink-0 overflow-hidden sm:h-auto sm:w-[40%] sm:min-w-[132px] sm:max-w-[210px]">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, 210px"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-emerald-800 to-teal-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/78 via-slate-900/35 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 sm:bottom-2.5 sm:left-2.5">
          <span className="inline-flex max-w-[85%] items-center gap-1 truncate rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900 shadow-sm backdrop-blur-sm">
            <Building className="h-3 w-3 shrink-0" aria-hidden />
            {job.category?.name ?? "General"}
          </span>
          {job.distanceKm != null ? (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-600/92 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              <Navigation className="h-3 w-3" aria-hidden />
              {job.distanceKm} km
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="min-w-0">
          <Link
            href={`/jobs/${job.id}`}
            className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-slate-950 sm:text-base">
              {job.title}
            </h3>
          </Link>
          <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-slate-600">
            {job.description}
          </p>
        </div>

        <div className="flex items-end justify-between gap-2 border-t border-slate-100/90 pt-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="inline-flex items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50/95 px-2 py-1 text-sm font-bold tabular-nums text-emerald-900">
              <DollarSign className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              {budgetLabel}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-0.5">
                <FileText className="h-3 w-3" aria-hidden />
                {job.proposalCount} proposal{job.proposalCount === 1 ? "" : "s"}
              </span>
              {job.location ? (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex max-w-[9rem] items-center gap-0.5 truncate">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">{job.location}</span>
                  </span>
                </>
              ) : null}
              {job.deadline ? (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-0.5 text-orange-700/90">
                    <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                    {new Date(job.deadline).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {job.client.image ? (
                  <Image
                    src={job.client.image}
                    alt={job.client.name ? `${job.client.name}` : "Client"}
                    fill
                    className="object-cover"
                    sizes="32px"
                    priority={priority}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-teal-700">
                    {job.client.name?.[0] ?? "?"}
                  </div>
                )}
              </div>
              <div className="hidden min-w-0 max-w-[5rem] sm:block">
                <p className="truncate text-[11px] font-semibold text-slate-900">
                  {job.client.name?.trim() || "Client"}
                </p>
                {job.client.isVerified ? (
                  <p className="flex items-center gap-0.5 text-[10px] text-emerald-600">
                    <CheckCircle className="h-3 w-3" aria-hidden />
                    Verified
                  </p>
                ) : null}
              </div>
            </div>
            <Link
              href={`/jobs/${job.id}`}
              className="inline-flex h-8 items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              View job
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
