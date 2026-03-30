"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useProviderJobs,
  useSubmitProposal,
  useWithdrawProposal,
} from "@/lib/api/hooks/useJobs";
import { toast } from "sonner";
import Link from "next/link";

const tabs = ["recommended", "available", "applied", "active", "completed"];

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
  PENDING: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  ACCEPTED: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "Accepted",
  },
  REJECTED: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  CLOSED: { bg: "bg-gray-100", text: "text-gray-700", label: "Closed" },
};

export default function JobApplicationsPage() {
  const [activeTab, setActiveTab] = useState("available");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);

  // Proposal form state
  const [coverLetter, setCoverLetter] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");

  const { data, isLoading } = useProviderJobs(activeTab, 1);
  const submitProposal = useSubmitProposal();
  const withdrawProposal = useWithdrawProposal();

  const jobs = data?.items || [];

  const handleApplyClick = (job: any) => {
    setSelectedJob(job);
    setCoverLetter("");
    setProposedPrice(job.budget?.toString() || "");
    setEstimatedDays("");
    setShowProposalModal(true);
  };

  const handleJobClick = (job: any) => {
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

    try {
      await submitProposal.mutateAsync({
        jobId: selectedJob.id,
        coverLetter,
        price: parseFloat(proposedPrice),
        estimatedDays: estimatedDays ? parseInt(estimatedDays) : undefined,
      });
      toast.success("Proposal submitted successfully!");
      setShowProposalModal(false);
      setSelectedJob(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to submit proposal");
    }
  };

  const handleWithdraw = async (proposalId: string) => {
    if (confirm("Are you sure you want to withdraw this proposal?")) {
      try {
        await withdrawProposal.mutateAsync(proposalId);
        toast.success("Proposal withdrawn");
      } catch (error) {
        toast.error("Failed to withdraw proposal");
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">My Jobs</h1>
        <Link
          href="/services"
          className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg md:rounded-xl hover:bg-emerald-700 transition-colors shadow-md sm:shadow-lg shadow-emerald-200 font-medium text-sm sm:text-base w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-sm">search</span>
          <span>Browse Jobs</span>
        </Link>
      </div>

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
            {jobs.map((job: any) => (
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyClick(job);
                          }}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap"
                        >
                          Apply Now
                        </button>
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
                      <img
                        src={selectedJob.client.image}
                        alt={selectedJob.client.name}
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
