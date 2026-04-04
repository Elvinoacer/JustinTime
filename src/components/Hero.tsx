"use client";
import { motion, useInView } from "framer-motion";
import {
  Globe,
  MapPin,
  Search,
  Shield,
  Star,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useLandingCopyVariant } from "@/hooks/useLandingCopyVariant";
import useLandingEvents from "@/hooks/useLandingEvents";

const kenyanCounties = [
  "All Counties",
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
];

const countries = [
  { name: "Kenya", code: "KE", subdivisions: kenyanCounties },
  {
    name: "Uganda",
    code: "UG",
    subdivisions: ["All Regions", "Central", "Eastern", "Northern", "Western"],
  },
  {
    name: "Tanzania",
    code: "TZ",
    subdivisions: [
      "All Regions",
      "Dar es Salaam",
      "Arusha",
      "Dodoma",
      "Mwanza",
      "Tanga",
    ],
  },
  {
    name: "Nigeria",
    code: "NG",
    subdivisions: [
      "All States",
      "Lagos",
      "Abuja",
      "Kano",
      "Ibadan",
      "Port Harcourt",
    ],
  },
  {
    name: "South Africa",
    code: "ZA",
    subdivisions: [
      "All Provinces",
      "Gauteng",
      "Western Cape",
      "KwaZulu-Natal",
      "Eastern Cape",
    ],
  },
];

const floatingAvatars = [
  {
    name: "Sarah",
    role: "Plumber",
    img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    position: "top-[18%] left-[7%]",
    delay: 0,
    duration: 5,
    size: "w-16 h-16",
  },
  {
    name: "Anita",
    role: "Cleaner",
    img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    position: "top-[45%] left-[5%]",
    delay: 1.2,
    duration: 6,
    size: "w-14 h-14",
  },
  {
    name: "David",
    role: "Electrician",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    position: "bottom-[30%] left-[6%]",
    delay: 0.6,
    duration: 7,
    size: "w-12 h-12",
  },
  {
    name: "James",
    role: "Fundi",
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    position: "top-[16%] right-[7%]",
    delay: 0.3,
    duration: 5.5,
    size: "w-14 h-14",
  },
  {
    name: "Risika",
    role: "Freelancer",
    img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    position: "top-[42%] right-[5%]",
    delay: 1.8,
    duration: 6.5,
    size: "w-12 h-12",
  },
  {
    name: "Grace",
    role: "Painter",
    img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    position: "bottom-[28%] right-[7%]",
    delay: 0.9,
    duration: 5,
    size: "w-11 h-11",
  },
];

function useCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });
  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, end, duration]);
  return { count, ref };
}

const statAccents = [
  { border: "border-l-emerald-400/50", glow: "shadow-emerald-500/10" },
  { border: "border-l-cyan-400/50", glow: "shadow-cyan-500/10" },
  { border: "border-l-amber-400/50", glow: "shadow-amber-500/10" },
];

const Hero = () => {
  const router = useRouter();
  const { trackEvent } = useLandingEvents();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [selectedLocation, setSelectedLocation] = useState(kenyanCounties[0]);
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
      setSelectedLocation(country.subdivisions[0]);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedLocation && !selectedLocation.startsWith("All"))
      params.append("location", selectedLocation);
    if (selectedCountry.code !== "KE")
      params.append("country", selectedCountry.code);
    trackEvent("landing:search_initiated", {
      searchQuery,
      location: selectedLocation,
      country: selectedCountry.code,
      variant,
    });
    router.push(`/services?${params.toString()}`);
  };

  const stat1 = useCounter(500, 2000);
  const stat2 = useCounter(2500, 2200);
  const stat3 = useCounter(98, 1800);
  const variant = useLandingCopyVariant();
  const isProVariant = variant === "pro";
  const hasTrackedVariantAssignment = useRef(false);

  useEffect(() => {
    if (hasTrackedVariantAssignment.current) return;
    trackEvent("landing:variant_assigned", { variant });
    hasTrackedVariantAssignment.current = true;
  }, [trackEvent, variant]);

  const handleVariantSwitch = (newVariant: "booking" | "pro") => {
    if (newVariant !== variant)
      trackEvent("landing:variant_switched", { variant: newVariant });
  };

  const copy = isProVariant
    ? {
        badge: "Built for service pros",
        title:
          "Turn your skills into predictable monthly income with verified local demand.",
        subtitle:
          "Create your profile, get discovered by high-intent clients, and grow repeat business without chasing leads manually.",
        searchTitle: "Preview local demand by skill and location",
        searchAction: "Explore Market Demand",
        secondaryCtaLabel: "Create Pro Account",
        secondaryCtaHref: "/join",
      }
    : {
        badge: "Trusted Across Kenya",
        title:
          "Book the right pro in under 2 minutes with trusted pricing upfront.",
        subtitle:
          "JustInTime connects homes and businesses to vetted experts for cleaning, repairs, installation, and more. Compare top options instantly and confirm with secure checkout.",
        searchTitle:
          "Tell us what you need and we'll route you to the best matches",
        searchAction: "Find My Best Matches",
        secondaryCtaLabel: "Browse Top Services",
        secondaryCtaHref: "/services",
      };

  const trustBadges = [
    "ID-verified professionals",
    "M-Pesa and card payments",
    "Response within minutes",
    "Transparent ratings and reviews",
  ];

  return (
    <section
      className="group/hero relative w-full overflow-hidden px-4 pb-12 pt-20 sm:px-6 sm:pb-20 sm:pt-28 md:pt-32 lg:px-8 lg:pb-24 lg:pt-36"
      aria-label="Hero"
    >
      {/* Background video */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="hero-bg-video absolute inset-0 h-full w-full opacity-[0.1] transition-opacity duration-700 group-hover/hero:opacity-[0.16]"
        >
          <source src="/videos/bannervid.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(4,16,13,0.62) 0%, rgba(6,20,16,0.48) 28%, rgba(5,17,14,0.58) 64%, rgba(4,14,11,0.74) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: [
              "radial-gradient(55% 45% at 20% 14%, rgba(16,185,129,0.14), transparent 70%)",
              "radial-gradient(42% 36% at 86% 18%, rgba(20,184,166,0.12), transparent 72%)",
            ].join(", "),
          }}
        />
      </div>

      {/* Floating avatars — desktop only */}
      {floatingAvatars.map((avatar, i) => (
        <motion.div
          key={i}
          className={`absolute ${avatar.position} z-10 hidden flex-col items-center gap-1 xl:flex`}
          animate={{ y: [0, i % 2 === 0 ? -14 : 12, 0] }}
          transition={{
            duration: avatar.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: avatar.delay,
          }}
          aria-hidden="true"
        >
          <div
            className={`${avatar.size} relative overflow-hidden rounded-full ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/20`}
          >
            <Image
              src={avatar.img}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
              loading="lazy"
            />
          </div>
          <div className="mt-1 rounded-full border border-white/10 bg-white/8 px-2 py-1 text-center backdrop-blur-md">
            <p className="text-[10px] font-semibold leading-none text-white/90">
              {avatar.name}
            </p>
            <p className="mt-0.5 text-[9px] leading-none text-emerald-400">
              {avatar.role}
            </p>
          </div>
        </motion.div>
      ))}

      {/* Main grid */}
      <div className="relative z-20 mx-auto grid w-full max-w-6xl gap-8 sm:gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12">
        {/* Left column — copy */}
        <div>
          {/* Badge */}
          <motion.div
            className="animate-badge-pulse inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-white/6 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400 backdrop-blur-md sm:text-xs"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {copy.badge}
          </motion.div>

          {/* Mode toggle */}
          <div className="mt-4 inline-flex w-full max-w-xs items-center rounded-full border border-white/10 bg-white/[0.06] p-1 backdrop-blur-md sm:w-auto sm:max-w-none">
            <Link
              href="/?focus=booking"
              onClick={() => handleVariantSwitch("booking")}
              className={`flex-1 rounded-full px-4 py-2 text-center text-[11px] font-semibold transition sm:flex-none sm:text-xs ${
                !isProVariant
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              Hiring Mode
            </Link>
            <Link
              href="/?focus=pro"
              onClick={() => handleVariantSwitch("pro")}
              className={`flex-1 rounded-full px-4 py-2 text-center text-[11px] font-semibold transition sm:flex-none sm:text-xs ${
                isProVariant
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              Pro Growth Mode
            </Link>
          </div>

          {/* Headline */}
          <motion.h1
            className="gradient-text-hero landing-display mt-5 max-w-2xl text-[1.6rem] font-extrabold leading-[1.1] tracking-tight sm:text-[2.5rem] md:text-[2.8rem] lg:text-[3.5rem]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            {copy.title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="mt-4 max-w-xl text-[0.9rem] leading-[1.75] text-white/60 sm:text-base"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            {copy.subtitle}
          </motion.p>

          {/* Secondary CTA */}
          <motion.div
            className="mt-5"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, delay: 0.16 }}
          >
            <Link
              href={copy.secondaryCtaHref}
              onClick={() =>
                trackEvent("landing:cta_clicked", {
                  ctaLabel: copy.secondaryCtaLabel,
                  ctaLocation: "hero",
                  variant,
                })
              }
            >
              <motion.button
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-5 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition hover:border-emerald-400/30 hover:bg-white/10 sm:text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {copy.secondaryCtaLabel}
              </motion.button>
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            className="mt-6 grid gap-2 sm:grid-cols-2 sm:gap-2.5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
          >
            {trustBadges.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-[13px] backdrop-blur-sm sm:text-sm"
              >
                <CheckCircle2
                  className="h-4 w-4 text-emerald-400 shrink-0"
                  aria-hidden="true"
                />
                <span className="font-medium text-white/80">{item}</span>
              </div>
            ))}
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="mt-7 grid max-w-xl grid-cols-3 gap-2.5 sm:mt-8 sm:gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
          >
            {[
              {
                counter: stat1,
                label: "Pros",
                suffix: "+",
                format: (v: number) => String(v),
              },
              {
                counter: stat2,
                label: "Clients",
                suffix: "+",
                format: (v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v),
              },
              {
                counter: stat3,
                label: "Satisfaction",
                suffix: "%",
                format: (v: number) => String(v),
              },
            ].map((stat, idx) => (
              <div
                key={stat.label}
                className={`rounded-2xl border border-white/[0.08] ${statAccents[idx].border} border-l-[3px] bg-white/[0.05] px-3 py-3.5 text-left backdrop-blur-sm shadow-lg ${statAccents[idx].glow}`}
                ref={stat.counter.ref}
              >
                <div className="text-xl font-extrabold tabular-nums text-white sm:text-2xl">
                  {stat.format(stat.counter.count)}
                  <span className="text-emerald-400">{stat.suffix}</span>
                </div>
                <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60 sm:text-[11px]">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right column — search card */}
        <motion.div
          className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:rounded-3xl sm:p-6 md:p-7 shadow-[0_28px_70px_-38px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
        >
          <div
            className="pointer-events-none absolute -inset-[1px] rounded-2xl sm:rounded-3xl opacity-60"
            style={{
              background:
                "linear-gradient(135deg, rgba(52,211,153,0.2), rgba(34,211,238,0.15), rgba(168,85,247,0.1), rgba(52,211,153,0.2))",
              filter: "blur(1px)",
              zIndex: -1,
            }}
            aria-hidden="true"
          />

          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400 sm:text-xs">
            Find your specialist
          </p>
          <h2 className="landing-display mt-2.5 text-base font-bold tracking-tight text-white sm:text-xl md:text-2xl">
            {copy.searchTitle}
          </h2>

          <div className="mt-5 space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400"
                aria-hidden="true"
              />
              <label htmlFor="hero-search-input" className="sr-only">
                Search for a service
              </label>
              <input
                id="hero-search-input"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3 pl-11 pr-4 text-sm font-medium text-white placeholder-white/40 outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/20 sm:py-3.5"
                placeholder="Plumber for kitchen leak, same-day cleaning..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>

            {/* Country + Location row */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <Globe
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400"
                  aria-hidden="true"
                />
                <label htmlFor="hero-country-select" className="sr-only">
                  Select country
                </label>
                <select
                  id="hero-country-select"
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.06] py-3 pl-11 pr-4 text-sm font-medium text-white/80 outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/20 [&>option]:bg-[#0a0f0d] [&>option]:text-white sm:py-3.5"
                  value={selectedCountry.code}
                  onChange={(e) => handleCountryChange(e.target.value)}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <MapPin
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400"
                  aria-hidden="true"
                />
                <button
                  onClick={() => setIsLocationOpen(!isLocationOpen)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] py-3 pl-11 pr-4 text-left text-sm font-medium text-white/80 transition hover:border-white/15 sm:py-3.5"
                  aria-expanded={isLocationOpen}
                  aria-haspopup="listbox"
                >
                  <span className="truncate">
                    {selectedLocation === selectedCountry.subdivisions[0]
                      ? selectedCountry.name
                      : selectedLocation}
                  </span>
                  <svg
                    className="h-4 w-4 text-white/40 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {isLocationOpen && (
                  <div
                    className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#0a0f0d]/95 py-1 shadow-xl backdrop-blur-xl"
                    role="listbox"
                  >
                    {selectedCountry.subdivisions.map((sub, idx) => (
                      <button
                        key={idx}
                        role="option"
                        aria-selected={selectedLocation === sub}
                        onClick={() => {
                          setSelectedLocation(sub);
                          setIsLocationOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm transition ${
                          selectedLocation === sub
                            ? "bg-emerald-500/15 font-semibold text-emerald-400"
                            : "text-white/60 hover:bg-white/[0.05] hover:text-white/80"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Search button */}
            <motion.button
              className="shimmer-btn w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:from-emerald-400 hover:to-teal-400 sm:py-3.5"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleSearch}
            >
              {copy.searchAction}
            </motion.button>
          </div>

          {/* Trust pills */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5 sm:gap-2">
            {[
              { icon: Shield, text: "Verified Pros" },
              { icon: CreditCard, text: "Secure Payments" },
              { icon: Star, text: "Rated 4.8/5" },
            ].map((badge, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-sm sm:text-xs"
              >
                <badge.icon
                  className="h-3.5 w-3.5 text-emerald-400"
                  aria-hidden="true"
                />
                {badge.text}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
