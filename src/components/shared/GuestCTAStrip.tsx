"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";

interface GuestCTAStripProps {
  title?: string;
  description?: string;
  buttonText?: string;
  signupHref?: string;
  loginHref?: string;
  intent?: string;
  preserveCurrentUrl?: boolean;
}

const GuestCTAStrip: React.FC<GuestCTAStripProps> = ({
  title = "Ready to get started?",
  description = "Create a free account to book services, apply for jobs, or post your own projects.",
  buttonText = "Sign Up Free",
  signupHref = "/auth/signup",
  loginHref = "/auth/login",
  intent,
  preserveCurrentUrl = true,
}) => {
  const { status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (status === "authenticated") return null;

  const currentUrl = searchParams?.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  const enrichAuthHref = (href: string) => {
    if (!preserveCurrentUrl) {
      return href;
    }

    if (!href.startsWith("/auth/")) {
      return href;
    }

    const [basePath, rawQuery = ""] = href.split("?");
    const params = new URLSearchParams(rawQuery);

    if (!params.has("returnTo")) {
      params.set("returnTo", currentUrl);
    }
    if (intent && !params.has("intent")) {
      params.set("intent", intent);
    }

    return params.toString() ? `${basePath}?${params.toString()}` : basePath;
  };

  const resolvedSignupHref = enrichAuthHref(signupHref);
  const resolvedLoginHref = enrichAuthHref(loginHref);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative mt-12 flex flex-col items-center justify-between gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white shadow-[0_24px_60px_-28px_rgba(5,150,105,0.55)] sm:p-10 md:flex-row"
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
          href={resolvedSignupHref}
          className="min-h-[48px] w-full rounded-2xl bg-white px-8 py-3.5 text-center text-sm font-bold text-emerald-800 shadow-lg shadow-black/10 transition hover:bg-emerald-50 sm:w-auto"
        >
          {buttonText}
        </Link>
        <Link
          href={resolvedLoginHref}
          className="min-h-[48px] w-full rounded-2xl border border-white/25 bg-white/10 px-8 py-3.5 text-center text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15 sm:w-auto"
        >
          Sign In
        </Link>
      </div>
    </motion.div>
  );
};

export default GuestCTAStrip;
