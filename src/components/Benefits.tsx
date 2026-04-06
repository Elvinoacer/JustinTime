"use client";
import { motion } from "framer-motion";
import {
  Shield,
  Clock,
  CreditCard,
  Umbrella,
  Headphones,
  ThumbsUp,
} from "lucide-react";

const benefits = [
  {
    title: "Verified Professionals",
    description: "Every pro is background-checked and vetted before joining.",
    icon: Shield,
    accent: "text-emerald-400",
    bg: "bg-emerald-500/15",
    borderTop: "border-t-emerald-400/40",
    gradient: "from-emerald-500/8 to-transparent",
  },
  {
    title: "Instant Booking",
    description: "Book a professional in minutes. No phone calls, no waiting.",
    icon: Clock,
    accent: "text-cyan-400",
    bg: "bg-cyan-500/15",
    borderTop: "border-t-cyan-400/40",
    gradient: "from-cyan-500/8 to-transparent",
  },
  {
    title: "M-Pesa Payments",
    description: "Pay securely with M-Pesa or card. No cash needed.",
    icon: CreditCard,
    accent: "text-amber-400",
    bg: "bg-amber-500/15",
    borderTop: "border-t-amber-400/40",
    gradient: "from-amber-500/8 to-transparent",
  },
  {
    title: "Happiness Guarantee",
    description: "Not satisfied? We'll make it right or refund your payment.",
    icon: Umbrella,
    accent: "text-rose-400",
    bg: "bg-rose-500/15",
    borderTop: "border-t-rose-400/40",
    gradient: "from-rose-500/8 to-transparent",
  },
  {
    title: "24/7 Support",
    description: "Our support team is always available to assist you.",
    icon: Headphones,
    accent: "text-violet-400",
    bg: "bg-violet-500/15",
    borderTop: "border-t-violet-400/40",
    gradient: "from-violet-500/8 to-transparent",
  },
  {
    title: "Top-Rated Quality",
    description: "98% satisfaction rate. Exceptional service every time.",
    icon: ThumbsUp,
    accent: "text-teal-400",
    bg: "bg-teal-500/15",
    borderTop: "border-t-teal-400/40",
    gradient: "from-teal-500/8 to-transparent",
  },
];

const benefitsContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const benefitItem = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] as const },
  },
};

const Benefits = () => {
  return (
    <section
      className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8"
      aria-label="Benefits"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-20px" }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400 sm:text-xs">
            Step 4: Trust &amp; Repeat
          </p>
          <h2 className="gradient-text-hero landing-display text-[1.5rem] font-bold tracking-tight sm:text-3xl md:text-4xl">
            Why clients keep coming back
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
            Designed to remove friction and risk, so every booking feels easy
            and dependable.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
          variants={benefitsContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
        >
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                className={`group glass-card glass-card-hover relative overflow-hidden rounded-2xl border-t-2 ${benefit.borderTop} p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5`}
                variants={benefitItem}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-linear-to-br ${benefit.gradient} opacity-60`}
                  aria-hidden="true"
                />
                <div
                  className={`relative z-10 mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 ${benefit.bg} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}
                >
                  <Icon
                    className={`h-5 w-5 ${benefit.accent}`}
                    aria-hidden="true"
                  />
                </div>
                <h3
                  className={`relative z-10 landing-display mb-1.5 text-base font-semibold ${benefit.accent} sm:text-lg`}
                >
                  {benefit.title}
                </h3>
                <p className="relative z-10 text-sm leading-relaxed text-white/65">
                  {benefit.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default Benefits;
