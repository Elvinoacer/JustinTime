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
  },
  {
    num: "02",
    title: "Compare matches",
    description:
      "Browse profiles, ratings, and reviews. Pick the professional that fits your budget.",
    icon: UserCheck,
  },
  {
    num: "03",
    title: "Hire a Pro",
    description:
      "Confirm your booking, pay securely with M-Pesa, and let the professional handle the rest.",
    icon: CalendarCheck,
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
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42 } },
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
          viewport={{ once: true, margin: "-50px" }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400 sm:text-xs">
            Step 3: Book
          </p>
          <h2 className="landing-display text-[1.5rem] font-bold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">
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
                className="glass-card glass-card-hover relative flex flex-col rounded-2xl p-5 sm:p-6"
                variants={stepItem}
              >
                {/* Step number + icon */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/15 sm:h-10 sm:w-10">
                    <Icon className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  </div>
                  <span className="text-3xl font-bold text-emerald-400/20" aria-hidden="true">
                    {step.num}
                  </span>
                </div>

                <h3 className="landing-display mb-2 text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/60">
                  {step.description}
                </p>

                {/* Mobile connector */}
                {index < steps.length - 1 && (
                  <div
                    className="mx-auto mt-5 h-6 w-px bg-emerald-400/30 md:hidden"
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
