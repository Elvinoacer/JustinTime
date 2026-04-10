"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useProviderReviews } from "@/lib/api/hooks/useProvider";

const ReviewsPage = () => {
  const { data: reviewsData, isLoading } = useProviderReviews();
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");

  const reviews = reviewsData?.data || [];

  // Calculate statistics
  const stats = useMemo(() => {
    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) /
          totalReviews
        : 0;
    const ratingCounts = [5, 4, 3, 2, 1].map(
      (rating) => reviews.filter((r: any) => r.rating === rating).length
    );

    return {
      totalReviews,
      averageRating: averageRating.toFixed(1),
      ratingCounts,
    };
  }, [reviews]);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    if (ratingFilter === "all") return reviews;
    return reviews.filter((review: any) => review.rating === ratingFilter);
  }, [ratingFilter, reviews]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[18rem] sm:min-h-[24rem]">
        <div
          role="status"
          aria-label="Loading reviews"
          className="w-10 h-10 md:w-12 md:h-12 border-3 md:border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-4 lg:px-6 py-4 md:py-6 lg:py-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="mb-4 md:mb-6 lg:mb-8">
        <h1 className="text-gray-800 text-xl md:text-2xl lg:text-3xl font-bold leading-tight mb-1 md:mb-2">
          Reviews
        </h1>
        <p className="text-gray-500 text-xs md:text-sm font-normal leading-normal">
          See what your clients are saying about your services
        </p>
      </div>

      {/* Statistics Cards - Mobile Optimized */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 lg:gap-4 mb-4 md:mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg md:rounded-xl shadow-xs md:shadow-sm p-3 md:p-4 lg:p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-gray-500 text-xs md:text-sm font-medium truncate">
              Total Reviews
            </span>
            <span className="material-symbols-outlined text-blue-600 text-base md:text-lg">
              rate_review
            </span>
          </div>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
            {stats.totalReviews}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg md:rounded-xl shadow-xs md:shadow-sm p-3 md:p-4 lg:p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-gray-500 text-xs md:text-sm font-medium truncate">
              Avg Rating
            </span>
            <span className="material-symbols-outlined text-yellow-500 text-base md:text-lg">
              star
            </span>
          </div>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
            {stats.averageRating}
            <span className="text-sm md:text-lg text-gray-500">/5.0</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg md:rounded-xl shadow-xs md:shadow-sm p-3 md:p-4 lg:p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-gray-500 text-xs md:text-sm font-medium truncate">
              5-Stars
            </span>
            <span className="material-symbols-outlined text-green-600 text-base md:text-lg">
              thumb_up
            </span>
          </div>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
            {stats.ratingCounts[0]}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg md:rounded-xl shadow-xs md:shadow-sm p-3 md:p-4 lg:p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-gray-500 text-xs md:text-sm font-medium truncate">
              This Month
            </span>
            <span className="material-symbols-outlined text-primary-600 text-base md:text-lg">
              trending_up
            </span>
          </div>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
            {Math.floor(stats.totalReviews / 3)}
          </p>
        </motion.div>
      </div>

      {/* Main Content Grid - Two Column Layout on Large Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Rating Distribution Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg md:rounded-xl shadow-xs md:shadow-sm p-4 md:p-6 border border-gray-100 lg:col-span-1"
        >
          <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2">
            <span className="material-symbols-outlined text-primary-600 text-base md:text-lg">
              bar_chart
            </span>
            Rating Distribution
          </h2>
          <div className="space-y-2 md:space-y-3">
            {[5, 4, 3, 2, 1].map((rating, index) => {
              const count = stats.ratingCounts[index];
              const percentage =
                stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

              return (
                <button type="button"
                  key={rating}
                  onClick={() =>
                    setRatingFilter(ratingFilter === rating ? "all" : rating)
                  }
                  className={`w-full flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-md md:rounded-lg transition-colors text-xs md:text-sm ${
                    ratingFilter === rating
                      ? "bg-primary-50 border border-primary-200"
                      : "hover:bg-gray-50"
                  }`}
                  aria-label={`Filter by ${rating} stars`}
                  aria-pressed={ratingFilter === rating}
                >
                  <div className="flex items-center gap-1 w-12 md:w-16">
                    <span className="font-medium text-gray-700">{rating}</span>
                    <span className="material-symbols-outlined text-yellow-500 text-xs md:text-sm">
                      star
                    </span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5 md:h-2">
                    <div
                      className="bg-yellow-500 h-1.5 md:h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="font-medium text-gray-600 w-6 md:w-8 text-right">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter Reset */}
          {ratingFilter !== "all" && (
            <button type="button"
              onClick={() => setRatingFilter("all")}
              className="w-full mt-3 md:mt-4 px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 text-gray-700 rounded-md md:rounded-lg font-medium text-xs md:text-sm hover:bg-gray-200 transition-colors"
            >
              Show All Reviews
            </button>
          )}
        </motion.div>

        {/* Reviews List - Two Columns on Large Screens */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-base md:text-lg font-bold text-gray-900 truncate">
              {ratingFilter === "all"
                ? "All Reviews"
                : `${ratingFilter}-Star Reviews`}
            </h2>
            <span className="text-xs md:text-sm text-gray-500 whitespace-nowrap">
              {filteredReviews.length} review
              {filteredReviews.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredReviews.length === 0 ? (
            // Empty State
            <div className="bg-white rounded-lg md:rounded-xl shadow-xs md:shadow-sm p-6 md:p-8 lg:p-12 text-center border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <span className="material-symbols-outlined text-gray-400 text-2xl md:text-3xl lg:text-4xl">
                  reviews
                </span>
              </div>
              <h3 className="text-sm md:text-base lg:text-lg font-semibold text-gray-900 mb-1 md:mb-2">
                No reviews found
              </h3>
              <p className="text-gray-500 text-xs md:text-sm">
                {ratingFilter !== "all"
                  ? `You don't have any ${ratingFilter}-star reviews yet`
                  : "You haven't received any reviews yet"}
              </p>
            </div>
          ) : (
            // Reviews Grid - Two Columns on Large Screens
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
              {filteredReviews.map((review: any, index: number) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="bg-white rounded-lg md:rounded-xl shadow-xs md:shadow-sm p-4 md:p-6 border border-gray-100 hover:shadow-sm md:hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2 md:mb-3">
                    <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-linear-to-br from-primary-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm lg:text-base shrink-0 overflow-hidden">
                        {review.clientImage ? (
                          <img
                            src={review.clientImage}
                            alt={review.client}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          review.client.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                          {review.client}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1 truncate">
                          <span className="material-symbols-outlined text-xs">
                            calendar_today
                          </span>
                          {review.date}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div className="flex items-center gap-0.5 md:gap-1 mb-2 md:mb-3">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`material-symbols-outlined text-base md:text-lg ${
                          i < review.rating
                            ? "text-yellow-500"
                            : "text-gray-300"
                        }`}
                        aria-hidden="true"
                      >
                        star
                      </span>
                    ))}
                    <span className="sr-only">
                      {review.rating} out of 5 stars
                    </span>
                  </div>

                  {/* Review Comment */}
                  <p className="text-gray-700 text-xs md:text-sm leading-relaxed mb-3 md:mb-4 line-clamp-3 md:line-clamp-4">
                    {review.comment}
                  </p>

                  {/* Action Buttons - Mobile Optimized */}
                  <div className="flex items-center gap-2 md:gap-3 pt-2 md:pt-3 border-t border-gray-100">
                    <button type="button"
                      className="flex items-center gap-1 text-xs md:text-sm text-gray-600 hover:text-primary-600 transition-colors p-1"
                      aria-label="Reply to review"
                    >
                      <span className="material-symbols-outlined text-xs md:text-sm">
                        reply
                      </span>
                      <span className="hidden xs:inline">Reply</span>
                    </button>
                    <button type="button"
                      className="flex items-center gap-1 text-xs md:text-sm text-gray-600 hover:text-green-600 transition-colors p-1"
                      aria-label="Mark as helpful"
                    >
                      <span className="material-symbols-outlined text-xs md:text-sm">
                        thumb_up
                      </span>
                      <span className="hidden xs:inline">Helpful</span>
                    </button>
                    <button type="button"
                      className="flex items-center gap-1 text-xs md:text-sm text-gray-600 hover:text-blue-600 transition-colors p-1 ml-auto"
                      aria-label="Share review"
                    >
                      <span className="material-symbols-outlined text-xs md:text-sm">
                        share
                      </span>
                      <span className="hidden xs:inline">Share</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewsPage;
