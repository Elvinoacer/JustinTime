"use client";
import { motion } from "framer-motion";
import Link from "next/link";

// ─── Bespoke SVG Category Icons ───────────────────────────────────────────────

const HomeMaintenanceIcon = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    className="w-full h-full"
    aria-hidden="true"
  >
    <path
      d="M20 6L5 18h4v14h8v-8h6v8h8V18h4L20 6z"
      fill="rgba(59,130,246,0.3)"
      stroke="rgb(147,197,253)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle
      cx="28"
      cy="26"
      r="6"
      fill="rgba(59,130,246,0.2)"
      stroke="rgb(147,197,253)"
      strokeWidth="1.2"
    />
    <path
      d="M26 26h4M28 24v4"
      stroke="rgb(147,197,253)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M30.2 23.8l1.5-1.5"
      stroke="rgb(147,197,253)"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const CleaningIcon = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    className="w-full h-full"
    aria-hidden="true"
  >
    <path
      d="M14 30c0 0 2-12 8-16"
      stroke="rgb(34,211,238)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <ellipse
      cx="22"
      cy="13"
      rx="5"
      ry="3"
      fill="rgba(34,211,238,0.2)"
      stroke="rgb(34,211,238)"
      strokeWidth="1.3"
    />
    <path
      d="M27 13c2 3 1 8-2 10"
      stroke="rgb(34,211,238)"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <circle
      cx="10"
      cy="24"
      r="2"
      fill="rgba(34,211,238,0.4)"
      stroke="rgb(34,211,238)"
      strokeWidth="1"
    />
    <circle
      cx="32"
      cy="20"
      r="1.5"
      fill="rgba(34,211,238,0.35)"
      stroke="rgb(34,211,238)"
      strokeWidth="1"
    />
    <circle
      cx="29"
      cy="31"
      r="1"
      fill="rgba(34,211,238,0.45)"
      stroke="rgb(34,211,238)"
      strokeWidth="1"
    />
    <path
      d="M11 30 Q13 28 14 30 Q15 32 17 30"
      stroke="rgb(34,211,238)"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

const ElectricalIcon = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    className="w-full h-full"
    aria-hidden="true"
  >
    <path
      d="M22 6l-8 14h7l-3 14 11-16h-8l1-12z"
      fill="rgba(251,191,36,0.25)"
      stroke="rgb(253,224,71)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle
      cx="20"
      cy="20"
      r="13"
      stroke="rgba(251,191,36,0.2)"
      strokeWidth="1"
      strokeDasharray="2 3"
    />
    <circle cx="8" cy="15" r="1" fill="rgb(253,224,71)" opacity="0.6" />
    <circle cx="33" cy="26" r="1" fill="rgb(253,224,71)" opacity="0.5" />
    <circle cx="30" cy="10" r="1.2" fill="rgb(253,224,71)" opacity="0.4" />
  </svg>
);

const PaintingIcon = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    className="w-full h-full"
    aria-hidden="true"
  >
    <rect
      x="7"
      y="8"
      width="18"
      height="10"
      rx="2"
      fill="rgba(236,72,153,0.2)"
      stroke="rgb(244,114,182)"
      strokeWidth="1.4"
    />
    <rect
      x="9"
      y="10"
      width="14"
      height="6"
      rx="1"
      fill="rgba(236,72,153,0.3)"
    />
    <rect
      x="23"
      y="11"
      width="10"
      height="4"
      rx="1"
      fill="rgba(236,72,153,0.15)"
      stroke="rgb(244,114,182)"
      strokeWidth="1.2"
    />
    <path
      d="M14 18v4"
      stroke="rgb(244,114,182)"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <rect
      x="11"
      y="22"
      width="6"
      height="10"
      rx="1.5"
      fill="rgba(236,72,153,0.3)"
      stroke="rgb(244,114,182)"
      strokeWidth="1.2"
    />
    <path
      d="M22 28 Q26 24 30 28 Q34 32 30 34 Q26 36 22 34 Q18 32 22 28z"
      fill="rgba(244,114,182,0.3)"
      stroke="rgb(244,114,182)"
      strokeWidth="1.2"
    />
  </svg>
);

const ITSupportIcon = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    className="w-full h-full"
    aria-hidden="true"
  >
    <rect
      x="6"
      y="10"
      width="28"
      height="18"
      rx="2.5"
      fill="rgba(139,92,246,0.15)"
      stroke="rgb(167,139,250)"
      strokeWidth="1.4"
    />
    <rect
      x="9"
      y="13"
      width="22"
      height="12"
      rx="1.5"
      fill="rgba(139,92,246,0.1)"
    />
    <path
      d="M4 32h32"
      stroke="rgb(167,139,250)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <rect
      x="16"
      y="28"
      width="8"
      height="4"
      fill="rgba(139,92,246,0.2)"
      stroke="rgb(167,139,250)"
      strokeWidth="1"
    />
    <path
      d="M13 17l2 2-2 2"
      stroke="rgb(167,139,250)"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 21h5"
      stroke="rgb(167,139,250)"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <circle
      cx="30"
      cy="14"
      r="4"
      fill="rgba(139,92,246,0.3)"
      stroke="rgb(167,139,250)"
      strokeWidth="1.2"
    />
    <path
      d="M30 12.5v2l1 1"
      stroke="rgb(167,139,250)"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CateringIcon = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    className="w-full h-full"
    aria-hidden="true"
  >
    <ellipse
      cx="20"
      cy="26"
      rx="13"
      ry="4"
      fill="rgba(249,115,22,0.15)"
      stroke="rgb(251,146,60)"
      strokeWidth="1.3"
    />
    <path
      d="M7 26 Q8 16 20 15 Q32 16 33 26"
      fill="rgba(249,115,22,0.18)"
      stroke="rgb(251,146,60)"
      strokeWidth="1.4"
    />
    <path
      d="M17 12 Q17 9 20 8 Q23 9 23 12"
      stroke="rgb(251,146,60)"
      strokeWidth="1.3"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M20 8 Q20 6 19 5"
      stroke="rgb(251,146,60)"
      strokeWidth="1.1"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M18 7 Q17 5 16 5"
      stroke="rgb(251,146,60)"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.5"
    />
    <path
      d="M22 7 Q23 5 24 5"
      stroke="rgb(251,146,60)"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.5"
    />
    <path
      d="M6 29h28"
      stroke="rgb(251,146,60)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M10 32 Q20 34 30 32"
      stroke="rgb(251,146,60)"
      strokeWidth="1.2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const ConstructionIcon = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    className="w-full h-full"
    aria-hidden="true"
  >
    {/* Hard hat */}
    <path
      d="M10 22 Q10 12 20 11 Q30 12 30 22"
      fill="rgba(52,211,153,0.2)"
      stroke="rgb(110,231,183)"
      strokeWidth="1.5"
    />
    <rect
      x="7"
      y="22"
      width="26"
      height="4"
      rx="1.5"
      fill="rgba(52,211,153,0.25)"
      stroke="rgb(110,231,183)"
      strokeWidth="1.4"
    />
    <path
      d="M16 22 Q16 16 20 15 Q24 16 24 22"
      fill="rgba(52,211,153,0.15)"
      stroke="rgb(110,231,183)"
      strokeWidth="1.1"
    />
    {/* Bricks below */}
    <rect
      x="8"
      y="29"
      width="10"
      height="4"
      rx="0.8"
      fill="rgba(52,211,153,0.15)"
      stroke="rgb(110,231,183)"
      strokeWidth="1"
    />
    <rect
      x="21"
      y="29"
      width="10"
      height="4"
      rx="0.8"
      fill="rgba(52,211,153,0.15)"
      stroke="rgb(110,231,183)"
      strokeWidth="1"
    />
    <rect
      x="13"
      y="33"
      width="13"
      height="4"
      rx="0.8"
      fill="rgba(52,211,153,0.1)"
      stroke="rgb(110,231,183)"
      strokeWidth="1"
    />
  </svg>
);

const BeautyIcon = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    className="w-full h-full"
    aria-hidden="true"
  >
    {/* Lotus flower */}
    <circle
      cx="20"
      cy="22"
      r="5"
      fill="rgba(251,113,133,0.3)"
      stroke="rgb(253,164,175)"
      strokeWidth="1.3"
    />
    <path
      d="M20 17 Q16 13 13 15 Q12 19 17 22"
      fill="rgba(251,113,133,0.2)"
      stroke="rgb(253,164,175)"
      strokeWidth="1.2"
    />
    <path
      d="M20 17 Q24 13 27 15 Q28 19 23 22"
      fill="rgba(251,113,133,0.2)"
      stroke="rgb(253,164,175)"
      strokeWidth="1.2"
    />
    <path
      d="M15 22 Q10 20 9 17 Q11 13 16 17"
      fill="rgba(251,113,133,0.15)"
      stroke="rgb(253,164,175)"
      strokeWidth="1.1"
    />
    <path
      d="M25 22 Q30 20 31 17 Q29 13 24 17"
      fill="rgba(251,113,133,0.15)"
      stroke="rgb(253,164,175)"
      strokeWidth="1.1"
    />
    <path
      d="M20 27 Q16 30 14 28 Q14 24 19 22"
      fill="rgba(251,113,133,0.18)"
      stroke="rgb(253,164,175)"
      strokeWidth="1.1"
    />
    <path
      d="M20 27 Q24 30 26 28 Q26 24 21 22"
      fill="rgba(251,113,133,0.18)"
      stroke="rgb(253,164,175)"
      strokeWidth="1.1"
    />
    <circle
      cx="20"
      cy="22"
      r="2.5"
      fill="rgba(251,113,133,0.5)"
      stroke="rgb(253,164,175)"
      strokeWidth="1"
    />
    {/* Sparkles */}
    <path
      d="M8 10 L8.8 12 L10 12 L9 13 L9.5 15 L8 14 L6.5 15 L7 13 L6 12 L7.2 12z"
      fill="rgb(253,164,175)"
      opacity="0.6"
    />
    <path
      d="M33 8 L33.5 9.5 L35 9.5 L33.8 10.5 L34.2 12 L33 11 L31.8 12 L32.2 10.5 L31 9.5 L32.5 9.5z"
      fill="rgb(253,164,175)"
      opacity="0.4"
    />
  </svg>
);

const SecurityIcon = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    className="w-full h-full"
    aria-hidden="true"
  >
    <path
      d="M20 6L8 11v10c0 7 5.5 12 12 14 6.5-2 12-7 12-14V11L20 6z"
      fill="rgba(148,163,184,0.15)"
      stroke="rgb(203,213,225)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M20 6L8 11v10c0 7 5.5 12 12 14" fill="rgba(148,163,184,0.1)" />
    <circle
      cx="20"
      cy="20"
      r="5"
      fill="rgba(148,163,184,0.2)"
      stroke="rgb(203,213,225)"
      strokeWidth="1.3"
    />
    <path
      d="M17 20l2 2 4-4"
      stroke="rgb(203,213,225)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Keyhole */}
    <circle
      cx="31"
      cy="12"
      r="3.5"
      fill="rgba(148,163,184,0.2)"
      stroke="rgb(203,213,225)"
      strokeWidth="1.1"
    />
    <path d="M30 14.5h2v2h-2z" fill="rgb(203,213,225)" opacity="0.7" />
    <circle cx="31" cy="12" r="1.2" fill="rgba(148,163,184,0.5)" />
  </svg>
);

const MovingIcon = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    className="w-full h-full"
    aria-hidden="true"
  >
    <rect
      x="4"
      y="16"
      width="22"
      height="14"
      rx="2"
      fill="rgba(45,212,191,0.15)"
      stroke="rgb(94,234,212)"
      strokeWidth="1.4"
    />
    <path
      d="M26 20h6l4 6v4h-10V20z"
      fill="rgba(45,212,191,0.2)"
      stroke="rgb(94,234,212)"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <circle
      cx="11"
      cy="32"
      r="3"
      fill="rgba(45,212,191,0.3)"
      stroke="rgb(94,234,212)"
      strokeWidth="1.3"
    />
    <circle cx="11" cy="32" r="1.2" fill="rgb(94,234,212)" />
    <circle
      cx="29"
      cy="32"
      r="3"
      fill="rgba(45,212,191,0.3)"
      stroke="rgb(94,234,212)"
      strokeWidth="1.3"
    />
    <circle cx="29" cy="32" r="1.2" fill="rgb(94,234,212)" />
    {/* Motion lines */}
    <path
      d="M2 19h4"
      stroke="rgb(94,234,212)"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.6"
    />
    <path
      d="M1 22h3"
      stroke="rgb(94,234,212)"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.4"
    />
    <path
      d="M2 25h2"
      stroke="rgb(94,234,212)"
      strokeWidth="0.9"
      strokeLinecap="round"
      opacity="0.3"
    />
    {/* Boxes */}
    <rect
      x="8"
      y="10"
      width="6"
      height="6"
      rx="0.8"
      fill="rgba(45,212,191,0.2)"
      stroke="rgb(94,234,212)"
      strokeWidth="1"
    />
    <rect
      x="16"
      y="10"
      width="6"
      height="6"
      rx="0.8"
      fill="rgba(45,212,191,0.2)"
      stroke="rgb(94,234,212)"
      strokeWidth="1"
    />
  </svg>
);

const TutoringIcon = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    className="w-full h-full"
    aria-hidden="true"
  >
    {/* Open book */}
    <path
      d="M20 12 Q14 10 8 12v18 Q14 28 20 30z"
      fill="rgba(99,102,241,0.2)"
      stroke="rgb(165,180,252)"
      strokeWidth="1.4"
    />
    <path
      d="M20 12 Q26 10 32 12v18 Q26 28 20 30z"
      fill="rgba(99,102,241,0.15)"
      stroke="rgb(165,180,252)"
      strokeWidth="1.4"
    />
    <path d="M20 12v18" stroke="rgb(165,180,252)" strokeWidth="1.3" />
    {/* Lines on pages */}
    <path
      d="M11 17h6M11 20h6M11 23h4"
      stroke="rgb(165,180,252)"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M23 17h6M23 20h6M25 23h4"
      stroke="rgb(165,180,252)"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.7"
    />
    {/* Lightbulb above */}
    <circle
      cx="29"
      cy="9"
      r="4"
      fill="rgba(99,102,241,0.25)"
      stroke="rgb(165,180,252)"
      strokeWidth="1.2"
    />
    <path
      d="M29 7v2l1 1.5"
      stroke="rgb(165,180,252)"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M28 12.5h2"
      stroke="rgb(165,180,252)"
      strokeWidth="1"
      strokeLinecap="round"
    />
    <path
      d="M27 6.5 L25 5"
      stroke="rgb(165,180,252)"
      strokeWidth="0.9"
      strokeLinecap="round"
      opacity="0.5"
    />
    <path
      d="M31 6.5 L33 5"
      stroke="rgb(165,180,252)"
      strokeWidth="0.9"
      strokeLinecap="round"
      opacity="0.5"
    />
    <path
      d="M25 9 L23 9"
      stroke="rgb(165,180,252)"
      strokeWidth="0.9"
      strokeLinecap="round"
      opacity="0.5"
    />
    <path
      d="M33 9 L35 9"
      stroke="rgb(165,180,252)"
      strokeWidth="0.9"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
);

const PhotographyIcon = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    className="w-full h-full"
    aria-hidden="true"
  >
    {/* Camera body */}
    <rect
      x="6"
      y="14"
      width="28"
      height="20"
      rx="3"
      fill="rgba(192,38,211,0.15)"
      stroke="rgb(232,121,249)"
      strokeWidth="1.4"
    />
    {/* Viewfinder hump */}
    <path
      d="M14 14v-3h5l2 3"
      fill="rgba(192,38,211,0.2)"
      stroke="rgb(232,121,249)"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Flash */}
    <rect
      x="28"
      y="11"
      width="5"
      height="3"
      rx="1"
      fill="rgba(192,38,211,0.25)"
      stroke="rgb(232,121,249)"
      strokeWidth="1"
    />
    {/* Lens outer */}
    <circle
      cx="20"
      cy="24"
      r="7"
      fill="rgba(192,38,211,0.1)"
      stroke="rgb(232,121,249)"
      strokeWidth="1.4"
    />
    {/* Lens mid */}
    <circle
      cx="20"
      cy="24"
      r="5"
      fill="rgba(192,38,211,0.15)"
      stroke="rgb(232,121,249)"
      strokeWidth="1"
    />
    {/* Lens inner */}
    <circle
      cx="20"
      cy="24"
      r="2.8"
      fill="rgba(192,38,211,0.35)"
      stroke="rgb(232,121,249)"
      strokeWidth="1"
    />
    {/* Aperture blades */}
    <path
      d="M20 22 L21 23 L20 24"
      stroke="rgb(232,121,249)"
      strokeWidth="0.8"
      opacity="0.5"
      fill="none"
    />
    {/* Shine */}
    <circle cx="22" cy="22" r="1.2" fill="rgba(255,255,255,0.15)" />
    {/* Indicator light */}
    <circle cx="10" cy="18" r="1.5" fill="rgb(232,121,249)" opacity="0.6" />
  </svg>
);

// ─── Category data ──────────────────────────────────────────────────────────

const categories = [
  {
    name: "Home Maintenance",
    Icon: HomeMaintenanceIcon,
    color: "from-blue-500/30 to-indigo-500/10",
    glowColor: "rgba(59,130,246,0.35)",
    href: "/services?category=Home+Maintenance",
    accentBorder: "hover:border-blue-400/40",
    accentGlow: "group-hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]",
  },
  {
    name: "Cleaning Services",
    Icon: CleaningIcon,
    color: "from-cyan-400/30 to-teal-500/10",
    glowColor: "rgba(34,211,238,0.35)",
    href: "/services?category=Cleaning",
    accentBorder: "hover:border-cyan-400/40",
    accentGlow: "group-hover:shadow-[0_0_20px_rgba(34,211,238,0.25)]",
  },
  {
    name: "Electrical",
    Icon: ElectricalIcon,
    color: "from-amber-400/30 to-yellow-500/10",
    glowColor: "rgba(251,191,36,0.35)",
    href: "/services?category=Electrical",
    accentBorder: "hover:border-amber-400/40",
    accentGlow: "group-hover:shadow-[0_0_20px_rgba(251,191,36,0.25)]",
  },
  {
    name: "Painting",
    Icon: PaintingIcon,
    color: "from-pink-500/30 to-rose-500/10",
    glowColor: "rgba(236,72,153,0.35)",
    href: "/services?category=Painting",
    accentBorder: "hover:border-pink-400/40",
    accentGlow: "group-hover:shadow-[0_0_20px_rgba(236,72,153,0.25)]",
  },
  {
    name: "IT Support",
    Icon: ITSupportIcon,
    color: "from-violet-500/30 to-fuchsia-500/10",
    glowColor: "rgba(139,92,246,0.35)",
    href: "/services?category=IT+Support",
    accentBorder: "hover:border-violet-400/40",
    accentGlow: "group-hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]",
  },
  {
    name: "Catering",
    Icon: CateringIcon,
    color: "from-orange-500/30 to-amber-500/10",
    glowColor: "rgba(249,115,22,0.35)",
    href: "/services?category=Catering",
    accentBorder: "hover:border-orange-400/40",
    accentGlow: "group-hover:shadow-[0_0_20px_rgba(249,115,22,0.25)]",
  },
  {
    name: "Construction",
    Icon: ConstructionIcon,
    color: "from-emerald-500/30 to-teal-500/10",
    glowColor: "rgba(52,211,153,0.35)",
    href: "/services?category=Construction",
    accentBorder: "hover:border-emerald-400/40",
    accentGlow: "group-hover:shadow-[0_0_20px_rgba(52,211,153,0.25)]",
  },
  {
    name: "Beauty & Wellness",
    Icon: BeautyIcon,
    color: "from-rose-500/30 to-pink-500/10",
    glowColor: "rgba(251,113,133,0.35)",
    href: "/services?category=Beauty",
    accentBorder: "hover:border-rose-400/40",
    accentGlow: "group-hover:shadow-[0_0_20px_rgba(251,113,133,0.25)]",
  },
  {
    name: "Security",
    Icon: SecurityIcon,
    color: "from-slate-300/30 to-slate-500/10",
    glowColor: "rgba(148,163,184,0.35)",
    href: "/services?category=Security",
    accentBorder: "hover:border-slate-300/40",
    accentGlow: "group-hover:shadow-[0_0_20px_rgba(148,163,184,0.2)]",
  },
  {
    name: "Moving & Delivery",
    Icon: MovingIcon,
    color: "from-teal-400/30 to-cyan-500/10",
    glowColor: "rgba(45,212,191,0.35)",
    href: "/services?category=Moving",
    accentBorder: "hover:border-teal-400/40",
    accentGlow: "group-hover:shadow-[0_0_20px_rgba(45,212,191,0.25)]",
  },
  {
    name: "Tutoring",
    Icon: TutoringIcon,
    color: "from-indigo-500/30 to-blue-500/10",
    glowColor: "rgba(99,102,241,0.35)",
    href: "/services?category=Tutoring",
    accentBorder: "hover:border-indigo-400/40",
    accentGlow: "group-hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]",
  },
  {
    name: "Photography",
    Icon: PhotographyIcon,
    color: "from-fuchsia-500/30 to-violet-500/10",
    glowColor: "rgba(192,38,211,0.35)",
    href: "/services?category=Photography",
    accentBorder: "hover:border-fuchsia-400/40",
    accentGlow: "group-hover:shadow-[0_0_20px_rgba(192,38,211,0.25)]",
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.38, ease: [0.23, 1, 0.32, 1] as const },
  },
};

const ServiceCategories = () => {
  return (
    <section
      className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8"
      aria-label="Service categories"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          className="mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-20px" }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400 sm:text-xs">
            Step 1: Discover
          </p>
          <h2 className="gradient-text-hero landing-display text-[1.5rem] font-bold tracking-tight sm:text-3xl md:text-4xl">
            Pick the lane that fits your task
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/65 sm:text-base">
            Jump straight into the right category and surface relevant
            professionals faster.
          </p>
        </motion.div>

        {/* Category Grid */}
        <motion.div
          className="grid grid-cols-2 gap-2.5 min-[480px]:grid-cols-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
        >
          {categories.map((category, index) => {
            const { Icon } = category;
            return (
              <motion.div key={index} variants={cardVariants}>
                <Link href={category.href}>
                  <div
                    className={`group relative flex min-h-[8rem] cursor-pointer flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))] p-3 backdrop-blur-xl transition-all duration-300 ${category.accentBorder} ${category.accentGlow} hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] hover:-translate-y-0.5 sm:min-h-[9rem] sm:p-4`}
                  >
                    {/* Ambient glow blob */}
                    <div
                      className={`pointer-events-none absolute -top-8 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full bg-linear-to-br ${category.color} blur-2xl opacity-50 transition-opacity duration-300 group-hover:opacity-90`}
                      aria-hidden="true"
                    />

                    {/* Icon container */}
                    <div
                      className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.12] bg-[#071610]/80 p-2 transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14 sm:p-2.5"
                      style={{
                        boxShadow: `0 4px 20px -8px ${category.glowColor}`,
                      }}
                    >
                      <span
                        className={`absolute inset-0 rounded-xl bg-linear-to-br ${category.color} opacity-30`}
                        aria-hidden="true"
                      />
                      <div className="relative z-10 w-full h-full">
                        <Icon />
                      </div>
                    </div>

                    {/* Label */}
                    <span className="relative z-[2] text-center text-[10px] font-semibold leading-tight text-white/75 transition-colors group-hover:text-white sm:text-[11px]">
                      {category.name}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default ServiceCategories;
