"use client";
import { motion } from "framer-motion";
import { steps } from "@/lib/dummyData/howItWorks";
import { Search, Calendar, Users, CheckCircle } from "lucide-react";

// Map icon names to actual components for better performance
const iconComponents: { [key: string]: React.ComponentType<any> } = {
  search: Search,
  calendar_month: Calendar,
  group: Users,
  check_circle: CheckCircle,
};

const HowItWorks = () => {
  return (
    <section className="py-8 sm:py-12 md:py-16 lg:py-20 px-3 xs:px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl sm:rounded-2xl md:rounded-3xl mx-3 xs:mx-4 sm:mx-6 lg:mx-auto">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <motion.h2
            className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            How It Works
          </motion.h2>
          <motion.p
            className="text-sm xs:text-base sm:text-lg md:text-xl text-gray-600 mt-2 sm:mt-3 max-w-2xl md:max-w-3xl mx-auto px-2 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            Get started in just a few simple steps
          </motion.p>
        </div>

        <div className="relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-16 md:top-20 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-emerald-400 to-green-400 z-0"></div>

          {/* Mobile step indicators */}
          <div className="lg:hidden flex justify-center mb-6 sm:mb-8">
            <div className="flex items-center space-x-4">
              {[...Array(steps.length)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i === 0 ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {steps.map((step, index) => {
              const IconComponent = iconComponents[step.icon] || Search;
              return (
                <motion.div
                  key={index}
                  className="relative flex flex-col items-center text-center p-4 sm:p-5 md:p-6 bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-emerald-100 z-10"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  whileHover={{ y: -2 }}
                >
                  {/* Step number - Mobile position */}
                  <div className="lg:hidden absolute top-3 left-3 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-green-500 text-white rounded-full h-6 w-6 font-bold text-xs shadow-sm">
                    {index + 1}
                  </div>

                  {/* Step number - Desktop position */}
                  <div className="hidden lg:flex absolute -top-4 left-1/2 transform -translate-x-1/2 items-center justify-center bg-gradient-to-br from-emerald-500 to-green-500 text-white rounded-full h-7 w-7 font-bold text-sm shadow-md">
                    {index + 1}
                  </div>

                  {/* Icon container */}
                  <div className="flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-50 text-emerald-600 rounded-xl sm:rounded-2xl h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 mb-4 sm:mb-5 md:mb-6 shadow-sm">
                    <IconComponent className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                  </div>

                  {/* Content */}
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-2 sm:mb-3">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Connecting arrow for mobile */}
                  {index < steps.length - 1 && (
                    <div className="sm:hidden mt-4 pt-4 border-t border-gray-100 w-full">
                      <div className="flex items-center justify-center text-gray-400">
                        <div className="w-6 h-0.5 bg-gray-300"></div>
                        <svg
                          className="w-4 h-4 text-gray-400 ml-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          className="text-center mt-8 sm:mt-12 md:mt-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 shadow-md sm:shadow-lg border border-gray-100 max-w-2xl md:max-w-3xl mx-auto">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-4 sm:mb-6 max-w-xl mx-auto px-1">
              Join thousands of satisfied customers
            </p>
            <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 justify-center items-stretch xs:items-center">
              <motion.button
                className="bg-gradient-to-r from-emerald-500 to-green-500 text-white py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:from-emerald-600 hover:to-green-600 transition-all duration-300 shadow-md hover:shadow-lg flex-1 xs:flex-none min-w-[140px]"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Find a Pro
              </motion.button>
              <motion.button
                className="border border-emerald-500 text-emerald-600 py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:bg-emerald-500 hover:text-white transition-all duration-300 flex-1 xs:flex-none min-w-[140px]"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Learn More
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
