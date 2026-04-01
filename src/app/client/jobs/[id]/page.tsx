"use client";
import apiClient from "@/lib/api/client";
import { useJobsEvents } from "@/hooks/useJobsEvents";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import PaymentTimelineCard from "@/components/jobs/PaymentTimelineCard";
import { parseFulfillmentPreference } from "@/lib/proposals/fulfillmentMode";

interface Proposal {
  id: string;
  bookingId?: string | null;
  attachments?: string[];
  providerId: string;
  price: number;
  coverLetter: string;
  status: string;
  estimatedDays?: number | null;
  createdAt: string;
  clientFitHints?: string[];
  provider: {
    id: string;
    name: string;
    image: string | null;
    avgRating?: number;
    reviewCount?: number;
    isVerified?: boolean;
    skills?: string[];
    certifications?: unknown[];
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
}

type RecommendationLabel =
  | "BEST_VALUE"
  | "FASTEST_DELIVERY"
  | "MOST_RELIABLE"
  | "LOWEST_COST";

function evaluateProposal(proposal: Proposal, budget: number | null) {
  const price = Number(proposal.price);

  const fit = Math.min(
    100,
    (proposal.provider.reviewCount && proposal.provider.reviewCount > 0
      ? 35
      : 0) +
      (proposal.provider.avgRating || 0) * 10 +
      (proposal.provider.isVerified ? 15 : 0) +
      Math.min((proposal.provider.skills?.length || 0) * 3, 20),
  );

  const budgetMatch =
    budget && budget > 0
      ? Math.max(0, 100 - (Math.abs(price - budget) / budget) * 120)
      : 60;

  const completeness = Math.min(
    100,
    Math.min((proposal.coverLetter.trim().length / 450) * 70, 70) +
      (proposal.estimatedDays ? 15 : 0) +
      (proposal.provider.skills?.length ? 15 : 0),
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

function recommendationLabelText(label: RecommendationLabel) {
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

interface Job {
  id: string;
  title: string;
  description: string;
  budget: number;
  location: string;
  status: string;
  createdAt: string;
  images?: string[];
  category: {
    name: string;
  };
  _count: {
    proposals: number;
  };
}

interface BookingTimelineResponse {
  bookingStatus?: string;
  totalAmount?: number;
  payment?: {
    status?: string;
  } | null;
  escrow?: {
    milestones?: Array<{ id: string; status: string; amount?: number }>;
  } | null;
}

const statusColors: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

function buildMessagesHref(
  partnerId: string,
  partnerName?: string,
  partnerImage?: string | null,
) {
  const params = new URLSearchParams({ partnerId });
  if (partnerName) params.set("partnerName", partnerName);
  if (partnerImage) params.set("partnerImage", partnerImage);
  return `/client/messages?${params.toString()}`;
}

export default function JobDetailsPage() {
  const { trackEvent } = useJobsEvents();
  const recommendationsEnabled =
    (
      process.env.NEXT_PUBLIC_FF_CLIENT_PROPOSAL_RECOMMENDATIONS || ""
    ).toLowerCase() === "true";
  const recommendationsVariant = recommendationsEnabled
    ? "client-recommendations"
    : "baseline";
  const trackedRecommendationImpressionsRef = useRef<Set<string>>(new Set());
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = params.id as string;
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [expandedRecommendation, setExpandedRecommendation] = useState<
    string | null
  >(null);
  const [bookingTimelineById, setBookingTimelineById] = useState<
    Record<string, BookingTimelineResponse>
  >({});

  const {
    data: job,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const response = await apiClient.get(`/jobs/${jobId}`);
      return response.data as Job;
    },
  });

  const { data: proposalsData } = useQuery({
    queryKey: ["job", jobId, "proposals"],
    queryFn: async () => {
      const response = await apiClient.get(`/jobs/${jobId}/proposals`);
      return response.data as Proposal[];
    },
    enabled: !!job,
  });

  // Accept proposal mutation
  const acceptProposalMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      await apiClient.patch(`/jobs/${jobId}/proposals/${proposalId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job", jobId, "proposals"] });
      showToastMessage("Proposal accepted successfully!");
    },
    onError: () => {
      showToastMessage("Failed to accept proposal. Please try again.");
    },
  });

  // Close job mutation
  const closeJobMutation = useMutation({
    mutationFn: async () => {
      await apiClient.put(`/jobs/${jobId}`, { status: "CANCELLED" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      showToastMessage("Job closed successfully!");
    },
    onError: () => {
      showToastMessage("Failed to close job. Please try again.");
    },
  });

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleShareJob = () => {
    const jobUrl = `${window.location.origin}/client/jobs/${jobId}`;
    navigator.clipboard.writeText(jobUrl);
    showToastMessage("Job link copied to clipboard!");
  };

  const handleEditJob = () => {
    router.push(`/client/post-job?edit=${jobId}`);
  };

  const handleMessage = (
    providerId: string,
    providerName?: string,
    providerImage?: string | null,
  ) => {
    router.push(buildMessagesHref(providerId, providerName, providerImage));
  };

  const handleDispute = async (bookingId?: string | null) => {
    if (!bookingId) {
      showToastMessage("No booking found for this proposal yet.");
      return;
    }

    const reason = window.prompt(
      "Please describe the issue in at least 20 characters:",
    );

    if (!reason) {
      return;
    }

    if (reason.trim().length < 20) {
      showToastMessage("Dispute reason must be at least 20 characters.");
      return;
    }

    try {
      await apiClient.post(`/bookings/${bookingId}/dispute`, {
        reason: reason.trim(),
      });
      showToastMessage("Dispute submitted. Our team will review it shortly.");
      queryClient.invalidateQueries({ queryKey: ["job", jobId, "proposals"] });
    } catch {
      showToastMessage("Failed to submit dispute. Please try again.");
    }
  };

  const proposals = useMemo(() => proposalsData ?? [], [proposalsData]);

  useEffect(() => {
    const acceptedBookingIds = Array.from(
      new Set(
        proposals
          .filter(
            (proposal) =>
              proposal.status === "ACCEPTED" && Boolean(proposal.bookingId),
          )
          .map((proposal) => proposal.bookingId as string),
      ),
    );

    if (acceptedBookingIds.length === 0) {
      return;
    }

    const missingBookingIds = acceptedBookingIds.filter(
      (bookingId) => !bookingTimelineById[bookingId],
    );

    if (missingBookingIds.length === 0) {
      return;
    }

    let cancelled = false;

    Promise.all(
      missingBookingIds.map(async (bookingId) => {
        try {
          const response = await apiClient.get(
            `/bookings/${bookingId}/escrow/milestones`,
          );
          return {
            bookingId,
            data: response.data as BookingTimelineResponse,
          };
        } catch {
          return {
            bookingId,
            data: null,
          };
        }
      }),
    ).then((results) => {
      if (cancelled) {
        return;
      }

      setBookingTimelineById((previous) => {
        const next = { ...previous };
        for (const result of results) {
          if (result.data) {
            next[result.bookingId] = result.data;
          }
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [bookingTimelineById, proposals]);

  const recommendationMetaById = useMemo(() => {
    if (!recommendationsEnabled) {
      return {};
    }

    const pending = proposals.filter(
      (proposal) => proposal.status === "PENDING",
    );
    const result: Record<
      string,
      {
        isRecommended: boolean;
        label: RecommendationLabel;
        reason: string;
        riskSignals: string[];
        score: ReturnType<typeof evaluateProposal>;
      }
    > = {};

    if (pending.length === 0) {
      return result;
    }

    const scored = pending.map((proposal) => ({
      proposal,
      score: evaluateProposal(proposal, job?.budget ?? null),
    }));

    const winner = scored.reduce((best, current) => {
      if (current.score.overall > best.score.overall) return current;
      if (current.score.overall < best.score.overall) return best;
      return Number(current.proposal.price) < Number(best.proposal.price)
        ? current
        : best;
    });

    const cheapestId = scored.reduce((min, item) =>
      Number(item.proposal.price) < Number(min.proposal.price) ? item : min,
    ).proposal.id;

    const fastest = scored.reduce((min, item) => {
      const currentEta =
        item.proposal.estimatedDays ?? Number.POSITIVE_INFINITY;
      const minEta = min.proposal.estimatedDays ?? Number.POSITIVE_INFINITY;
      return currentEta < minEta ? item : min;
    });

    const mostReliableId = scored.reduce((max, item) => {
      const current =
        (item.proposal.provider.avgRating || 0) * 10 +
        (item.proposal.provider.reviewCount || 0);
      const best =
        (max.proposal.provider.avgRating || 0) * 10 +
        (max.proposal.provider.reviewCount || 0);
      return current > best ? item : max;
    }).proposal.id;

    scored.forEach(({ proposal, score }) => {
      let label: RecommendationLabel = "BEST_VALUE";
      if (proposal.id === cheapestId) {
        label = "LOWEST_COST";
      } else if (
        proposal.id === fastest.proposal.id &&
        proposal.estimatedDays !== null &&
        proposal.estimatedDays !== undefined
      ) {
        label = "FASTEST_DELIVERY";
      } else if (
        proposal.id === mostReliableId &&
        (proposal.provider.reviewCount || 0) > 0
      ) {
        label = "MOST_RELIABLE";
      }

      const riskSignals: string[] = [];
      if ((proposal.provider.reviewCount || 0) === 0) {
        riskSignals.push("New provider - limited history");
      }
      if (!proposal.estimatedDays) {
        riskSignals.push("No ETA provided yet");
      }
      if (job?.budget && Number(proposal.price) > Number(job.budget) * 1.25) {
        riskSignals.push("Quote is significantly above budget");
      }

      const responseTimeHours = proposal.provider.metrics?.responseTimeHours;
      if (typeof responseTimeHours === "number" && responseTimeHours > 48) {
        riskSignals.push(
          `Slow response time (~${responseTimeHours}h after posting)`,
        );
      }

      const completionRatePct = proposal.provider.metrics?.completionRatePct;
      const completedJobsCount =
        proposal.provider.metrics?.completedJobsCount ?? 0;
      if (
        proposal.provider.metrics?.completionConfidenceBand === "HIGH" &&
        typeof completionRatePct === "number" &&
        completedJobsCount >= 5
      ) {
        riskSignals.push(
          `High completion confidence (${completionRatePct}% across ${completedJobsCount} completed jobs)`,
        );
      }

      const reason =
        label === "LOWEST_COST"
          ? `Lowest quote at KES ${Number(proposal.price).toLocaleString()}.`
          : label === "FASTEST_DELIVERY"
            ? `Fastest ETA at ${proposal.estimatedDays} days.`
            : label === "MOST_RELIABLE"
              ? `Strong reliability profile (${proposal.provider.avgRating || 0} stars, ${proposal.provider.reviewCount || 0} reviews).`
              : `Best overall balance of fit (${score.fit}), budget (${score.budgetMatch}), and completeness (${score.completeness}).`;

      result[proposal.id] = {
        isRecommended: proposal.id === winner.proposal.id,
        label,
        reason,
        riskSignals,
        score,
      };
    });

    return result;
  }, [job?.budget, proposals, recommendationsEnabled]);

  useEffect(() => {
    if (!recommendationsEnabled) {
      return;
    }

    proposals.forEach((proposal) => {
      const recommendationMeta = recommendationMetaById[proposal.id];
      if (!recommendationMeta) {
        return;
      }

      const impressionKey = `${proposal.id}:${recommendationMeta.label}:${recommendationMeta.isRecommended ? "recommended" : "labeled"}`;
      if (trackedRecommendationImpressionsRef.current.has(impressionKey)) {
        return;
      }

      trackedRecommendationImpressionsRef.current.add(impressionKey);
      trackEvent("proposal_recommendation_impression", {
        userRole: "CLIENT",
        sourcePage: "/client/jobs/[id]",
        experimentVariant: recommendationsVariant,
        proposalId: proposal.id,
        jobId,
        jobCategory: job?.category?.name,
        recommendationLabel: recommendationMeta.label,
        isRecommended: recommendationMeta.isRecommended,
      });
    });
  }, [
    job?.category?.name,
    jobId,
    proposals,
    recommendationMetaById,
    recommendationsEnabled,
    recommendationsVariant,
    trackEvent,
  ]);

  const trackRecommendationClick = (
    proposal: Proposal,
    label: RecommendationLabel,
    isRecommended: boolean,
  ) => {
    if (!recommendationsEnabled) {
      return;
    }

    trackEvent("proposal_recommendation_clicked", {
      userRole: "CLIENT",
      sourcePage: "/client/jobs/[id]",
      experimentVariant: recommendationsVariant,
      proposalId: proposal.id,
      jobId,
      jobCategory: job?.category?.name,
      recommendationLabel: label,
      isRecommended,
    });
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm md:text-base">
          Error loading job details. Please try again.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="bg-white shadow-sm rounded-xl md:rounded-2xl p-6 sm:p-8 md:p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 md:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3 sm:mb-4" />
            <p className="text-sm md:text-base text-gray-600">
              Loading job details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="text-center">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Job not found
          </h3>
          <p className="text-sm md:text-base text-gray-600 mb-4">
            The job you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/client/dashboard"
            className="text-emerald-600 hover:text-emerald-700 font-medium text-sm md:text-base"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8">
      {/* Toast Notification */}
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-3 sm:top-4 right-3 sm:right-4 bg-gray-900 text-white px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg shadow-lg z-50 max-w-[calc(100vw-2rem)] text-sm sm:text-base"
        >
          {toastMessage}
        </motion.div>
      )}

      {/* Header */}
      <div className="mb-4 sm:mb-5 md:mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 md:gap-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 transition-colors touch-manipulation"
        >
          <span className="material-symbols-outlined text-sm md:text-base">
            arrow_back
          </span>
          <span className="font-medium text-sm md:text-base">Back</span>
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1.5 sm:mb-2 wrap-break-word">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-600">
              <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                <span className="material-symbols-outlined text-xs sm:text-sm">
                  category
                </span>
                {job.category.name}
              </span>
              <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                <span className="material-symbols-outlined text-xs sm:text-sm">
                  location_on
                </span>
                <span className="truncate max-w-30 sm:max-w-50">
                  {job.location}
                </span>
              </span>
              <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                <span className="material-symbols-outlined text-xs sm:text-sm">
                  schedule
                </span>
                {new Date(job.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
          <span
            className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold border-2 whitespace-nowrap self-start ${
              statusColors[job.status] ||
              "bg-gray-100 text-gray-800 border-gray-200"
            }`}
          >
            {job.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5 md:space-y-6">
          {/* Job Description */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
              Job Description
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
              {job.description}
            </p>
          </div>

          {/* Image Gallery */}
          {job.images && job.images.length > 0 && (
            <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                Photos
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {job.images.map((image, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative aspect-square rounded-lg sm:rounded-xl overflow-hidden group cursor-pointer"
                  >
                    <Image
                      src={image}
                      alt={`Job photo ${index + 1}`}
                      width={640}
                      height={640}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg sm:text-xl">
                        zoom_in
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Proposals */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Proposals ({job._count.proposals})
              </h2>
            </div>

            {proposals.length === 0 ? (
              <div className="text-center py-6 sm:py-8 md:py-12">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="material-symbols-outlined text-gray-400 text-xl sm:text-2xl">
                    inbox
                  </span>
                </div>
                <h3 className="text-gray-900 font-medium text-sm sm:text-base mb-1">
                  No proposals yet
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm">
                  Professionals will start submitting proposals soon.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {proposals.map((proposal, index) =>
                  (() => {
                    const recommendationMeta =
                      recommendationMetaById[proposal.id];
                    const fulfillmentPreference = parseFulfillmentPreference(
                      proposal.attachments,
                    );
                    const timelineData = proposal.bookingId
                      ? bookingTimelineById[proposal.bookingId]
                      : null;
                    const confidenceVisual = recommendationMeta
                      ? getConfidenceVisual(recommendationMeta.score.overall)
                      : null;
                    return (
                      <motion.div
                        key={proposal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-2 sm:mb-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                              {proposal.provider.image ? (
                                <Image
                                  src={proposal.provider.image}
                                  alt={proposal.provider.name}
                                  width={48}
                                  height={48}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="material-symbols-outlined text-emerald-600 text-lg sm:text-xl">
                                  person
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                {proposal.provider.name}
                              </h4>
                              <p className="text-xs sm:text-sm text-gray-500">
                                Submitted{" "}
                                {new Date(
                                  proposal.createdAt,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs">
                                {recommendationsEnabled &&
                                recommendationMeta ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      trackRecommendationClick(
                                        proposal,
                                        recommendationMeta.label,
                                        recommendationMeta.isRecommended,
                                      )
                                    }
                                    className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-medium text-sky-700"
                                  >
                                    {recommendationLabelText(
                                      recommendationMeta.label,
                                    )}
                                  </button>
                                ) : null}
                                {recommendationsEnabled &&
                                recommendationMeta?.isRecommended ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      trackRecommendationClick(
                                        proposal,
                                        recommendationMeta.label,
                                        recommendationMeta.isRecommended,
                                      )
                                    }
                                    className="inline-flex items-center rounded-full border border-emerald-600 bg-emerald-600 px-2 py-0.5 font-medium text-white"
                                  >
                                    Recommended Provider
                                  </button>
                                ) : null}
                                {proposal.provider.isVerified ? (
                                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                                    Verified
                                  </span>
                                ) : null}
                                {(proposal.provider.reviewCount || 0) > 0 ? (
                                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                                    ⭐ {proposal.provider.avgRating} (
                                    {proposal.provider.reviewCount} review
                                    {proposal.provider.reviewCount === 1
                                      ? ""
                                      : "s"}
                                    )
                                  </span>
                                ) : null}
                                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                                  {fulfillmentPreference?.mode === "TEAM"
                                    ? `Team Fulfillment${fulfillmentPreference.teamName ? `: ${fulfillmentPreference.teamName}` : ""}`
                                    : "Individual Fulfillment"}
                                </span>
                              </div>
                              {recommendationsEnabled && recommendationMeta ? (
                                <p className="mt-2 text-xs text-gray-600">
                                  {recommendationMeta.reason}
                                </p>
                              ) : null}
                              {recommendationsEnabled &&
                              recommendationMeta &&
                              proposal.clientFitHints &&
                              proposal.clientFitHints.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] sm:text-xs">
                                  {proposal.clientFitHints
                                    .slice(0, 2)
                                    .map((hint, hintIndex) => (
                                      <span
                                        key={`${proposal.id}-fit-hint-${hintIndex}`}
                                        className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-indigo-700"
                                      >
                                        {hint}
                                      </span>
                                    ))}
                                </div>
                              ) : null}
                              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] sm:text-xs">
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">
                                  Avg response:{" "}
                                  {getTrustMetricText(
                                    proposal.provider.metrics
                                      ?.responseTimeHours,
                                    (hours) => `${hours}h`,
                                    "No response-time history yet",
                                  )}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">
                                  Response rate:{" "}
                                  {getTrustMetricText(
                                    proposal.provider.metrics?.responseRatePct,
                                    (percent) => `${percent}%`,
                                    "No response-rate history yet",
                                  )}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">
                                  Completion:{" "}
                                  {getTrustMetricText(
                                    proposal.provider.metrics
                                      ?.completionRatePct,
                                    (percent) => `${percent}%`,
                                    "No completion history yet",
                                  )}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">
                                  Successful jobs:{" "}
                                  {getTrustMetricText(
                                    proposal.provider.metrics
                                      ?.successfulJobsCount ??
                                      proposal.provider.metrics
                                        ?.completedJobsCount,
                                    (count) => String(count),
                                    "No successful-job history yet",
                                  )}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">
                                  Repeat clients:{" "}
                                  {getTrustMetricText(
                                    proposal.provider.metrics
                                      ?.repeatClientsCount,
                                    (count) => String(count),
                                    "No repeat-client history yet",
                                  )}
                                </span>
                              </div>
                              {recommendationsEnabled &&
                              recommendationMeta &&
                              confidenceVisual ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    trackRecommendationClick(
                                      proposal,
                                      recommendationMeta.label,
                                      recommendationMeta.isRecommended,
                                    )
                                  }
                                  className="mt-2 w-full max-w-xs rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left"
                                >
                                  <div className="flex items-center justify-between text-[11px] sm:text-xs">
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
                              ) : null}
                              {recommendationsEnabled && recommendationMeta ? (
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      trackRecommendationClick(
                                        proposal,
                                        recommendationMeta.label,
                                        recommendationMeta.isRecommended,
                                      );
                                      setExpandedRecommendation((prev) =>
                                        prev === proposal.id
                                          ? null
                                          : proposal.id,
                                      );
                                    }}
                                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                                  >
                                    {expandedRecommendation === proposal.id
                                      ? "Hide recommendation details"
                                      : "Why this recommendation?"}
                                  </button>
                                  {expandedRecommendation === proposal.id ? (
                                    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2.5 space-y-2 text-[11px] sm:text-xs">
                                      <div className="grid grid-cols-2 gap-2">
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
                                      <p className="text-gray-600">
                                        Rankings use weighted fit, budget match,
                                        and proposal completeness. The
                                        recommended provider is the
                                        highest-scoring pending option for this
                                        job.
                                      </p>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                              {recommendationsEnabled &&
                              recommendationMeta &&
                              recommendationMeta.riskSignals.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] sm:text-xs">
                                  {recommendationMeta.riskSignals.map(
                                    (signal, signalIndex) => (
                                      <span
                                        key={`${proposal.id}-risk-${signalIndex}`}
                                        className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${
                                          signal.startsWith(
                                            "High completion confidence",
                                          )
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            : "border-amber-200 bg-amber-50 text-amber-700"
                                        }`}
                                      >
                                        {signal}
                                      </span>
                                    ),
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-base sm:text-lg font-bold text-emerald-600">
                              KES {proposal.price.toLocaleString()}
                            </p>
                            <span className="text-xs text-gray-500">
                              Bid Amount
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed mb-2 sm:mb-3 line-clamp-3 sm:line-clamp-4">
                          {proposal.coverLetter}
                        </p>
                        {(proposal.provider.skills?.length || 0) > 0 ? (
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {proposal.provider
                              .skills!.slice(0, 4)
                              .map((skill) => (
                                <span
                                  key={`${proposal.id}-${skill}`}
                                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] sm:text-xs text-slate-700"
                                >
                                  {skill}
                                </span>
                              ))}
                            {(proposal.provider.certifications?.length || 0) >
                            0 ? (
                              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] sm:text-xs text-indigo-700">
                                {proposal.provider.certifications!.length} cert
                                {proposal.provider.certifications!.length === 1
                                  ? ""
                                  : "s"}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {proposal.status === "PENDING" &&
                          job.status === "OPEN" && (
                            <div className="flex flex-col xs:flex-row gap-2 mt-2">
                              <button
                                onClick={() =>
                                  acceptProposalMutation.mutate(proposal.id)
                                }
                                disabled={acceptProposalMutation.isPending}
                                className="flex-1 px-3 py-2 sm:px-4 sm:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors font-medium disabled:opacity-50 text-sm sm:text-base touch-manipulation flex items-center justify-center gap-1.5"
                              >
                                {acceptProposalMutation.isPending ? (
                                  <>
                                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>Accepting...</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="material-symbols-outlined text-sm">
                                      check
                                    </span>
                                    <span>Accept Proposal</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  handleMessage(
                                    proposal.providerId,
                                    proposal.provider.name,
                                    proposal.provider.image,
                                  )
                                }
                                className="px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium text-sm sm:text-base touch-manipulation flex items-center justify-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  message
                                </span>
                                <span>Message</span>
                              </button>
                            </div>
                          )}
                        {proposal.status === "ACCEPTED" && (
                          <div className="mt-2 space-y-2">
                            <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs sm:text-sm font-medium text-center">
                              ✓ Accepted
                            </div>
                            {timelineData ? (
                              <PaymentTimelineCard
                                bookingStatus={timelineData.bookingStatus}
                                paymentStatus={
                                  timelineData.payment?.status || null
                                }
                                totalAmount={timelineData.totalAmount}
                                milestones={
                                  timelineData.escrow?.milestones || null
                                }
                              />
                            ) : null}
                            <button
                              onClick={() => handleDispute(proposal.bookingId)}
                              className="w-full px-3 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 active:bg-amber-100 transition-colors font-medium text-xs sm:text-sm"
                            >
                              Report Issue
                            </button>
                          </div>
                        )}
                        {proposal.status === "REJECTED" && (
                          <div className="mt-2 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-xs sm:text-sm text-center">
                            Rejected
                          </div>
                        )}
                      </motion.div>
                    );
                  })(),
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Budget Card */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Budget
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              KES {job.budget.toLocaleString()}
            </p>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 sm:mb-4">
              Actions
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={handleEditJob}
                className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:bg-emerald-800 transition-colors font-medium text-sm sm:text-base touch-manipulation"
              >
                <span className="material-symbols-outlined text-sm sm:text-base">
                  edit
                </span>
                <span>Edit Job</span>
              </button>
              <button
                onClick={handleShareJob}
                className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium text-sm sm:text-base touch-manipulation"
              >
                <span className="material-symbols-outlined text-sm sm:text-base">
                  share
                </span>
                <span>Share Job</span>
              </button>
              {job.status === "OPEN" && (
                <button
                  onClick={() => closeJobMutation.mutate()}
                  disabled={closeJobMutation.isPending}
                  className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-2.5 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors font-medium text-sm sm:text-base touch-manipulation disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm sm:text-base">
                    close
                  </span>
                  {closeJobMutation.isPending ? "Closing..." : "Close Job"}
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 sm:mb-4">
              Job Stats
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm sm:text-base">
                  Total Proposals
                </span>
                <span className="font-bold text-gray-900 text-sm sm:text-base">
                  {job._count.proposals}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm sm:text-base">
                  Views
                </span>
                <span className="font-bold text-gray-900 text-sm sm:text-base">
                  -
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm sm:text-base">
                  Time Posted
                </span>
                <span className="font-bold text-gray-900 text-sm sm:text-base">
                  {Math.floor(
                    (Date.now() - new Date(job.createdAt).getTime()) /
                      (1000 * 60 * 60 * 24),
                  )}{" "}
                  days
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
