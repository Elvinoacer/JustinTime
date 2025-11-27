"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    description: string;
    budget?: number;
    location?: string;
    createdAt: string;
    distance?: number | null;
    score?: number;
    category?: {
      name: string;
      slug: string;
    };
    client?: {
      id: string;
      name: string;
      image?: string;
    };
    _count?: {
      proposals: number;
    };
  };
  onApply?: (jobId: string) => void;
  index?: number;
}

const categoryColors: Record<string, string> = {
  plumbing: "bg-blue-100 text-blue-700",
  electrical: "bg-yellow-100 text-yellow-700",
  carpentry: "bg-amber-100 text-amber-700",
  gardening: "bg-green-100 text-green-700",
  cleaning: "bg-purple-100 text-purple-700",
  painting: "bg-pink-100 text-pink-700",
  default: "bg-gray-100 text-gray-700",
};

const JobCard: React.FC<JobCardProps> = ({ job, onApply, index = 0 }) => {
  const categoryColor =
    categoryColors[job.category?.slug || ""] || categoryColors.default;

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Truncate title to approximately 5 words
  const truncateTitle = (title: string, wordLimit: number = 5) => {
    const words = title.split(' ');
    if (words.length <= wordLimit) return title;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl shadow-sm hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300 border border-gray-100 hover:border-emerald-200 group overflow-hidden"
    >
      <div className="p-6 flex flex-col md:flex-row gap-6">
        {/* Left Column - Main Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Title and Tags */}
          <div className="space-y-3">
            <h3 className="text-2xl font-extrabold text-gray-900 group-hover:text-emerald-600 transition-colors leading-tight">
              {truncateTitle(job.title, 5)}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {job.category && (
                <span
                  className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${categoryColor}`}
                >
                  {job.category.name}
                </span>
              )}
              {job.distance !== null && job.distance !== undefined && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wide">
                  <span className="material-symbols-outlined text-sm">near_me</span>
                  {job.distance < 1 ? `${Math.round(job.distance * 1000)}m` : `${job.distance}km`} away
                </span>
              )}
              {job.score !== undefined && job.score > 0.5 && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wide">
                  <span className="material-symbols-outlined text-sm">stars</span>
                  {Math.round(job.score * 100)}% Match
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {job.description}
          </p>

          {/* Meta Info */}
          <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap">
            {job.location && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">
                    location_on
                  </span>
                </div>
                <span className="font-medium">{job.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                <span className="material-symbols-outlined text-lg" aria-hidden="true">
                  schedule
                </span>
              </div>
              <span className="font-medium">{getRelativeTime(job.createdAt)}</span>
            </div>
            {job._count && job._count.proposals > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">
                    groups
                  </span>
                </div>
                <span className="font-bold">
                  {job._count.proposals} applicant{job._count.proposals !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Budget, Client & Actions */}
        <div className="flex flex-col md:w-72 gap-4 md:border-l md:border-gray-100 md:pl-6">
          {/* Budget */}
          {job.budget && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Budget</p>
              <p className="text-3xl font-extrabold text-emerald-700">
                KES {job.budget.toLocaleString()}
              </p>
            </div>
          )}

          {/* Client Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white">
              {job.client?.image ? (
                <img
                  src={job.client.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 font-bold text-lg">
                  {job.client?.name?.[0] || "?"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Posted by</p>
              <p className="text-sm font-bold text-gray-900 truncate">
                {job.client?.name || "Anonymous"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-auto">
            <Link href={`/jobs/${job.id}`} className="w-full">
              <button className="w-full py-3 px-4 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all text-sm">
                View Details
              </button>
            </Link>
            {onApply && (
              <button
                onClick={() => onApply(job.id)}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-extrabold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 text-base hover:scale-[1.02] active:scale-[0.98]"
              >
                Apply Now
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default JobCard;
