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
  { name: "Home Maintenance", icon: Wrench, color: "from-blue-500/20 to-blue-600/10", borderColor: "border-blue-500/20", href: "/services?category=Home+Maintenance" },
  { name: "Cleaning Services", icon: Sparkles, color: "from-cyan-500/20 to-cyan-600/10", borderColor: "border-cyan-500/20", href: "/services?category=Cleaning" },
  { name: "Electrical", icon: Zap, color: "from-amber-500/20 to-amber-600/10", borderColor: "border-amber-500/20", href: "/services?category=Electrical" },
  { name: "Painting", icon: Paintbrush, color: "from-pink-500/20 to-pink-600/10", borderColor: "border-pink-500/20", href: "/services?category=Painting" },
  { name: "IT Support", icon: MonitorSmartphone, color: "from-violet-500/20 to-violet-600/10", borderColor: "border-violet-500/20", href: "/services?category=IT+Support" },
  { name: "Catering", icon: Utensils, color: "from-orange-500/20 to-orange-600/10", borderColor: "border-orange-500/20", href: "/services?category=Catering" },
  { name: "Construction", icon: Hammer, color: "from-emerald-500/20 to-emerald-600/10", borderColor: "border-emerald-500/20", href: "/services?category=Construction" },
  { name: "Beauty & Wellness", icon: Heart, color: "from-rose-500/20 to-rose-600/10", borderColor: "border-rose-500/20", href: "/services?category=Beauty" },
  { name: "Security", icon: ShieldCheck, color: "from-slate-400/20 to-slate-500/10", borderColor: "border-slate-400/20", href: "/services?category=Security" },
  { name: "Moving & Delivery", icon: Truck, color: "from-teal-500/20 to-teal-600/10", borderColor: "border-teal-500/20", href: "/services?category=Moving" },
  { name: "Tutoring", icon: GraduationCap, color: "from-indigo-500/20 to-indigo-600/10", borderColor: "border-indigo-500/20", href: "/services?category=Tutoring" },
  { name: "Photography", icon: Camera, color: "from-fuchsia-500/20 to-fuchsia-600/10", borderColor: "border-fuchsia-500/20", href: "/services?category=Photography" },
];

const ServiceCategories = () => {
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
            Browse
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            Explore by Category
          </h2>
          <p className="mt-3 text-gray-500 text-sm sm:text-base max-w-lg">
            Find exactly what you need — from home repairs to personal care, all in one place.
          </p>
        </motion.div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                viewport={{ once: true, margin: "-30px" }}
              >
                <Link href={category.href}>
                  <div className={`group flex flex-col items-center gap-3 p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] ${category.borderColor} hover:bg-white/[0.07] hover:border-emerald-500/20 transition-all duration-400 cursor-pointer`}>
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white/80 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-gray-400 text-[11px] sm:text-xs font-medium text-center leading-tight group-hover:text-white transition-colors">
                      {category.name}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServiceCategories;
