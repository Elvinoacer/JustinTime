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
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
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
        {/* ── Background gradient layers ── */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Base gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(112deg, rgba(5,29,22,0.96) 0%, rgba(4,22,18,0.95) 32%, rgba(3,20,16,0.93) 56%, rgba(2,17,14,0.97) 100%)",
            }}
          />
          {/* Emerald radial glows — using inline styles for reliable mobile rendering */}
          <div
            className="absolute inset-0"
            style={{
              background: [
                "radial-gradient(120% 70% at 10% 6%, rgba(34,197,94,0.16), transparent 52%)",
                "radial-gradient(85% 58% at 86% 14%, rgba(16,185,129,0.14), transparent 55%)",
                "radial-gradient(90% 65% at 52% 84%, rgba(20,184,166,0.11), transparent 60%)",
              ].join(", "),
            }}
          />
          {/* Vignette layer */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(6,17,14,0.28) 0%, rgba(6,17,14,0.05) 22%, rgba(6,17,14,0.3) 52%, rgba(5,14,12,0.58) 100%)",
            }}
          />
          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)",
              backgroundSize: "68px 68px",
            }}
          />
        </div>

        <div className="relative z-10">
          {/* 1. Hero — headline, search, avatars, stats */}
          <Suspense fallback={<div className="min-h-[70vh]" />}>
            <Hero />
          </Suspense>
          {/* Journey narrative rail — anchors the scroll story */}
          <LandingNarrativeRail />
          {/* 2. Service Categories — always visible 12-item grid */}
          <ServiceCategories />
          {/* 3. Popular Services — data-driven cards */}
          <PopularServices />
          {/* 4. Trust Banner — animated metrics strip */}
          <TrustBanner />
          {/* 5. How It Works — 3-step process */}
          <HowItWorks />
          {/* 6. Featured Professionals — top-rated providers */}
          <FeaturedProfessionals />
          {/* 7. Join as a Pro — recruitment section */}
          <JoinAsPro />
          {/* 8. Benefits — why choose JustInTime */}
          <Benefits />
          {/* 9. Testimonials — social proof */}
          <Testimonials />
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
