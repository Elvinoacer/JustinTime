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
    <section className="px-4 py-14 sm:px-6 sm:py-18 md:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left — Image */}
          <motion.div
            className="relative aspect-4/3 overflow-hidden rounded-3xl border border-emerald-400/20"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{
                backgroundImage: `url("https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=450&fit=crop")`,
              }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#0a0f0d]/70 via-[#0a0f0d]/20 to-transparent" />
            {/* Floating badge */}
            <div className="absolute bottom-4 left-4 rounded-xl border border-white/[0.12] bg-white/[0.1] px-4 py-3 backdrop-blur-xl">
              <p className="text-xl font-bold text-white">KSh 85k+</p>
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
            viewport={{ once: true, margin: "-50px" }}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              For Professionals
            </p>
            <h2 className="landing-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
              Turn your skills into recurring income
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
              Join Kenya&apos;s fastest-growing marketplace for service
              professionals. Reach more clients, manage bookings in one place,
              and get paid faster.
            </p>

            {/* Perks list */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {perks.map((perk, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5"
                >
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="text-xs text-white/80 sm:text-sm">
                    {perk}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/auth/signup?callbackUrl=/provider/onboarding">
                <motion.button
                  className="group inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-colors hover:from-emerald-400 hover:to-teal-400"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Start Earning as a Pro
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </motion.button>
              </Link>
              <Link href="/about">
                <motion.button
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all hover:border-emerald-400/30 hover:text-emerald-400"
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
