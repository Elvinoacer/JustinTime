"use client";
import { motion } from "framer-motion";
import { Search, UserCheck, CalendarCheck } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "Post your request",
    description:
      "Enter what you need in the search bar or browse categories to find the perfect service.",
    icon: Search,
    accent: "text-emerald-400",
    bg: "bg-emerald-500/15",
    borderAccent: "border-t-emerald-400/40",
    gradient: "from-emerald-500/10 to-transparent",
  },
  {
    num: "02",
    title: "Compare matches",
    description:
      "Browse profiles, ratings, and reviews. Pick the professional that fits your budget.",
    icon: UserCheck,
    accent: "text-cyan-400",
    bg: "bg-cyan-500/15",
    borderAccent: "border-t-cyan-400/40",
    gradient: "from-cyan-500/10 to-transparent",
  },
  {
    num: "03",
    title: "Hire a Pro",
    description:
      "Confirm your booking, pay securely with M-Pesa, and let the professional handle the rest.",
    icon: CalendarCheck,
    accent: "text-amber-400",
    bg: "bg-amber-500/15",
    borderAccent: "border-t-amber-400/40",
    gradient: "from-amber-500/10 to-transparent",
  },
];

const stepsContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const stepItem = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } },
};

const HowItWorks = () => {
  return (
    <section
      className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8"
      aria-label="How it works"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          className="mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-20px" }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400 sm:text-xs">
            Step 3: Book
          </p>
          <h2 className="gradient-text-cool landing-display text-[1.5rem] font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
            Three clear steps to completed work
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            No confusion, no back-and-forth. Just a clean path from request to
            confirmed booking.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 md:gap-8"
          variants={stepsContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                className={`group glass-card glass-card-hover relative flex flex-col rounded-2xl border-t-2 ${step.borderAccent} p-5 sm:p-6 overflow-hidden`}
                variants={stepItem}
              >
                {/* Watermark number */}
                <span
                  className="pointer-events-none absolute -right-3 -top-4 text-[6rem] font-black leading-none text-white/[0.03] sm:text-[7rem]"
                  aria-hidden="true"
                >
                  {step.num}
                </span>

                {/* Gradient backdrop */}
                <div
                  className={`pointer-events-none absolute inset-0 bg-linear-to-b ${step.gradient} opacity-50`}
                  aria-hidden="true"
                />

                {/* Step number + icon */}
                <div className="relative z-10 flex items-center gap-3 mb-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 ${step.bg} shadow-lg sm:h-10 sm:w-10`}>
                    <Icon className={`h-5 w-5 ${step.accent}`} aria-hidden="true" />
                  </div>
                  <span className={`text-3xl font-bold ${step.accent} opacity-20`} aria-hidden="true">
                    {step.num}
                  </span>
                </div>

                <h3 className={`relative z-10 landing-display mb-2 text-lg font-semibold ${step.accent}`}>
                  {step.title}
                </h3>
                <p className="relative z-10 text-sm leading-relaxed text-white/70">
                  {step.description}
                </p>

                {/* Mobile connector */}
                {index < steps.length - 1 && (
                  <div
                    className="mx-auto mt-5 h-6 w-px md:hidden"
                    style={{
                      background: "linear-gradient(180deg, rgba(52,211,153,0.4), rgba(34,211,238,0.2))",
                    }}
                    aria-hidden="true"
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
