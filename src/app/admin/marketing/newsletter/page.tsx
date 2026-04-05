import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

interface AdminNewsletterSubscribersPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

type StatusFilter = "all" | "active" | "inactive";
const PAGE_SIZE = 50;

function getSingleValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatusFilter(value: string | undefined): StatusFilter {
  if (value === "active" || value === "inactive") {
    return value;
  }

  return "all";
}

function parsePage(value: string | undefined): number {
  const parsed = Number(value ?? "1");
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function buildHref(input: {
  page: number;
  query: string;
  status: StatusFilter;
}): string {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.status !== "all") {
    params.set("status", input.status);
  }

  if (input.page > 1) {
    params.set("page", String(input.page));
  }

  const queryString = params.toString();
  return queryString
    ? `/admin/marketing/newsletter?${queryString}`
    : "/admin/marketing/newsletter";
}

export default async function AdminNewsletterSubscribersPage({
  searchParams,
}: AdminNewsletterSubscribersPageProps) {
  const params = (await searchParams) ?? {};
  const query = (getSingleValue(params.q) ?? "").trim();
  const status = parseStatusFilter(getSingleValue(params.status));
  const page = parsePage(getSingleValue(params.page));

  const where: Prisma.NewsletterSubscriberWhereInput = {
    ...(query
      ? {
          email: {
            contains: query,
            mode: "insensitive",
          },
        }
      : {}),
    ...(status === "active"
      ? { isActive: true }
      : status === "inactive"
        ? { isActive: false }
        : {}),
  };

  const [subscribers, total, activeCount, inactiveCount] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    prisma.newsletterSubscriber.count({ where: { isActive: false } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startCount = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endCount = Math.min(
    (currentPage - 1) * PAGE_SIZE + subscribers.length,
    total,
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Newsletter Subscribers
          </h1>
          <p className="text-gray-600">
            Monitor active and inactive newsletter records.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/marketing/events"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Event Logs
          </Link>
          <Link
            href="/admin/marketing/promos"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open Promotions
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Total records</p>
          <p className="text-2xl font-bold text-gray-900">
            {total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs text-emerald-700">Active</p>
          <p className="text-2xl font-bold text-emerald-700">
            {activeCount.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-600">Inactive</p>
          <p className="text-2xl font-bold text-gray-700">
            {inactiveCount.toLocaleString()}
          </p>
        </div>
      </div>

      <form
        method="GET"
        action="/admin/marketing/newsletter"
        className="rounded-xl border border-gray-200 bg-white p-4"
      >
        <div className="grid gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm text-gray-700 md:col-span-3">
            Subscriber email contains
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="example@company.com"
              className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Status
            <div className="flex gap-2">
              <select
                name="status"
                defaultValue={status}
                className="h-10 flex-1 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-md bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800"
              >
                Filter
              </button>
            </div>
          </label>
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
          <span>
            Showing {startCount} to {endCount} of {total} subscribers
          </span>
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {subscribers.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No subscriber records found for the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {subscriber.email}
                    </td>
                    <td className="px-4 py-3">
                      {subscriber.isActive ? (
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {subscriber.createdAt.toISOString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {subscriber.updatedAt.toISOString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
          {currentPage > 1 ? (
            <Link
              href={buildHref({
                page: currentPage - 1,
                query,
                status,
              })}
              className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Previous
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400">
              Previous
            </span>
          )}

          {currentPage < totalPages ? (
            <Link
              href={buildHref({
                page: currentPage + 1,
                query,
                status,
              })}
              className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Next
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400">
              Next
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
