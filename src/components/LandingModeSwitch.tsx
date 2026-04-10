"use client";

import Link from "next/link";

import useLandingEvents from "@/hooks/useLandingEvents";
import { useLandingCopyVariant } from "@/hooks/useLandingCopyVariant";

const LandingModeSwitch = () => {
  const variant = useLandingCopyVariant();
  const { trackEvent } = useLandingEvents();

  const onSwitch = (newVariant: "booking" | "pro") => {
    if (newVariant === variant) return;
    trackEvent("landing:variant_switched", { variant: newVariant });
  };

  return (
    <section className="px-4 sm:px-6 lg:px-8" aria-label="Landing mode switch">
      <div className="mx-auto max-w-6xl pb-2">
        <div className="inline-flex w-full items-center rounded-full border border-white/20 bg-black/25 p-1 backdrop-blur-sm sm:w-auto">
          <Link
            href="/?focus=booking"
            onClick={() => onSwitch("booking")}
            className={`flex-1 rounded-full px-4 py-2 text-center text-[11px] font-semibold transition sm:flex-none sm:text-xs ${
              variant === "booking"
                ? "bg-white text-black"
                : "text-white/75 hover:text-white"
            }`}
          >
            Hiring Mode
          </Link>
          <Link
            href="/?focus=pro"
            onClick={() => onSwitch("pro")}
            className={`flex-1 rounded-full px-4 py-2 text-center text-[11px] font-semibold transition sm:flex-none sm:text-xs ${
              variant === "pro"
                ? "bg-white text-black"
                : "text-white/75 hover:text-white"
            }`}
          >
            Pro Growth Mode
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LandingModeSwitch;
