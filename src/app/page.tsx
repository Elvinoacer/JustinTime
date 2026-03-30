import { Suspense } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import LandingNarrativeRail from "@/components/LandingNarrativeRail";
import ServiceCategories from "@/components/ServiceCategories";
import PopularServices from "@/components/PopularServices";
import TrustBanner from "@/components/TrustBanner";
import HowItWorks from "@/components/HowItWorks";
import FeaturedProfessionals from "@/components/FeaturedProfessionals";
import JoinAsPro from "@/components/JoinAsPro";
import Benefits from "@/components/Benefits";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({
  title: "JustInTime — Find Trusted Professionals Near You in Kenya",
  description:
    "Book verified local professionals for cleaning, plumbing, electrical, repairs & more. Pay with M-Pesa. Trusted by thousands across Kenya.",
  canonical: "https://justintime.gtss.software",
});

export default function Home() {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden antialiased selection:bg-emerald-500/30 selection:text-emerald-100">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "JustInTime",
            url: "https://justintime.gtss.software",
            description: "Kenya's marketplace for verified local professionals",
            potentialAction: {
              "@type": "SearchAction",
              target:
                "https://justintime.gtss.software/professionals?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <main className="landing-shell relative overflow-hidden bg-[#06110d]" role="main">
        {/* ── Aurora animated background ── */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Base gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(112deg, rgba(5,29,22,0.96) 0%, rgba(4,22,18,0.95) 32%, rgba(3,20,16,0.93) 56%, rgba(2,17,14,0.97) 100%)",
            }}
          />
          {/* Aurora animated mesh */}
          <div className="aurora-bg absolute inset-0" />
          {/* Vignette layer */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(6,17,14,0.22) 0%, rgba(6,17,14,0.02) 22%, rgba(6,17,14,0.25) 52%, rgba(5,14,12,0.52) 100%)",
            }}
          />
          {/* Subtle grid texture — finer, more premium */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative z-10">
          {/* 1. Hero — headline, search, avatars, stats */}
          <Suspense fallback={<div className="min-h-[70vh]" />}>
            <Hero />
          </Suspense>

          {/* ─── Glow divider ─── */}
          <div className="glow-divider my-2" aria-hidden="true" />

          {/* Journey narrative rail — anchors the scroll story */}
          <LandingNarrativeRail />

          {/* 2. Service Categories — always visible 12-item grid */}
          <ServiceCategories />

          {/* ─── Glow divider ─── */}
          <div className="glow-divider my-2" aria-hidden="true" />

          {/* 3. Popular Services — data-driven cards */}
          <PopularServices />

          {/* ─── Warm glow divider ─── */}
          <div className="glow-divider glow-divider-warm my-2" aria-hidden="true" />

          {/* 4. Trust Banner — animated metrics strip */}
          <TrustBanner />

          {/* 5. How It Works — 3-step process */}
          <HowItWorks />

          {/* ─── Glow divider ─── */}
          <div className="glow-divider my-2" aria-hidden="true" />

          {/* 6. Featured Professionals — top-rated providers */}
          <FeaturedProfessionals />

          {/* 7. Join as a Pro — recruitment section */}
          <JoinAsPro />

          {/* ─── Rose glow divider ─── */}
          <div className="glow-divider glow-divider-rose my-2" aria-hidden="true" />

          {/* 8. Benefits — why choose JustInTime */}
          <Benefits />

          {/* 9. Testimonials — social proof */}
          <Testimonials />

          {/* ─── Glow divider ─── */}
          <div className="glow-divider my-2" aria-hidden="true" />

          {/* 10. FAQ — common questions */}
          <FAQ />

          {/* 11. Final CTA — conversion */}
          <Suspense fallback={<div className="min-h-32" />}>
            <CTA />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
