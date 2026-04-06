"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";

const perks = [
  "Create your professional profile in minutes",
  "Set your own prices and availability",
  "Get matched with clients in your area",
  "Receive payments via M-Pesa instantly",
  "Build your reputation with reviews",
  "Access to thousands of potential customers",
];

const JoinAsPro = () => {
  return (
    <section
      className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8"
      aria-label="Join as a professional"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-2 md:gap-12 md:items-center">
          {/* Left — Image */}
          <motion.div
            className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-emerald-400/20 sm:rounded-3xl"
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            viewport={{ once: true, margin: "-20px" }}
          >
            <div
              className="absolute inset-0 bg-center bg-cover transition-transform duration-700 hover:scale-105"
              style={{
                backgroundImage: `url("https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=450&fit=crop")`,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(10,15,13,0.7) 0%, rgba(10,15,13,0.2) 50%, transparent 100%)",
              }}
            />
            <div className="absolute bottom-4 left-4 rounded-xl border border-white/[0.12] bg-white/[0.1] px-4 py-3 backdrop-blur-xl">
              <p className="gradient-text-emerald text-xl font-bold">
                KSh 85k+
              </p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-400">
                avg. monthly earnings
              </p>
            </div>
          </motion.div>

          {/* Right — Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true, margin: "-20px" }}
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400 sm:text-xs">
              For Professionals
            </p>
            <h2 className="gradient-text-hero landing-display text-[1.5rem] font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
              Turn your skills into recurring income
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65 sm:text-base">
              Join Kenya&apos;s fastest-growing marketplace for service
              professionals. Reach more clients, manage bookings in one place,
              and get paid faster.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
              {perks.map((perk, index) => (
                <motion.div
                  key={index}
                  className="flex items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 transition-all duration-300 hover:border-emerald-400/20 hover:bg-white/[0.07]"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
                  viewport={{ once: true, margin: "-20px" }}
                >
                  <CheckCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                    aria-hidden="true"
                  />
                  <span className="text-[13px] text-white/80 sm:text-sm">
                    {perk}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/join">
                <motion.button
                  className="shimmer-btn group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-colors hover:from-emerald-400 hover:to-teal-400 sm:w-auto"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Start Earning as a Pro
                  <ArrowRight
                    className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                </motion.button>
              </Link>
              <Link href="/about">
                <motion.button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all hover:border-emerald-400/30 hover:text-emerald-400 sm:w-auto"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Learn More
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default JoinAsPro;
