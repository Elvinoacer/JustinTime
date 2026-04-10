"use client";
import { useState, useEffect } from "react";

const LIQUID_GLASS_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body, #root {
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #000;
    color: #fff;
    height: 100%;
    width: 100%;
  }

  .hero-root {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .bg-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }

  .liquid-glass {
    background: rgba(0, 0, 0, 0.4);
    background-blend-mode: luminosity;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: none;
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
    position: relative;
    overflow: hidden;
  }

  .liquid-glass::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.4px;
    background: linear-gradient(180deg,
      rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 20%,
      rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
      rgba(255,255,255,0.1) 80%, rgba(255,255,255,0.3) 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  .nav-layer {
    position: relative;
    z-index: 10;
    padding: 24px 64px 0;
  }

  @media (max-width: 1023px) { .nav-layer { padding: 24px 48px 0; } }
  @media (max-width: 767px)  { .nav-layer { padding: 24px 24px 0; } }

  .nav-bar {
    border-radius: 12px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .nav-logo {
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.03em;
    color: #fff;
  }

  .nav-links {
    display: flex;
    gap: 32px;
    align-items: center;
  }

  @media (max-width: 767px) { .nav-links { display: none; } }

  .nav-link {
    font-size: 0.875rem;
    color: #fff;
    text-decoration: none;
    transition: color 0.2s;
    background: none;
    border: none;
    cursor: pointer;
  }
  .nav-link:hover { color: #d1d5db; }

  .nav-cta {
    background: #fff;
    color: #000;
    padding: 8px 24px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
    font-family: 'Inter', sans-serif;
  }
  .nav-cta:hover { background: #f3f4f6; }

  .hero-layer {
    position: relative;
    z-index: 10;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 0 64px 64px;
  }

  @media (max-width: 1023px) { .hero-layer { padding: 0 48px 48px; } }
  @media (max-width: 767px)  { .hero-layer { padding: 0 24px 48px; } }

  .hero-grid {
    display: grid;
    grid-template-columns: 1fr;
    align-items: end;
  }

  @media (min-width: 1024px) {
    .hero-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .hero-heading {
    font-weight: 400;
    margin-bottom: 16px;
    letter-spacing: -0.04em;
    line-height: 1.1;
    font-size: clamp(2.25rem, 6vw, 4.5rem);
    color: #fff;
  }

  .hero-sub {
    font-size: 1.125rem;
    color: #d1d5db;
    margin-bottom: 20px;
    line-height: 1.6;
  }

  @media (max-width: 767px) { .hero-sub { font-size: 1rem; } }

  .hero-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .btn-primary {
    background: #fff;
    color: #000;
    padding: 12px 32px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.9375rem;
    border: none;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.2s;
  }
  .btn-primary:hover { background: #f3f4f6; }

  .btn-glass {
    border: 1px solid rgba(255,255,255,0.2);
    color: #fff;
    padding: 12px 32px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.9375rem;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.2s, color 0.2s;
    background: transparent;
  }
  .btn-glass:hover { background: #fff; color: #000; }

  .hero-tag-col {
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
  }

  @media (min-width: 1024px) { .hero-tag-col { justify-content: flex-end; } }

  .hero-tag {
    border: 1px solid rgba(255,255,255,0.2);
    padding: 12px 24px;
    border-radius: 12px;
  }

  .hero-tag-text {
    font-weight: 300;
    color: #fff;
    font-size: clamp(1.125rem, 2.5vw, 1.5rem);
  }

  .char-span {
    display: inline-block;
    transition: opacity 500ms ease, transform 500ms ease;
  }
`;

function FadeIn({
  delay = 0,
  duration = 1000,
  children,
  style = {},
  className = "",
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`transition-opacity ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transitionDuration: `${duration}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function AnimatedHeading({ text, className = "", style = {} }) {
  const CHAR_DELAY = 30;
  const INITIAL_DELAY = 200;

  const lines = text.split("\n");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), INITIAL_DELAY);
    return () => clearTimeout(t);
  }, []);

  let charGlobalIndex = 0;

  return (
    <h1 className={`hero-heading ${className}`} style={style}>
      {lines.map((line, lineIndex) => {
        const chars = line.split("");
        const lineStartIndex = charGlobalIndex;
        charGlobalIndex += chars.length;

        return (
          <span key={lineIndex} style={{ display: "block" }}>
            {chars.map((char, charIndex) => {
              const delay =
                lineStartIndex * CHAR_DELAY + charIndex * CHAR_DELAY;
              return (
                <span
                  key={charIndex}
                  className="char-span"
                  style={{
                    opacity: started ? 1 : 0,
                    transform: started ? "translateX(0)" : "translateX(-18px)",
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

export default function HeroSection() {
  return (
    <>
      <style>{LIQUID_GLASS_CSS}</style>
      <div className="hero-root">
        {/* Background video */}
        <video
          className="bg-video"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4"
          autoPlay
          loop
          muted
          playsInline
        />

        {/* Navbar */}
        <div className="nav-layer">
          <nav className="nav-bar liquid-glass">
            <span className="nav-logo">VEX</span>
            <div className="nav-links">
              {["Story", "Investing", "Building", "Advisory"].map((item) => (
                <button key={item} className="nav-link">
                  {item}
                </button>
              ))}
            </div>
            <button className="nav-cta">Start a Chat</button>
          </nav>
        </div>

        {/* Hero content */}
        <div className="hero-layer">
          <div className="hero-grid">
            {/* Left column */}
            <div>
              <AnimatedHeading
                text={"Shaping tomorrow\nwith vision and action."}
              />

              <FadeIn delay={800} duration={1000}>
                <p className="hero-sub">
                  We back visionaries and craft ventures that define what comes
                  next.
                </p>
              </FadeIn>

              <FadeIn delay={1200} duration={1000}>
                <div className="hero-buttons">
                  <button className="btn-primary">Start a Chat</button>
                  <button className="btn-glass liquid-glass">
                    Explore Now
                  </button>
                </div>
              </FadeIn>
            </div>

            {/* Right column - tag */}
            <FadeIn delay={1400} duration={1000} className="hero-tag-col">
              <div className="hero-tag liquid-glass">
                <span className="hero-tag-text">
                  Investing. Building. Advisory.
                </span>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </>
  );
}
