import { getUserDetails } from "@/app/actions/admin";
import Link from "next/link";
import UserAdminActions from "@/components/admin/UserAdminActions";
import ProviderVerificationCard from "@/components/admin/ProviderVerificationCard";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  MapPin,
  FileText,
  Badge,
  Ban,
  Crown,
  Wallet,
  BarChart3,
  Settings,
  Bell,
  Star,
  MessageCircle,
  HelpCircle,
  Shield,
  Clock,
  TrendingUp,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Briefcase,
  Workflow,
  Gavel,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UserDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUserDetails(id);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm sm:shadow-lg p-4 sm:p-6">
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/users"
                className="flex items-center gap-2 p-2 sm:p-3 hover:bg-slate-100 rounded-lg text-slate-600 transition-all duration-200 group"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm font-medium hidden xs:block">
                  Back to Users
                </span>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                  User Details
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  Comprehensive user information and management
                </p>
              </div>
            </div>
            <UserAdminActions user={user} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Verification Card for Providers */}
            {user.role === "PROVIDER" && user.profile && (
              <ProviderVerificationCard user={user} />
            )}

            {/* Profile Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm sm:shadow-lg overflow-hidden">
              <div className="p-4 sm:p-6 lg:p-8">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-linear-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name || "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1 truncate">
                        {user.name || "No Name"}
                      </h2>
                      <p className="text-slate-600 flex items-center gap-2 text-sm sm:text-base">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{user.email}</span>
                      </p>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === "PROVIDER"
                              ? "bg-purple-100 text-purple-700"
                              : user.role === "ADMIN"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          <Badge className="w-3 h-3" />
                          {user.role}
                        </span>

                        {user.isBanned && (
                          <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <Ban className="w-3 h-3" />
                            Banned
                          </span>
                        )}

                        {user.deletionScheduledAt && (
                          <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                            <Clock className="w-3 h-3" />
                            Deletion Scheduled
                          </span>
                        )}

                        {user.subscription && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                              user.subscription.plan === "PRO"
                                ? "bg-indigo-100 text-indigo-700"
                                : user.subscription.plan === "BUSINESS"
                                ? "bg-pink-100 text-pink-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            <Crown className="w-3 h-3" />
                            {user.subscription.plan}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-2">
                    <div className="inline-flex flex-col gap-1 px-3 py-2 bg-slate-50 rounded-lg sm:rounded-xl">
                      <span className="text-xs text-slate-500 font-medium">
                        Member Since
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      ID: {user.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>

                {/* Profile Information */}
                {user.profile && (
                  <div className="border-t border-slate-100 pt-4 sm:pt-6">
                    <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Profile Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {/* Location */}
                      <div className="sm:col-span-2 p-3 sm:p-4 bg-slate-50 rounded-lg sm:rounded-xl">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                              Location
                            </p>
                            <p className="text-slate-900 font-medium text-sm sm:text-base">
                              {user.profile.location || "N/A"}
                            </p>
                            {user.profile.latitude &&
                              user.profile.longitude && (
                                <p className="text-xs text-slate-400 mt-1 font-mono">
                                  {user.profile.latitude.toFixed(6)},{" "}
                                  {user.profile.longitude.toFixed(6)}
                                </p>
                              )}
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <div className="sm:col-span-2 p-3 sm:p-4 bg-slate-50 rounded-lg sm:rounded-xl">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                              Bio
                            </p>
                            <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                              {user.profile.bio || "No bio provided"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {user.role === "PROVIDER" && (
                        <>
                          {/* Hourly Rate */}
                          <div className="p-3 sm:p-4 bg-emerald-50 rounded-lg sm:rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                              <p className="text-xs text-emerald-700 uppercase font-semibold">
                                Hourly Rate
                              </p>
                            </div>
                            <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                              KES {user.profile.hourlyRate || "—"}
                            </p>
                          </div>

                          {/* Verification Status */}
                          <div className="p-3 sm:p-4 bg-blue-50 rounded-lg sm:rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                              <p className="text-xs text-blue-700 uppercase font-semibold">
                                Status
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold ${
                                user.profile.verificationStatus === "VERIFIED"
                                  ? "bg-emerald-500 text-white"
                                  : user.profile.verificationStatus ===
                                    "REJECTED"
                                  ? "bg-red-500 text-white"
                                  : "bg-amber-500 text-white"
                              }`}
                            >
                              {user.profile.verificationStatus?.toLowerCase() ||
                                "pending"}
                            </span>
                          </div>

                          {/* Skills */}
                          {user.profile.skills &&
                            user.profile.skills.length > 0 && (
                              <div className="sm:col-span-2 p-3 sm:p-4 bg-purple-50 rounded-lg sm:rounded-xl">
                                <div className="flex items-center gap-2 mb-3">
                                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                                  <p className="text-xs text-purple-700 uppercase font-semibold">
                                    Skills
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {user.profile.skills.map((skill, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 sm:px-3 py-1 bg-white text-purple-700 rounded-lg text-xs font-medium shadow-sm"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Services Section */}
            {user.role === "PROVIDER" &&
              user.services &&
              user.services.length > 0 && (
                <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm sm:shadow-lg overflow-hidden">
                  <div className="bg-linear-to-r from-purple-500 to-purple-600 p-4 sm:p-6">
                    <h3 className="font-bold text-lg sm:text-xl text-white flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Services ({user.services.length})
                    </h3>
                  </div>
                  <div className="p-4 sm:p-6 space-y-3">
                    {user.services.map((service: any) => (
                      <div
                        key={service.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200 gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm sm:text-base mb-1 truncate">
                            {service.title}
                          </p>
                          <p className="text-slate-600 text-xs sm:text-sm flex items-center gap-1">
                            <Badge className="w-3 h-3" />
                            {service.category.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-purple-600">
                              KES {service.price}
                            </p>
                            <p className="text-xs text-slate-500">
                              {service._count.bookings} bookings
                            </p>
                          </div>
                          <span
                            className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-bold ${
                              service.isActive
                                ? "bg-emerald-500 text-white"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            {service.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Jobs Section */}
            {user.role === "CLIENT" && user.jobs && user.jobs.length > 0 && (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm sm:shadow-lg overflow-hidden">
                <div className="bg-linear-to-r from-blue-500 to-blue-600 p-4 sm:p-6">
                  <h3 className="font-bold text-lg sm:text-xl text-white flex items-center gap-2">
                    <Workflow className="w-5 h-5" />
                    Jobs Posted ({user.jobs.length})
                  </h3>
                </div>
                <div className="p-4 sm:p-6 space-y-3">
                  {user.jobs.map((job: any) => (
                    <div
                      key={job.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200 gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm sm:text-base mb-1 truncate">
                          {job.title}
                        </p>
                        <p className="text-slate-600 text-xs sm:text-sm flex items-center gap-1">
                          <Badge className="w-3 h-3" />
                          {job.category.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">
                            {job.budget ? `KES ${job.budget}` : "Not set"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {job._count.proposals} proposals
                          </p>
                        </div>
                        <span
                          className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-bold ${
                            job.status === "OPEN"
                              ? "bg-emerald-500 text-white"
                              : job.status === "IN_PROGRESS"
                              ? "bg-blue-500 text-white"
                              : job.status === "COMPLETED"
                              ? "bg-purple-500 text-white"
                              : "bg-red-500 text-white"
                          }`}
                        >
                          {job.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Bookings */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm sm:shadow-lg overflow-hidden">
              <div className="bg-linear-to-r from-slate-700 to-slate-800 p-4 sm:p-6">
                <h3 className="font-bold text-lg sm:text-xl text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Bookings
                </h3>
              </div>
              <div className="p-4 sm:p-6">
                {user.bookings && user.bookings.length > 0 ? (
                  <div className="space-y-3">
                    {user.bookings
                      .slice(0, 5)
                      .map((booking: any, idx: number) => (
                        <div
                          key={booking.id}
                          className="flex items-start gap-3 p-3 sm:p-4 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200"
                        >
                          <div
                            className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mt-2 ${
                              booking.status === "COMPLETED"
                                ? "bg-emerald-500"
                                : booking.status === "CONFIRMED"
                                ? "bg-blue-500"
                                : booking.status === "PENDING"
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                          />

                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm sm:text-base mb-1 truncate">
                              {booking.service?.title || "Service N/A"}
                            </p>
                            <p className="text-slate-600 text-xs sm:text-sm flex items-center gap-1 mb-2">
                              <User className="w-3 h-3" />
                              {booking.client.id === user.id
                                ? `Provider: ${booking.provider.name}`
                                : `Client: ${booking.client.name}`}
                            </p>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(booking.date)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                              KES {booking.totalAmount}
                            </p>
                            <span
                              className={`inline-block px-2 sm:px-3 py-1 rounded-lg text-xs font-bold ${
                                booking.status === "COMPLETED"
                                  ? "bg-emerald-500 text-white"
                                  : booking.status === "CONFIRMED"
                                  ? "bg-blue-500 text-white"
                                  : booking.status === "PENDING"
                                  ? "bg-amber-500 text-white"
                                  : "bg-red-500 text-white"
                              }`}
                            >
                              {booking.status.toLowerCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm sm:text-base">
                      No recent bookings found
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Support Tickets */}
            {user.supportTickets && user.supportTickets.length > 0 && (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm sm:shadow-lg overflow-hidden">
                <div className="bg-linear-to-r from-orange-500 to-orange-600 p-4 sm:p-6">
                  <h3 className="font-bold text-lg sm:text-xl text-white flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Support Tickets ({user.supportTickets.length})
                  </h3>
                </div>
                <div className="p-4 sm:p-6 space-y-3">
                  {user.supportTickets.slice(0, 5).map((ticket: any) => (
                    <div
                      key={ticket.id}
                      className="p-3 sm:p-4 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm sm:text-base mb-1 truncate">
                            {ticket.subject}
                          </p>
                          <p className="text-slate-600 text-xs sm:text-sm">
                            {ticket.category}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span
                            className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-bold ${
                              ticket.priority === "URGENT"
                                ? "bg-red-500 text-white"
                                : ticket.priority === "HIGH"
                                ? "bg-orange-500 text-white"
                                : ticket.priority === "MEDIUM"
                                ? "bg-amber-500 text-white"
                                : "bg-slate-400 text-white"
                            }`}
                          >
                            {ticket.priority}
                          </span>
                          <span
                            className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-bold ${
                              ticket.status === "RESOLVED"
                                ? "bg-emerald-500 text-white"
                                : ticket.status === "IN_PROGRESS"
                                ? "bg-blue-500 text-white"
                                : ticket.status === "CLOSED"
                                ? "bg-slate-500 text-white"
                                : "bg-amber-500 text-white"
                            }`}
                          >
                            {ticket.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(ticket.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disputes */}
            {((user.disputes && user.disputes.length > 0) ||
              (user.disputesAgainst && user.disputesAgainst.length > 0)) && (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-red-200 shadow-sm sm:shadow-lg overflow-hidden">
                <div className="bg-linear-to-r from-red-500 to-red-600 p-4 sm:p-6">
                  <h3 className="font-bold text-lg sm:text-xl text-white flex items-center gap-2">
                    <Gavel className="w-5 h-5" />
                    Disputes
                  </h3>
                </div>
                <div className="p-4 sm:p-6 space-y-3">
                  {user.disputes?.slice(0, 3).map((dispute: any) => (
                    <div
                      key={dispute.id}
                      className="p-3 sm:p-4 bg-red-50 rounded-lg sm:rounded-xl border border-red-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-red-900 text-sm sm:text-base flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            Created by this user
                          </p>
                          <p className="text-red-700 text-xs sm:text-sm mb-2">
                            Against: {dispute.defendant.name}
                          </p>
                          <p className="text-slate-700 text-xs sm:text-sm line-clamp-2">
                            {dispute.reason}
                          </p>
                        </div>
                        <span
                          className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-bold mt-2 sm:mt-0 ${
                            dispute.status === "RESOLVED"
                              ? "bg-emerald-500 text-white"
                              : dispute.status === "CLOSED"
                              ? "bg-slate-500 text-white"
                              : "bg-red-500 text-white"
                          }`}
                        >
                          {dispute.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {user.disputesAgainst?.slice(0, 3).map((dispute: any) => (
                    <div
                      key={dispute.id}
                      className="p-3 sm:p-4 bg-amber-50 rounded-lg sm:rounded-xl border border-amber-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-amber-900 text-sm sm:text-base flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            Against this user
                          </p>
                          <p className="text-amber-700 text-xs sm:text-sm mb-2">
                            By: {dispute.creator.name}
                          </p>
                          <p className="text-slate-700 text-xs sm:text-sm line-clamp-2">
                            {dispute.reason}
                          </p>
                        </div>
                        <span
                          className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-bold mt-2 sm:mt-0 ${
                            dispute.status === "RESOLVED"
                              ? "bg-emerald-500 text-white"
                              : dispute.status === "CLOSED"
                              ? "bg-slate-500 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {dispute.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Wallet Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm sm:shadow-lg overflow-hidden">
              <div className="bg-linear-to-br from-emerald-500 to-emerald-600 p-4 sm:p-6">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Wallet
                </h3>
              </div>

              <div className="p-4 sm:p-6">
                <div className="relative bg-linear-to-br from-slate-900 to-slate-800 text-white p-4 sm:p-6 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 overflow-hidden">
                  <div className="relative">
                    <p className="text-slate-400 text-xs uppercase font-semibold tracking-wider mb-2">
                      Current Balance
                    </p>
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1">
                      KES {user.wallet?.balance || "0.00"}
                    </p>
                    <Wallet className="absolute top-0 right-0 w-8 h-8 sm:w-12 sm:h-12 text-white/10" />
                  </div>
                </div>

                {user.wallet?.transactions &&
                  user.wallet.transactions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Recent Transactions
                      </h4>
                      <div className="space-y-2">
                        {user.wallet.transactions.slice(0, 3).map((tx: any) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <span
                                className={`inline-block px-2 py-1 rounded text-xs font-bold mb-1 ${
                                  tx.type === "CREDIT" || tx.type === "EARNING"
                                    ? "bg-emerald-500 text-white"
                                    : "bg-slate-600 text-white"
                                }`}
                              >
                                {tx.type}
                              </span>
                              {tx.description && (
                                <p className="text-xs text-slate-500 truncate">
                                  {tx.description}
                                </p>
                              )}
                            </div>
                            <span className="text-base sm:text-lg font-bold text-slate-900 ml-2">
                              KES {tx.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Statistics Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm sm:shadow-lg overflow-hidden">
              <div className="bg-linear-to-r from-blue-500 to-blue-600 p-4 sm:p-6">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Statistics
                </h3>
              </div>

              <div className="p-4 sm:p-6 space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Bookings
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-blue-600">
                    {user._count.bookings}
                  </span>
                </div>

                {user.role === "PROVIDER" && (
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                      Services
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-purple-600">
                      {user._count.services}
                    </span>
                  </div>
                )}

                {user.role === "CLIENT" && (
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Workflow className="w-4 h-4 text-blue-600" />
                      Jobs
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-blue-600">
                      {user._count.jobs}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Star className="w-4 h-4 text-emerald-600" />
                    Reviews Received
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-emerald-600">
                    {user._count.receivedReviews}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-amber-600" />
                    Reviews Written
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-amber-600">
                    {user._count.reviews}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-indigo-600" />
                    Messages
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-indigo-600">
                    {user._count.sentMessages + user._count.receivedMessages}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-orange-600" />
                    Tickets
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-orange-600">
                    {user._count.supportTickets}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Settings */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm sm:shadow-lg overflow-hidden">
              <div className="bg-linear-to-r from-slate-700 to-slate-800 p-4 sm:p-6">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Account
                </h3>
              </div>

              <div className="p-4 sm:p-6 space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    {user.onboardingCompleted ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600" />
                    )}
                    <p className="text-xs text-slate-500 uppercase font-semibold">
                      Onboarding
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {user.onboardingCompleted ? "Completed" : "Incomplete"}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    {user.emailVerified ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <p className="text-xs text-slate-500 uppercase font-semibold">
                      Email
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {user.emailVerified ? "Verified" : "Not Verified"}
                  </p>
                </div>

                {user.deletionScheduledAt && (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <p className="text-xs text-orange-700 uppercase font-bold">
                        Deletion Alert
                      </p>
                    </div>
                    <p className="text-sm font-bold text-orange-900 mb-2">
                      {formatDate(user.deletionScheduledAt)}
                    </p>
                    {user.deletionReason && (
                      <p className="text-xs text-orange-700 bg-white/50 p-2 rounded">
                        {user.deletionReason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notifications Summary */}
            {user.notifications && user.notifications.length > 0 && (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm sm:shadow-lg overflow-hidden">
                <div className="bg-linear-to-r from-indigo-500 to-indigo-600 p-4 sm:p-6">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications
                  </h3>
                </div>

                <div className="p-4 sm:p-6 space-y-2 max-h-64 overflow-y-auto">
                  {user.notifications.slice(0, 5).map((notif: any) => (
                    <div
                      key={notif.id}
                      className="p-3 bg-slate-50 rounded-lg hover:shadow-md transition-all duration-200"
                    >
                      <p className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(notif.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
