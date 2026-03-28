"use client";
import { motion } from "framer-motion";
import { useServices } from "@/lib/api/hooks/useServices";
import Link from "next/link";
import { Star, Check, ArrowRight } from "lucide-react";

const FeaturedProfessionals = () => {
  const { data, isLoading } = useServices({ limit: 3, sort: "rating" });
  const services = data?.services || [];

  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end mb-10 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-2">
              Top Rated
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Featured Professionals
            </h2>
          </motion.div>
          <Link href="/professionals" className="hidden sm:flex items-center gap-1 text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service: any, index: number) => (
              <motion.div
                key={service.id}
                className="group backdrop-blur-sm bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 sm:p-6 hover:bg-white/[0.07] hover:border-emerald-500/20 transition-all duration-500 flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-50px" }}
              >
                {/* Avatar with ring */}
                <div className="relative mb-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full ring-2 ring-emerald-400/30 ring-offset-2 ring-offset-[#0a1a15] overflow-hidden group-hover:ring-emerald-400/50 transition-all duration-500">
                    <div
                      className="w-full h-full bg-center bg-no-repeat bg-cover"
                      style={{ backgroundImage: `url("${service.provider?.image || service.images?.[0] || "/images/placeholder.png"}")` }}
                    />
                  </div>
                  {service.provider?.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-md">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>

                <h3 className="text-white text-base sm:text-lg font-semibold">
                  {service.provider?.name || "Professional"}
                </h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  {service.category?.name || "Specialist"}
                </p>

                <div className="flex items-center gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < Math.floor(service.rating || 5) ? "fill-amber-400 text-amber-400" : "fill-gray-700 text-gray-700"}`} />
                  ))}
                  <span className="text-gray-400 text-xs ml-1">({service.reviews || 0})</span>
                </div>

                <div className="w-full mt-4 pt-4 border-t border-white/[0.06] flex justify-between items-center">
                  <span className="text-gray-500 text-xs">From</span>
                  <span className="text-emerald-400 font-semibold text-sm">
                    Ksh {Number(service.price || service.startingPrice || 0).toLocaleString()}
                  </span>
                </div>

                <Link href={`/services/${service.id}`} className="w-full mt-3">
                  <button className="w-full py-2 px-4 bg-white/[0.06] border border-white/[0.08] text-gray-300 rounded-xl text-xs font-medium hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/20 transition-all duration-300">
                    View Profile
                  </button>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Mobile View All */}
        <div className="sm:hidden mt-8 text-center">
          <Link href="/professionals" className="inline-flex items-center gap-1 text-emerald-400 text-sm font-medium">
            View All Professionals <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProfessionals;
