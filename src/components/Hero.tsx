"use client";
import { useState } from "react";
import { motion } from "framer-motion";

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="relative rounded-b-3xl md:rounded-b-none overflow-hidden mx-4 mt-4 sm:mx-6 sm:mt-6 md:mx-0 md:mt-0">
      {/* Background with overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-gray-900/60 z-10"></div>
      <div
        className="flex min-h-[500px] sm:min-h-[600px] md:min-h-[700px] flex-col gap-8 items-center justify-center p-6 sm:p-8 md:p-10 text-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80")',
        }}
      >
        <div className="z-20 flex flex-col gap-6 max-w-4xl">
          <motion.h1
            className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Find Trusted{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
              Professionals
            </span>{" "}
            Near You
          </motion.h1>

          <motion.h2
            className="text-gray-200 text-lg sm:text-xl md:text-2xl font-normal leading-relaxed max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Connect with skilled local service providers for all your needs,
            from home repairs to personal services, right in your community.
          </motion.h2>
        </div>

        <motion.div
          className="z-20 w-full max-w-2xl mt-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-1.5 flex flex-col sm:flex-row items-stretch w-full">
            <div className="flex items-center px-4 py-3 sm:py-0">
              <span className="material-symbols-outlined text-gray-500">
                search
              </span>
              <input
                className="flex-1 min-w-0 border-none outline-none text-gray-800 placeholder-gray-500 text-base sm:text-lg font-normal ml-3 bg-transparent"
                placeholder="What service do you need?..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center border-t border-gray-200 sm:border-t-0 sm:border-l sm:pl-2 pt-3 sm:pt-0">
              <select className="text-gray-700 bg-transparent border-none outline-none text-base sm:text-lg font-medium mx-3 sm:mx-4">
                <option>Location</option>
                <option>Nairobi</option>
                <option>Mombasa</option>
                <option>Kisumu</option>
                <option>Nakuru</option>
              </select>

              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>

              <motion.button
                className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 sm:h-14 px-6 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-base font-bold leading-normal tracking-wide hover:from-emerald-600 hover:to-green-600 transition-all duration-300 ml-auto mx-3 sm:mx-4 my-2 sm:my-0"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="truncate">Search Now</span>
              </motion.button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {["Plumbing", "Electrical", "Cleaning", "Repairs", "Painting"].map(
              (service, index) => (
                <motion.span
                  key={index}
                  className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium cursor-pointer hover:bg-white/20 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {service}
                </motion.span>
              )
            )}
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          className="z-20 mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {[
            { number: "500+", label: "Professionals" },
            { number: "2,500+", label: "Happy Clients" },
            { number: "98%", label: "Satisfaction Rate" },
            { number: "24/7", label: "Support" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                {stat.number}
              </div>
              <div className="text-sm sm:text-base text-gray-300 mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Floating elements for visual interest */}
      <motion.div
        className="absolute top-20 left-10 w-6 h-6 rounded-full bg-emerald-400/20 z-0"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-40 right-16 w-8 h-8 rounded-full bg-white/10 z-0"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
      />
    </div>
  );
};

export default Hero;
