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
    image?: string;
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
    <section className="px-4 py-14 sm:px-6 sm:py-18 md:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-9 flex items-end justify-between sm:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Step 3: Choose
            </p>
            <h2 className="landing-display text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
              Professionals clients rebook the most
            </h2>
          </motion.div>
          <Link
            href="/professionals"
            className="hidden items-center gap-1 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300 sm:flex"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-white/6 bg-white/3"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service, index) => {
              const ratingValue =
                typeof service.rating === "number" ? service.rating : 0;
              const roundedRating = Math.round(ratingValue);
              const reviewCount = service.reviews || 0;

              return (
                <motion.div
                  key={service.id}
                  className="group glass-card glass-card-hover flex flex-col items-center rounded-2xl p-5 text-center sm:p-6"
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true, margin: "-50px" }}
                >
                  {/* Avatar with ring */}
                  <div className="relative mb-4">
                    <div className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-emerald-400/40 ring-offset-2 ring-offset-[#0a0f0d] transition-all duration-300 group-hover:ring-emerald-400/60 sm:h-20 sm:w-20">
                      <div
                        className="w-full h-full bg-center bg-no-repeat bg-cover"
                        style={{
                          backgroundImage: `url("${service.provider?.image || service.images?.[0] || "/images/placeholder.png"}")`,
                        }}
                      />
                    </div>
                    {service.provider?.isVerified && (
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-0.5 text-white shadow-md shadow-emerald-500/30">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  <h3 className="landing-display text-base font-semibold text-white sm:text-lg">
                    {service.provider?.name || "Professional"}
                  </h3>
                  <p className="mt-0.5 text-xs text-white/50">
                    {service.category?.name || "Specialist"}
                  </p>

                  <div className="flex items-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < roundedRating && ratingValue > 0 ? "fill-amber-400 text-amber-400" : "fill-white/10 text-white/10"}`}
                      />
                    ))}
                    <span className="ml-1 text-xs text-white/50">
                      {ratingValue > 0
                        ? `${ratingValue.toFixed(1)} (${reviewCount})`
                        : "No reviews yet"}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] font-medium text-emerald-300/85">
                    {service.rebookedCount || 0} repeat bookings
                  </p>

                  <div className="mt-4 flex w-full items-center justify-between border-t border-white/8 pt-4">
                    <span className="text-xs text-white/50">From</span>
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
                    <button className="w-full rounded-xl border border-white/10 bg-white/4 px-4 py-2 text-xs font-semibold text-white/80 transition-all duration-300 hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-emerald-400">
                      Shortlist Pro
                    </button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Mobile View All */}
        <div className="sm:hidden mt-8 text-center">
          <Link
            href="/professionals"
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-400"
          >
            View All Professionals <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProfessionals;
