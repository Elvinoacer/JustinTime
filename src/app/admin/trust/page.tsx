import Link from "next/link";
import {
  getIdentityVerificationRequests,
  getVerificationAuditFeed,
  reviewIdentityVerificationRequest,
  approveBackgroundCheck,
  rejectBackgroundCheck,
} from "@/app/actions/verification";
import {
  adminApproveBadge,
  adminRevokeBadge,
  getPendingBadgeRequests,
} from "@/app/actions/taas";
import { getBackgroundChecks } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

type TrustTab = "identity" | "badges" | "background" | "audit";

function asTrustTab(value: string | undefined): TrustTab {
  if (value === "badges") return "badges";
  if (value === "background") return "background";
  if (value === "audit") return "audit";
  return "identity";
}

function statusTone(status: string) {
  if (["VERIFIED", "APPROVED", "PAID"].includes(status)) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  if (["REJECTED", "REVOKED", "EXPIRED"].includes(status)) {
    return "bg-red-100 text-red-700 border-red-200";
  }
  return "bg-amber-100 text-amber-700 border-amber-200";
}

export default async function AdminTrustCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = asTrustTab(params.tab);

  const [identityResult, badgeResult, backgroundChecks, auditResult] =
    await Promise.all([
      getIdentityVerificationRequests(),
      getPendingBadgeRequests(),
      getBackgroundChecks("PENDING"),
      getVerificationAuditFeed(150),
    ]);

  const identityRequests = identityResult.success
    ? identityResult.requests
    : [];
  const pendingBadges = badgeResult.success ? (badgeResult.badges ?? []) : [];
  const audits = auditResult.success ? auditResult.events : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Trust Center
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Unified operations for identity verification, badges, background
          checks, and trust audits.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "identity", label: "Identity Requests" },
          { id: "badges", label: "Badge Queue" },
          { id: "background", label: "Background Checks" },
          { id: "audit", label: "Audit Timeline" },
        ].map((item) => {
          const active = tab === item.id;
          return (
            <Link
              key={item.id}
              href={`/admin/trust?tab=${item.id}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {tab === "identity" ? (
        <div className="space-y-3">
          {identityRequests.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No identity verification requests found.
            </div>
          ) : (
            identityRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {request.user.name || "Unknown user"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {request.user.email || "No email"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-semibold ${statusTone(request.status)}`}
                  >
                    {request.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <a
                    href={request.idDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                  >
                    View ID document
                  </a>
                  {request.selfieUrl ? (
                    <a
                      href={request.selfieUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                    >
                      View selfie
                    </a>
                  ) : null}
                </div>

                {request.status === "SUBMITTED" ||
                request.status === "UNDER_REVIEW" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <form
                      action={async () => {
                        "use server";
                        await reviewIdentityVerificationRequest({
                          requestId: request.id,
                          decision: "VERIFIED",
                        });
                      }}
                    >
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-700"
                      >
                        Approve identity
                      </button>
                    </form>

                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const notes = String(
                          formData.get("notes") || "",
                        ).trim();
                        await reviewIdentityVerificationRequest({
                          requestId: request.id,
                          decision: "REJECTED",
                          reviewNotes: notes || undefined,
                        });
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        name="notes"
                        placeholder="Rejection note"
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-red-600 text-white px-3 py-2 text-sm font-semibold hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === "badges" ? (
        <div className="space-y-3">
          {(pendingBadges?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No pending badge requests.
            </div>
          ) : (
            (pendingBadges ?? []).map((badge) => (
              <div
                key={badge.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {badge.user.name || "Unknown user"}
                    </p>
                    <p className="text-xs text-slate-500">{badge.user.email}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-700">
                      {badge.type}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form
                      action={async () => {
                        "use server";
                        await adminApproveBadge(badge.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                    </form>
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const reason =
                          String(formData.get("reason") || "").trim() ||
                          "Rejected in trust center";
                        await adminRevokeBadge(badge.id, reason);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        name="reason"
                        placeholder="Reason"
                        className="w-32 rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-red-600 text-white px-3 py-2 text-sm font-semibold hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === "background" ? (
        <div className="space-y-3">
          {backgroundChecks.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No pending background checks.
            </div>
          ) : (
            backgroundChecks.map((check) => (
              <div
                key={check.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {check.user.name || "Unknown user"}
                    </p>
                    <p className="text-xs text-slate-500">{check.user.email}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Submitted: {new Date(check.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form
                      action={async () => {
                        "use server";
                        await approveBackgroundCheck(check.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                    </form>
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const reason =
                          String(formData.get("reason") || "").trim() ||
                          "Rejected in trust center";
                        await rejectBackgroundCheck(check.id, reason);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        name="reason"
                        placeholder="Reason"
                        className="w-32 rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-red-600 text-white px-3 py-2 text-sm font-semibold hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(check.documents || []).map(
                    (docUrl: string, idx: number) => (
                      <a
                        key={`${check.id}-${idx}`}
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50"
                      >
                        Document {idx + 1}
                      </a>
                    ),
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Change
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Actor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audits.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {new Date(event.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {event.user?.name || "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                    {event.action}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {event.previousValue || "-"} → {event.newValue || "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {event.performedBy || "SYSTEM"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
