"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Booking {
  id: string;
  service: {
    title: string;
    provider: {
      name: string;
      image: string | null;
    };
  };
  date: string;
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
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        if (response.ok) {
          const data = await response.json();
          setBooking(data);
        } else {
          toast.error("Failed to load booking details");
          router.push("/client/bookings");
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
        toast.error("Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, router]);

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
        }),
      });

      if (response.ok) {
        toast.success("Review submitted successfully!");
        router.push("/client/bookings");
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* Header Section */}
            <div className="bg-emerald-600 p-8 text-center text-white">
              <h1 className="text-3xl font-bold mb-2">Rate Your Experience</h1>
              <p className="text-emerald-100">
                How was your service with {booking.service.provider.name}?
              </p>
            </div>

            <div className="p-8">
              {/* Service Details */}
              <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div 
                  className="w-16 h-16 bg-gray-200 rounded-full bg-cover bg-center flex-shrink-0"
                  style={{ backgroundImage: `url(${booking.service.provider.image || '/placeholder-avatar.png'})` }}
                />
                <div>
                  <h3 className="font-bold text-gray-900">{booking.service.title}</h3>
                  <p className="text-sm text-gray-500">
                    Completed on {new Date(booking.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Star Rating */}
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Tap to Rate
                  </label>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <span 
                          className={`material-symbols-outlined text-5xl transition-colors ${
                            star <= (hoveredRating || rating)
                              ? "text-amber-400 fill-current"
                              : "text-gray-200"
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm font-medium text-emerald-600 h-5">
                    {rating === 1 && "Terrible"}
                    {rating === 2 && "Bad"}
                    {rating === 3 && "Okay"}
                    {rating === 4 && "Good"}
                    {rating === 5 && "Excellent!"}
                  </p>
                </div>

                {/* Comment */}
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Share your experience (optional)
                  </label>
                  <textarea
                    id="comment"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What did you like? What could be improved?"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || rating === 0}
                  className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    "Submit Review"
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
