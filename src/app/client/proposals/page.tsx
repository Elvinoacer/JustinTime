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
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Paperclip,
  ExternalLink,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import {
  getClientProposals,
  acceptProposal,
  rejectProposal,
} from "@/app/actions/proposals";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED";
type ProposalSortOption =
  | "HIGHEST_MATCH"
  | "LOWEST_PRICE"
  | "FASTEST_ETA"
  | "NEWEST";

const sortHelperText: Record<ProposalSortOption, string> = {
  HIGHEST_MATCH:
    "Orders by match score, then lower price, faster ETA, and newer proposals.",
  LOWEST_PRICE:
    "Orders by lowest price, then better match score, faster ETA, and recency.",
  FASTEST_ETA:
    "Orders by shortest ETA, then better match score, lower price, and recency.",
  NEWEST:
    "Orders by most recent proposal, then better match score, lower price, and ETA.",
};

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
      certifications?: Array<{ name?: string; issuer?: string; date?: string }>;
      portfolio?: string[];
      socialLinks?: Array<{ platform?: string; url?: string }>;
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

type ScoreTier = "high" | "medium" | "low";

const tierStyles: Record<ScoreTier, string> = {
  high: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-red-100 text-red-800 border-red-200",
};

function getTier(score: number): ScoreTier {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function evaluateProposal(proposal: Proposal) {
  const budget = proposal.job.budget ? Number(proposal.job.budget) : null;
  const price = Number(proposal.price);

  const fit = Math.min(
    100,
    (proposal.provider.reviewCount > 0 ? 35 : 0) +
      proposal.provider.avgRating * 10 +
      (proposal.provider.profile?.isVerified ? 15 : 0) +
      Math.min((proposal.provider.profile?.skills?.length || 0) * 3, 20),
  );

  const budgetMatch =
    budget && budget > 0
      ? Math.max(0, 100 - (Math.abs(price - budget) / budget) * 120)
      : 60;

  const completeness = Math.min(
    100,
    Math.min((proposal.coverLetter.trim().length / 450) * 55, 55) +
      Math.min((proposal.attachments?.length || 0) * 10, 25) +
      (proposal.estimatedDays ? 10 : 0) +
      (proposal.provider.profile?.bio ? 10 : 0),
  );

  const overall = Math.round(
    fit * 0.4 + budgetMatch * 0.35 + completeness * 0.25,
  );

  return {
    fit: Math.round(fit),
    budgetMatch: Math.round(budgetMatch),
    completeness: Math.round(completeness),
    overall,
  };
}

export default function ClientProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ProposalStatus | "ALL">(
    "ALL",
  );
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [sortBy, setSortBy] = useState<ProposalSortOption>("HIGHEST_MATCH");

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

  const sortedProposals = [...filteredProposals].sort((a, b) => {
    const byNewest =
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    const byLowestPrice = Number(a.price) - Number(b.price);
    const byHighestMatch =
      evaluateProposal(b).overall - evaluateProposal(a).overall;

    const getEtaRank = (proposal: Proposal) =>
      proposal.estimatedDays === null
        ? Number.POSITIVE_INFINITY
        : proposal.estimatedDays;
    const byFastestEta = getEtaRank(a) - getEtaRank(b);

    const byStableId = a.id.localeCompare(b.id);

    switch (sortBy) {
      case "LOWEST_PRICE":
        return (
          byLowestPrice ||
          byHighestMatch ||
          byFastestEta ||
          byNewest ||
          byStableId
        );
      case "FASTEST_ETA":
        return (
          byFastestEta ||
          byHighestMatch ||
          byLowestPrice ||
          byNewest ||
          byStableId
        );
      case "NEWEST":
        return (
          byNewest ||
          byHighestMatch ||
          byLowestPrice ||
          byFastestEta ||
          byStableId
        );
      case "HIGHEST_MATCH":
      default:
        return (
          byHighestMatch ||
          byLowestPrice ||
          byFastestEta ||
          byNewest ||
          byStableId
        );
    }
  });

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

  const comparedProposals = sortedProposals.filter((p) =>
    compareIds.includes(p.id),
  );

  const toggleCompare = (proposalId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(proposalId)) {
        return prev.filter((id) => id !== proposalId);
      }

      if (prev.length >= 2) {
        toast.info("You can compare up to 2 proposals at a time");
        return prev;
      }

      return [...prev, proposalId];
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 lg:mb-8"
        >
          <h1 className="text-xl xs:text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 bg-linear-to-r from-gray-900 to-emerald-700 bg-clip-text text-transparent">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Sort Proposals
              </label>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as ProposalSortOption)
                }
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500/10 transition-all bg-white"
              >
                <option value="HIGHEST_MATCH">Highest Match</option>
                <option value="LOWEST_PRICE">Lowest Price</option>
                <option value="FASTEST_ETA">Fastest ETA</option>
                <option value="NEWEST">Newest</option>
              </select>
              <p className="mt-1.5 text-[11px] sm:text-xs text-gray-500">
                {sortHelperText[sortBy]}
              </p>
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
                className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl bg-linear-to-br ${stat.color} flex items-center justify-center mb-1.5 sm:mb-2 lg:mb-3`}
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

        {comparedProposals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 sm:p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                <p className="text-sm sm:text-base font-semibold text-emerald-900">
                  Compare Proposals ({comparedProposals.length}/2)
                </p>
              </div>
              <button
                onClick={() => setCompareIds([])}
                className="text-xs sm:text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                Clear comparison
              </button>
            </div>

            {comparedProposals.length === 2 && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                {comparedProposals.map((proposal) => {
                  const priceGap = proposal.job.budget
                    ? Number(proposal.price) - Number(proposal.job.budget)
                    : null;
                  const score = evaluateProposal(proposal);

                  return (
                    <div
                      key={proposal.id}
                      className="rounded-lg sm:rounded-xl border border-emerald-100 bg-white p-3"
                    >
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {proposal.provider.name || "Unknown Provider"}
                      </p>
                      <div className="mt-1 mb-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${tierStyles[getTier(score.overall)]}`}
                        >
                          Match score: {score.overall}/100
                        </span>
                      </div>
                      <div className="mt-1 space-y-1 text-xs sm:text-sm text-gray-600">
                        <p>
                          Price:{" "}
                          <strong>
                            KES {Number(proposal.price).toLocaleString()}
                          </strong>
                        </p>
                        <p>
                          Rating:{" "}
                          <p>
                            Fit/Budget/Complete: <strong>{score.fit}</strong> /{" "}
                            <strong>{score.budgetMatch}</strong> /{" "}
                            <strong>{score.completeness}</strong>
                          </p>
                          <strong>{proposal.provider.avgRating || 0}</strong> (
                          {proposal.provider.reviewCount} reviews)
                        </p>
                        <p>
                          ETA:{" "}
                          <strong>
                            {proposal.estimatedDays
                              ? `${proposal.estimatedDays} days`
                              : "Not specified"}
                          </strong>
                        </p>
                        <p>
                          Attachments:{" "}
                          <strong>{proposal.attachments?.length || 0}</strong>
                        </p>
                        {priceGap !== null && (
                          <p
                            className={
                              priceGap > 0
                                ? "text-amber-700"
                                : "text-emerald-700"
                            }
                          >
                            {priceGap > 0 ? "Above budget" : "Within budget"}:{" "}
                            <strong>
                              KES {Math.abs(priceGap).toLocaleString()}
                            </strong>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Proposals List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12 sm:py-16 lg:py-20">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 border-3 sm:border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          </div>
        ) : sortedProposals.length === 0 ? (
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
              {sortedProposals.map((proposal, idx) =>
                (() => {
                  const score = evaluateProposal(proposal);
                  return (
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
                                  <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-emerald-400 to-teal-500 text-white text-base sm:text-lg font-bold">
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
                                    <span className="truncate max-w-20 sm:max-w-none">
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
                                      proposal.createdAt,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      ...(isMobile ? {} : { year: "numeric" }),
                                    })}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-semibold ${tierStyles[getTier(score.overall)]}`}
                                >
                                  Score {score.overall}/100
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-medium ${tierStyles[getTier(score.fit)]}`}
                                >
                                  Fit {score.fit}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-medium ${tierStyles[getTier(score.budgetMatch)]}`}
                                >
                                  Budget Match {score.budgetMatch}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-medium ${tierStyles[getTier(score.completeness)]}`}
                                >
                                  Completeness {score.completeness}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => toggleCompare(proposal.id)}
                              className={`text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full border transition-colors ${
                                compareIds.includes(proposal.id)
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700"
                              }`}
                            >
                              {compareIds.includes(proposal.id)
                                ? "Comparing"
                                : "Compare"}
                            </button>

                            <div
                              className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium ${getStatusColor(
                                proposal.status,
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
                        </div>

                        {/* Cover Letter Preview */}
                        <div className="mb-3 sm:mb-4">
                          <button
                            onClick={() =>
                              setExpandedProposal(
                                expandedProposal === proposal.id
                                  ? null
                                  : proposal.id,
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
                                className="mt-2 p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200 space-y-4"
                              >
                                <div>
                                  <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    Formatted cover letter
                                  </p>
                                  <div className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-a:text-emerald-700 max-h-56 overflow-y-auto pr-2">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {proposal.coverLetter}
                                    </ReactMarkdown>
                                  </div>
                                </div>

                                {proposal.attachments?.length > 0 && (
                                  <div>
                                    <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                      Attachments ({proposal.attachments.length}
                                      )
                                    </p>
                                    <div className="space-y-2">
                                      {proposal.attachments.map(
                                        (url, attachmentIdx) => (
                                          <a
                                            key={`${proposal.id}-att-${attachmentIdx}`}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm text-gray-700 hover:border-emerald-200 hover:bg-emerald-50"
                                          >
                                            <span className="flex items-center gap-2 min-w-0">
                                              <Paperclip className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                              <span className="truncate">
                                                {url.split("/").pop()}
                                              </span>
                                            </span>
                                            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                          </a>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}

                                <div className="rounded-lg border border-gray-200 bg-white p-3">
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      Provider profile snapshot
                                    </p>
                                    <Link
                                      href={`/professionals/${proposal.provider.id}`}
                                      className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                                    >
                                      View full profile
                                    </Link>
                                  </div>

                                  {proposal.provider.profile?.bio && (
                                    <p className="text-xs sm:text-sm text-gray-700 line-clamp-3 mb-2">
                                      {proposal.provider.profile.bio}
                                    </p>
                                  )}

                                  {proposal.provider.profile?.skills?.length >
                                    0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {proposal.provider.profile.skills
                                        .slice(0, 6)
                                        .map((skill, skillIdx) => (
                                          <span
                                            key={`${proposal.id}-skill-${skillIdx}`}
                                            className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-medium"
                                          >
                                            {skill}
                                          </span>
                                        ))}
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] sm:text-xs text-gray-600">
                                    <div className="rounded-md bg-gray-50 px-2 py-1.5">
                                      Certifications:{" "}
                                      {Array.isArray(
                                        proposal.provider.profile
                                          ?.certifications,
                                      )
                                        ? proposal.provider.profile
                                            ?.certifications.length
                                        : 0}
                                    </div>
                                    <div className="rounded-md bg-gray-50 px-2 py-1.5">
                                      Portfolio items:{" "}
                                      {proposal.provider.profile?.portfolio
                                        ?.length || 0}
                                    </div>
                                    <div className="rounded-md bg-gray-50 px-2 py-1.5">
                                      Links:{" "}
                                      {Array.isArray(
                                        proposal.provider.profile?.socialLinks,
                                      )
                                        ? proposal.provider.profile?.socialLinks
                                            .length
                                        : 0}
                                    </div>
                                  </div>
                                </div>
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
                                } px-3 sm:px-4 py-1.5 sm:py-2 bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-lg sm:rounded-xl hover:shadow-md hover:shadow-emerald-500/30 transition-all font-medium text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2`}
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
                  );
                })(),
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
