"use client";

import { toggleBanUser, verifyProvider } from "@/app/actions/admin";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Eye,
  CheckCircle,
  XCircle,
  Ban,
  Shield,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
} from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: Date;
  isBanned: boolean;
  profile?: {
    verificationStatus: string | null;
    isVerified: boolean;
    hasPaidOnboardingFee?: boolean;
    onboardingFeeWaived?: boolean;
  } | null;
}

interface UsersTableProps {
  users: User[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export default function UsersTable({
  users,
  total,
  currentPage,
  totalPages,
}: UsersTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleVerify = (userId: string, status: "VERIFIED" | "REJECTED") => {
    if (
      !confirm(
        `Are you sure you want to ${status.toLowerCase()} this provider?`,
      )
    )
      return;

    startTransition(async () => {
      await verifyProvider(userId, status);
      router.refresh();
    });
  };

  const handleBan = (userId: string, isBanned: boolean) => {
    if (
      !confirm(
        `Are you sure you want to ${isBanned ? "ban" : "unban"} this user?`,
      )
    )
      return;

    startTransition(async () => {
      await toggleBanUser(userId, isBanned);
      router.refresh();
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-xs sm:shadow-sm border border-slate-100 overflow-hidden">
      {/* Mobile Card View */}
      <div className="block lg:hidden divide-y divide-slate-100">
        {users.map((user) => (
          <div
            key={user.id}
            className="p-4 hover:bg-slate-50 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-linear-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {(user.name || "U")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {user.name || "No Name"}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/admin/users/${user.id}`)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div>
                <span className="text-slate-500">Role</span>
                <span
                  className={`block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.role === "PROVIDER"
                      ? "bg-purple-50 text-purple-700"
                      : user.role === "ADMIN"
                        ? "bg-slate-100 text-slate-700"
                        : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Joined</span>
                <p className="mt-0.5 text-slate-900 font-medium">
                  {formatDate(user.createdAt)}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {user.isBanned && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700">
                  <Ban className="w-3 h-3" />
                  Banned
                </span>
              )}
              {user.role === "PROVIDER" && user.profile && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    user.profile.verificationStatus === "VERIFIED"
                      ? "bg-emerald-50 text-emerald-700"
                      : user.profile.verificationStatus === "REJECTED"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  {user.profile.verificationStatus || "PENDING"}
                </span>
              )}
              {user.role === "PROVIDER" &&
                user.profile?.onboardingFeeWaived && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    <Shield className="w-3 h-3" />
                    Waived + Access
                  </span>
                )}
              {user.role === "PROVIDER" &&
                user.profile?.hasPaidOnboardingFee &&
                !user.profile?.onboardingFeeWaived && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700">
                    <Shield className="w-3 h-3" />
                    Paid Access
                  </span>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => router.push(`/admin/users/${user.id}`)}
                className="flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </button>

              <div className="flex items-center gap-1">
                {user.role === "PROVIDER" &&
                  user.profile?.verificationStatus === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleVerify(user.id, "VERIFIED")}
                        disabled={isPending}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Verify Provider"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleVerify(user.id, "REJECTED")}
                        disabled={isPending}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Reject Provider"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                {user.role !== "ADMIN" && (
                  <button
                    onClick={() => handleBan(user.id, !user.isBanned)}
                    disabled={isPending}
                    className={`p-1.5 rounded-lg transition-colors ${
                      user.isBanned
                        ? "text-emerald-600 hover:bg-emerald-50"
                        : "text-red-600 hover:bg-red-50"
                    }`}
                    title={user.isBanned ? "Unban User" : "Ban User"}
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-3">
              <User className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium text-sm">No users found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-linear-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      {(user.name || "U")[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">
                        {user.name || "No Name"}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === "PROVIDER"
                        ? "bg-purple-50 text-purple-700"
                        : user.role === "ADMIN"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {user.isBanned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 w-fit">
                        <Ban className="w-3 h-3" />
                        Banned
                      </span>
                    )}
                    {user.role === "PROVIDER" && user.profile && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit ${
                          user.profile.verificationStatus === "VERIFIED"
                            ? "bg-emerald-50 text-emerald-700"
                            : user.profile.verificationStatus === "REJECTED"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {user.profile.verificationStatus || "PENDING"}
                      </span>
                    )}
                    {user.role === "PROVIDER" &&
                      user.profile?.onboardingFeeWaived && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit bg-blue-50 text-blue-700">
                          Waived + Access
                        </span>
                      )}
                    {user.role === "PROVIDER" &&
                      user.profile?.hasPaidOnboardingFee &&
                      !user.profile?.onboardingFeeWaived && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit bg-purple-50 text-purple-700">
                          Paid Access
                        </span>
                      )}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {user.role === "PROVIDER" &&
                      user.profile?.verificationStatus === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleVerify(user.id, "VERIFIED")}
                            disabled={isPending}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Verify Provider"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleVerify(user.id, "REJECTED")}
                            disabled={isPending}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject Provider"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                    {user.role !== "ADMIN" && (
                      <button
                        onClick={() => handleBan(user.id, !user.isBanned)}
                        disabled={isPending}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.isBanned
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-red-600 hover:bg-red-50"
                        }`}
                        title={user.isBanned ? "Unban User" : "Ban User"}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-900">
                {(currentPage - 1) * 10 + 1}
              </span>{" "}
              -{" "}
              <span className="font-medium text-slate-900">
                {Math.min(currentPage * 10, total)}
              </span>{" "}
              of <span className="font-medium text-slate-900">{total}</span>{" "}
              users
            </p>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* First Page */}
              <button
                disabled={currentPage <= 1}
                onClick={() => router.push(`?page=1`)}
                className="p-1.5 sm:p-2 text-slate-400 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                title="First page"
              >
                <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Previous Page */}
              <button
                disabled={currentPage <= 1}
                onClick={() => router.push(`?page=${currentPage - 1}`)}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              {/* Page numbers */}
              <div className="flex gap-1">
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
                      onClick={() => router.push(`?page=${pageNum}`)}
                      className={`w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm rounded-lg transition-all ${
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
                onClick={() => router.push(`?page=${currentPage + 1}`)}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Last Page */}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => router.push(`?page=${totalPages}`)}
                className="p-1.5 sm:p-2 text-slate-400 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                title="Last page"
              >
                <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
