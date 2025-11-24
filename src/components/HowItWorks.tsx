"use client";
import { motion } from "framer-motion";
import { steps } from "@/lib/dummyData/howItWorks";

const HowItWorks = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            How It Works
          </motion.h2>
          <motion.p
            className="text-lg sm:text-xl md:text-2xl text-gray-600 mt-3 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Get started in just a few simple steps and find the perfect
            professional for your needs
          </motion.p>
        </div>

        <div className="relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-emerald-400 to-green-400 z-0"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="relative flex flex-col items-center text-center p-6 sm:p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white border-opacity-20 transform hover:-translate-y-1.5 z-10"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-green-500 text-white rounded-full h-8 w-8 font-bold text-sm shadow-md">
                  {index + 1}
                </div>

                {/* Icon container */}
                <div className="flex items-center justify-center bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-600 rounded-2xl h-20 w-20 mb-6 shadow-inner">
                  <span className="material-symbols-outlined text-4xl">
                    {step.icon}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">
                  {step.title}
                </h3>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                  {step.description}
                </p>

                {/* Decorative element */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 to-green-400 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          className="text-center mt-16 md:mt-20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="bg-white rounded-2xl p-8 sm:p-10 md:p-12 shadow-lg border border-gray-100 max-w-3xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              Join thousands of satisfied customers who found their perfect
              service professional
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                className="bg-gradient-to-r from-emerald-500 to-green-500 text-white py-3 px-8 rounded-xl font-semibold text-base hover:from-emerald-600 hover:to-green-600 transition-all duration-300 shadow-md hover:shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Find a Professional
              </motion.button>
              <motion.button
                className="border-2 border-emerald-500 text-emerald-600 py-3 px-8 rounded-xl font-semibold text-base hover:bg-emerald-500 hover:text-white transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
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
