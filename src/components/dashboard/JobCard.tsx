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
  isMobile?: boolean;
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

const JobCard: React.FC<JobCardProps> = ({
  job,
  onApply,
  index = 0,
  isMobile = false,
}) => {
  const categoryColor =
    categoryColors[job.category?.slug || ""] || categoryColors.default;

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Truncate title based on screen size
  const truncateTitle = (title: string, wordLimit?: number) => {
    const limit = wordLimit || (isMobile ? 4 : 5);
    const words = title.split(" ");
    if (words.length <= limit) return title;
    return words.slice(0, limit).join(" ") + "...";
  };

  // Truncate description based on screen size
  const truncateDescription = (description: string, charLimit?: number) => {
    const limit = charLimit || (isMobile ? 80 : 120);
    if (description.length <= limit) return description;
    return description.substring(0, limit).trim() + "...";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      whileHover={{ y: isMobile ? 0 : -2 }}
      className={`bg-white ${
        isMobile ? "rounded-xl" : "rounded-2xl"
      } shadow-sm hover:shadow-md hover:shadow-emerald-100/30 transition-all duration-300 border border-gray-100 hover:border-emerald-200 group overflow-hidden`}
    >
      <div
        className={`${
          isMobile
            ? "p-4 flex flex-col gap-4"
            : "p-6 flex flex-col lg:flex-row gap-6"
        }`}
      >
        {/* Main Content - Top on mobile, Left on desktop */}
        <div
          className={`${
            isMobile ? "flex-1 min-w-0 space-y-3" : "flex-1 min-w-0 space-y-4"
          }`}
        >
          {/* Title and Tags Row */}
          <div className={`${isMobile ? "space-y-2" : "space-y-3"}`}>
            <h3
              className={`${
                isMobile
                  ? "text-lg font-bold"
                  : "text-xl lg:text-2xl font-extrabold"
              } text-gray-900 group-hover:text-emerald-600 transition-colors leading-tight`}
            >
              {truncateTitle(job.title)}
            </h3>

            {/* Tags Row - Horizontal scroll on mobile if needed */}
            <div className="flex items-center gap-1.5 lg:gap-2 overflow-x-auto pb-1 lg:pb-0">
              {job.category && (
                <span
                  className={`inline-block px-2 lg:px-3 py-1 ${
                    isMobile ? "text-[10px]" : "text-xs"
                  } rounded-full font-bold uppercase tracking-wide ${categoryColor} flex-shrink-0`}
                >
                  {isMobile
                    ? job.category.name.substring(0, 12) +
                      (job.category.name.length > 12 ? "..." : "")
                    : job.category.name}
                </span>
              )}

              {job.distance !== null && job.distance !== undefined && (
                <span
                  className={`inline-flex items-center gap-0.5 lg:gap-1 px-2 lg:px-3 py-1 ${
                    isMobile ? "text-[10px]" : "text-xs"
                  } bg-emerald-50 text-emerald-700 rounded-full font-bold uppercase tracking-wide flex-shrink-0`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                  >
                    near_me
                  </span>
                  {job.distance < 1
                    ? `${Math.round(job.distance * 1000)}m`
                    : `${job.distance}km`}
                </span>
              )}

              {job.score !== undefined && job.score > 0.5 && (
                <span
                  className={`inline-flex items-center gap-0.5 lg:gap-1 px-2 lg:px-3 py-1 ${
                    isMobile ? "text-[10px]" : "text-xs"
                  } bg-purple-50 text-purple-700 rounded-full font-bold uppercase tracking-wide flex-shrink-0`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                  >
                    stars
                  </span>
                  {Math.round(job.score * 100)}% Match
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p
            className={`${isMobile ? "text-xs" : "text-sm"} text-gray-600 ${
              isMobile ? "line-clamp-2" : "line-clamp-2 lg:line-clamp-2"
            } leading-relaxed`}
          >
            {truncateDescription(job.description)}
          </p>

          {/* Meta Info - Stacked on mobile, horizontal on desktop */}
          <div
            className={`${
              isMobile
                ? "flex flex-col gap-2"
                : "flex items-center gap-4 lg:gap-6"
            } ${isMobile ? "text-xs" : "text-sm"} text-gray-500`}
          >
            {job.location && (
              <div className="flex items-center gap-2">
                <div
                  className={`${
                    isMobile ? "w-6 h-6" : "w-7 h-7 lg:w-8 lg:h-8"
                  } rounded-full bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      isMobile ? "text-sm" : "text-base lg:text-lg"
                    }`}
                    aria-hidden="true"
                  >
                    location_on
                  </span>
                </div>
                <span className="font-medium truncate">
                  {isMobile
                    ? job.location.substring(0, 20) +
                      (job.location.length > 20 ? "..." : "")
                    : job.location}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div
                className={`${
                  isMobile ? "w-6 h-6" : "w-7 h-7 lg:w-8 lg:h-8"
                } rounded-full bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0`}
              >
                <span
                  className={`material-symbols-outlined ${
                    isMobile ? "text-sm" : "text-base lg:text-lg"
                  }`}
                  aria-hidden="true"
                >
                  schedule
                </span>
              </div>
              <span className="font-medium">
                {getRelativeTime(job.createdAt)}
              </span>
            </div>

            {job._count && job._count.proposals > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <div
                  className={`${
                    isMobile ? "w-6 h-6" : "w-7 h-7 lg:w-8 lg:h-8"
                  } rounded-full bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      isMobile ? "text-sm" : "text-base lg:text-lg"
                    }`}
                    aria-hidden="true"
                  >
                    groups
                  </span>
                </div>
                <span className="font-bold">
                  {job._count.proposals} {isMobile ? "" : "applicant"}
                  {job._count.proposals !== 1 && !isMobile ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Bottom on mobile, Right on desktop */}
        <div
          className={`${
            isMobile
              ? "flex flex-col gap-3"
              : "flex flex-col lg:w-64 xl:w-72 gap-4 lg:border-l lg:border-gray-100 lg:pl-6"
          }`}
        >
          {/* Budget */}
          {job.budget && (
            <div
              className={`${
                isMobile
                  ? "bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-100"
                  : "bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100"
              }`}
            >
              <p
                className={`${
                  isMobile ? "text-[10px]" : "text-xs"
                } text-emerald-600 font-bold uppercase tracking-wider mb-0.5 lg:mb-1`}
              >
                Budget
              </p>
              <p
                className={`${
                  isMobile ? "text-xl" : "text-2xl lg:text-3xl"
                } font-extrabold text-emerald-700`}
              >
                KES {job.budget.toLocaleString()}
              </p>
            </div>
          )}

          {/* Client Info */}
          <div
            className={`${
              isMobile
                ? "flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                : "flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
            }`}
          >
            <div
              className={`${
                isMobile ? "w-8 h-8" : "w-10 h-10 lg:w-12 lg:h-12"
              } rounded-full overflow-hidden flex-shrink-0 ${
                isMobile ? "ring-1 ring-white" : "ring-2 ring-white"
              }`}
            >
              {job.client?.image ? (
                <img
                  src={job.client.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 ${
                    isMobile
                      ? "font-bold text-sm"
                      : "font-bold text-base lg:text-lg"
                  }`}
                >
                  {job.client?.name?.[0] || "?"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`${
                  isMobile ? "text-[10px]" : "text-xs"
                } text-gray-400 font-medium uppercase tracking-wider`}
              >
                Posted by
              </p>
              <p
                className={`${
                  isMobile ? "text-xs" : "text-sm"
                } font-bold text-gray-900 truncate`}
              >
                {job.client?.name || "Anonymous"}
              </p>
            </div>
          </div>

          {/* Actions - Stacked buttons */}
          <div
            className={`${
              isMobile ? "flex flex-col gap-2" : "flex flex-col gap-2 mt-auto"
            }`}
          >
            <Link href={`/jobs/${job.id}`} className="w-full">
              <button
                className={`w-full ${
                  isMobile ? "py-2.5 px-3 text-xs" : "py-3 px-4 text-sm"
                } border border-gray-200 text-gray-700 ${
                  isMobile ? "rounded-lg" : "rounded-xl"
                } font-bold hover:bg-gray-50 hover:border-gray-300 transition-all`}
              >
                View Details
              </button>
            </Link>
            {onApply && (
              <button
                onClick={() => onApply(job.id)}
                className={`w-full ${
                  isMobile ? "py-3 px-3 text-sm" : "py-3.5 px-4 text-base"
                } bg-gradient-to-r from-emerald-600 to-teal-600 text-white ${
                  isMobile ? "rounded-lg" : "rounded-xl"
                } font-bold lg:font-extrabold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:scale-[1.02] active:scale-[0.98]`}
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
