"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Star,
  ArrowLeft,
  MessageSquare,
  Calendar,
  CheckCircle,
  Smile,
  Meh,
  Frown,
  ThumbsUp,
  Award,
} from "lucide-react";

interface Booking {
  id: string;
  status: string;
  startTime?: string | null;
  review?: {
    id: string;
    authorId?: string;
  } | null;
  dispute?: {
    status?: string | null;
  } | null;
  service?: {
    title?: string | null;
    provider?: {
      name?: string | null;
      image?: string | null;
    } | null;
  } | null;
  job?: {
    title?: string | null;
  } | null;
  provider?: {
    name?: string | null;
    image?: string | null;
  } | null;
  date: string;
  subjectTitle: string;
  providerProfile: {
    name: string;
    image: string | null;
  };
}

function createReviewIdempotencyKey() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeBooking(raw: unknown): Booking | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const bookingRecord = raw as Record<string, unknown>;

  if (typeof bookingRecord.id !== "string" || !bookingRecord.id) {
    return null;
  }

  const service =
    bookingRecord.service && typeof bookingRecord.service === "object"
      ? (bookingRecord.service as Record<string, unknown>)
      : {};
  const serviceProvider =
    service.provider && typeof service.provider === "object"
      ? (service.provider as Record<string, unknown>)
      : {};
  const job =
    bookingRecord.job && typeof bookingRecord.job === "object"
      ? (bookingRecord.job as Record<string, unknown>)
      : {};
  const bookingProvider =
    bookingRecord.provider && typeof bookingRecord.provider === "object"
      ? (bookingRecord.provider as Record<string, unknown>)
      : {};

  const serviceTitle =
    typeof service.title === "string" && service.title.trim().length > 0
      ? service.title.trim()
      : null;
  const jobTitle =
    typeof job.title === "string" && job.title.trim().length > 0
      ? job.title.trim()
      : null;

  const providerNameFromService =
    typeof serviceProvider.name === "string" &&
    serviceProvider.name.trim().length > 0
      ? serviceProvider.name.trim()
      : null;
  const providerNameFromBooking =
    typeof bookingProvider.name === "string" &&
    bookingProvider.name.trim().length > 0
      ? bookingProvider.name.trim()
      : null;

  const providerImageFromService =
    typeof serviceProvider.image === "string" && serviceProvider.image
      ? serviceProvider.image
      : null;
  const providerImageFromBooking =
    typeof bookingProvider.image === "string" && bookingProvider.image
      ? bookingProvider.image
      : null;

  const subjectTitle = serviceTitle || jobTitle || "Booked Service";
  const providerName =
    providerNameFromService || providerNameFromBooking || "Service Provider";
  const providerImage = providerImageFromService || providerImageFromBooking;

  return {
    id: bookingRecord.id,
    status:
      typeof bookingRecord.status === "string"
        ? bookingRecord.status
        : "UNKNOWN",
    startTime:
      typeof bookingRecord.startTime === "string"
        ? bookingRecord.startTime
        : null,
    date:
      typeof bookingRecord.date === "string"
        ? bookingRecord.date
        : new Date().toISOString(),
    subjectTitle,
    providerProfile: {
      name: providerName,
      image: providerImage,
    },
    review:
      bookingRecord.review && typeof bookingRecord.review === "object"
        ? {
            id: String(
              (bookingRecord.review as Record<string, unknown>).id || "",
            ),
            authorId:
              typeof (bookingRecord.review as Record<string, unknown>)
                .authorId === "string"
                ? ((bookingRecord.review as Record<string, unknown>)
                    .authorId as string)
                : undefined,
          }
        : null,
    dispute:
      bookingRecord.dispute && typeof bookingRecord.dispute === "object"
        ? {
            status:
              typeof (bookingRecord.dispute as Record<string, unknown>)
                .status === "string"
                ? ((bookingRecord.dispute as Record<string, unknown>)
                    .status as string)
                : null,
          }
        : null,
    service:
      Object.keys(service).length > 0
        ? {
            title: typeof service.title === "string" ? service.title : null,
            provider:
              Object.keys(serviceProvider).length > 0
                ? {
                    name:
                      typeof serviceProvider.name === "string"
                        ? serviceProvider.name
                        : null,
                    image:
                      typeof serviceProvider.image === "string"
                        ? serviceProvider.image
                        : null,
                  }
                : null,
          }
        : null,
    job:
      Object.keys(job).length > 0
        ? {
            title: typeof job.title === "string" ? job.title : null,
          }
        : null,
    provider:
      Object.keys(bookingProvider).length > 0
        ? {
            name:
              typeof bookingProvider.name === "string"
                ? bookingProvider.name
                : null,
            image:
              typeof bookingProvider.image === "string"
                ? bookingProvider.image
                : null,
          }
        : null,
  };
}

function getReviewEligibility(booking: Booking): {
  eligible: boolean;
  reason?: string;
} {
  if (booking.review?.id) {
    return {
      eligible: false,
      reason: "You have already submitted a review for this booking.",
    };
  }

  const bookingDate = new Date(booking.date);
  const scheduledStart = new Date(bookingDate);

  if (booking.startTime) {
    const [hours, minutes] = booking.startTime
      .split(":")
      .map((value) => Number(value));

    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      scheduledStart.setHours(hours, minutes, 0, 0);
    }
  }

  const cancelledAfterStart =
    booking.status === "CANCELLED" && scheduledStart.getTime() <= Date.now();
  const disputeResolved = Boolean(
    booking.dispute?.status &&
    ["RESOLVED", "CLOSED"].includes(booking.dispute.status),
  );
  const eligible =
    booking.status === "COMPLETED" || cancelledAfterStart || disputeResolved;

  if (!eligible) {
    return {
      eligible: false,
      reason:
        "Review is available only after completion, qualifying cancellation, or resolved dispute.",
    };
  }

  return { eligible: true };
}

export default function ReviewSubmissionPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createReviewIdempotencyKey(),
  );
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [commentLength, setCommentLength] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/client/bookings/${bookingId}`);
        if (response.ok) {
          const data = await response.json();
          const normalizedBooking = normalizeBooking(data);

          if (!normalizedBooking) {
            throw new Error("Unable to load booking details");
          }

          const eligibility = getReviewEligibility(normalizedBooking);
          if (!eligibility.eligible) {
            toast.error(
              eligibility.reason || "This booking cannot be reviewed",
            );
            router.push("/client/bookings");
            return;
          }

          setBooking(normalizedBooking);
        } else {
          const data = await response.json().catch(() => null);
          toast.error(
            data?.message || data?.error || "Failed to load booking details",
          );
          router.push("/client/bookings");
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
        toast.error(
          error instanceof Error ? error.message : "Something went wrong",
        );
        router.push("/client/bookings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, router]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);
    setCommentLength(value.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          rating,
          comment,
          idempotencyKey,
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.idempotent) {
          toast.success("Review already submitted for this booking.");
        } else {
          toast.success("Review submitted successfully!");
        }
        router.push("/client/bookings");
      } else {
        const data = await response.json().catch(() => null);
        if (response.status === 409) {
          toast.success("Review already submitted for this booking.");
          router.push("/client/bookings");
          return;
        }

        toast.error(data?.message || data?.error || "Failed to submit review");
        setIdempotencyKey(createReviewIdempotencyKey());
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Something went wrong");
      setIdempotencyKey(createReviewIdempotencyKey());
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingLabels = [
    { value: 1, label: "Terrible", icon: <Frown className="w-5 h-5" /> },
    { value: 2, label: "Poor", icon: <Meh className="w-5 h-5" /> },
    { value: 3, label: "Average", icon: <Meh className="w-5 h-5" /> },
    { value: 4, label: "Good", icon: <Smile className="w-5 h-5" /> },
    { value: 5, label: "Excellent", icon: <ThumbsUp className="w-5 h-5" /> },
  ];

  const getRatingDescription = (ratingValue: number) => {
    const rating = ratingLabels.find((r) => r.value === ratingValue);
    return rating ? rating.label : "";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const formattedBookingDate = (() => {
    const parsedDate = new Date(booking.date);
    if (Number.isNaN(parsedDate.getTime())) {
      return "Unknown date";
    }

    return parsedDate.toLocaleDateString();
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <main className="flex-1 py-4 sm:py-6 lg:py-8 px-3 xs:px-4 sm:px-5 lg:px-8">
        <div className="max-w-lg mx-auto">
          {/* Mobile Back Button */}
          {isMobile && (
            <button
              onClick={() => router.push("/client/bookings")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Bookings
            </button>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xs sm:shadow-sm lg:shadow-md border border-gray-200 overflow-hidden"
          >
            {/* Header Section */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 sm:p-6 lg:p-8 text-center text-white">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                <Award className="w-3 h-3 sm:w-4 sm:h-4" />
                Share Your Experience
              </div>
              <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold mb-1.5 sm:mb-2">
                Rate Your Service
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 opacity-90">
                How was your experience with {booking.providerProfile.name}?
              </p>
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
              {/* Service Details */}
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg sm:rounded-xl border border-gray-100">
                <div
                  className={`${
                    isMobile ? "w-12 h-12" : "w-14 h-14 sm:w-16 sm:h-16"
                  } rounded-full bg-gray-200 bg-cover bg-center flex-shrink-0 border-2 border-white shadow-sm`}
                  style={{
                    backgroundImage: `url(${
                      booking.providerProfile.image || "/placeholder-avatar.png"
                    })`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                    {booking.subjectTitle}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    Completed on {formattedBookingDate}
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-4 sm:space-y-6 lg:space-y-8"
              >
                {/* Star Rating */}
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-3 sm:mb-4">
                    Tap stars to rate
                  </label>

                  {/* Star Rating */}
                  <div className="flex justify-center gap-1 sm:gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`${
                            isMobile ? "w-8 h-8" : "w-10 h-10 sm:w-12 sm:h-12"
                          } transition-all duration-200 ${
                            star <= (hoveredRating || rating)
                              ? "text-amber-400 fill-amber-400"
                              : "text-gray-200"
                          }`}
                          fill={
                            star <= (hoveredRating || rating)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    ))}
                  </div>

                  {/* Rating Label */}
                  <div className="h-6">
                    {rating > 0 && (
                      <p className="text-sm font-medium text-emerald-600 flex items-center justify-center gap-1.5">
                        {ratingLabels.find((r) => r.value === rating)?.icon}
                        {getRatingDescription(rating)}
                        <span className="text-gray-500 ml-1">
                          ({rating} stars)
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Quick Rating Labels - Desktop Only */}
                  {!isMobile && (
                    <div className="mt-3 flex justify-center gap-3">
                      {ratingLabels.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setRating(item.value)}
                          className={`px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-medium transition-all ${
                            rating === item.value
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {item.icon}
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comment */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="comment"
                      className="text-sm font-medium text-gray-700 flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Share your experience (optional)
                    </label>
                    <span className="text-xs text-gray-500">
                      {commentLength}/500
                    </span>
                  </div>
                  <textarea
                    id="comment"
                    rows={isMobile ? 3 : 4}
                    value={comment}
                    onChange={handleCommentChange}
                    maxLength={500}
                    placeholder="What did you like? What could be improved?"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-300 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow resize-none bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    Your review helps other clients and improves our service
                    quality
                  </p>
                </div>

                {/* Desktop: Tips for Good Review */}
                {!isMobile && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-blue-600">
                        lightbulb
                      </span>
                      Tips for a helpful review:
                    </h4>
                    <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
                      <li className="flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        Be specific about what you liked or didn&apos;t like
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        Mention the provider&apos;s punctuality and
                        professionalism
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        Note the quality of work and communication
                      </li>
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div
                  className={`flex ${isMobile ? "flex-col" : "gap-3"} gap-2`}
                >
                  {!isMobile && (
                    <button
                      type="button"
                      onClick={() => router.push("/client/bookings")}
                      className="flex-1 px-4 py-3 sm:py-3.5 bg-white border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-all font-medium text-sm sm:text-base"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting || rating === 0}
                    className={`${
                      isMobile ? "w-full" : "flex-1"
                    } bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 sm:py-3.5 rounded-lg sm:rounded-xl font-bold hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98] text-sm sm:text-base flex items-center justify-center gap-2`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-xs sm:text-sm">
                          Submitting...
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        Submit Review
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Mobile: Review Guidelines */}
          {isMobile && (
            <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Review Guidelines
              </h4>
              <ul className="text-xs text-blue-800 space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Be honest and specific
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Focus on the service quality
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Help others make better choices
                </li>
              </ul>
            </div>
          )}

          {/* Mobile: Quick Rating Emojis */}
          {isMobile && rating === 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2 text-center">
                Quick rating:
              </p>
              <div className="flex justify-center gap-2">
                {ratingLabels.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRating(item.value)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="text-[10px] text-gray-700 mt-0.5 block">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Desktop: Privacy Note */}
          {!isMobile && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Your review will be publicly visible. It helps other clients
                make informed decisions.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
