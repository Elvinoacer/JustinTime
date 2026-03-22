"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";

const perks = [
  "Create your professional profile in minutes",
  "Set your own prices and availability",
  "Get matched with clients in your area",
  "Receive payments via M-Pesa instantly",
  "Build your reputation with reviews",
  "Access to thousands of potential customers",
];

const JoinAsPro = () => {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left — Image */}
          <motion.div
            className="relative rounded-2xl overflow-hidden aspect-[4/3]"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{
                backgroundImage: `url("https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=450&fit=crop")`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a15] via-transparent to-transparent" />
            {/* Floating badge */}
            <div className="absolute bottom-4 left-4 backdrop-blur-md bg-black/40 border border-white/10 rounded-xl px-4 py-3">
              <p className="text-emerald-400 text-xl font-bold">KSh 85k+</p>
              <p className="text-gray-400 text-[10px] uppercase tracking-wider">avg. monthly earnings</p>
            </div>
          </motion.div>

          {/* Right — Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-2">
              For Professionals
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
              Grow Your Business with JustInTime
            </h2>
            <p className="mt-3 text-gray-400 text-sm sm:text-base leading-relaxed">
              Join Kenya&apos;s fastest-growing marketplace for service professionals. Reach more customers, manage bookings, and get paid — all from one platform.
            </p>

            {/* Perks list */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {perks.map((perk, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-xs sm:text-sm">{perk}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/provider/onboarding">
                <motion.button
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Join as a Pro
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </motion.button>
              </Link>
              <Link href="/about">
                <motion.button
                  className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 text-gray-300 text-sm font-medium rounded-xl hover:border-emerald-500/30 hover:text-emerald-300 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Learn More
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default JoinAsPro;
