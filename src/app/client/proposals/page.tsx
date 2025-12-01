"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  MapPin,
  Star,
  CheckCircle,
  XCircle,
  MessageCircle,
  Briefcase,
  Calendar,
  DollarSign,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import {
  getClientProposals,
  acceptProposal,
  rejectProposal,
} from "@/app/actions/proposals";
import Image from "next/image";

type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED";

interface Proposal {
  id: string;
  jobId: string;
  providerId: string;
  coverLetter: string;
  price: number;
  status: ProposalStatus;
  estimatedDays: number | null;
  attachments: string[];
  createdAt: Date;
  provider: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    avgRating: number;
    reviewCount: number;
    profile: {
      bio: string | null;
      location: string | null;
      hourlyRate: number | null;
      skills: string[];
      isVerified: boolean;
    } | null;
  };
  job: {
    id: string;
    title: string;
    description: string;
    budget: number | null;
    status: string;
    category: {
      name: string;
    };
  };
}

export default function ClientProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ProposalStatus | "ALL">(
    "ALL"
  );
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    loadProposals();
  }, [selectedJob]);

  const loadProposals = async () => {
    setIsLoading(true);
    try {
      const data = await getClientProposals(selectedJob || undefined);
      setProposals(data as any);
    } catch (error) {
      console.error("Error loading proposals:", error);
      toast.error("Failed to load proposals");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (proposalId: string) => {
    try {
      await acceptProposal(proposalId);
      toast.success("Proposal accepted! The provider has been notified.");
      loadProposals();
    } catch (error: any) {
      toast.error(error.message || "Failed to accept proposal");
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      await rejectProposal(proposalId);
      toast.success("Proposal rejected");
      loadProposals();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject proposal");
    }
  };

  const filteredProposals =
    filterStatus === "ALL"
      ? proposals
      : proposals.filter((p) => p.status === filterStatus);

  const getStatusColor = (status: ProposalStatus) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  const getStatusIcon = (status: ProposalStatus) => {
    switch (status) {
      case "ACCEPTED":
        return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
      case "REJECTED":
        return <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
      default:
        return <Clock className="w-3 h-3 sm:w-4 sm:h-4" />;
    }
  };

  // Get unique jobs for filter
  const uniqueJobs = Array.from(new Set(proposals.map((p) => p.job.id)))
    .map((jobId) => proposals.find((p) => p.job.id === jobId)?.job)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 lg:mb-8"
        >
          <h1 className="text-xl xs:text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 bg-gradient-to-r from-gray-900 to-emerald-700 bg-clip-text text-transparent">
            Job Proposals
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Review and manage proposals from service providers
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 sm:mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Job Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Filter by Job
              </label>
              <select
                value={selectedJob || ""}
                onChange={(e) => setSelectedJob(e.target.value || null)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500/10 transition-all bg-white"
              >
                <option value="">All Jobs</option>
                {uniqueJobs.map((job) => (
                  <option key={job!.id} value={job!.id}>
                    {isMobile && job!.title.length > 30
                      ? job!.title.substring(0, 30) + "..."
                      : job!.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter - Mobile: Scrollable, Desktop: Grid */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Filter by Status
              </label>
              <div
                className={`flex ${
                  isMobile ? "overflow-x-auto pb-2" : "flex-wrap"
                } gap-1.5 sm:gap-2`}
              >
                {["ALL", "PENDING", "ACCEPTED", "REJECTED"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status as any)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg sm:rounded-xl font-medium transition-all whitespace-nowrap ${
                      filterStatus === status
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6 lg:mb-8"
        >
          {[
            {
              label: "Total",
              count: proposals.length,
              color: "from-blue-500 to-blue-600",
              icon: <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
            },
            {
              label: "Pending",
              count: proposals.filter((p) => p.status === "PENDING").length,
              color: "from-amber-500 to-amber-600",
              icon: <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
            },
            {
              label: "Accepted",
              count: proposals.filter((p) => p.status === "ACCEPTED").length,
              color: "from-emerald-500 to-emerald-600",
              icon: (
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              ),
            },
            {
              label: "Rejected",
              count: proposals.filter((p) => p.status === "REJECTED").length,
              color: "from-red-500 to-red-600",
              icon: <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
            },
          ].map((stat, idx) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-100 shadow-xs hover:shadow-sm transition-shadow"
            >
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-1.5 sm:mb-2 lg:mb-3`}
              >
                {stat.icon}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">
                {stat.label} Proposals
              </p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {stat.count}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Proposals List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12 sm:py-16 lg:py-20">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 border-3 sm:border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredProposals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 sm:py-16 lg:py-20"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-1.5 sm:mb-2">
              No proposals found
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto">
              There are no proposals matching your filters.
              {isMobile && (
                <span className="block mt-1">Try changing your filters.</span>
              )}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <AnimatePresence>
              {filteredProposals.map((proposal, idx) => (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xs hover:shadow-sm sm:hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-200"
                >
                  <div className="p-4 sm:p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4 flex-1">
                        {/* Provider Avatar */}
                        <div className="relative">
                          <div
                            className={`${
                              isMobile
                                ? "w-12 h-12"
                                : "w-14 h-14 sm:w-16 sm:h-16"
                            } rounded-full overflow-hidden bg-gray-100 ring-2 sm:ring-4 ring-white shadow-sm`}
                          >
                            {proposal.provider.image ? (
                              <Image
                                src={proposal.provider.image}
                                alt={proposal.provider.name || "Provider"}
                                width={isMobile ? 48 : 64}
                                height={isMobile ? 48 : 64}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-base sm:text-lg font-bold">
                                {proposal.provider.name?.[0] || "P"}
                              </div>
                            )}
                          </div>
                          {proposal.provider.profile?.isVerified && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-500 rounded-full flex items-center justify-center ring-1 sm:ring-2 ring-white">
                              <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Provider Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 truncate">
                              {proposal.provider.name || "Unknown Provider"}
                            </h3>
                            {proposal.provider.reviewCount > 0 && (
                              <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-amber-50 rounded-md sm:rounded-lg">
                                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500 fill-amber-500" />
                                <span className="text-xs sm:text-sm font-bold text-amber-700">
                                  {proposal.provider.avgRating}
                                </span>
                                <span className="text-[10px] sm:text-xs text-amber-600">
                                  ({proposal.provider.reviewCount})
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Job Title */}
                          <p className="text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2 truncate">
                            For:{" "}
                            <span className="font-semibold text-gray-900">
                              {proposal.job.title}
                            </span>
                            {!isMobile && (
                              <>
                                <span className="mx-1.5">•</span>
                                <span className="text-emerald-600">
                                  {proposal.job.category.name}
                                </span>
                              </>
                            )}
                          </p>

                          {/* Mobile Category Badge */}
                          {isMobile && (
                            <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-full mb-2">
                              {proposal.job.category.name}
                            </span>
                          )}

                          {/* Meta Info */}
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 lg:gap-3 text-xs sm:text-sm text-gray-600">
                            {proposal.provider.profile?.location && (
                              <div className="flex items-center gap-0.5 sm:gap-1">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="truncate max-w-[80px] sm:max-w-none">
                                  {proposal.provider.profile.location}
                                </span>
                              </div>
                            )}
                            {proposal.estimatedDays && (
                              <div className="flex items-center gap-0.5 sm:gap-1">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>{proposal.estimatedDays} days</span>
                              </div>
                            )}
                            <div className="flex items-center gap-0.5 sm:gap-1">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>
                                {new Date(
                                  proposal.createdAt
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  ...(isMobile ? {} : { year: "numeric" }),
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div
                        className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium ${getStatusColor(
                          proposal.status
                        )}`}
                      >
                        {getStatusIcon(proposal.status)}
                        <span
                          className={`${isMobile ? "hidden sm:inline" : ""}`}
                        >
                          {proposal.status}
                        </span>
                      </div>
                    </div>

                    {/* Cover Letter Preview */}
                    <div className="mb-3 sm:mb-4">
                      <button
                        onClick={() =>
                          setExpandedProposal(
                            expandedProposal === proposal.id
                              ? null
                              : proposal.id
                          )
                        }
                        className="text-xs sm:text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                      >
                        {expandedProposal === proposal.id ? (
                          <>
                            <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" />
                            Hide Cover Letter
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                            Show Cover Letter
                          </>
                        )}
                      </button>
                      <AnimatePresence>
                        {expandedProposal === proposal.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-2 p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200"
                          >
                            <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap max-h-32 sm:max-h-48 overflow-y-auto pr-2">
                              {proposal.coverLetter}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Price and Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 sm:pt-4 border-t border-gray-100 gap-3">
                      <div className="flex items-baseline gap-1.5">
                        <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                        <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                          KES {Number(proposal.price).toLocaleString()}
                        </span>
                        {proposal.job.budget && !isMobile && (
                          <span className="text-xs sm:text-sm text-gray-500">
                            (Budget: KES{" "}
                            {Number(proposal.job.budget).toLocaleString()})
                          </span>
                        )}
                      </div>

                      {/* Mobile Budget Info */}
                      {isMobile && proposal.job.budget && (
                        <div className="text-xs text-gray-500">
                          Job budget: KES{" "}
                          {Number(proposal.job.budget).toLocaleString()}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {proposal.status === "PENDING" && (
                        <div
                          className={`flex gap-1.5 sm:gap-2 ${
                            isMobile ? "flex-col" : ""
                          }`}
                        >
                          <button
                            onClick={() => handleReject(proposal.id)}
                            className={`${
                              isMobile ? "w-full" : ""
                            } px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-xs sm:text-sm`}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleAccept(proposal.id)}
                            className={`${
                              isMobile ? "w-full" : ""
                            } px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg sm:rounded-xl hover:shadow-md hover:shadow-emerald-500/30 transition-all font-medium text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2`}
                          >
                            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Accept Proposal
                          </button>
                        </div>
                      )}

                      {proposal.status === "ACCEPTED" && (
                        <div
                          className={`flex gap-1.5 sm:gap-2 ${
                            isMobile ? "flex-col" : ""
                          }`}
                        >
                          <button
                            className={`${
                              isMobile ? "w-full" : ""
                            } px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-50 text-emerald-700 rounded-lg sm:rounded-xl hover:bg-emerald-100 transition-all font-medium text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2`}
                          >
                            <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            Contact Provider
                          </button>
                          {isMobile && (
                            <div className="grid grid-cols-2 gap-1.5">
                              <button className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all font-medium text-xs flex items-center justify-center gap-1">
                                <Phone className="w-3 h-3" />
                                Call
                              </button>
                              <button className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium text-xs flex items-center justify-center gap-1">
                                <Mail className="w-3 h-3" />
                                Email
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Mobile Quick Contact */}
                    {proposal.status === "ACCEPTED" && !isMobile && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                        <button className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all font-medium text-xs flex items-center justify-center gap-1">
                          <Phone className="w-3 h-3" />
                          Call Provider
                        </button>
                        <button className="flex-1 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium text-xs flex items-center justify-center gap-1">
                          <Mail className="w-3 h-3" />
                          Send Email
                        </button>
                        <button className="flex-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-all font-medium text-xs flex items-center justify-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          Message
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
