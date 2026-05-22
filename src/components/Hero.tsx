"use client";

import Link from "next/link";
import { useEffect } from "react";

import useLandingEvents from "@/hooks/useLandingEvents";
import { useLandingCopyVariant } from "@/hooks/useLandingCopyVariant";

const HERO_STYLE = `
  .jit-hero-root {
    position: relative;
    width: 100%;
    min-height: calc(92vh - var(--public-header-h));
    min-height: calc(92svh - var(--public-header-h));
    padding-top: var(--public-header-h);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background-image:
      linear-gradient(90deg, rgba(2, 8, 10, 0.9) 0%, rgba(2, 8, 10, 0.72) 42%, rgba(2, 8, 10, 0.34) 100%),
      linear-gradient(180deg, rgba(2, 8, 10, 0.24) 0%, rgba(2, 8, 10, 0.18) 48%, rgba(2, 8, 10, 0.7) 100%),
      url("/images/jitbanner.webp");
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
  }

  .jit-hero-root::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    opacity: 0.12;
    background-image:
      linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size: 64px 64px;
    mask-image: linear-gradient(180deg, transparent 0%, #000 24%, #000 72%, transparent 100%);
  }

  .jit-hero-root::after {
    content: "";
    position: absolute;
    inset: auto -8% -24% 34%;
    z-index: 0;
    height: 58%;
    transform: skewY(-8deg);
    background:
      linear-gradient(90deg, rgba(20, 184, 166, 0.14), rgba(59, 130, 246, 0.12), rgba(245, 158, 11, 0.08));
    filter: blur(1px);
    opacity: 0.36;
  }

  .jit-hero-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      linear-gradient(90deg, rgba(4, 8, 10, 0.16) 0%, rgba(4, 8, 10, 0.02) 48%, rgba(4, 8, 10, 0.36) 100%),
      linear-gradient(180deg, rgba(4, 8, 10, 0.04) 0%, rgba(4, 8, 10, 0.16) 62%, rgba(4, 8, 10, 0.5) 100%);
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
    justify-content: center;
    padding: 40px 64px 64px;
  }

  .jit-hero-grid {
    display: grid;
    grid-template-columns: 1fr;
    align-items: center;
    gap: 42px;
  }

  .jit-hero-main-col {
    max-width: 46rem;
    position: relative;
    z-index: 1;
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
    color: rgba(236, 253, 245, 0.94);
    margin-bottom: 16px;
    background: linear-gradient(130deg, rgba(20, 184, 166, 0.14) 0%, rgba(255, 255, 255, 0.05) 100%);
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
      #e0f2fe 48%,
      #67e8f9 67%,
      #fde68a 86%,
      #f8fafc 98%
    );
    filter:
      drop-shadow(0 10px 30px rgba(0, 0, 0, 0.42))
      drop-shadow(0 0 20px rgba(16, 185, 129, 0.12));
    text-wrap: balance;
  }

  .jit-hero-sub {
    font-size: 1.03rem;
    color: rgba(226, 232, 240, 0.82);
    margin-bottom: 22px;
    line-height: 1.72;
    max-width: 42rem;
  }

  .jit-hero-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .jit-btn-primary,
  .jit-btn-glass {
    padding: 12px 28px;
    border-radius: 8px;
    font-size: 0.92rem;
    text-decoration: none;
    transition: background 0.2s, transform 0.22s, box-shadow 0.22s, color 0.22s;
  }

  .jit-btn-primary {
    background: linear-gradient(150deg, #ffffff 0%, #f0f9f4 100%);
    color: #000;
    font-weight: 600;
    box-shadow: 0 12px 26px -18px rgba(0, 0, 0, 0.62);
  }

  .jit-btn-primary:hover {
    background: linear-gradient(150deg, #ffffff 0%, #e8f6ee 100%);
    transform: translateY(-1px);
    box-shadow: 0 16px 32px -20px rgba(0, 0, 0, 0.64);
  }

  .jit-btn-glass {
    border: 1px solid rgba(255,255,255,0.3);
    color: #fff;
    font-weight: 500;
    background: linear-gradient(150deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.2) 100%);
  }

  .jit-btn-glass:hover {
    background: #fff;
    color: #000;
    transform: translateY(-1px);
  }

  .jit-hero-tag-col {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .jit-hero-visual {
    width: min(100%, 520px);
    margin-left: auto;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background:
      linear-gradient(145deg, rgba(15, 23, 42, 0.78) 0%, rgba(6, 19, 24, 0.72) 58%, rgba(21, 18, 30, 0.74) 100%);
    box-shadow:
      0 28px 90px -54px rgba(14, 165, 233, 0.7),
      0 18px 60px -42px rgba(0, 0, 0, 0.9),
      inset 0 1px 0 rgba(255, 255, 255, 0.16);
    padding: 18px;
  }

  .jit-hero-visual-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 4px 4px 16px;
  }

  .jit-hero-visual-title {
    color: rgba(248, 250, 252, 0.92);
    font-size: 0.86rem;
    font-weight: 650;
  }

  .jit-hero-visual-pill {
    border-radius: 999px;
    background: rgba(20, 184, 166, 0.12);
    color: #99f6e4;
    padding: 5px 10px;
    font-size: 0.72rem;
    border: 1px solid rgba(45, 212, 191, 0.2);
  }

  .jit-hero-card-stack {
    display: grid;
    gap: 12px;
  }

  .jit-hero-mini-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.11);
    background: rgba(2, 6, 12, 0.42);
    padding: 13px;
  }

  .jit-hero-mini-icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    color: #f8fafc;
    font-weight: 700;
    background: linear-gradient(145deg, rgba(20, 184, 166, 0.82), rgba(59, 130, 246, 0.72));
  }

  .jit-hero-mini-copy {
    min-width: 0;
  }

  .jit-hero-mini-title {
    display: block;
    color: rgba(248, 250, 252, 0.92);
    font-size: 0.9rem;
    font-weight: 640;
  }

  .jit-hero-mini-meta {
    display: block;
    margin-top: 3px;
    color: rgba(203, 213, 225, 0.7);
    font-size: 0.76rem;
  }

  .jit-hero-mini-price {
    color: #fde68a;
    font-size: 0.84rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .jit-hero-visual-footer {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 14px;
  }

  .jit-hero-stat {
    display: block;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    padding: 12px;
  }

  .jit-hero-stat-value {
    display: block;
    color: #f8fafc;
    font-size: 1rem;
    font-weight: 750;
  }

  .jit-hero-stat-label {
    display: block;
    margin-top: 2px;
    color: rgba(203, 213, 225, 0.68);
    font-size: 0.7rem;
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
  }

  @keyframes jit-heading-gradient-shift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  @keyframes jit-hero-badge-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  @media (min-width: 1024px) {
    .jit-hero-grid {
      grid-template-columns: 1fr 1fr;
      gap: 56px;
    }

    .jit-hero-tag-col { justify-content: flex-end; }
  }

  @media (max-width: 1023px) {
    .jit-hero-content-layer { padding: 32px 40px 48px; }
  }

  @media (max-width: 767px) {
    .jit-hero-content-layer {
      justify-content: center;
      padding: 20px 14px 24px;
    }

    .jit-hero-overlay {
      background:
        linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.38) 56%, rgba(0, 0, 0, 0.66) 100%),
        linear-gradient(90deg, rgba(0, 0, 0, 0.62) 0%, rgba(0, 0, 0, 0.42) 56%, rgba(0, 0, 0, 0.26) 100%);
    }

    .jit-hero-grid { gap: 16px; }

    .jit-hero-main-col {
      max-width: 100%;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: linear-gradient(180deg, rgba(1, 8, 6, 0.56) 0%, rgba(1, 8, 6, 0.3) 100%);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      padding: 12px 12px 10px;
    }

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

    .jit-hero-buttons {
      width: 100%;
      max-width: 100%;
      flex-wrap: nowrap;
      flex-direction: row;
      align-items: stretch;
      gap: 10px;
    }

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

    .jit-btn-primary { flex: 0.95 1 0; }
    .jit-btn-glass { flex: 1.05 1 0; }
    .jit-hero-tag-col { display: none; }
  }

  @media (max-height: 760px) {
    .jit-hero-content-layer { padding-bottom: 16px; }
    .jit-hero-heading {
      font-size: clamp(1.68rem, 8.1vw, 2.3rem);
      margin-bottom: 8px;
    }
    .jit-hero-sub {
      margin-bottom: 10px;
      font-size: 0.9rem;
      line-height: 1.45;
    }
    .jit-hero-tag-col { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .jit-hero-heading,
    .jit-hero-badge {
      animation: none !important;
      transform: none !important;
    }

    .jit-btn-primary,
    .jit-btn-glass {
      transition: none !important;
    }
  }
`;

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

  const handleCtaClick = (label: string) => {
    trackEvent("landing:cta_clicked", {
      ctaLabel: label,
      ctaLocation: "hero",
      variant,
    });
  };

  return (
    <>
      <style>{HERO_STYLE}</style>
      <section className="jit-hero-root" aria-label="Hero">
        <div className="jit-hero-overlay" />

        <div className="jit-hero-content-layer">
          <div className="jit-hero-grid">
            <div className="jit-hero-main-col">
              <span className="jit-hero-badge">{copy.badge}</span>

              <h1 className="jit-hero-heading">
                {copy.heading.split("\n").map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h1>

              <p className="jit-hero-sub">{copy.subtitle}</p>

              <div className="jit-hero-buttons">
                <Link
                  href={copy.primaryHref}
                  className="jit-btn-primary"
                  onClick={() => handleCtaClick(copy.primaryLabel)}
                >
                  {copy.primaryLabel}
                </Link>
                <Link
                  href={copy.secondaryHref}
                  className="jit-btn-glass jit-liquid-glass"
                  onClick={() => handleCtaClick(copy.secondaryLabel)}
                >
                  {copy.secondaryLabel}
                </Link>
              </div>
            </div>

            <div className="jit-hero-tag-col">
              <div className="jit-hero-visual" aria-hidden="true">
                <div className="jit-hero-visual-head">
                  <span className="jit-hero-visual-title">
                    Live local demand
                  </span>
                  <span className="jit-hero-visual-pill">{copy.tag}</span>
                </div>
                <div className="jit-hero-card-stack">
                  <div className="jit-hero-mini-card">
                    <span className="jit-hero-mini-icon">P</span>
                    <span className="jit-hero-mini-copy">
                      <span className="jit-hero-mini-title">Plumbing repair</span>
                      <span className="jit-hero-mini-meta">
                        Westlands · verified pro matched
                      </span>
                    </span>
                    <span className="jit-hero-mini-price">KSh 2.4k</span>
                  </div>
                  <div className="jit-hero-mini-card">
                    <span className="jit-hero-mini-icon">C</span>
                    <span className="jit-hero-mini-copy">
                      <span className="jit-hero-mini-title">Deep cleaning</span>
                      <span className="jit-hero-mini-meta">
                        Kilimani · secure checkout ready
                      </span>
                    </span>
                    <span className="jit-hero-mini-price">KSh 3.8k</span>
                  </div>
                  <div className="jit-hero-mini-card">
                    <span className="jit-hero-mini-icon">E</span>
                    <span className="jit-hero-mini-copy">
                      <span className="jit-hero-mini-title">Electrical callout</span>
                      <span className="jit-hero-mini-meta">
                        Karen · arrival window confirmed
                      </span>
                    </span>
                    <span className="jit-hero-mini-price">KSh 1.9k</span>
                  </div>
                </div>
                <div className="jit-hero-visual-footer">
                  <span className="jit-hero-stat">
                    <span className="jit-hero-stat-value">2 min</span>
                    <span className="jit-hero-stat-label">avg booking</span>
                  </span>
                  <span className="jit-hero-stat">
                    <span className="jit-hero-stat-value">4.8</span>
                    <span className="jit-hero-stat-label">rated pros</span>
                  </span>
                  <span className="jit-hero-stat">
                    <span className="jit-hero-stat-value">M-Pesa</span>
                    <span className="jit-hero-stat-label">payments</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
