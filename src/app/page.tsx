import Header from "@/components/Header";
import Hero from "@/components/Hero";
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
              target: "https://justintime.gtss.software/professionals?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      {/* Unified dark background for entire landing page (except footer) */}
      <main className="relative bg-[#0a1a15]">
        {/* Global mesh gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-emerald-600/[0.07] rounded-full blur-[180px]" />
          <div className="absolute top-[15%] right-0 w-[600px] h-[600px] bg-teal-500/[0.05] rounded-full blur-[150px]" />
          <div className="absolute top-[35%] left-0 w-[700px] h-[700px] bg-emerald-700/[0.06] rounded-full blur-[160px]" />
          <div className="absolute top-[55%] right-1/4 w-[500px] h-[500px] bg-cyan-600/[0.04] rounded-full blur-[140px]" />
          <div className="absolute top-[75%] left-1/3 w-[600px] h-[600px] bg-emerald-500/[0.05] rounded-full blur-[170px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-600/[0.04] rounded-full blur-[160px]" />
        </div>
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(52,211,153,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.4) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative z-10">
          {/* 1. Hero — headline, search, avatars, stats */}
          <Hero />
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
          <CTA />
        </div>
      </main>
      <Footer />
    </div>
  );
}
