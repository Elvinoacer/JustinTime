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
  },
  {
    title: "Instant Booking",
    description: "Book a professional in minutes. No phone calls, no waiting.",
    icon: Clock,
  },
  {
    title: "M-Pesa Payments",
    description: "Pay securely with M-Pesa or card. No cash needed.",
    icon: CreditCard,
  },
  {
    title: "Happiness Guarantee",
    description: "Not satisfied? We'll make it right or refund your payment.",
    icon: Umbrella,
  },
  {
    title: "24/7 Support",
    description: "Our support team is always available to assist you.",
    icon: Headphones,
  },
  {
    title: "Top-Rated Quality",
    description: "98% satisfaction rate. Exceptional service every time.",
    icon: ThumbsUp,
  },
];

const benefitsContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const benefitItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.36 } },
};

const Benefits = () => {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-18 md:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          className="mb-9 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Step 4: Trust & Repeat
          </p>
          <h2 className="landing-display text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Why clients keep coming back
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Designed to remove friction and risk, so every booking feels easy
            and dependable.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
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
                className="group glass-card glass-card-hover rounded-2xl p-5 sm:p-6"
                variants={benefitItem}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/15 transition-colors group-hover:bg-emerald-500/25">
                  <Icon className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="landing-display mb-1.5 text-base font-semibold text-white sm:text-lg">
                  {benefit.title}
                </h3>
                <p className="text-xs leading-relaxed text-white/60 sm:text-sm">
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
