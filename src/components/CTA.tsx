"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-8 sm:py-12 md:py-16 lg:py-20 px-3 xs:px-4 sm:px-6 lg:px-8 mx-3 xs:mx-4 sm:mx-6 lg:mx-auto">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="relative bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-500 rounded-xl sm:rounded-2xl md:rounded-3xl p-5 xs:p-6 sm:p-8 md:p-10 lg:p-12 text-center overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
                backgroundSize: "12px 12px",
                color: "white",
              }}
            ></div>
          </div>

          {/* Animated circles */}
          <motion.div
            className="absolute -top-6 -left-4 xs:-top-8 xs:-left-6 w-20 xs:w-24 sm:w-28 h-20 xs:h-24 sm:h-28 rounded-full bg-white opacity-5"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-6 -right-4 xs:-bottom-8 xs:-right-6 w-24 xs:w-28 sm:w-32 h-24 xs:h-28 sm:h-32 rounded-full bg-white opacity-5"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true, margin: "-50px" }}
            className="relative z-10"
          >
            <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight px-1">
              Ready to Get Started?
            </h2>
            <p className="text-sm xs:text-base sm:text-lg md:text-xl text-white mt-2 sm:mt-3 max-w-lg md:max-w-2xl mx-auto opacity-95 leading-relaxed px-2">
              Join thousands of satisfied users and find the perfect
              professional.
            </p>

            <div className="mt-6 sm:mt-8 md:mt-10 flex flex-col xs:flex-row justify-center items-stretch xs:items-center gap-3 sm:gap-4">
              <Link
                href="/auth/signup"
                className="flex-1 xs:flex-none min-w-[120px]"
              >
                <motion.button
                  className="relative w-full cursor-pointer overflow-hidden rounded-lg sm:rounded-xl h-10 xs:h-11 sm:h-12 px-4 sm:px-6 bg-white text-emerald-700 text-sm xs:text-base font-bold tracking-wide hover:bg-gray-50 transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98] group"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    Sign Up Now
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></div>
                </motion.button>
              </Link>

              <Link
                href="/#how-it-works"
                className="flex-1 xs:flex-none min-w-[120px]"
              >
                <motion.button
                  className="w-full cursor-pointer overflow-hidden rounded-lg sm:rounded-xl h-10 xs:h-11 sm:h-12 px-4 sm:px-6 bg-transparent border border-white text-white text-sm xs:text-base font-bold tracking-wide hover:bg-white hover:text-emerald-700 transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    Learn More
                  </span>
                </motion.button>
              </Link>
            </div>

            <p className="text-xs sm:text-sm text-white mt-4 sm:mt-6 opacity-80">
              No credit card required
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
