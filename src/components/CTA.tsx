"use client";
import { motion } from "framer-motion";

const CTA = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="relative bg-gradient-to-r from-emerald-500 via-green-500 to-lime-400 rounded-3xl p-8 sm:p-10 md:p-12 lg:p-14 text-center overflow-hidden"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          {/* Background pattern for visual interest */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full pattern-dots pattern-green-500 pattern-bg-white pattern-opacity-100 pattern-size-4"></div>
          </div>

          {/* Animated circles for visual enhancement */}
          <motion.div
            className="absolute -top-10 -left-8 w-32 h-32 rounded-full bg-white opacity-5"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-10 -right-8 w-40 h-40 rounded-full bg-white opacity-5"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
              Ready to Get Started?
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl text-white mt-3 md:mt-4 max-w-2xl mx-auto opacity-95 leading-relaxed">
              Join thousands of satisfied users today and find the perfect
              professional for your needs.
            </p>

            <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <motion.button
                className="relative min-w-[140px] sm:min-w-[160px] cursor-pointer overflow-hidden rounded-xl h-12 sm:h-14 px-6 sm:px-8 bg-white text-emerald-700 text-base sm:text-lg font-bold leading-normal tracking-wide hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10">Sign Up Now</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></div>
              </motion.button>

              <motion.button
                className="min-w-[140px] sm:min-w-[160px] cursor-pointer overflow-hidden rounded-xl h-12 sm:h-14 px-6 sm:px-8 bg-transparent border-2 border-white text-white text-base sm:text-lg font-bold leading-normal tracking-wide hover:bg-white hover:text-emerald-700 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>Learn More</span>
              </motion.button>
            </div>

            <p className="text-sm sm:text-base text-white mt-6 opacity-80">
              No credit card required
            </p>
          </motion.div>
        </motion.div>
      </div>

      <style jsx>{`
        .pattern-dots {
          background-image: radial-gradient(currentColor 1px, transparent 1px);
          background-size: 12px 12px;
        }
      `}</style>
    </section>
  );
};

export default CTA;
