"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { hasRole } from "@/lib/auth/roles";
import {
  CheckCircle,
  Circle,
  ArrowRight,
  Briefcase,
  Calendar,
  Shield,
  CreditCard,
  User,
  Loader2,
  PartyPopper,
} from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  completed: boolean;
}

export default function ProviderSetupChecklistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isLoading = status === "loading";
  const [checklistData, setChecklistData] = useState<{
    hasServices: boolean;
    hasAvailability: boolean;
    verificationStatus: string | null;
    hasPayoutDetails: boolean;
    profilePublished: boolean;
  } | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  // Redirect guards
  useEffect(() => {
    if (isLoading) return;
    if (!session?.user) {
      router.push("/auth/login?callbackUrl=/provider/setup/checklist");
      return;
    }
    if (!session.user.providerSetupCompleted) {
      router.push("/provider/setup");
      return;
    }
  }, [session, isLoading, router]);

  // Fetch checklist progress
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchProgress = async () => {
      try {
        const [servicesRes, availRes, profileRes] = await Promise.allSettled([
          fetch("/api/services?limit=1", { credentials: "include" }),
          fetch("/api/availability", { credentials: "include" }),
          fetch("/api/provider/profile", { credentials: "include" }),
        ]);

        let hasServices = false;
        let hasAvailability = false;
        let verificationStatus: string | null = null;
        let hasPayoutDetails = false;
        let profilePublished = false;

        if (servicesRes.status === "fulfilled" && servicesRes.value.ok) {
          try {
            const data = await servicesRes.value.json();
            hasServices = (data?.services?.length ?? data?.data?.length ?? 0) > 0;
          } catch {}
        }

        if (availRes.status === "fulfilled" && availRes.value.ok) {
          try {
            const data = await availRes.value.json();
            hasAvailability =
              (data?.availability?.length ?? data?.data?.length ?? 0) > 0;
          } catch {}
        }

        if (profileRes.status === "fulfilled" && profileRes.value.ok) {
          try {
            const data = await profileRes.value.json();
            const profile = data?.profile ?? data?.data;
            verificationStatus = profile?.verificationStatus ?? null;
            hasPayoutDetails = Boolean(profile?.hasPaidOnboardingFee);
            profilePublished = Boolean(profile?.isVerified);
          } catch {}
        }

        setChecklistData({
          hasServices,
          hasAvailability,
          verificationStatus,
          hasPayoutDetails,
          profilePublished,
        });
      } catch (error) {
        console.error("[CHECKLIST_FETCH_ERROR]", error);
        setChecklistData({
          hasServices: false,
          hasAvailability: false,
          verificationStatus: null,
          hasPayoutDetails: false,
          profilePublished: false,
        });
      } finally {
        setIsFetching(false);
      }
    };

    void fetchProgress();
  }, [session?.user?.id]);

  if (isLoading || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const items: ChecklistItem[] = [
    {
      id: "service",
      title: "Add Your First Service",
      description: "List a service so clients can discover and book you.",
      href: "/dashboard/services",
      icon: Briefcase,
      completed: checklistData?.hasServices ?? false,
    },
    {
      id: "availability",
      title: "Set Your Availability",
      description:
        "Define your working hours so clients know when to book you.",
      href: "/dashboard/availability",
      icon: Calendar,
      completed: checklistData?.hasAvailability ?? false,
    },
    {
      id: "verification",
      title: "Complete Verification Review",
      description:
        "Your ID verification is being reviewed. This usually takes 24–48 hours.",
      href: "/dashboard/verification",
      icon: Shield,
      completed: checklistData?.verificationStatus === "VERIFIED",
    },
    {
      id: "payout",
      title: "Add Payout Details",
      description: "Set up how you want to receive your earnings.",
      href: "/dashboard/wallet",
      icon: CreditCard,
      completed: checklistData?.hasPayoutDetails ?? false,
    },
    {
      id: "profile",
      title: "Publish Your Profile",
      description:
        "Once verified, your profile goes live and clients can find you.",
      href: "/dashboard/profile",
      icon: User,
      completed: checklistData?.profilePublished ?? false,
    },
  ];

  const completedCount = items.filter((i) => i.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  const allDone = completedCount === items.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            ← Provider Dashboard
          </Link>
          <h1 className="font-bold text-gray-900 text-lg">Setup Checklist</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 mb-8 text-white"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <PartyPopper className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">
                Welcome, {session.user.name?.split(" ")[0] || "Provider"}!
              </h2>
              <p className="text-emerald-100 text-sm">
                Your provider account is active. Complete these steps to start
                receiving bookings and earning on JustInTime.
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-emerald-100">Progress</span>
              <span className="font-semibold">
                {completedCount}/{items.length} complete
              </span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Checklist Items */}
        <div className="space-y-3">
          {isFetching
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-100 rounded w-48 mb-2" />
                      <div className="h-3 bg-gray-50 rounded w-72" />
                    </div>
                  </div>
                </div>
              ))
            : items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Link
                      href={item.href}
                      className={`group flex items-center gap-4 bg-white rounded-xl p-5 border transition-all duration-200 ${
                        item.completed
                          ? "border-emerald-100 bg-emerald-50/30"
                          : "border-gray-100 hover:border-emerald-200 hover:shadow-sm"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          item.completed
                            ? "bg-emerald-100"
                            : "bg-gray-100 group-hover:bg-emerald-50"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            item.completed
                              ? "text-emerald-600"
                              : "text-gray-400 group-hover:text-emerald-600"
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-semibold text-sm ${
                              item.completed
                                ? "text-emerald-700"
                                : "text-gray-900"
                            }`}
                          >
                            {item.title}
                          </h3>
                          {item.completed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {item.description}
                        </p>
                      </div>

                      {!item.completed && (
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 shrink-0 transition-colors" />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
        </div>

        {/* All Done Banner */}
        {allDone && !isFetching && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 text-center"
          >
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              You&apos;re All Set!
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Your provider profile is complete. Start managing your services
              from the dashboard.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}

        {/* Skip link */}
        {!allDone && !isFetching && (
          <div className="mt-8 text-center">
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip for now → Go to Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
