"use client";
import { motion } from "framer-motion";
import { useServices } from "@/lib/api/hooks/useServices";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type LandingService = {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
};

const cardsContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const cardItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.36 } },
};

const PopularServices = () => {
  const { data, isLoading } = useServices({ limit: 6, sort: "rebooked" });
  const services: LandingService[] = data?.services || [];

  return (
    <section className="px-4 py-14 sm:px-6 sm:py-18 md:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <motion.div
          className="mb-9 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Step 2: Compare
          </p>
          <h2 className="landing-display text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Most booked services this week
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Start with proven options that consistently deliver quality and
            client satisfaction.
          </p>
        </motion.div>

        {/* Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-2xl border border-white/6 bg-white/3"
              />
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
            variants={cardsContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
          >
            {services.map((service) => (
              <motion.div
                key={service.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/3 shadow-[0_16px_45px_-24px_rgba(0,0,0,0.65)]"
                variants={cardItem}
              >
                <div className="absolute inset-0">
                  {service.images?.[0] || service.imageUrl ? (
                    <div
                      className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{
                        backgroundImage: `url("${service.images?.[0] || service.imageUrl}")`,
                      }}
                    />
                  ) : (
                    <div className="h-full w-full bg-[radial-gradient(circle_at_18%_16%,rgba(16,185,129,0.42),transparent_55%),linear-gradient(130deg,rgba(5,34,26,0.98)_0%,rgba(4,26,21,0.98)_100%)]" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.55)_45%,rgba(0,0,0,0.82)_100%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(65%_50%_at_14%_85%,rgba(16,185,129,0.32),transparent_76%)]" />
                </div>

                <div className="relative z-10 flex h-56 flex-col justify-end p-5 sm:h-60 sm:p-6">
                  <p className="mb-2 w-fit rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-emerald-200/90 backdrop-blur-sm">
                    Top pick
                  </p>

                  <h3 className="mb-2 line-clamp-1 text-base font-semibold text-white transition-colors group-hover:text-emerald-200 sm:text-lg">
                    {service.title || service.name}
                  </h3>

                  <p className="mb-4 line-clamp-2 max-w-[96%] text-xs leading-relaxed text-white/78 sm:text-sm">
                    {service.description}
                  </p>

                  <div>
                    <Link
                      href={`/services/${service.id}`}
                      className="group/link inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition-colors hover:border-emerald-300/45 hover:text-emerald-100 sm:text-sm"
                    >
                      Review Service
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* View All */}
        <motion.div
          className="mt-10 sm:mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <Link href="/services">
            <motion.button
              className="group inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/4 px-6 py-2.5 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all duration-300 hover:border-emerald-400/30 hover:text-emerald-400"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Compare All Services
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PopularServices;
