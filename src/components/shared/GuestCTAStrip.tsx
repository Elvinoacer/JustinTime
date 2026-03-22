"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

interface GuestCTAStripProps {
  title?: string;
  description?: string;
  buttonText?: string;
}

const GuestCTAStrip: React.FC<GuestCTAStripProps> = ({
  title = "Ready to get started?",
  description = "Create a free account to book services, apply for jobs, or post your own projects.",
  buttonText = "Sign Up Free",
}) => {
  const { status } = useSession();

  if (status === "authenticated") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-12 p-6 sm:p-10 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 rounded-2xl sm:rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-emerald-600/20 relative overflow-hidden"
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />

      <div className="relative z-10 text-center md:text-left">
        <h3 className="text-xl sm:text-2xl font-bold mb-2">{title}</h3>
        <p className="text-emerald-50 text-sm sm:text-base max-w-xl">
          {description}
        </p>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <Link
          href="/auth/signup"
          className="px-8 py-3.5 bg-white text-emerald-700 rounded-xl font-bold hover:bg-emerald-50 transition-all text-center shadow-lg shadow-white/10 hover:shadow-white/20 hover:-translate-y-0.5 active:translate-y-0"
        >
          {buttonText}
        </Link>
        <Link
          href="/auth/login"
          className="px-8 py-3.5 bg-emerald-500/30 backdrop-blur-md text-white border border-white/20 rounded-xl font-bold hover:bg-emerald-500/40 transition-all text-center hover:-translate-y-0.5 active:translate-y-0"
        >
          Sign In
        </Link>
      </div>
    </motion.div>
  );
};

export default GuestCTAStrip;
