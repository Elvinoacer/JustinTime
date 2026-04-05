import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function formatAmount(
  value: { toString(): string } | number | null | undefined,
) {
  if (value == null) {
    return "Budget not set";
  }

  const numericValue = Number(value.toString());
  if (!Number.isFinite(numericValue)) {
    return "Budget not set";
  }

  return `KES ${numericValue.toLocaleString()}`;
}

const jobStatusClasses: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-indigo-100 text-indigo-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const proposalStatusClasses: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default async function AdminJobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      proposals: {
        orderBy: { createdAt: "desc" },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      _count: {
        select: {
          proposals: true,
        },
      },
    },
  });

  if (!job) {
    notFound();
  }

  const acceptedCount = job.proposals.filter(
    (proposal) => proposal.status === "ACCEPTED",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link
            href="/admin/jobs"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
          >
            ← Back to Jobs
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            {job.title}
          </h1>
          <p className="text-slate-600 text-sm mt-1">Job ID: {job.id}</p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              jobStatusClasses[job.status] || "bg-slate-100 text-slate-700"
            }`}
          >
            {job.status.replaceAll("_", " ")}
          </span>
          <Link
            href={`/jobs/${job.id}`}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Public View
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Budget
          </p>
          <p className="text-lg font-semibold text-slate-900 mt-1">
            {formatAmount(job.budget)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Proposals
          </p>
          <p className="text-lg font-semibold text-slate-900 mt-1">
            {job._count.proposals}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Accepted Proposals
          </p>
          <p className="text-lg font-semibold text-slate-900 mt-1">
            {acceptedCount}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Job Details</h2>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">
          {job.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Category</p>
            <p className="font-medium text-slate-900">
              {job.category?.name || "Uncategorized"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Location</p>
            <p className="font-medium text-slate-900">
              {job.location || "Not specified"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Client</p>
            <p className="font-medium text-slate-900">
              {job.client?.name || "Unknown client"}
            </p>
            <p className="text-slate-500 text-xs">
              {job.client?.email || "No email"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Posted</p>
            <p className="font-medium text-slate-900">
              {new Date(job.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Proposals</h2>
          <span className="text-sm text-slate-500">
            {job.proposals.length} total
          </span>
        </div>

        {job.proposals.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No proposals have been submitted yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {job.proposals.map((proposal) => (
              <div key={proposal.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {proposal.provider?.name || "Unknown provider"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {proposal.provider?.email || "No email"}
                    </p>
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                      {proposal.coverLetter}
                    </p>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        proposalStatusClasses[proposal.status] ||
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {proposal.status}
                    </span>
                    <p className="text-sm font-semibold text-slate-900">
                      KES {Number(proposal.price).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      ETA: {proposal.estimatedDays ?? "Not provided"} day
                      {proposal.estimatedDays === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Submitted {new Date(proposal.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
