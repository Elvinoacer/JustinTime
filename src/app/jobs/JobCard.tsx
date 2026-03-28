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
      : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-emerald-100 hover:shadow-lg">
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`/jobs/${job.id}`}
              className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              <h3 className="mb-2 line-clamp-2 text-lg font-bold text-gray-900 transition-colors group-hover:text-emerald-700">
                {job.title}
              </h3>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                <Building className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                {job.category?.name ?? "General"}
              </span>
              {job.location ? (
                <span className="inline-flex max-w-[160px] items-center gap-1 truncate rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                  <span className="truncate">{job.location}</span>
                </span>
              ) : null}
              {job.distanceKm != null ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                  <Navigation className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {job.distanceKm}&nbsp;/&nbsp;km
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {budgetLabel ? (
          <div className="mb-3 inline-flex w-fit items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800">
            <DollarSign className="h-4 w-4 shrink-0" aria-hidden />
            {budgetLabel}
          </div>
        ) : null}

        <p className="mb-5 line-clamp-3 text-sm leading-relaxed text-gray-600">
          {job.description}
        </p>

        <div className="mt-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              {job.proposalCount} proposal{job.proposalCount === 1 ? "" : "s"}
            </span>
            {job.deadline ? (
              <span className="inline-flex items-center gap-1.5 text-orange-700">
                <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Due {new Date(job.deadline).toLocaleDateString()}
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                {job.client.image ? (
                  <Image
                    src={job.client.image}
                    alt={job.client.name ? `${job.client.name} avatar` : "Client"}
                    fill
                    sizes="36px"
                    className="object-cover"
                    priority={priority}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-teal-50 text-sm font-bold text-teal-700">
                    {job.client.name?.[0] ?? "?"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="text-xs text-gray-500">Client</span>
                <p className="flex items-center gap-1 truncate text-sm font-semibold text-gray-900">
                  <span className="truncate">
                    {job.client.name?.trim() || "Anonymous"}
                  </span>
                  {job.client.isVerified ? (
                    <CheckCircle
                      className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                      aria-label="Verified client"
                    />
                  ) : null}
                </p>
              </div>
            </div>
            <Link
              href={`/jobs/${job.id}`}
              className="inline-flex h-9 shrink-0 items-center rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              View
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
