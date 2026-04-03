"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  ShieldAlert,
  Wallet,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { resolveInsuranceClaim } from "@/app/actions/insurance";

type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

export type AdminInsuranceClaimRow = {
  id: string;
  amount: number;
  approvedAmount: number | null;
  status: ClaimStatus;
  description: string;
  adminNotes: string | null;
  evidence: string[];
  createdAt: string;
  resolvedAt: string | null;
  claimant: {
    id: string;
    name: string | null;
    email: string | null;
  };
  booking: {
    id: string;
    date: string;
    totalAmount: number;
    status: string;
  };
};

interface InsuranceClaimsTableProps {
  claims: AdminInsuranceClaimRow[];
}

type ResolutionDecision = "APPROVE_NO_PAYOUT" | "APPROVE_AND_PAYOUT" | "REJECT";

function getStatusStyle(status: ClaimStatus) {
  switch (status) {
    case "PAID":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "APPROVED":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "REJECTED":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-amber-100 text-amber-700 border-amber-200";
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InsuranceClaimsTable({
  claims,
}: InsuranceClaimsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedClaim, setSelectedClaim] =
    useState<AdminInsuranceClaimRow | null>(null);
  const [decision, setDecision] =
    useState<ResolutionDecision>("APPROVE_AND_PAYOUT");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const openClaim = (claim: AdminInsuranceClaimRow) => {
    setSelectedClaim(claim);
    setDecision("APPROVE_AND_PAYOUT");
    setPayoutAmount(String(Number(claim.amount || 0)));
    setAdminNotes(claim.adminNotes || "");
  };

  const handleResolve = () => {
    if (!selectedClaim) return;

    const numericPayout = Number(payoutAmount || 0);

    if (decision === "APPROVE_AND_PAYOUT") {
      if (!Number.isFinite(numericPayout) || numericPayout <= 0) {
        toast.error("Enter a payout amount greater than zero.");
        return;
      }
    }

    startTransition(async () => {
      const status =
        decision === "REJECT"
          ? "REJECTED"
          : decision === "APPROVE_NO_PAYOUT"
            ? "APPROVED"
            : "PAID";

      const result = await resolveInsuranceClaim({
        claimId: selectedClaim.id,
        status,
        payoutAmount:
          decision === "APPROVE_AND_PAYOUT" ? numericPayout : undefined,
        adminNotes: adminNotes.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to resolve insurance claim.");
        return;
      }

      toast.success("Insurance claim updated successfully.");
      setSelectedClaim(null);
      router.refresh();
    });
  };

  if (claims.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-lg font-semibold text-slate-900">
          No claims found
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Insurance claims will appear here once users submit them.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Claim
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Claimant
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Booking
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {claims.map((claim) => (
              <tr key={claim.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 align-top">
                  <p className="font-mono text-xs text-slate-500">
                    #{claim.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Submitted {formatDate(claim.createdAt)}
                  </p>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="text-sm font-semibold text-slate-900">
                    {claim.claimant.name || "Unknown user"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {claim.claimant.email || "-"}
                  </p>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="text-sm font-medium text-slate-900">
                    #{claim.booking.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(claim.booking.date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    Status: {claim.booking.status}
                  </p>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="text-sm font-bold text-emerald-700">
                    KES {Number(claim.amount || 0).toLocaleString()}
                  </p>
                  {claim.approvedAmount ? (
                    <p className="text-xs text-slate-500">
                      Approved: KES{" "}
                      {Number(claim.approvedAmount).toLocaleString()}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(claim.status)}`}
                  >
                    {claim.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <button
                    type="button"
                    onClick={() => openClaim(claim)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {claim.status === "PENDING" ? "Review" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedClaim && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedClaim(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <p className="text-xs font-mono text-slate-500">
                Claim #{selectedClaim.id.slice(-8).toUpperCase()}
              </p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">
                Insurance Claim Review
              </h3>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-900">Claim details</p>
                <p className="mt-1 text-slate-700">
                  {selectedClaim.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Claim amount</p>
                  <p className="font-bold text-emerald-700">
                    KES {Number(selectedClaim.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Booking amount</p>
                  <p className="font-semibold text-slate-900">
                    KES{" "}
                    {Number(
                      selectedClaim.booking.totalAmount || 0,
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Current status</p>
                  <span
                    className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusStyle(selectedClaim.status)}`}
                  >
                    {selectedClaim.status}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Evidence files
                </p>
                {selectedClaim.evidence.length > 0 ? (
                  <ul className="space-y-1.5">
                    {selectedClaim.evidence.map((url, index) => (
                      <li key={`${url}-${index}`}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          Evidence {index + 1}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    No evidence attached.
                  </p>
                )}
              </div>

              {selectedClaim.status === "PENDING" ? (
                <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Resolution decision
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDecision("APPROVE_AND_PAYOUT")}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                        decision === "APPROVE_AND_PAYOUT"
                          ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      Approve & Pay Out
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision("APPROVE_NO_PAYOUT")}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                        decision === "APPROVE_NO_PAYOUT"
                          ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      Approve (No Payout)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision("REJECT")}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                        decision === "REJECT"
                          ? "border-red-500 bg-red-100 text-red-800"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      Reject Claim
                    </button>
                  </div>

                  {decision === "APPROVE_AND_PAYOUT" && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Payout amount (KES)
                      </label>
                      <div className="relative">
                        <Wallet className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={payoutAmount}
                          onChange={(event) =>
                            setPayoutAmount(event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-8 py-2 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Admin notes
                    </label>
                    <textarea
                      rows={3}
                      value={adminNotes}
                      onChange={(event) => setAdminNotes(event.target.value)}
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Optional notes for the claimant"
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-2 xs:flex-row xs:justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedClaim(null)}
                      disabled={isPending}
                      className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleResolve}
                      disabled={isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Apply Decision"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p>
                    This claim has already been resolved.
                    {selectedClaim.resolvedAt
                      ? ` Resolved on ${formatDate(selectedClaim.resolvedAt)}.`
                      : ""}
                  </p>
                  {selectedClaim.adminNotes ? (
                    <p className="mt-2">
                      Admin notes: {selectedClaim.adminNotes}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
