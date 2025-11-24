"use client";
import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { motion } from "framer-motion";
import Link from "next/link";

interface Proposal {
  id: string;
  providerId: string;
  price: number;
  coverLetter: string;
  status: string;
  createdAt: string;
  provider: {
    id: string;
    name: string;
    image: string | null;
  };
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

const statusColors: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = params.id as string;
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const { data: job, isLoading, error } = useQuery({
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

  const handleMessage = (providerId: string) => {
    // Navigate to messages or show coming soon
    showToastMessage("Messaging feature coming soon!");
  };

  const proposals = proposalsData || [];

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          Error loading job details. Please try again.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm rounded-2xl p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Loading job details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Job not found</h3>
          <p className="text-gray-600 mb-4">The job you're looking for doesn't exist.</p>
          <Link href="/client/dashboard" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Notification */}
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50"
        >
          {toastMessage}
        </motion.div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span className="font-medium">Back</span>
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">category</span>
                {job.category.name}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">location_on</span>
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">schedule</span>
                Posted {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <span
            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 ${
              statusColors[job.status] || "bg-gray-100 text-gray-800 border-gray-200"
            }`}
          >
            {job.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Description */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Job Description</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </div>

          {/* Image Gallery */}
          {job.images && job.images.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Photos</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {job.images.map((image, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
                  >
                    <img
                      src={image}
                      alt={`Job photo ${index + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        zoom_in
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Proposals */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                Proposals ({job._count.proposals})
              </h2>
            </div>

            {proposals.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-gray-400 text-2xl">inbox</span>
                </div>
                <h3 className="text-gray-900 font-medium mb-1">No proposals yet</h3>
                <p className="text-gray-500 text-sm">Professionals will start submitting proposals soon.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map((proposal, index) => (
                  <motion.div
                    key={proposal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-gray-200 rounded-xl p-4 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          {proposal.provider.image ? (
                            <img
                              src={proposal.provider.image}
                              alt={proposal.provider.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-emerald-600">person</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{proposal.provider.name}</h4>
                          <p className="text-sm text-gray-500">
                            Submitted {new Date(proposal.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">
                          KES {proposal.price.toLocaleString()}
                        </p>
                        <span className="text-xs text-gray-500">Bid Amount</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">{proposal.coverLetter}</p>
                    {proposal.status === "PENDING" && job.status === "OPEN" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => acceptProposalMutation.mutate(proposal.id)}
                          disabled={acceptProposalMutation.isPending}
                          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
                        >
                          {acceptProposalMutation.isPending ? "Accepting..." : "Accept Proposal"}
                        </button>
                        <button
                          onClick={() => handleMessage(proposal.providerId)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                          Message
                        </button>
                      </div>
                    )}
                    {proposal.status === "ACCEPTED" && (
                      <div className="mt-3 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium text-center">
                        ✓ Accepted
                      </div>
                    )}
                    {proposal.status === "REJECTED" && (
                      <div className="mt-3 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-sm text-center">
                        Rejected
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Budget Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Budget</h3>
            <p className="text-3xl font-bold text-gray-900">KES {job.budget.toLocaleString()}</p>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={handleEditJob}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit Job
              </button>
              <button
                onClick={handleShareJob}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                <span className="material-symbols-outlined text-sm">share</span>
                Share Job
              </button>
              {job.status === "OPEN" && (
                <button
                  onClick={() => closeJobMutation.mutate()}
                  disabled={closeJobMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  {closeJobMutation.isPending ? "Closing..." : "Close Job"}
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Job Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Proposals</span>
                <span className="font-bold text-gray-900">{job._count.proposals}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Views</span>
                <span className="font-bold text-gray-900">-</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Time Posted</span>
                <span className="font-bold text-gray-900">
                  {Math.floor((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
