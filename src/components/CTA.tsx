"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-8 sm:p-10 md:p-14 flex flex-col md:flex-row items-center gap-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Background accents */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-[60px]" />

          {/* Text content */}
          <div className="relative z-10 flex-1 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
              Ready to Get Started?
            </h2>
            <p className="mt-3 text-emerald-100/80 text-sm sm:text-base max-w-md">
              Find your next trusted professional today on JustInTime. Join thousands of happy customers.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link href="/auth/signup">
                <motion.button
                  className="px-6 py-3 bg-white text-emerald-700 font-bold rounded-xl text-sm hover:bg-emerald-50 transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Hire your first Pro
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </motion.button>
              </Link>
              <Link href="/services">
                <motion.button
                  className="px-6 py-3 border-2 border-white/30 text-white font-semibold rounded-xl text-sm hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Browse Services
                </motion.button>
              </Link>
            </div>
          </div>

          {/* Image side — professional team */}
          <div className="relative z-10 flex-shrink-0 w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
            <div
              className="w-full h-full bg-center bg-cover"
              style={{
                backgroundImage: `url("https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&h=400&fit=crop")`,
              }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
