"use client";
import { motion } from "framer-motion";
import { Compass, SearchCheck, ShieldCheck, Sparkles } from "lucide-react";

const milestones = [
  {
    icon: Compass,
    step: "01",
    title: "Discover",
    description: "Start with service categories that match your exact need.",
    accent: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-400/20",
    glow: "shadow-emerald-500/20",
  },
  {
    icon: SearchCheck,
    step: "02",
    title: "Compare",
    description: "Review top options, ratings, and pricing with full clarity.",
    accent: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-400/20",
    glow: "shadow-cyan-500/20",
  },
  {
    icon: ShieldCheck,
    step: "03",
    title: "Trust",
    description: "Book vetted professionals with secure platform protection.",
    accent: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-400/20",
    glow: "shadow-amber-500/20",
  },
  {
    icon: Sparkles,
    step: "04",
    title: "Delight",
    description: "Get the work done and rebook your favorites in seconds.",
    accent: "text-violet-400",
    bg: "bg-violet-500/15",
    border: "border-violet-400/20",
    glow: "shadow-violet-500/20",
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {milestones.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.08 }}
                  viewport={{ once: true, margin: "-30px" }}
                  className={`relative rounded-xl border ${item.border} bg-white/[0.04] p-3.5 transition-all duration-300 hover:bg-white/[0.07]`}
                >
                  {index < milestones.length - 1 && (
                    <div
                      className="pointer-events-none absolute -right-2 top-1/2 hidden h-px w-4 -translate-y-1/2 md:block"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(52,211,153,0.4), rgba(34,211,238,0.3))",
                      }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="mb-2.5 flex items-center justify-between">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.bg} ${item.accent} shadow-lg ${item.glow}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span
                      className={`text-[10px] font-bold tracking-[0.16em] ${item.accent} opacity-50`}
                    >
                      {item.step}
                    </span>
                  </div>
                  <h3
                    className={`landing-display text-sm font-semibold ${item.accent}`}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">
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
