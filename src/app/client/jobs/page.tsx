"use client";

import apiClient from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

type JobStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

type ClientJob = {
  id: string;
  title: string;
  description: string;
  budget: number | string | null;
  status: JobStatus | string;
  location: string | null;
  createdAt: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  _count?: {
    proposals: number;
  };
};

type ClientJobsResponse = {
  jobs: ClientJob[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

const statusOptions = [
  { value: "ALL", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

type StatusFilter = (typeof statusOptions)[number]["value"];

const statusClasses: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  COMPLETED: "bg-indigo-100 text-indigo-700 border-indigo-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

export default function ClientJobsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const { data, isLoading, isFetching, error } = useQuery<
    ClientJobsResponse,
    Error
  >({
    queryKey: ["client-jobs-list", page, pageSize, statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      if (search) {
        params.set("search", search);
      }

      const response = await apiClient.get<ClientJobsResponse>(
        `/client/jobs?${params.toString()}`,
      );
      return response.data;
    },
  });

  const jobs = data?.jobs || [];
  const pagination = data?.pagination;
  const totalJobs = pagination?.total ?? jobs.length;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm md:text-base">
          Failed to load your jobs. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            My Jobs
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Track all jobs you have posted and review proposal activity.
          </p>
        </div>
        <Link
          href="/client/post-job"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Post a New Job
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              search
            </span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, description, or location"
              className="w-full rounded-lg border border-gray-200 pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        {isLoading
          ? "Loading jobs..."
          : `${totalJobs} job${totalJobs === 1 ? "" : "s"} found`}
      </div>

      {isLoading ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 flex justify-center">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
          <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">
            work_off
          </span>
          <h2 className="text-lg font-semibold text-gray-900">No jobs found</h2>
          <p className="text-sm text-gray-600 mt-1">
            Try changing your filters or post a new job to get started.
          </p>
          <Link
            href="/client/post-job"
            className="inline-flex mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Post a Job
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const budgetValue =
              job.budget === null
                ? null
                : Number.parseFloat(String(job.budget));
            const proposalsCount = job._count?.proposals || 0;

            return (
              <div
                key={job.id}
                className="bg-white border border-gray-100 rounded-xl p-4 sm:p-5 shadow-xs"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {job.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-3 text-xs sm:text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                        <span className="material-symbols-outlined text-sm">
                          category
                        </span>
                        {job.category?.name || "Uncategorized"}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                        <span className="material-symbols-outlined text-sm">
                          location_on
                        </span>
                        {job.location || "Not specified"}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                        <span className="material-symbols-outlined text-sm">
                          description
                        </span>
                        {proposalsCount} proposal
                        {proposalsCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2">
                    <span
                      className={`inline-flex border rounded-full px-2.5 py-1 text-xs font-semibold ${
                        statusClasses[job.status] ||
                        "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {job.status.replaceAll("_", " ")}
                    </span>
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-900">
                        {budgetValue === null || Number.isNaN(budgetValue)
                          ? "Budget not set"
                          : `KES ${budgetValue.toLocaleString()}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Posted {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Public View
                      </Link>
                      <Link
                        href={`/client/jobs/${job.id}`}
                        className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Manage Job
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || isFetching}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <p className="text-sm text-gray-600">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)}
          </p>

          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={!pagination.hasMore || isFetching}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
