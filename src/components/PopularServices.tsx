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
  show: { transition: { staggerChildren: 0.07 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 22, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] },
  },
};

const PopularServices = () => {
  const { data, isLoading } = useServices({ limit: 6, sort: "rebooked" });
  const services: LandingService[] = data?.services || [];

  return (
    <section
      className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8"
      aria-label="Popular services"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-20px" }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400 sm:text-xs">
            Step 2: Compare
          </p>
          <h2 className="gradient-text-cool landing-display text-[1.5rem] font-bold tracking-tight sm:text-3xl md:text-4xl">
            Most booked services this week
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
            Start with proven options that consistently deliver quality and
            client satisfaction.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03] sm:h-56"
              />
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
            variants={cardsContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
          >
            {services.map((service) => (
              <motion.div
                key={service.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_16px_45px_-24px_rgba(0,0,0,0.65)] transition-all duration-500 hover:border-cyan-400/30 hover:shadow-[0_20px_50px_-20px_rgba(34,211,238,0.2)] hover:-translate-y-1"
                variants={cardItem}
              >
                <div className="absolute inset-0" aria-hidden="true">
                  {service.images?.[0] || service.imageUrl ? (
                    <div
                      className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{
                        backgroundImage: `url("${service.images?.[0] || service.imageUrl}")`,
                      }}
                    />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{
                        background:
                          "radial-gradient(circle at 18% 16%, rgba(16,185,129,0.42), transparent 55%), linear-gradient(130deg, rgba(5,34,26,0.98) 0%, rgba(4,26,21,0.98) 100%)",
                      }}
                    />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.88) 100%)",
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(65% 50% at 14% 85%, rgba(16,185,129,0.32), transparent 76%)",
                    }}
                  />
                </div>

                <div className="relative z-10 flex h-52 flex-col justify-end p-5 sm:h-60 sm:p-6">
                  <p className="animate-badge-pulse mb-2 w-fit rounded-full border border-cyan-400/30 bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-cyan-200/90 backdrop-blur-sm">
                    Top pick
                  </p>
                  <h3 className="mb-2 line-clamp-1 text-base font-semibold text-white transition-colors group-hover:text-cyan-200 sm:text-lg">
                    {service.title || service.name}
                  </h3>
                  <p className="mb-4 line-clamp-2 max-w-[96%] text-xs leading-relaxed text-white/75 sm:text-sm">
                    {service.description}
                  </p>
                  <div>
                    <Link
                      href={`/services/${service.id}`}
                      className="group/link inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/45 px-3.5 py-2 text-xs font-semibold text-white/90 backdrop-blur-sm transition-all duration-300 hover:border-cyan-300/45 hover:bg-cyan-500/15 hover:text-cyan-100 sm:text-sm"
                    >
                      Review Service
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <motion.div
          className="mt-10 sm:mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true, margin: "-20px" }}
        >
          <Link href="/services">
            <motion.button
              className="group inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-6 py-2.5 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/30 hover:text-cyan-400"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Compare All Services
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PopularServices;
