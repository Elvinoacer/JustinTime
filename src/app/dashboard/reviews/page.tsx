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
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" aria-label="Loading reviews" className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-800 text-3xl font-bold leading-tight mb-2">
          Reviews
        </h1>
        <p className="text-gray-500 text-sm font-normal leading-normal">
          See what your clients are saying about your services
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-medium">
              Total Reviews
            </span>
            <span className="material-symbols-outlined text-blue-600">
              rate_review
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.totalReviews}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-medium">
              Average Rating
            </span>
            <span className="material-symbols-outlined text-yellow-500">
              star
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.averageRating}
            <span className="text-lg text-gray-500">/5.0</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-medium">
              5-Star Reviews
            </span>
            <span className="material-symbols-outlined text-green-600">
              thumb_up
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.ratingCounts[0]}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-medium">
              This Month
            </span>
            <span className="material-symbols-outlined text-primary-600">
              trending_up
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {/* Placeholder for monthly growth */}
            {Math.floor(stats.totalReviews / 3)}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rating Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-600">
              bar_chart
            </span>
            Rating Distribution
          </h2>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating, index) => {
              const count = stats.ratingCounts[index];
              const percentage =
                stats.totalReviews > 0
                  ? (count / stats.totalReviews) * 100
                  : 0;

              return (
                <button
                  key={rating}
                  onClick={() =>
                    setRatingFilter(ratingFilter === rating ? "all" : rating)
                  }
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    ratingFilter === rating
                      ? "bg-primary-50 border border-primary-200"
                      : "hover:bg-gray-50"
                  }`}
                  aria-label={`Filter by ${rating} stars`}
                  aria-pressed={ratingFilter === rating}
                >
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium text-gray-700">
                      {rating}
                    </span>
                    <span className="material-symbols-outlined text-yellow-500 text-sm">
                      star
                    </span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-8 text-right">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter Reset */}
          {ratingFilter !== "all" && (
            <button
              onClick={() => setRatingFilter("all")}
              className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
            >
              Show All Reviews
            </button>
          )}
        </motion.div>

        {/* Reviews List */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {ratingFilter === "all"
                ? "All Reviews"
                : `${ratingFilter}-Star Reviews`}
            </h2>
            <span className="text-sm text-gray-500">
              {filteredReviews.length} review
              {filteredReviews.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredReviews.length === 0 ? (
            // Empty State
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-gray-400 text-4xl">
                  reviews
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No reviews found
              </h3>
              <p className="text-gray-500 text-sm">
                {ratingFilter !== "all"
                  ? `You don't have any ${ratingFilter}-star reviews yet`
                  : "You haven't received any reviews yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review: any, index: number) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
                        {review.clientImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={review.clientImage} alt={review.client} className="w-full h-full object-cover" />
                        ) : (
                          review.client.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {review.client}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">
                            calendar_today
                          </span>
                          {review.date}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`material-symbols-outlined text-lg ${
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
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {review.comment}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                    <button
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 transition-colors"
                      aria-label="Reply to review"
                    >
                      <span className="material-symbols-outlined text-sm">
                        reply
                      </span>
                      Reply
                    </button>
                    <button
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-green-600 transition-colors"
                      aria-label="Mark as helpful"
                    >
                      <span className="material-symbols-outlined text-sm">
                        thumb_up
                      </span>
                      Helpful
                    </button>
                    <button
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors ml-auto"
                      aria-label="Share review"
                    >
                      <span className="material-symbols-outlined text-sm">
                        share
                      </span>
                      Share
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
