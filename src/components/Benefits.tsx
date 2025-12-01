"use client";
import { motion } from "framer-motion";
import { benefits } from "@/lib/dummyData/benefits";
import {
  Shield,
  Clock,
  Award,
  DollarSign,
  ThumbsUp,
  Headphones,
} from "lucide-react";

// Map icon names to actual components
const iconComponents: { [key: string]: React.ComponentType<any> } = {
  shield: Shield,
  schedule: Clock,
  workspace_premium: Award,
  payments: DollarSign,
  thumb_up: ThumbsUp,
  support_agent: Headphones,
};

const Benefits = () => {
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
            Why Choose Us?
          </motion.h2>
          <motion.p
            className="text-sm xs:text-base sm:text-lg md:text-xl text-gray-600 mt-2 sm:mt-3 max-w-2xl md:max-w-3xl mx-auto px-2 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            Discover the advantages of using our platform
          </motion.p>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {benefits.map((benefit, index) => {
            const IconComponent = iconComponents[benefit.icon] || Shield;
            return (
              <motion.div
                key={index}
                className="flex flex-col items-center text-center p-4 sm:p-5 md:p-6 bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-emerald-100"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-50px" }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center justify-center bg-gradient-to-br from-emerald-400 to-green-500 text-white rounded-full h-14 w-14 xs:h-16 xs:w-16 sm:h-18 sm:w-18 md:h-20 md:w-20 mb-4 sm:mb-5 shadow-sm sm:shadow-md">
                  <IconComponent className="h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8" />
                </div>

                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-2 sm:mb-3 leading-tight">
                  {benefit.title}
                </h3>

                <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed max-w-xs sm:max-w-sm mx-auto px-1">
                  {benefit.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
