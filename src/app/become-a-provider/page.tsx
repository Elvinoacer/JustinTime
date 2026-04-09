"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { hasRole } from "@/lib/auth/roles";
import Header from "@/components/Header";
import {
  Briefcase,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
} from "lucide-react";

const benefits = [
  {
    icon: Briefcase,
    title: "Earn on Your Terms",
    description:
      "Set your own rates, choose your clients, and work on your schedule. No commissions on your first 3 bookings.",
  },
  {
    icon: TrendingUp,
    title: "Grow Your Business",
    description:
      "Access analytics, client insights, and marketing tools that help you scale from side-hustle to full business.",
  },
  {
    icon: Shield,
    title: "Trusted Platform",
    description:
      "Verified profiles, secure escrow payments, and dispute resolution keep both you and your clients protected.",
  },
  {
    icon: Star,
    title: "Build Your Reputation",
    description:
      "Collect reviews, earn badges, and climb the rankings. Top providers get featured placement.",
  },
];

const steps = [
  {
    step: "1",
    title: "Complete Your Provider Profile",
    description: "Add your business details, skills, and service category.",
    time: "~3 min",
  },
  {
    step: "2",
    title: "Verify Your Identity",
    description: "Quick ID + selfie verification for trust and safety.",
    time: "~2 min",
  },
  {
    step: "3",
    title: "Start Accepting Work",
    description: "List your first service and start getting bookings.",
    time: "Immediately",
  },
];

export default function BecomeAProviderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAuthenticated = status === "authenticated";
  const isProvider = hasRole(session?.user, "PROVIDER");
  const providerSetupDone = session?.user?.providerSetupCompleted;

  const handleCTA = () => {
    if (!isAuthenticated) {
      router.push("/auth/signup?intent=provider&callbackUrl=/provider/setup");
      return;
    }
    if (isProvider && providerSetupDone) {
      router.push("/dashboard");
      return;
    }
    router.push("/provider/setup");
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pt-[var(--public-header-h)]">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-linear-to-br from-gray-900 via-gray-800 to-emerald-900 pb-20 pt-10 sm:pt-14 lg:pb-28 lg:pt-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-emerald-500/50 to-transparent" />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Your client account stays active
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6">
                Turn Your Skills Into{" "}
                <span className="bg-linear-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Income
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-10">
                Already using JustInTime as a client? Add provider capabilities
                to your account and start earning — without losing any of your
                client features.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.button
                  onClick={handleCTA}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] hover:shadow-emerald-500/40 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isProvider && providerSetupDone
                    ? "Go to Provider Dashboard"
                    : "Start Provider Setup"}
                  <ArrowRight className="w-5 h-5" />
                </motion.button>

                <p className="flex items-center gap-2 text-center text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  Takes about 5 minutes
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Reassurance Banner */}
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col items-start justify-center gap-3 text-sm text-gray-600 min-[420px]:items-center min-[420px]:text-center sm:flex-row sm:gap-8">
              {[
                "Your client bookings stay unchanged",
                "Switch between modes anytime",
                "One account, two dashboards",
              ].map((text) => (
                <div
                  key={text}
                  className="flex w-full items-center gap-2 sm:w-auto"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-16 lg:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Become a Provider?
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Join thousands of professionals who are building their
                businesses on JustInTime.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {benefits.map((benefit, i) => {
                const Icon = benefit.icon;
                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all duration-300"
                  >
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-gray-600">
                Three simple steps to unlock provider mode.
              </p>
            </motion.div>

            <div className="space-y-6">
              {steps.map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-start gap-4 sm:gap-5"
                >
                  <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md shadow-emerald-500/20">
                    {step.step}
                  </div>
                  <div className="flex-1 pb-6 border-b border-gray-100 last:border-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2 sm:gap-3">
                      <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                        {step.title}
                      </h3>
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        {step.time}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Footer */}
        <section className="bg-linear-to-br from-gray-900 to-emerald-900 py-14 sm:py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to start earning?
            </h2>
            <p className="text-gray-300 mb-8">
              Your client account stays exactly as it is. You&apos;re just
              adding a new capability.
            </p>
            <motion.button
              onClick={handleCTA}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {isProvider && providerSetupDone
                ? "Go to Provider Dashboard"
                : "Activate Provider Mode"}
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 bg-gray-50 border-t border-gray-200">
          <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-500">
            <p>
              Already a provider?{" "}
              <Link
                href="/dashboard"
                className="text-emerald-600 font-medium hover:text-emerald-700"
              >
                Go to your dashboard →
              </Link>
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
