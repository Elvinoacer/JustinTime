import { Suspense } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import { constructMetadata } from "@/lib/metadata";

const LandingNarrativeRail = dynamic(
  () => import("@/components/LandingNarrativeRail"),
  { loading: () => <div className="min-h-32" /> },
);
const ServiceCategories = dynamic(
  () => import("@/components/ServiceCategories"),
  { loading: () => <div className="min-h-48" /> },
);
const PopularServices = dynamic(() => import("@/components/PopularServices"), {
  loading: () => <div className="min-h-48" />,
});
const TrustBanner = dynamic(() => import("@/components/TrustBanner"), {
  loading: () => <div className="min-h-32" />,
});
const HowItWorks = dynamic(() => import("@/components/HowItWorks"), {
  loading: () => <div className="min-h-48" />,
});
const FeaturedProfessionals = dynamic(
  () => import("@/components/FeaturedProfessionals"),
  { loading: () => <div className="min-h-48" /> },
);
const JoinAsPro = dynamic(() => import("@/components/JoinAsPro"), {
  loading: () => <div className="min-h-48" />,
});
const Benefits = dynamic(() => import("@/components/Benefits"), {
  loading: () => <div className="min-h-48" />,
});
const Testimonials = dynamic(() => import("@/components/Testimonials"), {
  loading: () => <div className="min-h-48" />,
});
const FAQ = dynamic(() => import("@/components/FAQ"), {
  loading: () => <div className="min-h-48" />,
});
const CTA = dynamic(() => import("@/components/CTA"), {
  loading: () => <div className="min-h-32" />,
});

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
      <main
        className="landing-shell relative overflow-hidden bg-[#05080a]"
        role="main"
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(112deg, rgba(5,8,10,0.98) 0%, rgba(6,14,17,0.96) 38%, rgba(12,10,16,0.97) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 72% 48% at 14% 14%, rgba(20,184,166,0.07), transparent 54%), radial-gradient(ellipse 64% 46% at 88% 18%, rgba(59,130,246,0.08), transparent 54%), radial-gradient(ellipse 70% 48% at 52% 92%, rgba(245,158,11,0.055), transparent 56%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(6,17,14,0.22) 0%, rgba(6,17,14,0.02) 22%, rgba(6,17,14,0.25) 52%, rgba(5,14,12,0.52) 100%)",
            }}
          />
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
          <Suspense fallback={<div className="min-h-[70vh]" />}>
            <Hero />
          </Suspense>
          <div className="glow-divider my-2" aria-hidden="true" />
          <LandingNarrativeRail />
          <ServiceCategories />
          <div className="glow-divider my-2" aria-hidden="true" />
          <PopularServices />
          <div
            className="glow-divider glow-divider-warm my-2"
            aria-hidden="true"
          />
          <TrustBanner />
          <HowItWorks />
          <div className="glow-divider my-2" aria-hidden="true" />
          <FeaturedProfessionals />
          <JoinAsPro />
          <div
            className="glow-divider glow-divider-rose my-2"
            aria-hidden="true"
          />
          <Benefits />
          <Testimonials />
          <div className="glow-divider my-2" aria-hidden="true" />
          <FAQ />
          <Suspense fallback={<div className="min-h-32" />}>
            <CTA />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
