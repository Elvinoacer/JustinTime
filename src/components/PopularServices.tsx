"use client";
import { motion } from "framer-motion";
import { useServices } from "@/lib/api/hooks/useServices";
import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";

const PopularServices = () => {
  const { data, isLoading } = useServices({ limit: 6, sort: "rating" });
  const services = data?.services || [];

  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="mb-10 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            Explore Services
          </h2>
        </motion.div>

        {/* Cards Grid — Glassmorphism */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/[0.04] rounded-2xl h-56 animate-pulse border border-white/[0.06]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {services.map((service: any, index: number) => (
              <motion.div
                key={service.id}
                className="group relative backdrop-blur-sm bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden hover:bg-white/[0.07] hover:border-emerald-500/20 transition-all duration-500"
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                viewport={{ once: true, margin: "-50px" }}
              >
                <div className="p-5 sm:p-6">
                  {/* Service icon/image thumbnail */}
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 overflow-hidden">
                    {service.images?.[0] || service.imageUrl ? (
                      <div
                        className="w-full h-full bg-center bg-cover rounded-lg"
                        style={{ backgroundImage: `url("${service.images?.[0] || service.imageUrl}")` }}
                      />
                    ) : (
                      <Star className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-white text-base sm:text-lg font-semibold mb-1.5 line-clamp-1 group-hover:text-emerald-300 transition-colors">
                    {service.title || service.name}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-500 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-4">
                    {service.description}
                  </p>

                  {/* Book Now link */}
                  <Link
                    href={`/services/${service.id}`}
                    className="inline-flex items-center gap-1 text-emerald-400 text-xs sm:text-sm font-medium hover:text-emerald-300 transition-colors group/link"
                  >
                    Book Now
                    <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* View All */}
        <motion.div
          className="mt-10 sm:mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <Link href="/services">
            <motion.button
              className="inline-flex items-center gap-2 px-6 py-2.5 border border-white/10 text-gray-300 rounded-full text-sm font-medium hover:border-emerald-500/30 hover:text-emerald-300 hover:bg-emerald-500/5 transition-all duration-300 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View All Services
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PopularServices;
