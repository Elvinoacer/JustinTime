'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Star, CheckCircle, XCircle, MessageCircle, Briefcase, Calendar, DollarSign, FileText, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { getClientProposals, acceptProposal, rejectProposal } from '@/app/actions/proposals';
import Image from 'next/image';

type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

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
  const [filterStatus, setFilterStatus] = useState<ProposalStatus | 'ALL'>('ALL');
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);

  useEffect(() => {
    loadProposals();
  }, [selectedJob]);

  const loadProposals = async () => {
    setIsLoading(true);
    try {
      const data = await getClientProposals(selectedJob || undefined);
      setProposals(data as any);
    } catch (error) {
      console.error('Error loading proposals:', error);
      toast.error('Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (proposalId: string) => {
    try {
      await acceptProposal(proposalId);
      toast.success('Proposal accepted! The provider has been notified.');
      loadProposals();
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept proposal');
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      await rejectProposal(proposalId);
      toast.success('Proposal rejected');
      loadProposals();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject proposal');
    }
  };

  const filteredProposals = filterStatus === 'ALL' 
    ? proposals 
    : proposals.filter(p => p.status === filterStatus);

  const getStatusColor = (status: ProposalStatus) => {
    switch (status) {
      case 'ACCEPTED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const getStatusIcon = (status: ProposalStatus) => {
    switch (status) {
      case 'ACCEPTED': return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Get unique jobs for filter
  const uniqueJobs = Array.from(new Set(proposals.map(p => p.job.id)))
    .map(jobId => proposals.find(p => p.job.id === jobId)?.job)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-gray-900 to-emerald-700 bg-clip-text text-transparent">
            Job Proposals
          </h1>
          <p className="text-gray-600">Review and manage proposals from service providers</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-wrap gap-4"
        >
          {/* Job Filter */}
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Job
            </label>
            <select
              value={selectedJob || ''}
              onChange={(e) => setSelectedJob(e.target.value || null)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all bg-white"
            >
              <option value="">All Jobs</option>
              {uniqueJobs.map((job) => (
                <option key={job!.id} value={job!.id}>
                  {job!.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <div className="flex gap-2">
              {['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as any)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    filterStatus === status
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'Total', count: proposals.length, color: 'from-blue-500 to-blue-600' },
            { label: 'Pending', count: proposals.filter(p => p.status === 'PENDING').length, color: 'from-amber-500 to-amber-600' },
            { label: 'Accepted', count: proposals.filter(p => p.status === 'ACCEPTED').length, color: 'from-emerald-500 to-emerald-600' },
            { label: 'Rejected', count: proposals.filter(p => p.status === 'REJECTED').length, color: 'from-red-500 to-red-600' },
          ].map((stat, idx) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm text-gray-600 mb-1">{stat.label} Proposals</p>
              <p className="text-3xl font-bold text-gray-900">{stat.count}</p>
            </div>
          ))}
        </motion.div>

        {/* Proposals List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredProposals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No proposals found</h3>
            <p className="text-gray-600">There are no proposals matching your filters.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredProposals.map((proposal, idx) => (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Provider Avatar */}
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 ring-4 ring-white shadow-md">
                            {proposal.provider.image ? (
                              <Image
                                src={proposal.provider.image}
                                alt={proposal.provider.name || 'Provider'}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xl font-bold">
                                {proposal.provider.name?.[0] || 'P'}
                              </div>
                            )}
                          </div>
                          {proposal.provider.profile?.isVerified && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-white">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Provider Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">
                              {proposal.provider.name || 'Unknown Provider'}
                            </h3>
                            {proposal.provider.reviewCount > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span className="text-sm font-bold text-amber-700">
                                  {proposal.provider.avgRating}
                                </span>
                                <span className="text-xs text-amber-600">
                                  ({proposal.provider.reviewCount})
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Job Title */}
                          <p className="text-sm text-gray-600 mb-2">
                            For: <span className="font-semibold text-gray-900">{proposal.job.title}</span>
                            <span className="mx-2">•</span>
                            <span className="text-emerald-600">{proposal.job.category.name}</span>
                          </p>

                          {/* Meta Info */}
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                            {proposal.provider.profile?.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{proposal.provider.profile.location}</span>
                              </div>
                            )}
                            {proposal.estimatedDays && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{proposal.estimatedDays} days</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{new Date(proposal.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-medium ${getStatusColor(proposal.status)}`}>
                        {getStatusIcon(proposal.status)}
                        <span className="text-sm">{proposal.status}</span>
                      </div>
                    </div>

                    {/* Cover Letter Preview */}
                    <div className="mb-4">
                      <button
                        onClick={() => setExpandedProposal(expandedProposal === proposal.id ? null : proposal.id)}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        {expandedProposal === proposal.id ? 'Hide' : 'Show'} Cover Letter
                      </button>
                      <AnimatePresence>
                        {expandedProposal === proposal.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200"
                          >
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {proposal.coverLetter}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Price and Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-baseline gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        <span className="text-3xl font-bold text-gray-900">
                          KES {Number(proposal.price).toLocaleString()}
                        </span>
                        {proposal.job.budget && (
                          <span className="text-sm text-gray-500">
                            (Budget: KES {Number(proposal.job.budget).toLocaleString()})
                          </span>
                        )}
                      </div>

                      {proposal.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(proposal.id)}
                            className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleAccept(proposal.id)}
                            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium flex items-center gap-2"
                          >
                            <CheckCircle className="w-5 h-5" />
                            Accept Proposal
                          </button>
                        </div>
                      )}

                      {proposal.status === 'ACCEPTED' && (
                        <div className="flex gap-2">
                          <button className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all font-medium flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            Contact Provider
                          </button>
                        </div>
                      )}
                    </div>
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
