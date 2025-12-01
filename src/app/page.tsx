import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PopularServices from "@/components/PopularServices";
import HowItWorks from "@/components/HowItWorks";
import FeaturedProfessionals from "@/components/FeaturedProfessionals";
import Benefits from "@/components/Benefits";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div
      className="relative flex h-auto min-h-screen w-full flex-col bg-white group/design-root overflow-x-hidden"
      style={{
        fontFamily: '"Work Sans", "Noto Sans", sans-serif',
      }}
    >
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <div className="flex flex-1 justify-center py-6 sm:py-8 md:py-12 lg:py-16 xl:py-20">
          <div className="layout-content-container flex flex-col max-w-6xl flex-1 px-3 sm:px-4 md:px-6 lg:px-8 xl:px-0">
            <Hero />
            <PopularServices />
            <HowItWorks />
            <FeaturedProfessionals />
            <Benefits />
            <Testimonials />
            <CTA />
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
