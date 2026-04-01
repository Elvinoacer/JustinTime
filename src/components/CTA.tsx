"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLandingCopyVariant } from "@/hooks/useLandingCopyVariant";
import useLandingEvents from "@/hooks/useLandingEvents";

const CTA = () => {
  const variant = useLandingCopyVariant();
  const { trackEvent } = useLandingEvents();
  const isProVariant = variant === "pro";

  const copy = isProVariant
    ? {
        kicker: "Scale your business",
        title: "Ready to turn your expertise into stable monthly revenue?",
        subtitle:
          "Join the pro network, get booked by trusted clients, and manage work from one dashboard.",
        primaryLabel: "Create Pro Account",
        primaryHref: "/auth/signup?callbackUrl=/provider/onboarding",
        secondaryLabel: "See Pro Benefits",
        secondaryHref: "/about",
      }
    : {
        kicker: "Start in minutes",
        title: "Ready to book with confidence today?",
        subtitle:
          "Lock in a verified professional, transparent pricing, and secure payment in one smooth flow.",
        primaryLabel: "Book My First Pro",
        primaryHref: "/auth/signup",
        secondaryLabel: "Browse Services",
        secondaryHref: "/services",
      };

  return (
    <section
      className="px-4 py-10 sm:px-6 sm:py-14 md:py-20 lg:px-8"
      aria-label="Call to action"
    >
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="relative flex flex-col items-center gap-6 overflow-hidden rounded-2xl border border-white/[0.1] p-6 sm:gap-8 sm:rounded-3xl sm:p-8 md:flex-row md:p-12 md:gap-10 lg:p-14 backdrop-blur-xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(34,211,238,0.05) 40%, rgba(168,85,247,0.06) 70%, rgba(52,211,153,0.08) 100%)",
          }}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          viewport={{ once: true, margin: "-20px" }}
        >
          <div
            className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full blur-[80px]"
            style={{ background: "rgba(16,185,129,0.18)" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full blur-[60px]"
            style={{ background: "rgba(34,211,238,0.12)" }}
            aria-hidden="true"
          />
          <div
            className="shimmer-btn pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 flex-1 text-center md:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400 sm:text-xs sm:tracking-[0.18em]">
              {copy.kicker}
            </p>
            <h2 className="gradient-text-hero landing-display mt-2 text-xl font-bold leading-tight sm:text-2xl md:text-3xl lg:text-4xl">
              {copy.title}
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/65 sm:text-base">
              {copy.subtitle}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Link
                href={copy.primaryHref}
                onClick={() =>
                  trackEvent("landing:cta_clicked", {
                    ctaLabel: copy.primaryLabel,
                    ctaLocation: "final_cta",
                    variant,
                  })
                }
              >
                <motion.button
                  className="shimmer-btn group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-colors hover:from-emerald-400 hover:to-teal-400 sm:w-auto"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {copy.primaryLabel}
                  <ArrowRight
                    className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                </motion.button>
              </Link>
              <Link
                href={copy.secondaryHref}
                onClick={() =>
                  trackEvent("landing:cta_clicked", {
                    ctaLabel: copy.secondaryLabel,
                    ctaLocation: "final_cta",
                    variant,
                  })
                }
              >
                <motion.button
                  className="w-full rounded-xl border border-white/[0.15] bg-white/[0.06] px-6 py-3.5 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all hover:border-emerald-400/30 hover:text-emerald-400 sm:w-auto"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {copy.secondaryLabel}
                </motion.button>
              </Link>
            </div>
          </div>

          <div className="relative z-10 hidden h-48 w-48 shrink-0 overflow-hidden rounded-xl border border-emerald-400/20 shadow-2xl shadow-emerald-500/10 sm:block md:h-56 md:w-56 lg:h-64 lg:w-64 sm:rounded-2xl">
            <div
              className="w-full h-full bg-center bg-cover transition-transform duration-700 hover:scale-110"
              style={{
                backgroundImage: `url("https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&h=400&fit=crop")`,
              }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
