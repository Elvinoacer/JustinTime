"use client";

import { reviewIdentityVerificationRequest } from "@/app/actions/verification";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  FolderOpen,
  CheckCircle2,
  XCircle,
  Shield,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
} from "lucide-react";

interface IdentityVerificationRequestItem {
  id: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "EXPIRED";
  submittedAt: Date | string;
  reviewedAt: Date | string | null;
  reviewNotes: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    profile?: {
      bio: string | null;
      location: string | null;
      verificationStatus: string | null;
    } | null;
  };
}

interface VerificationsGridProps {
  requests: IdentityVerificationRequestItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  currentStatus: "PENDING" | "VERIFIED" | "REJECTED" | "ALL";
}

function getRequestStatusConfig(
  status: IdentityVerificationRequestItem["status"],
) {
  switch (status) {
    case "VERIFIED":
      return {
        label: "VERIFIED",
        badgeClass: "bg-emerald-100 text-emerald-700",
      };
    case "REJECTED":
      return {
        label: "REJECTED",
        badgeClass: "bg-red-100 text-red-700",
      };
    case "UNDER_REVIEW":
      return {
        label: "IN REVIEW",
        badgeClass: "bg-blue-100 text-blue-700",
      };
    case "EXPIRED":
      return {
        label: "EXPIRED",
        badgeClass: "bg-slate-200 text-slate-700",
      };
    default:
      return {
        label: "SUBMITTED",
        badgeClass: "bg-amber-100 text-amber-700",
      };
  }
}

function canReviewRequest(status: IdentityVerificationRequestItem["status"]) {
  return status === "SUBMITTED" || status === "UNDER_REVIEW";
}

export default function VerificationsGrid({
  requests,
  total,
  currentPage,
  totalPages,
  currentStatus,
}: VerificationsGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `?${params.toString()}`;
  };

  const handleReview = (
    requestId: string,
    decision: "VERIFIED" | "REJECTED",
  ) => {
    const action = decision === "VERIFIED" ? "approve" : "reject";
    if (!confirm(`Are you sure you want to ${action} this request?`)) {
      return;
    }

    setProcessingId(requestId);
    startTransition(async () => {
      const result = await reviewIdentityVerificationRequest({
        requestId,
        decision,
      });

      if (!result.success) {
        alert(result.error || "Failed to review verification request");
      }

      setProcessingId(null);
      router.refresh();
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center">
        <FolderOpen className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          No Verification Requests Found
        </h3>
        <p className="text-slate-500 text-sm">
          {currentStatus === "PENDING" &&
            "No pending identity verification requests at the moment."}
          {currentStatus === "VERIFIED" &&
            "No approved identity verification requests yet."}
          {currentStatus === "REJECTED" &&
            "No rejected identity verification requests."}
          {currentStatus === "ALL" && "No identity verification requests yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Requests Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {requests.map((request) => {
          const statusConfig = getRequestStatusConfig(request.status);

          return (
            <div
              key={request.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden group"
            >
              {/* Card Header */}
              <div className="bg-linear-to-r from-purple-50 to-purple-100 p-3 sm:p-4 border-b border-purple-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate">
                      {request.user.name || "No Name"}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 truncate">
                      {request.user.email || "No email"}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold shrink-0 ${statusConfig.badgeClass}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3 sm:p-4 space-y-3">
                {request.user.profile?.bio && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Bio
                    </p>
                    <p className="text-sm text-slate-700 line-clamp-2">
                      {request.user.profile.bio}
                    </p>
                  </div>
                )}

                {request.user.profile?.location && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Location
                    </p>
                    <p className="text-sm text-slate-900 font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="truncate">
                        {request.user.profile.location}
                      </span>
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Submitted: {formatDate(request.submittedAt)}
                  </p>
                  {request.reviewedAt ? (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Reviewed: {formatDate(request.reviewedAt)}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Card Actions */}
              {canReviewRequest(request.status) && (
                <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col xs:flex-row gap-2">
                  <button
                    onClick={() => handleReview(request.id, "VERIFIED")}
                    disabled={isPending && processingId === request.id}
                    className="flex-1 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isPending && processingId === request.id
                      ? "Processing..."
                      : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReview(request.id, "REJECTED")}
                    disabled={isPending && processingId === request.id}
                    className="flex-1 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    {isPending && processingId === request.id
                      ? "Processing..."
                      : "Reject"}
                  </button>
                </div>
              )}

              {request.status === "VERIFIED" && (
                <div className="p-3 bg-emerald-50 border-t border-emerald-200 text-center">
                  <p className="text-sm text-emerald-700 font-medium flex items-center justify-center gap-1">
                    <Shield className="w-4 h-4" />
                    Identity Verified
                  </p>
                </div>
              )}

              {request.status === "REJECTED" && (
                <div className="p-3 bg-red-50 border-t border-red-200 text-center">
                  <p className="text-sm text-red-700 font-medium flex items-center justify-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Verification Rejected
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Page Info */}
            <p className="text-sm text-slate-500 whitespace-nowrap">
              Page <span className="font-medium">{currentPage}</span> of{" "}
              <span className="font-medium">{totalPages}</span>
            </p>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* First Page */}
              <button
                disabled={currentPage <= 1}
                onClick={() => router.push(buildPageUrl(1))}
                className="p-1.5 sm:p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <ChevronsLeft className="w-4 h-4 text-slate-400" />
              </button>

              {/* Previous Page */}
              <button
                disabled={currentPage <= 1}
                onClick={() => router.push(buildPageUrl(currentPage - 1))}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => router.push(buildPageUrl(pageNum))}
                      className={`w-8 h-8 sm:w-10 sm:h-10 text-sm rounded-lg transition-all flex items-center justify-center ${
                        currentPage === pageNum
                          ? "bg-emerald-600 text-white font-semibold shadow-md"
                          : "border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => router.push(buildPageUrl(currentPage + 1))}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors text-sm"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page */}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => router.push(buildPageUrl(totalPages))}
                className="p-1.5 sm:p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <ChevronsRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Mobile Summary */}
          <div className="block sm:hidden mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {requests.length} of {total}
              </span>
              <span>{currentStatus.toLowerCase()} requests</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
