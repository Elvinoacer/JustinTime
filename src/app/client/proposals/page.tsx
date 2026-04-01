"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
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
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  getClientProposals,
  acceptProposal,
  rejectProposal,
} from "@/app/actions/proposals";
import { useJobsEvents } from "@/hooks/useJobsEvents";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  parseFulfillmentPreference,
  stripFulfillmentMetadata,
} from "@/lib/proposals/fulfillmentMode";

const proposalStatusOptions = [
  "ALL",
  "PENDING",
  "ACCEPTED",
  "REJECTED",
] as const;
type ProposalStatusFilter = (typeof proposalStatusOptions)[number];

type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED";
type ProposalSortOption =
  | "HIGHEST_MATCH"
  | "LOWEST_PRICE"
  | "FASTEST_ETA"
  | "NEWEST";
type RecommendationLabel =
  | "BEST_VALUE"
  | "FASTEST_DELIVERY"
  | "MOST_RELIABLE"
  | "LOWEST_COST";

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
  clientFitHints?: string[];
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
    metrics?: {
      responseTimeHours?: number | null;
      responseRatePct?: number | null;
      completionRatePct?: number | null;
      completedJobsCount?: number;
      successfulJobsCount?: number;
      repeatClientsCount?: number;
      completionConfidenceBand?: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    };
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
  const visibleAttachments = getVisibleAttachments(proposal.attachments);
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
      Math.min((visibleAttachments.length || 0) * 10, 25) +
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

function getRecommendationLabelText(label: RecommendationLabel) {
  switch (label) {
    case "BEST_VALUE":
      return "Best Value";
    case "FASTEST_DELIVERY":
      return "Fastest Delivery";
    case "MOST_RELIABLE":
      return "Most Reliable";
    case "LOWEST_COST":
      return "Lowest Cost";
    default:
      return "Recommended";
  }
}

function getRecommendationVisual(label: RecommendationLabel) {
  switch (label) {
    case "BEST_VALUE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "FASTEST_DELIVERY":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "MOST_RELIABLE":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "LOWEST_COST":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function getTrustMetricText(
  value: number | null | undefined,
  formatter: (input: number) => string,
  noDataText: string,
) {
  if (typeof value !== "number") {
    return noDataText;
  }
  return formatter(value);
}

function getVisibleAttachments(attachments: string[] | null | undefined) {
  return stripFulfillmentMetadata(attachments || []);
}

function parseConfidenceThreshold(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, parsed));
}

const confidenceHighThreshold = parseConfidenceThreshold(
  process.env.NEXT_PUBLIC_RECOMMENDATION_CONFIDENCE_HIGH,
  80,
);
const confidenceMediumThresholdBase = parseConfidenceThreshold(
  process.env.NEXT_PUBLIC_RECOMMENDATION_CONFIDENCE_MEDIUM,
  60,
);
const confidenceMediumThreshold = Math.min(
  confidenceHighThreshold,
  confidenceMediumThresholdBase,
);

function getConfidenceVisual(score: number) {
  if (score >= confidenceHighThreshold) {
    return {
      track: "bg-emerald-100",
      fill: "bg-emerald-500",
      text: "text-emerald-700",
      label: "High confidence",
    };
  }
  if (score >= confidenceMediumThreshold) {
    return {
      track: "bg-amber-100",
      fill: "bg-amber-500",
      text: "text-amber-700",
      label: "Medium confidence",
    };
  }

  return {
    track: "bg-red-100",
    fill: "bg-red-500",
    text: "text-red-700",
    label: "Low confidence",
  };
}

function buildRiskSignals(
  proposal: Proposal,
  score: ReturnType<typeof evaluateProposal>,
) {
  const signals: string[] = [];
  const budget = proposal.job.budget ? Number(proposal.job.budget) : null;

  if (proposal.provider.reviewCount === 0) {
    signals.push("New provider - limited history");
  }

  if (!proposal.estimatedDays) {
    signals.push("No ETA provided yet");
  }

  if (budget && budget > 0 && Number(proposal.price) > budget * 1.25) {
    signals.push("Quote is significantly above budget");
  }

  if (score.completeness < 45) {
    signals.push("Proposal details are brief");
  }

  const responseTimeHours = proposal.provider.metrics?.responseTimeHours;
  if (typeof responseTimeHours === "number" && responseTimeHours > 48) {
    signals.push(`Slow response time (~${responseTimeHours}h after posting)`);
  }

  const completionRatePct = proposal.provider.metrics?.completionRatePct;
  const completedJobsCount = proposal.provider.metrics?.completedJobsCount ?? 0;
  if (
    proposal.provider.metrics?.completionConfidenceBand === "HIGH" &&
    typeof completionRatePct === "number" &&
    completedJobsCount >= 5
  ) {
    signals.push(
      `High completion confidence (${completionRatePct}% across ${completedJobsCount} completed jobs)`,
    );
  }

  return signals;
}

function getRecommendationReason(
  label: RecommendationLabel,
  proposal: Proposal,
  score: ReturnType<typeof evaluateProposal>,
) {
  switch (label) {
    case "LOWEST_COST":
      return `Lowest quote at KES ${Number(proposal.price).toLocaleString()}.`;
    case "FASTEST_DELIVERY":
      return proposal.estimatedDays
        ? `Fastest ETA at ${proposal.estimatedDays} days.`
        : "Fastest shortlist option based on overall profile strength.";
    case "MOST_RELIABLE":
      return `Strong reliability profile (${proposal.provider.avgRating} stars, ${proposal.provider.reviewCount} reviews).`;
    case "BEST_VALUE":
    default:
      return `Best overall balance of fit (${score.fit}), budget (${score.budgetMatch}), and completeness (${score.completeness}).`;
  }
}

function pickRecommendationLabel(
  proposal: Proposal,
  score: ReturnType<typeof evaluateProposal>,
  group: Array<{
    proposal: Proposal;
    score: ReturnType<typeof evaluateProposal>;
  }>,
): RecommendationLabel {
  const cheapest = group.reduce((min, item) =>
    Number(item.proposal.price) < Number(min.proposal.price) ? item : min,
  );
  const fastest = group.reduce((min, item) => {
    const currentEta = item.proposal.estimatedDays ?? Number.POSITIVE_INFINITY;
    const minEta = min.proposal.estimatedDays ?? Number.POSITIVE_INFINITY;
    return currentEta < minEta ? item : min;
  });
  const reliable = group.reduce((max, item) => {
    const current =
      item.proposal.provider.avgRating * 10 +
      item.proposal.provider.reviewCount;
    const best =
      max.proposal.provider.avgRating * 10 + max.proposal.provider.reviewCount;
    return current > best ? item : max;
  });

  if (proposal.id === cheapest.proposal.id) {
    return "LOWEST_COST";
  }
  if (proposal.id === fastest.proposal.id && proposal.estimatedDays !== null) {
    return "FASTEST_DELIVERY";
  }
  if (
    proposal.id === reliable.proposal.id &&
    proposal.provider.reviewCount > 0
  ) {
    return "MOST_RELIABLE";
  }

  return score.overall >= 70 ? "BEST_VALUE" : "MOST_RELIABLE";
}

export default function ClientProposalsPage() {
  const { trackEvent } = useJobsEvents();
  const recommendationsEnabled =
    (
      process.env.NEXT_PUBLIC_FF_CLIENT_PROPOSAL_RECOMMENDATIONS || ""
    ).toLowerCase() === "true";
  const recommendationsVariant = recommendationsEnabled
    ? "client-recommendations"
    : "baseline";
  const trackedRecommendationImpressionsRef = useRef<Set<string>>(new Set());
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ProposalStatusFilter>("ALL");
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [expandedRecommendation, setExpandedRecommendation] = useState<
    string | null
  >(null);
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

  const loadProposals = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getClientProposals(selectedJob || undefined);
      setProposals(data as Proposal[]);
    } catch (error) {
      console.error("Error loading proposals:", error);
      toast.error("Failed to load proposals");
    } finally {
      setIsLoading(false);
    }
  }, [selectedJob]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const handleAccept = async (proposalId: string) => {
    try {
      await acceptProposal(proposalId);
      const accepted = proposals.find((proposal) => proposal.id === proposalId);
      trackEvent("proposal_accepted", {
        userRole: "CLIENT",
        sourcePage: "/client/proposals",
        experimentVariant: recommendationsVariant,
        proposalId,
        jobId: accepted?.jobId,
        jobCategory: accepted?.job?.category?.name,
      });
      toast.success("Proposal accepted! The provider has been notified.");
      loadProposals();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to accept proposal";
      toast.error(message);
    }
  };

  useEffect(() => {
    if (compareIds.length > 0) {
      trackEvent("proposal_compare_opened", {
        userRole: "CLIENT",
        sourcePage: "/client/proposals",
        experimentVariant: recommendationsVariant,
      });
    }
  }, [compareIds, recommendationsVariant, trackEvent]);

  const handleReject = async (proposalId: string) => {
    try {
      await rejectProposal(proposalId);
      toast.success("Proposal rejected");
      loadProposals();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to reject proposal";
      toast.error(message);
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

  const recommendationMetaByProposalId = useMemo(() => {
    if (!recommendationsEnabled) {
      return {};
    }

    const grouped = proposals
      .filter((proposal) => proposal.status === "PENDING")
      .reduce<Record<string, Proposal[]>>((acc, proposal) => {
        if (!acc[proposal.jobId]) {
          acc[proposal.jobId] = [];
        }
        acc[proposal.jobId].push(proposal);
        return acc;
      }, {});

    const meta: Record<
      string,
      {
        isRecommended: boolean;
        recommendationLabel: RecommendationLabel;
        recommendationReason: string;
        riskSignals: string[];
        score: ReturnType<typeof evaluateProposal>;
      }
    > = {};

    Object.values(grouped).forEach((jobProposals) => {
      if (jobProposals.length === 0) {
        return;
      }

      const scored = jobProposals.map((proposal) => ({
        proposal,
        score: evaluateProposal(proposal),
      }));

      const winner = scored.reduce((best, current) => {
        if (current.score.overall > best.score.overall) return current;
        if (current.score.overall < best.score.overall) return best;
        return Number(current.proposal.price) < Number(best.proposal.price)
          ? current
          : best;
      });

      scored.forEach(({ proposal, score }) => {
        const label = pickRecommendationLabel(proposal, score, scored);
        meta[proposal.id] = {
          isRecommended: proposal.id === winner.proposal.id,
          recommendationLabel: label,
          recommendationReason: getRecommendationReason(label, proposal, score),
          riskSignals: buildRiskSignals(proposal, score),
          score,
        };
      });
    });

    return meta;
  }, [proposals, recommendationsEnabled]);

  useEffect(() => {
    if (!recommendationsEnabled) {
      return;
    }

    sortedProposals.forEach((proposal) => {
      const recommendationMeta = recommendationMetaByProposalId[proposal.id];
      if (!recommendationMeta) {
        return;
      }

      const impressionKey = `${proposal.id}:${recommendationMeta.recommendationLabel}:${recommendationMeta.isRecommended ? "recommended" : "labeled"}`;
      if (trackedRecommendationImpressionsRef.current.has(impressionKey)) {
        return;
      }

      trackedRecommendationImpressionsRef.current.add(impressionKey);
      trackEvent("proposal_recommendation_impression", {
        userRole: "CLIENT",
        sourcePage: "/client/proposals",
        experimentVariant: recommendationsVariant,
        proposalId: proposal.id,
        jobId: proposal.jobId,
        jobCategory: proposal.job.category.name,
        recommendationLabel: recommendationMeta.recommendationLabel,
        isRecommended: recommendationMeta.isRecommended,
      });
    });
  }, [
    recommendationMetaByProposalId,
    recommendationsEnabled,
    recommendationsVariant,
    sortedProposals,
    trackEvent,
  ]);

  const trackRecommendationClick = (
    proposal: Proposal,
    recommendationLabel: RecommendationLabel,
    isRecommended: boolean,
  ) => {
    if (!recommendationsEnabled) {
      return;
    }

    trackEvent("proposal_recommendation_clicked", {
      userRole: "CLIENT",
      sourcePage: "/client/proposals",
      experimentVariant: recommendationsVariant,
      proposalId: proposal.id,
      jobId: proposal.jobId,
      jobCategory: proposal.job.category.name,
      recommendationLabel,
      isRecommended,
    });
  };

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
                {proposalStatusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
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
          ].map((stat) => (
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
                  const visibleAttachments = getVisibleAttachments(
                    proposal.attachments,
                  );
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
                          <strong>{visibleAttachments.length}</strong>
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
                  const visibleAttachments = getVisibleAttachments(
                    proposal.attachments,
                  );
                  const fulfillmentPreference = parseFulfillmentPreference(
                    proposal.attachments,
                  );
                  const score = evaluateProposal(proposal);
                  const recommendationMeta =
                    recommendationMetaByProposalId[proposal.id];
                  const confidenceVisual = recommendationMeta
                    ? getConfidenceVisual(recommendationMeta.score.overall)
                    : null;
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
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-medium border-indigo-200 bg-indigo-50 text-indigo-700">
                                  {fulfillmentPreference?.mode === "TEAM"
                                    ? `Team Fulfillment${fulfillmentPreference.teamName ? `: ${fulfillmentPreference.teamName}` : ""}`
                                    : "Individual Fulfillment"}
                                </span>
                                {recommendationsEnabled &&
                                  recommendationMeta && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        trackRecommendationClick(
                                          proposal,
                                          recommendationMeta.recommendationLabel,
                                          recommendationMeta.isRecommended,
                                        )
                                      }
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-semibold ${getRecommendationVisual(
                                        recommendationMeta.recommendationLabel,
                                      )}`}
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      {getRecommendationLabelText(
                                        recommendationMeta.recommendationLabel,
                                      )}
                                    </button>
                                  )}
                                {recommendationsEnabled &&
                                  recommendationMeta?.isRecommended && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        trackRecommendationClick(
                                          proposal,
                                          recommendationMeta.recommendationLabel,
                                          recommendationMeta.isRecommended,
                                        )
                                      }
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-semibold bg-emerald-600 text-white border-emerald-600"
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      Recommended Provider
                                    </button>
                                  )}
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
                              {recommendationsEnabled && recommendationMeta && (
                                <p className="mt-2 text-[11px] sm:text-xs text-gray-600">
                                  {recommendationMeta.recommendationReason}
                                </p>
                              )}
                              {recommendationsEnabled &&
                                recommendationMeta &&
                                proposal.clientFitHints &&
                                proposal.clientFitHints.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {proposal.clientFitHints
                                      .slice(0, 2)
                                      .map((hint, hintIdx) => (
                                        <span
                                          key={`${proposal.id}-hint-${hintIdx}`}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] sm:text-xs"
                                        >
                                          <Sparkles className="w-3 h-3" />
                                          {hint}
                                        </span>
                                      ))}
                                  </div>
                                )}
                              {recommendationsEnabled &&
                                recommendationMeta &&
                                confidenceVisual && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      trackRecommendationClick(
                                        proposal,
                                        recommendationMeta.recommendationLabel,
                                        recommendationMeta.isRecommended,
                                      )
                                    }
                                    className="mt-2 w-full max-w-xs rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left"
                                  >
                                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                                      <span
                                        className={`font-medium ${confidenceVisual.text}`}
                                      >
                                        {confidenceVisual.label}
                                      </span>
                                      <span className="font-semibold text-gray-700">
                                        {recommendationMeta.score.overall}%
                                      </span>
                                    </div>
                                    <div
                                      className={`mt-1 h-1.5 w-full overflow-hidden rounded-full ${confidenceVisual.track}`}
                                    >
                                      <div
                                        className={`h-full rounded-full ${confidenceVisual.fill}`}
                                        style={{
                                          width: `${Math.max(6, Math.min(100, recommendationMeta.score.overall))}%`,
                                        }}
                                      />
                                    </div>
                                  </button>
                                )}
                              {recommendationsEnabled && recommendationMeta && (
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      trackRecommendationClick(
                                        proposal,
                                        recommendationMeta.recommendationLabel,
                                        recommendationMeta.isRecommended,
                                      );
                                      setExpandedRecommendation((prev) =>
                                        prev === proposal.id
                                          ? null
                                          : proposal.id,
                                      );
                                    }}
                                    className="text-[11px] sm:text-xs font-medium text-emerald-700 hover:text-emerald-800"
                                  >
                                    {expandedRecommendation === proposal.id
                                      ? "Hide recommendation details"
                                      : "Why this recommendation?"}
                                  </button>
                                  {expandedRecommendation === proposal.id && (
                                    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2.5 sm:p-3 space-y-2">
                                      <div className="grid grid-cols-2 gap-2 text-[11px] sm:text-xs">
                                        <div className="rounded-md bg-white border border-emerald-100 px-2 py-1.5 text-gray-700">
                                          Fit score:{" "}
                                          <strong>
                                            {recommendationMeta.score.fit}
                                          </strong>
                                        </div>
                                        <div className="rounded-md bg-white border border-emerald-100 px-2 py-1.5 text-gray-700">
                                          Budget match:{" "}
                                          <strong>
                                            {
                                              recommendationMeta.score
                                                .budgetMatch
                                            }
                                          </strong>
                                        </div>
                                        <div className="rounded-md bg-white border border-emerald-100 px-2 py-1.5 text-gray-700">
                                          Completeness:{" "}
                                          <strong>
                                            {
                                              recommendationMeta.score
                                                .completeness
                                            }
                                          </strong>
                                        </div>
                                        <div className="rounded-md bg-white border border-emerald-100 px-2 py-1.5 text-gray-700">
                                          Overall:{" "}
                                          <strong>
                                            {recommendationMeta.score.overall}
                                            /100
                                          </strong>
                                        </div>
                                      </div>
                                      <p className="text-[11px] sm:text-xs text-gray-600">
                                        Rankings use weighted fit, budget match,
                                        and proposal completeness. The
                                        recommended provider is the
                                        highest-scoring pending option for this
                                        job.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {recommendationsEnabled &&
                                recommendationMeta &&
                                recommendationMeta.riskSignals.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {recommendationMeta.riskSignals
                                      .slice(0, 3)
                                      .map((signal, signalIdx) => (
                                        <span
                                          key={`${proposal.id}-risk-${signalIdx}`}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] sm:text-xs ${
                                            signal.startsWith(
                                              "High completion confidence",
                                            )
                                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                              : "border-amber-200 bg-amber-50 text-amber-700"
                                          }`}
                                        >
                                          <AlertTriangle className="w-3 h-3" />
                                          {signal}
                                        </span>
                                      ))}
                                  </div>
                                )}
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

                                {visibleAttachments.length > 0 && (
                                  <div>
                                    <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                      Attachments ({visibleAttachments.length})
                                    </p>
                                    <div className="space-y-2">
                                      {visibleAttachments.map(
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
                                    <div className="rounded-md bg-gray-50 px-2 py-1.5">
                                      Avg response:{" "}
                                      {getTrustMetricText(
                                        proposal.provider.metrics
                                          ?.responseTimeHours,
                                        (hours) => `${hours}h`,
                                        "No response-time history yet",
                                      )}
                                    </div>
                                    <div className="rounded-md bg-gray-50 px-2 py-1.5">
                                      Response rate:{" "}
                                      {getTrustMetricText(
                                        proposal.provider.metrics
                                          ?.responseRatePct,
                                        (percent) => `${percent}%`,
                                        "No response-rate history yet",
                                      )}
                                    </div>
                                    <div className="rounded-md bg-gray-50 px-2 py-1.5">
                                      Completion rate:{" "}
                                      {getTrustMetricText(
                                        proposal.provider.metrics
                                          ?.completionRatePct,
                                        (percent) => `${percent}%`,
                                        "No completion history yet",
                                      )}
                                    </div>
                                    <div className="rounded-md bg-gray-50 px-2 py-1.5">
                                      Successful jobs:{" "}
                                      {getTrustMetricText(
                                        proposal.provider.metrics
                                          ?.successfulJobsCount ??
                                          proposal.provider.metrics
                                            ?.completedJobsCount,
                                        (count) => String(count),
                                        "No successful-job history yet",
                                      )}
                                    </div>
                                    <div className="rounded-md bg-gray-50 px-2 py-1.5">
                                      Repeat clients:{" "}
                                      {getTrustMetricText(
                                        proposal.provider.metrics
                                          ?.repeatClientsCount,
                                        (count) => String(count),
                                        "No repeat-client history yet",
                                      )}
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
