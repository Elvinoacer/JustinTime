"use client";

import { motion } from "framer-motion";
import { Compass, SearchCheck, ShieldCheck, Sparkles } from "lucide-react";

const milestones = [
  {
    icon: Compass,
    step: "01",
    title: "Discover",
    description: "Start with service categories that match your exact need.",
  },
  {
    icon: SearchCheck,
    step: "02",
    title: "Compare",
    description: "Review top options, ratings, and pricing with full clarity.",
  },
  {
    icon: ShieldCheck,
    step: "03",
    title: "Trust",
    description: "Book vetted professionals with secure platform protection.",
  },
  {
    icon: Sparkles,
    step: "04",
    title: "Delight",
    description: "Get the work done and rebook your favorites in seconds.",
  },
];

const LandingNarrativeRail = () => {
  return (
    <section
      className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
      aria-label="Booking journey steps"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="glass-card rounded-2xl p-4 sm:p-5"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-40px" }}
        >
          <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400 sm:text-xs">
            Your Booking Journey
          </p>

          {/* Mobile: vertical stack. Desktop: horizontal 4-col grid. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
            {milestones.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.08 }}
                  viewport={{ once: true, margin: "-30px" }}
                  className="relative rounded-xl border border-white/[0.08] bg-white/[0.04] p-3.5 sm:px-3 sm:py-3"
                >
                  {/* Desktop connector line */}
                  {index < milestones.length - 1 && (
                    <div
                      className="pointer-events-none absolute -right-2 top-1/2 hidden h-px w-4 -translate-y-1/2 bg-emerald-400/30 md:block"
                      aria-hidden="true"
                    />
                  )}
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 sm:h-8 sm:w-8">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span className="text-[10px] font-bold tracking-[0.16em] text-emerald-400/60">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="landing-display text-sm font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingNarrativeRail;
