"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    description: string;
    budget?: number;
    location?: string;
    createdAt: string;
    deadline?: string;
    distance?: number | null;
    score?: number;
    urgency?: "normal" | "urgent" | "critical";
    category?: {
      name: string;
      slug: string;
    };
    client?: {
      id: string;
      name: string;
      image?: string;
      verified?: boolean;
    };
    _count?: {
      proposals: number;
    };
    maxProposals?: number;
  };
  onApply?: (jobId: string) => void;
  index?: number;
  isMobile?: boolean;
}

const categoryGradients: Record<
  string,
  { bg: string; border: string; text: string; chip: string }
> = {
  plumbing: {
    bg: "from-sky-50 to-cyan-50",
    border: "border-sky-200",
    text: "text-sky-700",
    chip: "bg-sky-100",
  },
  electrical: {
    bg: "from-amber-50 to-yellow-50",
    border: "border-amber-200",
    text: "text-amber-700",
    chip: "bg-amber-100",
  },
  carpentry: {
    bg: "from-orange-50 to-amber-50",
    border: "border-orange-200",
    text: "text-orange-700",
    chip: "bg-orange-100",
  },
  gardening: {
    bg: "from-emerald-50 to-green-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    chip: "bg-emerald-100",
  },
  cleaning: {
    bg: "from-indigo-50 to-violet-50",
    border: "border-indigo-200",
    text: "text-indigo-700",
    chip: "bg-indigo-100",
  },
  painting: {
    bg: "from-rose-50 to-pink-50",
    border: "border-rose-200",
    text: "text-rose-700",
    chip: "bg-rose-100",
  },
  default: {
    bg: "from-slate-50 to-gray-50",
    border: "border-slate-200",
    text: "text-slate-700",
    chip: "bg-slate-100",
  },
};

const JobCard: React.FC<JobCardProps> = ({
  job,
  onApply,
  index = 0,
  isMobile = false,
}) => {
  const categoryStyle =
    categoryGradients[job.category?.slug || ""] || categoryGradients.default;
  const proposalCount = job._count?.proposals || 0;
  const maxProposals = job.maxProposals || 15;
  const proposalProgress = Math.min((proposalCount / maxProposals) * 100, 100);

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getDaysUntilDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diffInMs = date.getTime() - now.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

  const daysLeft = getDaysUntilDeadline(job.deadline);
  const isUrgent = daysLeft !== null && daysLeft <= 3;
  const isHot =
    proposalCount >= 5 || (job.score !== undefined && job.score > 0.8);

  const urgencyLabel =
    daysLeft === null
      ? null
      : daysLeft < 0
        ? "Deadline passed"
        : daysLeft === 0
          ? "Deadline today"
          : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`group relative bg-linear-to-br ${categoryStyle.bg} ${
        isMobile ? "rounded-xl" : "rounded-2xl"
      } overflow-hidden transition-all duration-300 hover:shadow-xl border ${categoryStyle.border}`}
    >
      {(isUrgent || isHot) && (
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          {isHot && !isUrgent && (
            <motion.div
              className="px-2.5 py-1 bg-linear-to-r from-orange-500 to-red-500 rounded-full shadow-lg shadow-orange-500/30 flex items-center gap-1"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <span className="material-symbols-outlined text-white text-xs">
                local_fire_department
              </span>
              <span className="text-white text-[10px] font-bold uppercase tracking-wide">
                Hot
              </span>
            </motion.div>
          )}
          {isUrgent && (
            <motion.div
              className="px-2.5 py-1 bg-linear-to-r from-red-600 to-red-500 rounded-full shadow-lg shadow-red-500/30 flex items-center gap-1"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <span className="material-symbols-outlined text-white text-xs">
                schedule
              </span>
              <span className="text-white text-[10px] font-bold uppercase tracking-wide">
                {daysLeft === 0 ? "Today" : `${daysLeft}d left`}
              </span>
            </motion.div>
          )}
        </div>
      )}

      <div className={`${isMobile ? "p-4" : "p-5 sm:p-6"}`}>
        <div className="flex items-center flex-wrap gap-2 mb-3 pr-16">
          {job.category && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 ${categoryStyle.chip} ${categoryStyle.text} rounded-lg text-xs font-bold uppercase tracking-wide border ${categoryStyle.border}`}
            >
              <span className="material-symbols-outlined text-sm">
                category
              </span>
              {job.category.name}
            </span>
          )}
          <span className="text-gray-500 text-xs flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">schedule</span>
            {getRelativeTime(job.createdAt)}
          </span>
          {urgencyLabel && (
            <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-0.5 font-semibold">
              {urgencyLabel}
            </span>
          )}
        </div>

        <h3
          className={`${isMobile ? "text-base" : "text-lg sm:text-xl"} font-bold text-gray-900 group-hover:text-emerald-700 transition-colors mb-2 line-clamp-2`}
        >
          {job.title}
        </h3>

        <p
          className={`text-gray-600 ${
            isMobile ? "text-xs line-clamp-2" : "text-sm line-clamp-2"
          } mb-4`}
        >
          {job.description}
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {job.distance !== null && job.distance !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold">
              <span className="material-symbols-outlined text-sm">near_me</span>
              {job.distance < 1
                ? `${Math.round(job.distance * 1000)}m`
                : `${job.distance.toFixed(1)}km`}
            </span>
          )}

          {job.location && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/80 text-gray-600 rounded-lg text-xs font-medium">
              <span className="material-symbols-outlined text-sm">
                location_on
              </span>
              <span className="truncate max-w-24 sm:max-w-36">
                {job.location}
              </span>
            </span>
          )}

          {job.score !== undefined && job.score > 0.5 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">
              <span className="material-symbols-outlined text-sm">stars</span>
              {Math.round(job.score * 100)}% Match
            </span>
          )}
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 mb-4 border border-white/60 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider font-medium mb-0.5">
                Budget
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-baseline gap-1">
                <span className="text-emerald-600">KES</span>
                {job.budget ? job.budget.toLocaleString() : "Negotiable"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider font-medium mb-1">
                Proposals
              </p>
              <div className="flex items-center gap-2">
                <div className="w-16 sm:w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      proposalProgress >= 80
                        ? "bg-red-500"
                        : proposalProgress >= 50
                          ? "bg-yellow-500"
                          : "bg-emerald-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${proposalProgress}%` }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  />
                </div>
                <span
                  className={`text-sm font-bold ${
                    proposalProgress >= 80 ? "text-red-600" : "text-gray-700"
                  }`}
                >
                  {proposalCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-200/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              {job.client?.image ? (
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-white shadow-md">
                  <Image
                    src={job.client.image}
                    alt={job.client.name || "Client"}
                    width={44}
                    height={44}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center border-2 border-white shadow-md">
                  <span className="text-white font-bold text-sm">
                    {job.client?.name?.[0] || "?"}
                  </span>
                </div>
              )}

              {job.client?.verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="material-symbols-outlined text-white text-[8px]">
                    check
                  </span>
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] sm:text-xs text-gray-500">Posted by</p>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                {job.client?.name || "Anonymous"}
              </p>
            </div>
          </div>

          <Link href={`/jobs/${job.id}`}>
            <motion.button
              type="button"
              onClick={() => onApply?.(job.id)}
              className={`${
                isMobile ? "px-3 py-2 text-xs" : "px-4 sm:px-5 py-2.5 text-sm"
              } bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all flex items-center gap-1.5`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label={`View details for ${job.title}`}
            >
              <span>View Details</span>
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default JobCard;
