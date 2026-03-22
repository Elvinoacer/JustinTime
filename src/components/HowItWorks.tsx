"use client";
import { motion } from "framer-motion";
import { Search, UserCheck, CalendarCheck } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "Post your request",
    description: "Enter what you need in the search bar or browse categories to find the perfect service.",
    icon: Search,
  },
  {
    num: "02",
    title: "Compare matches",
    description: "Browse profiles, ratings, and reviews. Pick the professional that fits your budget.",
    icon: UserCheck,
  },
  {
    num: "03",
    title: "Hire a Pro",
    description: "Confirm your booking, pay securely with M-Pesa, and let the professional handle the rest.",
    icon: CalendarCheck,
  },
];

const HowItWorks = () => {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-10 sm:mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-2">
            How It Works
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Simple, Reliable, Local.
          </h2>
        </motion.div>

        {/* Steps — horizontal on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                className="relative flex flex-col"
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.12 }}
                viewport={{ once: true, margin: "-50px" }}
              >
                {/* Step number */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-emerald-500/30 text-3xl font-bold">{step.num}</span>
                </div>

                <h3 className="text-white text-lg font-semibold mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {step.description}
                </p>

                {/* Mobile connector */}
                {index < steps.length - 1 && (
                  <div className="md:hidden mt-6 mb-2 ml-5 w-px h-6 bg-emerald-500/20" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
