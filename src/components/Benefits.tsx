"use client";
import { motion } from "framer-motion";
import { Shield, Clock, CreditCard, Umbrella, Headphones, ThumbsUp } from "lucide-react";

const benefits = [
  { title: "Verified Professionals", description: "Every pro is background-checked and vetted before joining.", icon: Shield },
  { title: "Instant Booking", description: "Book a professional in minutes. No phone calls, no waiting.", icon: Clock },
  { title: "M-Pesa Payments", description: "Pay securely with M-Pesa or card. No cash needed.", icon: CreditCard },
  { title: "Happiness Guarantee", description: "Not satisfied? We'll make it right or refund your payment.", icon: Umbrella },
  { title: "24/7 Support", description: "Our support team is always available to assist you.", icon: Headphones },
  { title: "Top-Rated Quality", description: "98% satisfaction rate. Exceptional service every time.", icon: ThumbsUp },
];

const Benefits = () => {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-10 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-2">
            Why Us
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            Why Kenyans Trust JustInTime
          </h2>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                className="group backdrop-blur-sm bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 sm:p-6 hover:bg-white/[0.07] hover:border-emerald-500/20 transition-all duration-500"
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                viewport={{ once: true, margin: "-50px" }}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/15 transition-colors">
                  <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-white text-base sm:text-lg font-semibold mb-1.5">
                  {benefit.title}
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
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
