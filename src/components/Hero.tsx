"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import useLandingEvents from "@/hooks/useLandingEvents";
import { useLandingCopyVariant } from "@/hooks/useLandingCopyVariant";

const HERO_STYLE = `
  .jit-hero-root {
    position: relative;
    width: 100%;
    min-height: calc(100vh - var(--public-header-h));
    min-height: calc(100svh - var(--public-header-h));
    padding-top: var(--public-header-h);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: #040806;
  }

  .jit-hero-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    z-index: 0;
    opacity: 1;
    filter: saturate(1.08) contrast(1.03);
    transform-origin: center;
    animation: jit-hero-video-drift 28s ease-in-out infinite alternate;
  }

  .jit-hero-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.16) 0%,
        rgba(0, 0, 0, 0.24) 52%,
        rgba(0, 0, 0, 0.52) 100%
      ),
      linear-gradient(
        100deg,
        rgba(4, 16, 12, 0.46) 0%,
        rgba(0, 0, 0, 0.2) 54%,
        rgba(4, 16, 12, 0.18) 100%
      );
  }

  .jit-liquid-glass {
    background: linear-gradient(160deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.24) 100%);
    backdrop-filter: blur(9px);
    -webkit-backdrop-filter: blur(9px);
    border: 1px solid rgba(255, 255, 255, 0.22);
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.14);
    position: relative;
    overflow: hidden;
  }

  .jit-liquid-glass::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.2px;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.36) 0%,
      rgba(255, 255, 255, 0.14) 18%,
      rgba(255, 255, 255, 0) 46%,
      rgba(255, 255, 255, 0) 58%,
      rgba(255, 255, 255, 0.14) 82%,
      rgba(255, 255, 255, 0.34) 100%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  .jit-hero-content-layer {
    position: relative;
    z-index: 10;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 0 64px 56px;
  }

  @media (max-width: 1023px) {
    .jit-hero-content-layer { padding: 0 40px 48px; }
  }

  @media (max-width: 767px) {
    .jit-hero-content-layer {
      justify-content: center;
      padding: 20px 14px 24px;
    }

    .jit-hero-video {
      object-position: 58% center;
      filter: saturate(1) contrast(0.94) brightness(0.78);
      animation: none;
      transform: none;
    }

    .jit-hero-overlay {
      background:
        linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.38) 56%, rgba(0, 0, 0, 0.66) 100%),
        linear-gradient(90deg, rgba(0, 0, 0, 0.62) 0%, rgba(0, 0, 0, 0.42) 56%, rgba(0, 0, 0, 0.26) 100%);
    }

    .jit-hero-grid {
      gap: 16px;
    }

    .jit-hero-main-col {
      max-width: 100%;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: linear-gradient(180deg, rgba(1, 8, 6, 0.56) 0%, rgba(1, 8, 6, 0.3) 100%);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      padding: 12px 12px 10px;
    }
  }

  .jit-hero-grid {
    display: grid;
    grid-template-columns: 1fr;
    align-items: end;
    gap: 28px;
  }

  .jit-hero-main-col {
    max-width: 46rem;
    position: relative;
    z-index: 1;
  }

  @media (min-width: 1024px) {
    .jit-hero-grid {
      grid-template-columns: 1fr 1fr;
      gap: 38px;
    }
  }

  .jit-hero-badge {
    display: inline-flex;
    align-items: center;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 9999px;
    padding: 6px 12px;
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.96);
    margin-bottom: 16px;
    background: linear-gradient(130deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    box-shadow:
      0 8px 24px -16px rgba(0, 0, 0, 0.62),
      0 0 0 1px rgba(16, 185, 129, 0.14) inset;
    animation: jit-hero-badge-float 8s ease-in-out infinite;
  }

  .jit-hero-heading {
    font-weight: 450;
    margin-bottom: 16px;
    letter-spacing: -0.045em;
    line-height: 1.06;
    font-size: clamp(1.95rem, 6.4vw, 4.6rem);
    color: #f8fafc;
    --jit-heading-gradient: linear-gradient(
      114deg,
      #fdfefe 2%,
      #f3f4f6 24%,
      #d1fae5 48%,
      #6ee7b7 67%,
      #a7f3d0 82%,
      #f8fafc 98%
    );
    filter:
      drop-shadow(0 10px 30px rgba(0, 0, 0, 0.42))
      drop-shadow(0 0 20px rgba(16, 185, 129, 0.12));
    text-wrap: balance;
  }

  .jit-hero-sub {
    font-size: 1.03rem;
    color: rgba(248,250,252,0.8);
    margin-bottom: 22px;
    line-height: 1.72;
    max-width: 42rem;
  }

  @media (max-width: 767px) {
    .jit-hero-badge {
      margin-bottom: 12px;
      padding: 5px 10px;
      font-size: 0.66rem;
      letter-spacing: 0.1em;
    }

    .jit-hero-heading {
      margin-bottom: 8px;
      font-size: clamp(1.58rem, 8vw, 2.15rem);
      line-height: 1.1;
    }

    .jit-hero-sub {
      margin-bottom: 12px;
      font-size: 0.93rem;
      line-height: 1.5;
      max-width: 34rem;
    }
  }

  .jit-hero-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  @media (max-width: 767px) {
    .jit-hero-buttons {
      width: 100%;
      max-width: 100%;
      flex-wrap: nowrap;
      flex-direction: row;
      align-items: stretch;
      gap: 10px;
    }
  }

  .jit-btn-primary {
    background: linear-gradient(150deg, #ffffff 0%, #f0f9f4 100%);
    color: #000;
    padding: 12px 28px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.92rem;
    text-decoration: none;
    box-shadow: 0 12px 26px -18px rgba(0, 0, 0, 0.62);
    transition: background 0.2s, transform 0.22s, box-shadow 0.22s;
  }

  .jit-btn-primary:hover {
    background: linear-gradient(150deg, #ffffff 0%, #e8f6ee 100%);
    transform: translateY(-1px);
    box-shadow: 0 16px 32px -20px rgba(0, 0, 0, 0.64);
  }

  .jit-btn-glass {
    border: 1px solid rgba(255,255,255,0.3);
    color: #fff;
    padding: 12px 28px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.92rem;
    text-decoration: none;
    transition: background 0.22s, color 0.22s, transform 0.22s;
    background: linear-gradient(150deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.2) 100%);
  }

  .jit-btn-glass:hover {
    background: #fff;
    color: #000;
    transform: translateY(-1px);
  }

  @media (max-width: 767px) {
    .jit-btn-primary,
    .jit-btn-glass {
      width: auto;
      flex: 1 1 0;
      min-width: 0;
      min-height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 8px;
      border-radius: 14px;
      font-size: clamp(0.76rem, 3.4vw, 0.88rem);
      letter-spacing: -0.01em;
    }

    .jit-btn-primary {
      flex: 0.95 1 0;
    }

    .jit-btn-glass {
      flex: 1.05 1 0;
    }
  }

  .jit-hero-tag-col {
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
  }

  @media (min-width: 1024px) {
    .jit-hero-tag-col { justify-content: flex-end; }
  }

  @media (max-width: 767px) {
    .jit-hero-tag-col {
      justify-content: flex-start;
    }

    .jit-hero-tag {
      padding: 10px 14px;
      border-radius: 10px;
    }

    .jit-hero-tag-text {
      font-size: 1.02rem;
    }

  }

  @media (max-height: 760px) {
    .jit-hero-content-layer {
      padding-bottom: 16px;
    }

    .jit-hero-heading {
      font-size: clamp(1.68rem, 8.1vw, 2.3rem);
      margin-bottom: 8px;
    }

    .jit-hero-sub {
      margin-bottom: 10px;
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .jit-hero-tag-col {
      display: none;
    }
  }

  .jit-hero-tag {
    border: 1px solid rgba(255,255,255,0.25);
    padding: 12px 22px;
    border-radius: 12px;
    background: linear-gradient(155deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%);
    animation: jit-hero-tag-float 9s ease-in-out infinite;
  }

  .jit-hero-tag-text {
    font-weight: 300;
    color: #fff;
    font-size: clamp(1.08rem, 2.4vw, 1.45rem);
    letter-spacing: -0.02em;
    text-shadow: 0 1px 14px rgba(0, 0, 0, 0.36);
  }

  .jit-char-span {
    display: inline-block;
    transition: opacity 520ms ease, transform 520ms ease, filter 520ms ease;
    color: inherit;
  }

  @supports ((-webkit-background-clip: text) or (background-clip: text)) {
    .jit-hero-heading {
      color: transparent;
      background-image: var(--jit-heading-gradient);
      background-size: 240% 240%;
      background-position: 0% 50%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: jit-heading-gradient-shift 11s ease-in-out infinite;
    }

    .jit-char-span {
      background-image: var(--jit-heading-gradient);
      background-size: 240% 240%;
      background-position: 0% 50%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
      animation: jit-heading-gradient-shift 11s ease-in-out infinite;
    }
  }

  @keyframes jit-hero-video-drift {
    0% { transform: scale(1.03) translate3d(0%, 0%, 0); }
    100% { transform: scale(1.08) translate3d(-1.1%, -1.2%, 0); }
  }

  @keyframes jit-heading-gradient-shift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  @keyframes jit-hero-badge-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  @keyframes jit-hero-tag-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .jit-hero-video,
    .jit-hero-heading,
    .jit-hero-badge,
    .jit-hero-tag {
      animation: none !important;
      transform: none !important;
    }

    .jit-btn-primary,
    .jit-btn-glass,
    .jit-char-span {
      transition: none !important;
    }
  }
`;

interface FadeInProps {
  delay?: number;
  duration?: number;
  children: React.ReactNode;
  style?: CSSProperties;
  className?: string;
}

function FadeIn({
  delay = 0,
  duration = 1000,
  children,
  style = {},
  className = "",
}: FadeInProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${duration}ms ease`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface AnimatedHeadingProps {
  text: string;
  className?: string;
  style?: CSSProperties;
}

function AnimatedHeading({
  text,
  className = "",
  style = {},
}: AnimatedHeadingProps) {
  const charDelay = 28;
  const initialDelay = 180;

  const lines = text.split("\n");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), initialDelay);
    return () => clearTimeout(timer);
  }, []);

  let charGlobalIndex = 0;

  return (
    <h1 className={`jit-hero-heading ${className}`} style={style}>
      {lines.map((line, lineIndex) => {
        const chars = line.split("");
        const lineStartIndex = charGlobalIndex;
        charGlobalIndex += chars.length;

        return (
          <span key={lineIndex} style={{ display: "block" }}>
            {chars.map((char, charIndex) => {
              const delay = lineStartIndex * charDelay + charIndex * charDelay;

              return (
                <span
                  key={`${lineIndex}-${charIndex}`}
                  className="jit-char-span"
                  style={{
                    opacity: started ? 1 : 0,
                    transform: started ? "translateX(0)" : "translateX(-14px)",
                    transitionDelay: `${delay}ms`,
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              );
            })}
          </span>
        );
      })}
    </h1>
  );
}

const Hero = () => {
  const { trackEvent } = useLandingEvents();
  const variant = useLandingCopyVariant();
  const isProVariant = variant === "pro";

  useEffect(() => {
    trackEvent("landing:variant_assigned", { variant });
  }, [trackEvent, variant]);

  const copy = isProVariant
    ? {
        badge: "Built for service pros",
        heading: "Grow your business\nwith less hustle.",
        subtitle:
          "Get discovered by nearby clients, convert quality requests, and build repeat revenue with confidence.",
        primaryLabel: "Create Pro Account",
        primaryHref: "/join",
        secondaryLabel: "Explore Demand",
        secondaryHref: "/services?focus=pro",
        tag: "Verified. Visible. Growing.",
      }
    : {
        badge: "Trusted Across Kenya",
        heading: "Book the right pro\nin under 2 minutes.",
        subtitle:
          "Compare vetted professionals, transparent pricing, and secure checkout in one clean flow.",
        primaryLabel: "Explore Services",
        primaryHref: "/services",
        secondaryLabel: "Become a Provider",
        secondaryHref: "/become-a-provider",
        tag: "Trusted. Fast. Transparent.",
      };

  return (
    <>
      <style>{HERO_STYLE}</style>
      <section className="jit-hero-root" aria-label="Hero">
        <video
          className="jit-hero-video"
          src="/videos/bannervid.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />

        <div className="jit-hero-overlay" />

        <div className="jit-hero-content-layer">
          <div className="jit-hero-grid">
            <div className="jit-hero-main-col">
              <FadeIn delay={80} duration={700}>
                <span className="jit-hero-badge">{copy.badge}</span>
              </FadeIn>

              <AnimatedHeading text={copy.heading} />

              <FadeIn delay={720} duration={900}>
                <p className="jit-hero-sub">{copy.subtitle}</p>
              </FadeIn>

              <FadeIn delay={1080} duration={900}>
                <div className="jit-hero-buttons">
                  <Link
                    href={copy.primaryHref}
                    className="jit-btn-primary"
                    onClick={() =>
                      trackEvent("landing:cta_clicked", {
                        ctaLabel: copy.primaryLabel,
                        ctaLocation: "hero",
                        variant,
                      })
                    }
                  >
                    {copy.primaryLabel}
                  </Link>
                  <Link
                    href={copy.secondaryHref}
                    className="jit-btn-glass jit-liquid-glass"
                    onClick={() =>
                      trackEvent("landing:cta_clicked", {
                        ctaLabel: copy.secondaryLabel,
                        ctaLocation: "hero",
                        variant,
                      })
                    }
                  >
                    {copy.secondaryLabel}
                  </Link>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={1260} duration={900} className="jit-hero-tag-col">
              <div className="jit-hero-tag jit-liquid-glass">
                <span className="jit-hero-tag-text">{copy.tag}</span>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
