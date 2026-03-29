"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Wrench,
  Zap,
  Sparkles,
  Paintbrush,
  Hammer,
  MonitorSmartphone,
  Utensils,
  Heart,
  ShieldCheck,
  Truck,
  GraduationCap,
  Camera,
} from "lucide-react";

const categories = [
  {
    name: "Home Maintenance",
    icon: Wrench,
    color: "from-blue-500/35 to-indigo-500/15",
    iconColor: "text-blue-400",
    href: "/services?category=Home+Maintenance",
  },
  {
    name: "Cleaning Services",
    icon: Sparkles,
    color: "from-cyan-400/35 to-teal-500/15",
    iconColor: "text-cyan-400",
    href: "/services?category=Cleaning",
  },
  {
    name: "Electrical",
    icon: Zap,
    color: "from-amber-400/35 to-yellow-500/15",
    iconColor: "text-amber-400",
    href: "/services?category=Electrical",
  },
  {
    name: "Painting",
    icon: Paintbrush,
    color: "from-pink-500/35 to-rose-500/15",
    iconColor: "text-pink-400",
    href: "/services?category=Painting",
  },
  {
    name: "IT Support",
    icon: MonitorSmartphone,
    color: "from-violet-500/35 to-fuchsia-500/15",
    iconColor: "text-violet-400",
    href: "/services?category=IT+Support",
  },
  {
    name: "Catering",
    icon: Utensils,
    color: "from-orange-500/35 to-amber-500/15",
    iconColor: "text-orange-400",
    href: "/services?category=Catering",
  },
  {
    name: "Construction",
    icon: Hammer,
    color: "from-emerald-500/35 to-teal-500/15",
    iconColor: "text-emerald-400",
    href: "/services?category=Construction",
  },
  {
    name: "Beauty & Wellness",
    icon: Heart,
    color: "from-rose-500/35 to-pink-500/15",
    iconColor: "text-rose-400",
    href: "/services?category=Beauty",
  },
  {
    name: "Security",
    icon: ShieldCheck,
    color: "from-slate-300/35 to-slate-500/15",
    iconColor: "text-slate-300",
    href: "/services?category=Security",
  },
  {
    name: "Moving & Delivery",
    icon: Truck,
    color: "from-teal-400/35 to-cyan-500/15",
    iconColor: "text-teal-400",
    href: "/services?category=Moving",
  },
  {
    name: "Tutoring",
    icon: GraduationCap,
    color: "from-indigo-500/35 to-blue-500/15",
    iconColor: "text-indigo-400",
    href: "/services?category=Tutoring",
  },
  {
    name: "Photography",
    icon: Camera,
    color: "from-fuchsia-500/35 to-violet-500/15",
    iconColor: "text-fuchsia-400",
    href: "/services?category=Photography",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34 } },
};

const ServiceCategories = () => {
  return (
    <section
      className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8"
      aria-label="Service categories"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          className="mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400 sm:text-xs">
            Step 1: Discover
          </p>
          <h2 className="landing-display text-[1.5rem] font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Pick the lane that fits your task
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
            Jump straight into the right category and surface relevant
            professionals faster.
          </p>
        </motion.div>

        {/* Category Grid — 3 cols on mobile for compact fit, scales up */}
        <motion.div
          className="grid grid-cols-3 gap-2.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
        >
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div key={index} variants={cardVariants}>
                <Link href={category.href}>
                  <div className="group relative flex min-h-[7.5rem] cursor-pointer flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-white/8 bg-[linear-gradient(145deg,rgba(255,255,255,0.065),rgba(255,255,255,0.02))] p-3 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/30 sm:min-h-[8.5rem] sm:gap-3 sm:p-5">
                    <div
                      className={`pointer-events-none absolute -top-9 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-linear-to-br ${category.color} opacity-55 blur-2xl transition-opacity duration-300 group-hover:opacity-75`}
                      aria-hidden="true"
                    />
                    <div
                      className={`relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#071610]/85 shadow-[0_10px_28px_-16px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-110 sm:h-12 sm:w-12`}
                    >
                      <span
                        className={`absolute inset-0 rounded-xl bg-linear-to-br ${category.color} opacity-35`}
                        aria-hidden="true"
                      />
                      <Icon
                        className={`h-5 w-5 ${category.iconColor} sm:h-6 sm:w-6`}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-center text-[10px] font-semibold leading-tight text-white/78 transition-colors group-hover:text-white sm:text-xs">
                      {category.name}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default ServiceCategories;
