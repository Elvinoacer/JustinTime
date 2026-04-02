"use client";

import apiClient from "@/lib/api/client";
import {
  parseApiData,
  type JobsListPayload,
} from "@/lib/api/contracts/public-listings";
import { useCategories } from "@/lib/api/hooks/useServices";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

const statusOptions = [
  { value: "ALL", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

type StatusFilter = (typeof statusOptions)[number]["value"];

const statusClasses: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-indigo-100 text-indigo-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function AdminJobsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter]);

  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const { data, isLoading, isFetching, error } = useQuery<
    JobsListPayload,
    Error
  >({
    queryKey: [
      "admin-jobs",
      page,
      pageSize,
      statusFilter,
      categoryFilter,
      search,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      if (categoryFilter) {
        params.set("category", categoryFilter);
      }

      if (search) {
        params.set("search", search);
      }

      const response = await apiClient.get<unknown>(
        `/jobs?${params.toString()}`,
      );
      return parseApiData<JobsListPayload>(response.data);
    },
  });

  const jobs = data?.items || [];
  const pagination = data?.pagination;
  const categoryOptions = (categories || []).filter((category) => {
    return category.id && category.id !== "all";
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Jobs Management</h1>
        <p className="text-slate-500 text-sm mt-1">
          Search and monitor marketplace jobs across the platform.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title or description"
              className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            disabled={categoriesLoading || Boolean(categoriesError)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
          Failed to load jobs. Please try again.
        </div>
      ) : null}

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-100 p-12 flex justify-center">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-sm text-slate-600">
            {pagination?.total ?? jobs.length} job
            {(pagination?.total ?? jobs.length) === 1 ? "" : "s"} found
          </div>

          {jobs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No jobs matched your filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {jobs.map((job) => {
                const budgetLabel =
                  job.budget == null
                    ? "Budget not set"
                    : `KES ${Number(job.budget).toLocaleString()}`;

                return (
                  <div
                    key={job.id}
                    className="p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-slate-900 truncate">
                          {job.title}
                        </h2>
                        <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                          {job.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                            <span className="material-symbols-outlined text-sm">
                              category
                            </span>
                            {job.category?.name || "Uncategorized"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                            <span className="material-symbols-outlined text-sm">
                              person
                            </span>
                            {job.client?.name || "Unknown client"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                            <span className="material-symbols-outlined text-sm">
                              location_on
                            </span>
                            {job.location || "Not specified"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                            <span className="material-symbols-outlined text-sm">
                              description
                            </span>
                            {job.proposalCount} proposal
                            {job.proposalCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            statusClasses[job.status] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {job.status.replaceAll("_", " ")}
                        </span>
                        <p className="text-sm font-semibold text-slate-900">
                          {budgetLabel}
                        </p>
                        <p className="text-xs text-slate-500">
                          Posted {new Date(job.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/jobs/${job.id}`}
                            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Admin View
                          </Link>
                          <Link
                            href={`/jobs/${job.id}`}
                            className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Public View
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={pagination.page <= 1 || isFetching}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <p className="text-sm text-slate-600">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)}
          </p>

          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={!pagination.hasMore || isFetching}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
