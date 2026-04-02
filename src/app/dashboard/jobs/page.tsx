"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCreateProposalTemplate,
  useDeleteProposalTemplate,
  useProviderTeams,
  useProviderJobs,
  useProposalTemplates,
  useSubmitProposal,
  useUpdateProposalTemplate,
  useWithdrawProposal,
} from "@/lib/api/hooks/useJobs";
import { useJobsEvents } from "@/hooks/useJobsEvents";
import {
  buildProposalTemplate,
  type ProposalTemplateKey,
} from "@/lib/proposals/templates";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  withFulfillmentPreference,
  type ProposalFulfillmentMode,
} from "@/lib/proposals/fulfillmentMode";
import JobLifecycleTimeline from "@/components/jobs/JobLifecycleTimeline";

type ProviderJob = {
  id: string;
  title: string;
  description: string;
  budget?: number | string | null;
  location?: string | null;
  createdAt: string;
  deadline?: string | null;
  category?: { slug?: string; name?: string } | null;
  client?: { id?: string; name?: string; image?: string | null } | null;
  _count?: { proposals?: number };
  proposal?: {
    id: string;
    status: string;
    price?: number | string;
    createdAt?: string;
    latestStatusReason?: string | null;
    statusHistory?: Array<{
      status: "PENDING" | "ACCEPTED" | "REJECTED";
      reason: string | null;
      changedByName: string | null;
      changedByRole: string | null;
      createdAt: string;
    }>;
  };
  recommendation?: { reasons?: string[] };
  winProbabilityBand?: "HIGH" | "MEDIUM" | "LOW";
  winProbabilityReason?: string;
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      response?: { data?: { error?: string } };
      message?: string;
    };
    return maybeError.response?.data?.error || maybeError.message || fallback;
  }

  return fallback;
}

const tabs = ["recommended", "available", "applied", "active", "completed"];
const tabSet = new Set(tabs);

const tabLabels: Record<string, string> = {
  recommended: "Recommended",
  available: "Available",
  applied: "Applied",
  active: "Active",
  completed: "Completed",
};

const statusConfig: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  OPEN: { bg: "bg-blue-100", text: "text-blue-700", label: "Open" },
  PENDING: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "In Review",
  },
  ACCEPTED: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "Accepted",
  },
  REJECTED: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  CLOSED: { bg: "bg-gray-100", text: "text-gray-700", label: "Closed" },
};

function formatTimelineDate(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleString();
}

function getProposalTimeline(job: ProviderJob) {
  if (!job.proposal) {
    return [];
  }

  if (
    Array.isArray(job.proposal.statusHistory) &&
    job.proposal.statusHistory.length > 0
  ) {
    return job.proposal.statusHistory;
  }

  return [
    {
      status:
        (job.proposal.status as "PENDING" | "ACCEPTED" | "REJECTED") ||
        "PENDING",
      reason:
        job.proposal.latestStatusReason ||
        "Application submitted and awaiting client review.",
      changedByName: null,
      changedByRole: "SYSTEM",
      createdAt: job.proposal.createdAt || new Date().toISOString(),
    },
  ];
}

export default function JobApplicationsPage() {
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams.get("tab");
  const requestedTab =
    tabFromQuery && tabSet.has(tabFromQuery) ? tabFromQuery : null;
  const [activeTab, setActiveTab] = useState(requestedTab ?? "available");
  const [selectedJob, setSelectedJob] = useState<ProviderJob | null>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);

  // Proposal form state
  const [coverLetter, setCoverLetter] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProposalTemplateKey | null>(null);
  const [selectedSavedTemplateId, setSelectedSavedTemplateId] = useState<
    string | null
  >(null);
  const [templateName, setTemplateName] = useState("");
  const [fulfillmentMode, setFulfillmentMode] =
    useState<ProposalFulfillmentMode>("INDIVIDUAL");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const { data, isLoading } = useProviderJobs(activeTab, 1);
  const { data: providerTeamsData } = useProviderTeams(true);
  const submitProposal = useSubmitProposal();
  const withdrawProposal = useWithdrawProposal();
  const createProposalTemplate = useCreateProposalTemplate();
  const updateProposalTemplate = useUpdateProposalTemplate();
  const deleteProposalTemplate = useDeleteProposalTemplate();
  const { data: savedTemplatesData } = useProposalTemplates(true);
  const { trackEvent } = useJobsEvents();
  const quickApplyVariant =
    (process.env.NEXT_PUBLIC_FF_QUICK_APPLY_TEMPLATES || "").toLowerCase() ===
    "true"
      ? "quick-apply"
      : "baseline";

  const jobs = (data?.items || []) as ProviderJob[];
  const providerTeams = providerTeamsData?.items || [];
  const savedTemplates = savedTemplatesData?.items || [];
  const hasTeamAccess = providerTeams.length > 0;

  useEffect(() => {
    if (requestedTab && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [activeTab, requestedTab]);

  const getQuickApplyPayload = (job: ProviderJob) => {
    const draft = buildProposalTemplate(
      "budget",
      job?.title || "this job",
      job?.budget,
    );

    const price = Number(draft.price);
    const days = Number.parseInt(draft.estimatedDays, 10);

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    if (!draft.coverLetter || draft.coverLetter.trim().length < 50) {
      return null;
    }

    return {
      coverLetter: draft.coverLetter.trim(),
      price,
      estimatedDays: Number.isFinite(days) && days > 0 ? days : undefined,
    };
  };

  const handleApplyClick = (job: ProviderJob) => {
    trackEvent("provider_apply_started", {
      userRole: "PROVIDER",
      sourcePage: "/dashboard/jobs",
      experimentVariant: quickApplyVariant,
      jobId: job?.id,
      jobCategory: job?.category?.slug,
    });
    setSelectedJob(job);
    setCoverLetter("");
    setProposedPrice(job.budget?.toString() || "");
    setEstimatedDays("");
    setSelectedTemplate(null);
    setSelectedSavedTemplateId(null);
    setTemplateName("");
    setFulfillmentMode("INDIVIDUAL");
    setSelectedTeamId("");
    setShowProposalModal(true);
  };

  const handleQuickApply = async (job: ProviderJob) => {
    const payload = getQuickApplyPayload(job);
    if (!payload) {
      toast.error("Quick Apply could not build a valid proposal draft");
      return;
    }

    try {
      await submitProposal.mutateAsync({
        jobId: job.id,
        coverLetter: payload.coverLetter,
        price: payload.price,
        estimatedDays: payload.estimatedDays,
      });
      trackEvent("provider_apply_submitted", {
        userRole: "PROVIDER",
        sourcePage: "/dashboard/jobs",
        experimentVariant: "quick-apply",
        jobId: job?.id,
        jobCategory: job?.category?.slug,
      });
      toast.success("Quick Apply submitted successfully");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Quick Apply failed"));
    }
  };

  const applyTemplate = (template: ProposalTemplateKey) => {
    if (!selectedJob) return;
    const next = buildProposalTemplate(
      template,
      selectedJob.title || "this job",
      selectedJob.budget,
    );
    setCoverLetter(next.coverLetter);
    setProposedPrice(next.price);
    setEstimatedDays(next.estimatedDays);
    setSelectedTemplate(template);
    setSelectedSavedTemplateId(null);
    trackEvent("pricing_hint_applied", {
      userRole: "PROVIDER",
      sourcePage: "/dashboard/jobs",
      experimentVariant: quickApplyVariant,
      jobId: selectedJob?.id,
      jobCategory: selectedJob?.category?.slug,
    });
  };

  const applySavedTemplate = (template: {
    id: string;
    name: string;
    coverLetter: string;
    price: number | string;
    estimatedDays: number | null;
  }) => {
    setCoverLetter(template.coverLetter);
    setProposedPrice(String(template.price));
    setEstimatedDays(
      template.estimatedDays !== null ? String(template.estimatedDays) : "",
    );
    setSelectedSavedTemplateId(template.id);
    setSelectedTemplate(null);
    if (!templateName) {
      setTemplateName(template.name);
    }
  };

  const handleSaveTemplate = async () => {
    const normalizedName = templateName.trim();
    if (!normalizedName) {
      toast.error("Enter a template name before saving");
      return;
    }

    if (coverLetter.trim().length < 50) {
      toast.error("Cover letter must be at least 50 characters to save");
      return;
    }

    const price = Number(proposedPrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid price before saving");
      return;
    }

    const daysValue = estimatedDays ? Number.parseInt(estimatedDays, 10) : null;
    if (estimatedDays && (!Number.isFinite(daysValue) || daysValue <= 0)) {
      toast.error("Estimated days must be a positive number");
      return;
    }

    try {
      await createProposalTemplate.mutateAsync({
        name: normalizedName,
        coverLetter: coverLetter.trim(),
        price,
        estimatedDays: daysValue,
      });
      toast.success("Template saved");
    } catch {
      toast.error("Failed to save template");
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedSavedTemplateId) {
      toast.error("Select a saved template to update");
      return;
    }

    const normalizedName = templateName.trim();
    if (!normalizedName) {
      toast.error("Enter a template name before updating");
      return;
    }

    if (coverLetter.trim().length < 50) {
      toast.error("Cover letter must be at least 50 characters to update");
      return;
    }

    const price = Number(proposedPrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid price before updating");
      return;
    }

    const daysValue = estimatedDays ? Number.parseInt(estimatedDays, 10) : null;
    if (estimatedDays && (!Number.isFinite(daysValue) || daysValue <= 0)) {
      toast.error("Estimated days must be a positive number");
      return;
    }

    try {
      await updateProposalTemplate.mutateAsync({
        templateId: selectedSavedTemplateId,
        data: {
          name: normalizedName,
          coverLetter: coverLetter.trim(),
          price,
          estimatedDays: daysValue,
        },
      });
      toast.success("Template updated");
    } catch {
      toast.error("Failed to update template");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedSavedTemplateId) {
      toast.error("Select a saved template to delete");
      return;
    }

    if (!confirm("Delete this saved template?")) {
      return;
    }

    try {
      await deleteProposalTemplate.mutateAsync(selectedSavedTemplateId);
      setSelectedSavedTemplateId(null);
      setTemplateName("");
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const winProbabilityStyle: Record<string, string> = {
    HIGH: "border-emerald-200 bg-emerald-50 text-emerald-700",
    MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
    LOW: "border-rose-200 bg-rose-50 text-rose-700",
  };

  const winProbabilityLabel: Record<string, string> = {
    HIGH: "High chance",
    MEDIUM: "Medium chance",
    LOW: "Highly competitive",
  };

  const handleJobClick = (job: ProviderJob) => {
    setSelectedJob(job);
    setShowJobDetailsModal(true);
  };

  const handleSubmitProposal = async () => {
    if (!coverLetter || coverLetter.length < 50) {
      toast.error("Cover letter must be at least 50 characters");
      return;
    }
    if (!proposedPrice || parseFloat(proposedPrice) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (fulfillmentMode === "TEAM" && !selectedTeamId) {
      toast.error("Select a team for team-based fulfillment");
      return;
    }

    const selectedTeam =
      fulfillmentMode === "TEAM"
        ? providerTeams.find((team) => team.id === selectedTeamId)
        : null;

    const metadataAttachments = withFulfillmentPreference([], {
      mode: fulfillmentMode,
      teamId: selectedTeam?.id,
      teamName: selectedTeam?.name,
    });

    try {
      await submitProposal.mutateAsync({
        jobId: selectedJob.id,
        coverLetter,
        price: parseFloat(proposedPrice),
        estimatedDays: estimatedDays ? parseInt(estimatedDays) : undefined,
        attachments: metadataAttachments,
      });
      trackEvent("provider_apply_submitted", {
        userRole: "PROVIDER",
        sourcePage: "/dashboard/jobs",
        experimentVariant: quickApplyVariant,
        jobId: selectedJob?.id,
        jobCategory: selectedJob?.category?.slug,
      });
      toast.success("Proposal submitted successfully!");
      setShowProposalModal(false);
      setSelectedJob(null);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to submit proposal"));
    }
  };

  const handleWithdraw = async (proposalId: string) => {
    if (confirm("Are you sure you want to withdraw this proposal?")) {
      try {
        await withdrawProposal.mutateAsync(proposalId);
        toast.success("Proposal withdrawn");
      } catch {
        toast.error("Failed to withdraw proposal");
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">My Jobs</h1>
        <Link
          href="/jobs"
          className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg md:rounded-xl hover:bg-emerald-700 transition-colors shadow-md sm:shadow-lg shadow-emerald-200 font-medium text-sm sm:text-base w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-sm">search</span>
          <span>Browse Jobs</span>
        </Link>
      </div>

      {hasTeamAccess ? (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm font-medium">
            You also have team-dispatched assignments.
          </p>
          <Link
            href="/dashboard/team/jobs"
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
          >
            View team-dispatched jobs →
          </Link>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-w-20 ${
              activeTab === tab
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      <div className="grid gap-3 sm:gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl border border-gray-100 p-6 sm:p-8 md:p-12 text-center">
            <span className="material-symbols-outlined text-gray-300 text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">
              work_off
            </span>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2">
              No {tabLabels[activeTab]}
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm">
              {activeTab === "available"
                ? "Check your recommended jobs for best matches"
                : activeTab === "recommended"
                  ? "Check back later for new opportunities"
                  : activeTab === "applied"
                    ? "You haven't applied to any jobs yet"
                    : activeTab === "active"
                      ? "No active jobs at the moment"
                      : "No completed jobs yet"}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl md:rounded-2xl shadow-xs sm:shadow-sm border border-gray-100 hover:shadow-sm sm:hover:shadow-md transition-shadow group cursor-pointer"
                onClick={() => handleJobClick(job)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors shrink-0">
                      <span className="material-symbols-outlined text-base sm:text-lg md:text-xl">
                        work
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 group-hover:text-emerald-600 transition-colors mb-1 truncate">
                        {job.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2">
                        {job.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500">
                        <div className="flex items-center gap-1 truncate">
                          <span className="material-symbols-outlined text-xs sm:text-sm">
                            person
                          </span>
                          <span className="truncate max-w-25 sm:max-w-none">
                            {job.client?.name || "Client"}
                          </span>
                        </div>
                        {job.location && (
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs sm:text-sm">
                              location_on
                            </span>
                            <span className="truncate max-w-20 sm:max-w-none">
                              {job.location}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <span className="material-symbols-outlined text-xs sm:text-sm">
                            calendar_today
                          </span>
                          {new Date(job.createdAt).toLocaleDateString()}
                        </div>
                        {activeTab === "available" &&
                          job._count?.proposals > 0 && (
                            <div className="flex items-center gap-1 text-amber-600 whitespace-nowrap">
                              <span className="material-symbols-outlined text-xs sm:text-sm">
                                groups
                              </span>
                              {job._count.proposals} applicant
                              {job._count.proposals !== 1 ? "s" : ""}
                            </div>
                          )}
                        {(activeTab === "recommended" ||
                          activeTab === "available") &&
                          job.deadline && (
                            <div className="flex items-center gap-1 text-rose-600 whitespace-nowrap">
                              <span className="material-symbols-outlined text-xs sm:text-sm">
                                timer
                              </span>
                              Due {new Date(job.deadline).toLocaleDateString()}
                            </div>
                          )}
                      </div>
                      {activeTab === "recommended" &&
                      Array.isArray(job.recommendation?.reasons) &&
                      job.recommendation.reasons.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {job.recommendation.reasons.map((reason: string) => {
                            const label =
                              reason === "category-match"
                                ? "Category Match"
                                : reason === "nearby"
                                  ? "Nearby"
                                  : reason === "low-competition"
                                    ? "Low Competition"
                                    : reason === "good-budget"
                                      ? "Good Budget"
                                      : reason === "urgent"
                                        ? "Urgent"
                                        : reason === "this-week"
                                          ? "This Week"
                                          : reason === "high-win-rate"
                                            ? "High Win Rate"
                                            : reason === "reliable-history"
                                              ? "Reliable History"
                                              : reason;

                            return (
                              <span
                                key={`${job.id}-${reason}`}
                                className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                      {(activeTab === "recommended" ||
                        activeTab === "available") &&
                      job.winProbabilityBand ? (
                        <div className="mt-2">
                          <span
                            title={
                              job.winProbabilityReason ||
                              "Estimated using competition and your recent outcomes"
                            }
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${winProbabilityStyle[job.winProbabilityBand] || "border-slate-200 bg-slate-50 text-slate-700"}`}
                          >
                            {winProbabilityLabel[job.winProbabilityBand] ||
                              "Competitive"}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
                    <div className="text-right">
                      {job.budget && (
                        <p className="text-base sm:text-lg font-bold text-gray-900">
                          KES {Number(job.budget).toLocaleString()}
                        </p>
                      )}
                      {job.proposal && (
                        <div className="flex flex-col items-end gap-1 mt-0.5 sm:mt-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              statusConfig[job.proposal.status]?.bg
                            } ${statusConfig[job.proposal.status]?.text}`}
                          >
                            {statusConfig[job.proposal.status]?.label}
                          </span>
                          {job.proposal.latestStatusReason ? (
                            <span className="text-[11px] text-gray-500 max-w-56 text-right line-clamp-2">
                              {job.proposal.latestStatusReason}
                            </span>
                          ) : null}
                          {formatTimelineDate(
                            job.proposal.statusHistory?.[0]?.createdAt,
                          ) ? (
                            <span className="text-[11px] text-gray-400">
                              Updated{" "}
                              {formatTimelineDate(
                                job.proposal.statusHistory?.[0]?.createdAt,
                              )}
                            </span>
                          ) : null}
                          {job.proposal.price && (
                            <span className="text-xs text-gray-500">
                              Your bid: KES{" "}
                              {Number(job.proposal.price).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div
                      className="flex gap-1.5 sm:gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(activeTab === "available" ||
                        activeTab === "recommended") && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleQuickApply(job);
                            }}
                            disabled={submitProposal.isPending}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 border border-emerald-300 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap disabled:opacity-50"
                            title="Quick Apply uses an auto-filled proposal template"
                          >
                            Quick Apply
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyClick(job);
                            }}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap"
                          >
                            Apply Now
                          </button>
                        </>
                      )}
                      {activeTab === "applied" &&
                        job.proposal?.status === "PENDING" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWithdraw(job.proposal.id);
                            }}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap"
                          >
                            Withdraw
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Proposal Modal - Mobile Optimized */}
      <AnimatePresence>
        {showProposalModal && selectedJob && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-3 md:p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowProposalModal(false)}
          >
            <motion.div
              className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg sm:shadow-xl md:shadow-2xl max-w-lg w-full p-4 sm:p-5 md:p-6 max-h-[90dvh] overflow-y-auto my-auto sm:my-0"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                  Submit Proposal
                </h2>
                <button
                  onClick={() => setShowProposalModal(false)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0 ml-2"
                >
                  <span className="material-symbols-outlined text-lg sm:text-xl">
                    close
                  </span>
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base md:text-lg mb-1.5 sm:mb-2 truncate">
                  {selectedJob.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-3">
                  {selectedJob.description}
                </p>
                {selectedJob.budget && (
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-2">
                    Budget: KES {Number(selectedJob.budget).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Fulfillment mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFulfillmentMode("INDIVIDUAL");
                        setSelectedTeamId("");
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                        fulfillmentMode === "INDIVIDUAL"
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfillmentMode("TEAM")}
                      disabled={providerTeams.length === 0}
                      className={`rounded-lg border px-3 py-2 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 ${
                        fulfillmentMode === "TEAM"
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Team
                    </button>
                  </div>
                  {fulfillmentMode === "TEAM" ? (
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="mt-2 w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                    >
                      <option value="">Select team</option>
                      {providerTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Quick templates
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["budget", "Budget Offer"],
                        ["premium", "Premium Offer"],
                        ["fast", "Fast Delivery"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyTemplate(key)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          selectedTemplate === key
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {savedTemplates.length > 0 && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Saved templates
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {savedTemplates.slice(0, 6).map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => applySavedTemplate(template)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            selectedSavedTemplateId === template.id
                              ? "border-sky-600 bg-sky-600 text-white"
                              : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                          }`}
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Cover Letter * (minimum 50 characters)
                  </label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={4}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-sm sm:text-base"
                    placeholder="Explain why you're the best fit..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {coverLetter.length} / 50 characters
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Your Bid (KES) *
                  </label>
                  <input
                    type="number"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base"
                    placeholder="Enter your proposed price"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Estimated Days (Optional)
                  </label>
                  <input
                    type="number"
                    value={estimatedDays}
                    onChange={(e) => setEstimatedDays(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base"
                    placeholder="How many days will it take?"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Save as template
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base"
                      placeholder="Template name (e.g. Fast MVP)"
                    />
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={createProposalTemplate.isPending}
                      className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs sm:text-sm font-semibold disabled:opacity-50"
                    >
                      {createProposalTemplate.isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateTemplate}
                      disabled={
                        !selectedSavedTemplateId ||
                        updateProposalTemplate.isPending
                      }
                      className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs sm:text-sm font-semibold disabled:opacity-50"
                    >
                      {updateProposalTemplate.isPending
                        ? "Updating..."
                        : "Update"}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteTemplate}
                      disabled={
                        !selectedSavedTemplateId ||
                        deleteProposalTemplate.isPending
                      }
                      className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 text-xs sm:text-sm font-semibold disabled:opacity-50"
                    >
                      {deleteProposalTemplate.isPending
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 mt-4 sm:mt-5 md:mt-6">
                <button
                  onClick={() => setShowProposalModal(false)}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitProposal}
                  disabled={submitProposal.isPending}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  {submitProposal.isPending ? (
                    <>
                      <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    "Submit Proposal"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job Details Modal - Mobile Optimized */}
      <AnimatePresence>
        {showJobDetailsModal && selectedJob && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-3 md:p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowJobDetailsModal(false)}
          >
            <motion.div
              className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg sm:shadow-xl md:shadow-2xl max-w-lg w-full p-4 sm:p-5 md:p-6 max-h-[90dvh] overflow-y-auto my-auto sm:my-0"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                  Job Details
                </h2>
                <button
                  onClick={() => setShowJobDetailsModal(false)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0 ml-2"
                >
                  <span className="material-symbols-outlined text-lg sm:text-xl">
                    close
                  </span>
                </button>
              </div>

              <div className="space-y-4 sm:space-y-5 md:space-y-6">
                <div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2 truncate">
                    {selectedJob.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                    <span className="px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {selectedJob.category?.name || "General"}
                    </span>
                    <span>
                      Posted{" "}
                      {new Date(selectedJob.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-1.5 sm:mb-2">
                    Description
                  </h4>
                  <p className="text-gray-700 whitespace-pre-wrap text-xs sm:text-sm">
                    {selectedJob.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                  {selectedJob.budget && (
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
                        Budget
                      </h4>
                      <p className="text-gray-700 text-sm">
                        KES {Number(selectedJob.budget).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedJob.location && (
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
                        Location
                      </h4>
                      <p className="text-gray-700 text-sm truncate">
                        {selectedJob.location}
                      </p>
                    </div>
                  )}
                  {selectedJob.deadline && (
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
                        Deadline
                      </h4>
                      <p className="text-gray-700 text-sm">
                        {new Date(selectedJob.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {selectedJob._count?.proposals && (
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
                        Applicants
                      </h4>
                      <p className="text-gray-700 text-sm">
                        {selectedJob._count.proposals}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-1.5 sm:mb-2">
                    Client
                  </h4>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {selectedJob.client?.image ? (
                      <Image
                        src={selectedJob.client.image}
                        alt={selectedJob.client.name || "Client"}
                        width={48}
                        height={48}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-gray-500 text-lg sm:text-xl">
                          person
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                        {selectedJob.client?.name || "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedJob.proposal ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                    <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-2">
                      Application Tracker
                    </h4>
                    <div className="space-y-2.5">
                      {getProposalTimeline(selectedJob).map((entry, index) => (
                        <div
                          key={`${selectedJob.proposal?.id}-timeline-${index}`}
                          className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusConfig[entry.status]?.bg || "bg-slate-100"} ${statusConfig[entry.status]?.text || "text-slate-700"}`}
                            >
                              {statusConfig[entry.status]?.label ||
                                entry.status}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {formatTimelineDate(entry.createdAt) ||
                                "Unknown time"}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-700">
                            {entry.reason || "No reason provided."}
                          </p>
                          {entry.changedByName || entry.changedByRole ? (
                            <p className="mt-1 text-[11px] text-slate-500">
                              By{" "}
                              {entry.changedByName ||
                                entry.changedByRole ||
                                "System"}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedJob.proposal ? (
                  <JobLifecycleTimeline
                    jobId={selectedJob.id}
                    compact
                    title="Lifecycle Timeline"
                  />
                ) : null}

                {(activeTab === "available" || activeTab === "recommended") &&
                  !selectedJob.proposal && (
                    <button
                      onClick={() => {
                        setShowJobDetailsModal(false);
                        handleApplyClick(selectedJob);
                      }}
                      className="w-full px-4 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm sm:text-base"
                    >
                      Apply to This Job
                    </button>
                  )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
