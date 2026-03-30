"use client";
import { motion } from "framer-motion";
import { useServices } from "@/lib/api/hooks/useServices";
import Link from "next/link";
import { Star, Check, ArrowRight } from "lucide-react";

type FeaturedService = {
  id: string;
  rating?: number;
  reviews?: number;
  rebookedCount?: number;
  price?: number;
  startingPrice?: number;
  images?: string[];
  provider?: {
    image?: string | null;
    name?: string;
    isVerified?: boolean;
  };
  category?: {
    name?: string;
  };
};

const FeaturedProfessionals = () => {
  const { data, isLoading } = useServices({ limit: 3, sort: "rebooked" });
  const services: FeaturedService[] = data?.services || [];

  return (
    <section
      className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8"
      aria-label="Featured professionals"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, margin: "-20px" }}
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400 sm:text-xs">
              Step 3: Choose
            </p>
            <h2 className="gradient-text-hero landing-display text-[1.5rem] font-bold tracking-tight sm:text-3xl md:text-4xl">
              Professionals clients rebook the most
            </h2>
          </motion.div>
          <Link
            href="/professionals"
            className="hidden items-center gap-1 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300 sm:flex"
          >
            View All <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-white/6 bg-white/3"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {services.map((service, index) => {
              const ratingValue =
                typeof service.rating === "number" ? service.rating : 0;
              const roundedRating = Math.round(ratingValue);
              const reviewCount = service.reviews || 0;

              return (
                <motion.div
                  key={service.id}
                  className="group glass-card glass-card-hover flex flex-col items-center rounded-2xl p-5 text-center sm:p-6 transition-all duration-500"
                  initial={{ opacity: 0, y: 25, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.45, delay: index * 0.1, ease: [0.23, 1, 0.32, 1] }}
                  viewport={{ once: true, margin: "-20px" }}
                >
                  {/* Avatar with animated ring */}
                  <div className="relative mb-4">
                    {/* Pulse ring */}
                    <div className="absolute inset-0 rounded-full ring-2 ring-emerald-400/30 animate-pulse-ring" aria-hidden="true" />
                    <div className="h-18 w-18 overflow-hidden rounded-full ring-2 ring-emerald-400/40 ring-offset-2 ring-offset-[#0a0f0d] transition-all duration-500 group-hover:ring-emerald-400/70 group-hover:ring-offset-4 sm:h-20 sm:w-20">
                      <div
                        className="w-full h-full bg-center bg-no-repeat bg-cover transition-transform duration-500 group-hover:scale-110"
                        style={{
                          backgroundImage: `url("${service.provider?.image || service.images?.[0] || "/images/placeholder.png"}")`,
                        }}
                      />
                    </div>
                    {service.provider?.isVerified && (
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-0.5 text-white shadow-md shadow-emerald-500/30">
                        <Check className="w-3 h-3" aria-hidden="true" />
                        <span className="sr-only">Verified</span>
                      </div>
                    )}
                  </div>

                  <h3 className="landing-display text-base font-semibold text-white sm:text-lg">
                    {service.provider?.name || "Professional"}
                  </h3>
                  <p className="mt-0.5 text-xs text-white/70">
                    {service.category?.name || "Specialist"}
                  </p>

                  <div className="flex items-center gap-1 mt-2.5" aria-label={`${ratingValue.toFixed(1)} out of 5 stars`}>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 transition-all duration-300 ${i < roundedRating && ratingValue > 0 ? "fill-amber-400 text-amber-400 group-hover:scale-110" : "fill-white/10 text-white/10"}`}
                        aria-hidden="true"
                      />
                    ))}
                    <span className="ml-1 text-xs text-white/70">
                      {ratingValue > 0
                        ? `${ratingValue.toFixed(1)} (${reviewCount})`
                        : "No reviews yet"}
                    </span>
                  </div>

                  <p className="mt-1.5 text-[11px] font-medium text-emerald-300/85">
                    {service.rebookedCount || 0} repeat bookings
                  </p>

                  <div className="mt-4 flex w-full items-center justify-between border-t border-white/8 pt-4">
                    <span className="text-xs text-white/70">From</span>
                    <span className="text-sm font-semibold text-emerald-400">
                      Ksh{" "}
                      {Number(
                        service.price || service.startingPrice || 0,
                      ).toLocaleString()}
                    </span>
                  </div>

                  <Link
                    href={`/services/${service.id}`}
                    className="w-full mt-3"
                  >
                    <button className="w-full rounded-xl border border-white/10 bg-white/4 px-4 py-2.5 text-xs font-semibold text-white/80 transition-all duration-300 hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-emerald-400 sm:text-sm">
                      Shortlist Pro
                    </button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Mobile View All */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/professionals"
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-400"
          >
            View All Professionals <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProfessionals;
