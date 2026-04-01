"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import InteractionBar from "@/components/InteractionBar";
import {
  useProfessional,
  type ProfessionalDetail,
} from "@/lib/api/hooks/useProfessional";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo, useState } from "react";
import { toast } from "sonner";

type TabId = "about" | "services" | "reviews";

type EducationItem = {
  degree?: string;
  field?: string;
  institution?: string;
  startYear?: string | number;
  endYear?: string | number | null;
};

type CertificationItem = {
  name?: string;
  issuer?: string;
  date?: string;
  fileUrl?: string;
};

type SocialLinkItem = {
  platform?: string;
  url?: string;
};

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "about", label: "About", icon: "person" },
  { id: "services", label: "Services", icon: "work" },
  { id: "reviews", label: "Reviews", icon: "star" },
];

const SOCIAL_ICONS: Record<string, string> = {
  website: "language",
  linkedin: "work",
  twitter: "tag",
  facebook: "thumb_up",
  instagram: "photo_camera",
  github: "code",
  youtube: "play_circle",
  tiktok: "music_note",
  behance: "palette",
  dribbble: "sports_basketball",
};

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return `KES ${amount.toLocaleString()}`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSafeUrl(url?: string) {
  if (!url) return null;
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

export default function ProfessionalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("about");
  const { data, isLoading, error } = useProfessional(id);
  const professional = data?.data;

  const prof = professional as ProfessionalDetail | undefined;

  const educationItems = useMemo(
    () => ((prof?.education || []) as EducationItem[]).filter(Boolean),
    [prof?.education],
  );
  const certificationItems = useMemo(
    () => ((prof?.certifications || []) as CertificationItem[]).filter(Boolean),
    [prof?.certifications],
  );
  const socialLinks = useMemo(
    () =>
      ((prof?.socialLinks || []) as SocialLinkItem[])
        .map((link) => ({
          ...link,
          url: getSafeUrl(link.url),
        }))
        .filter((link) => link.url),
    [prof?.socialLinks],
  );

  const galleryImages = useMemo(
    () =>
      (prof?.services || [])
        .flatMap((service) => service.images || [])
        .filter((image): image is string => Boolean(image))
        .slice(0, 5),
    [prof?.services],
  );

  const heroImage = galleryImages[0] || prof?.image || null;
  const headline =
    prof?.bio
      ?.split(".")
      .find((part) => part.trim().length > 12)
      ?.trim() || "Trusted professional available for booking on JustInTime.";
  const memberSinceYear = prof
    ? new Date(prof.memberSince).getFullYear()
    : new Date().getFullYear();
  const isPremium =
    !!prof?.subscription?.isActive &&
    ["PRO", "BUSINESS"].includes(prof.subscription.plan);
  const hasPhone = Boolean(prof?.phone);
  const totalRatingBars = prof?.totalReviews || 0;

  const statCards = prof
    ? [
        {
          label: "Starting rate",
          value: `${formatCurrency(prof.hourlyRate)}/hr`,
          tone: "from-emerald-500/15 to-teal-500/10 text-emerald-900",
        },
        {
          label: "Completed jobs",
          value: prof.completedJobs.toLocaleString(),
          tone: "from-sky-500/15 to-cyan-500/10 text-slate-900",
        },
        {
          label: "Reviews",
          value: prof.totalReviews.toLocaleString(),
          tone: "from-amber-500/15 to-orange-500/10 text-slate-900",
        },
        {
          label: "Member since",
          value: String(memberSinceYear),
          tone: "from-slate-500/15 to-slate-700/10 text-slate-900",
        },
      ]
    : [];

  const handleBookNow = (serviceId?: string) => {
    const query = serviceId
      ? `/booking?professional=${id}&service=${serviceId}`
      : `/booking?professional=${id}`;
    router.push(query);
  };

  const handleSendMessage = () => {
    if (!prof?.phone) {
      toast.error("Phone number not available");
      return;
    }

    const formattedPhone = prof.phone.replace(/[^0-9+]/g, "");
    const message = encodeURIComponent(
      `Hi ${prof.name}, I found your profile on JustInTime and would like to discuss your services.`,
    );
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, "_blank");
  };

  const handleShareProfile = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: prof?.name || "Professional",
          text: headline,
          url,
        });
        return;
      } catch {
        // Fall back to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied to clipboard");
    } catch {
      toast.error("Unable to share this profile right now");
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center bg-slate-50 pt-[var(--public-header-h)]">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
            <p className="text-sm font-medium text-slate-600">
              Loading professional profile...
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !prof) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pt-[var(--public-header-h)]">
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <span className="material-symbols-outlined text-6xl text-slate-300">
              person_off
            </span>
            <h1 className="mt-4 text-2xl font-bold text-slate-950">
              Professional Not Found
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This professional may have been removed or is not currently
              available.
            </p>
            <Link
              href="/professionals"
              className="mt-6 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Browse Professionals
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-slate-50 pb-32 lg:pb-0">
        <section className="relative overflow-hidden border-b border-emerald-100/70 bg-gradient-to-b from-white via-emerald-50/55 to-slate-50 pt-[var(--public-header-h)]">
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-300/35 blur-3xl" />
            <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-48 w-96 rounded-full bg-teal-200/30 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 sm:pb-12 sm:pt-10 lg:px-8">
            <Link
              href="/professionals"
              className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:border-emerald-200 hover:text-emerald-700 sm:text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              Back to professionals
            </Link>

            <div className="mt-5 grid gap-4 lg:mt-6 lg:gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-start">
              <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/88 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.32)] backdrop-blur-sm sm:rounded-[2rem]">
                <div className="relative min-h-[220px] overflow-hidden sm:min-h-[320px]">
                  {heroImage ? (
                    <Image
                      src={heroImage}
                      alt={prof.name}
                      fill
                      className="object-cover"
                      priority
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/62 to-slate-950/18" />
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/35 to-transparent" />

                  <div className="relative flex h-full min-h-[220px] flex-col justify-between p-4 text-white sm:min-h-[320px] sm:p-7">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {prof.isVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900 shadow-sm">
                          <span className="material-symbols-outlined text-[16px]">
                            verified
                          </span>
                          Verified
                        </span>
                      ) : null}
                      {isPremium ? (
                        <span className="rounded-full bg-amber-400/95 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-950 shadow-sm">
                          {prof.subscription?.plan}
                        </span>
                      ) : null}
                      {prof.location ? (
                        <span className="max-w-[13rem] truncate rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                          {prof.location}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-3xl border-4 border-white/90 bg-white shadow-xl sm:h-28 sm:w-28">
                          {prof.image ? (
                            <Image
                              src={prof.image}
                              alt={prof.name}
                              fill
                              className="object-cover"
                              sizes="112px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 text-3xl font-bold text-emerald-700">
                              {prof.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 self-end">
                          <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-4xl">
                            {prof.name}
                          </h1>
                          <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-white/82 sm:line-clamp-none sm:text-base">
                            {headline}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/84 sm:mt-4 sm:gap-3 sm:text-sm">
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="material-symbols-outlined text-[18px] text-amber-300"
                                style={{ fontVariationSettings: '"FILL" 1' }}
                              >
                                star
                              </span>
                              {prof.averageRating.toFixed(1)} rating
                            </span>
                            <span className="text-white/30">•</span>
                            <span>
                              {prof.totalReviews.toLocaleString()} reviews
                            </span>
                            <span className="text-white/30">•</span>
                            <span>
                              {prof.completedJobs.toLocaleString()} jobs
                              completed
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
                            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                              From {formatCurrency(prof.hourlyRate)}/hr
                            </span>
                            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                              {prof.services.length} services
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="hidden grid-cols-2 gap-2 sm:grid sm:min-w-[240px]">
                        {statCards.slice(0, 2).map((card) => (
                          <div
                            key={card.label}
                            className={`rounded-2xl border border-white/10 bg-gradient-to-br ${card.tone} px-4 py-3 shadow-sm backdrop-blur-sm`}
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                              {card.label}
                            </p>
                            <p className="mt-1 text-sm font-bold text-white sm:text-base">
                              {card.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="hidden rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)] sm:p-6 lg:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Book this professional
                </p>
                <div className="mt-3">
                  <p className="text-sm text-slate-600">Starting from</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-800">
                    {formatCurrency(prof.hourlyRate)}
                    <span className="ml-1 text-base font-semibold text-slate-500">
                      /hr
                    </span>
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <button
                    onClick={() => handleBookNow()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      event_available
                    </span>
                    Book now
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleSendMessage}
                      disabled={!hasPhone}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        chat
                      </span>
                      Message
                    </button>
                    <button
                      onClick={handleShareProfile}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        share
                      </span>
                      Share
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                  <InteractionBar
                    id={prof.id}
                    type="professional"
                    initialViews={prof.views || 0}
                    initialFavorites={prof.favorites || 0}
                  />
                </div>

                <div className="mt-5 space-y-3">
                  {statCards.slice(2).map((card) => (
                    <div
                      key={card.label}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-slate-600">
                        {card.label}
                      </span>
                      <span className="text-sm font-bold text-slate-950">
                        {card.value}
                      </span>
                    </div>
                  ))}
                  {prof.totalEarnings > 0 ? (
                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                      <span className="text-sm font-medium text-slate-600">
                        Earned on JustInTime
                      </span>
                      <span className="text-sm font-bold text-slate-950">
                        {formatCurrency(prof.totalEarnings)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </aside>
            </div>

            <div className="mt-4 grid gap-3 lg:hidden">
              <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Ready to book
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-800">
                      {formatCurrency(prof.hourlyRate)}
                      <span className="ml-1 text-sm font-semibold text-slate-500">
                        /hr
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {prof.services.length > 0
                        ? `${prof.services.length} service options available`
                        : "Direct consultation available"}
                    </p>
                  </div>
                  {prof.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      <span className="material-symbols-outlined text-[14px]">
                        verified
                      </span>
                      Verified
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleBookNow()}
                    className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      event_available
                    </span>
                    Book now
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!hasPhone}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      chat
                    </span>
                    Message
                  </button>
                  <button
                    onClick={handleShareProfile}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      share
                    </span>
                    Share
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/90 p-3">
                  <InteractionBar
                    id={prof.id}
                    type="professional"
                    initialViews={prof.views || 0}
                    initialFavorites={prof.favorites || 0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {statCards.slice(2).map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {card.value}
                    </p>
                  </div>
                ))}
                {prof.totalEarnings > 0 ? (
                  <div className="col-span-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Earned on JustInTime
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {formatCurrency(prof.totalEarnings)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="grid gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <div className="sticky top-[calc(var(--public-header-h)+0.5rem)] z-30 mb-5 -mx-1 overflow-x-auto px-1 py-1 sm:mx-0 sm:px-0 lg:static lg:top-auto lg:z-auto lg:mb-6 lg:py-0">
                <div
                  className="inline-flex min-w-full gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-sm backdrop-blur sm:min-w-0"
                  role="tablist"
                  aria-label="Professional details sections"
                >
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      role="tab"
                      id={`${tab.id}-tab`}
                      aria-controls={`${tab.id}-panel`}
                      aria-selected={activeTab === tab.id}
                      className={`relative inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors sm:px-4 sm:py-3 sm:text-sm ${
                        activeTab === tab.id
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {tab.icon}
                      </span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === "about" ? (
                  <motion.div
                    key="about"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    id="about-panel"
                    role="tabpanel"
                    aria-labelledby="about-tab"
                    className="space-y-6"
                  >
                    <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-7">
                      <h2 className="text-xl font-bold tracking-tight text-slate-950">
                        About
                      </h2>
                      <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                        {prof.bio ||
                          "This professional has not added a full bio yet."}
                      </p>
                    </section>

                    {prof.skills.length > 0 ? (
                      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-7">
                        <h2 className="text-xl font-bold tracking-tight text-slate-950">
                          Skills & Expertise
                        </h2>
                        <div className="mt-4 flex flex-wrap gap-2.5">
                          {prof.skills.map((skill, idx) => (
                            <span
                              key={`${skill}-${idx}`}
                              className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 sm:px-3.5 sm:py-2 sm:text-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {educationItems.length > 0 ||
                    certificationItems.length > 0 ? (
                      <div className="grid gap-6 md:grid-cols-2">
                        {educationItems.length > 0 ? (
                          <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-7">
                            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-950">
                              <span className="material-symbols-outlined text-emerald-600">
                                school
                              </span>
                              Education
                            </h2>
                            <div className="mt-5 space-y-5">
                              {educationItems.map((edu, idx) => (
                                <div
                                  key={`${edu.institution || "edu"}-${idx}`}
                                  className="relative border-l-2 border-emerald-100 pl-4"
                                >
                                  <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                  <p className="text-sm font-semibold text-slate-950">
                                    {edu.degree || edu.field || "Education"}
                                  </p>
                                  {edu.field ? (
                                    <p className="mt-1 text-sm text-emerald-700">
                                      {edu.field}
                                    </p>
                                  ) : null}
                                  {edu.institution ? (
                                    <p className="mt-1 text-sm text-slate-600">
                                      {edu.institution}
                                    </p>
                                  ) : null}
                                  {edu.startYear || edu.endYear ? (
                                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                                      {edu.startYear || "Start"} -{" "}
                                      {edu.endYear || "Present"}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </section>
                        ) : null}

                        {certificationItems.length > 0 ? (
                          <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-7">
                            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-950">
                              <span className="material-symbols-outlined text-emerald-600">
                                workspace_premium
                              </span>
                              Certifications
                            </h2>
                            <div className="mt-5 space-y-4">
                              {certificationItems.map((cert, idx) => (
                                <div
                                  key={`${cert.name || "cert"}-${idx}`}
                                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-950">
                                        {cert.name || "Certification"}
                                      </p>
                                      {cert.issuer ? (
                                        <p className="mt-1 text-sm text-slate-600">
                                          {cert.issuer}
                                        </p>
                                      ) : null}
                                      {cert.date ? (
                                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                                          {cert.date}
                                        </p>
                                      ) : null}
                                    </div>
                                    {cert.fileUrl ? (
                                      <a
                                        href={cert.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700"
                                      >
                                        View
                                        <span className="material-symbols-outlined text-[16px]">
                                          open_in_new
                                        </span>
                                      </a>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>
                        ) : null}
                      </div>
                    ) : null}
                  </motion.div>
                ) : null}

                {activeTab === "services" ? (
                  <motion.div
                    key="services"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    id="services-panel"
                    role="tabpanel"
                    aria-labelledby="services-tab"
                  >
                    {prof.services.length === 0 ? (
                      <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                        <span className="material-symbols-outlined text-5xl text-slate-300">
                          construction
                        </span>
                        <h2 className="mt-4 text-xl font-bold text-slate-950">
                          No services listed yet
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                          This professional has not published services yet.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-5 sm:grid-cols-2">
                        {prof.services.map((service) => (
                          <article
                            key={service.id}
                            className="group overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lg"
                          >
                            <div className="relative h-48 overflow-hidden">
                              {service.images?.[0] ? (
                                <Image
                                  src={service.images[0]}
                                  alt={service.title}
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                  sizes="(max-width: 768px) 100vw, 50vw"
                                  unoptimized
                                />
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                              <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-2">
                                <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900 shadow-sm">
                                  {service.pricingUnit === "hourly"
                                    ? "Hourly"
                                    : service.pricingUnit}
                                </span>
                              </div>
                              <div className="absolute bottom-4 left-4 right-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                                  Starting from
                                </p>
                                <p className="mt-1 text-2xl font-bold text-white">
                                  {formatCurrency(service.price)}
                                  {service.pricingUnit === "hourly" ? (
                                    <span className="ml-1 text-sm font-semibold text-white/70">
                                      /hr
                                    </span>
                                  ) : null}
                                </p>
                              </div>
                            </div>

                            <div className="p-5">
                              <h3 className="text-lg font-bold text-slate-950">
                                {service.title}
                              </h3>
                              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                                {service.description ||
                                  "No service description provided yet."}
                              </p>
                              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                                <button
                                  onClick={() => handleBookNow(service.id)}
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 sm:w-auto"
                                >
                                  Book service
                                  <span className="material-symbols-outlined text-[18px]">
                                    arrow_forward
                                  </span>
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : null}

                {activeTab === "reviews" ? (
                  <motion.div
                    key="reviews"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    id="reviews-panel"
                    role="tabpanel"
                    aria-labelledby="reviews-tab"
                    className="space-y-4"
                  >
                    {prof.reviews.length === 0 ? (
                      <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                        <span className="material-symbols-outlined text-5xl text-slate-300">
                          rate_review
                        </span>
                        <h2 className="mt-4 text-xl font-bold text-slate-950">
                          No reviews yet
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                          Be the first client to leave feedback after a booking.
                        </p>
                      </div>
                    ) : (
                      prof.reviews.map((review) => (
                        <article
                          key={review.id}
                          className="rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6"
                        >
                          <div className="flex items-start gap-4">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                              {review.reviewer.image ? (
                                <Image
                                  src={review.reviewer.image}
                                  alt={review.reviewer.name || "Reviewer"}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-500">
                                  {(review.reviewer.name || "U").charAt(0)}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-950">
                                    {review.reviewer.name || "Anonymous"}
                                  </p>
                                  <p className="text-xs uppercase tracking-wide text-slate-400">
                                    {formatDate(review.createdAt)}
                                  </p>
                                </div>
                                <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                                  <span
                                    className="material-symbols-outlined text-[18px]"
                                    style={{
                                      fontVariationSettings: '"FILL" 1',
                                    }}
                                  >
                                    star
                                  </span>
                                  {review.rating.toFixed(1)}
                                </div>
                              </div>
                              {review.comment ? (
                                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                                  {review.comment}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="mt-6 space-y-4 lg:hidden">
                <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-950">
                      Review summary
                    </h2>
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      <span
                        className="material-symbols-outlined text-[16px]"
                        style={{ fontVariationSettings: '"FILL" 1' }}
                      >
                        star
                      </span>
                      {prof.averageRating.toFixed(1)}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {prof.ratingDistribution.map((dist) => (
                      <div
                        key={`mobile-${dist.stars}`}
                        className="flex items-center gap-2.5"
                      >
                        <div className="w-9 text-xs font-medium text-slate-600">
                          {dist.stars}★
                        </div>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${
                                totalRatingBars > 0
                                  ? (dist.count / totalRatingBars) * 100
                                  : 0
                              }%`,
                            }}
                            transition={{ duration: 0.6 }}
                            className="h-full rounded-full bg-amber-400"
                          />
                        </div>
                        <div className="w-6 text-right text-xs text-slate-500">
                          {dist.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {socialLinks.length > 0 ? (
                  <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-sm">
                    <h2 className="text-base font-bold text-slate-950">
                      Portfolio & Links
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {socialLinks.map((link, idx) => {
                        const platform = link.platform || "Website";
                        const icon =
                          SOCIAL_ICONS[platform.toLowerCase()] || "link";

                        return (
                          <a
                            key={`mobile-link-${platform}-${idx}`}
                            href={link.url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {icon}
                            </span>
                            {platform}
                          </a>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                <details className="group rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-base font-bold text-slate-950">
                    Trust details
                    <span className="material-symbols-outlined text-slate-500 transition-transform group-open:rotate-180">
                      expand_more
                    </span>
                  </summary>
                  <div className="mt-3 space-y-2.5">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                      <span className="text-xs text-slate-600">
                        Verification
                      </span>
                      <span className="text-xs font-semibold text-slate-950">
                        {prof.isVerified ? "Verified" : "Standard"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                      <span className="text-xs text-slate-600">Plan</span>
                      <span className="text-xs font-semibold text-slate-950">
                        {isPremium ? prof.subscription?.plan : "FREE"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                      <span className="text-xs text-slate-600">Location</span>
                      <span className="max-w-[9rem] truncate text-xs font-semibold text-slate-950">
                        {prof.location || "Mobile service"}
                      </span>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <aside className="hidden space-y-5 lg:block">
              <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-950">
                    Review summary
                  </h2>
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ fontVariationSettings: '"FILL" 1' }}
                    >
                      star
                    </span>
                    {prof.averageRating.toFixed(1)}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {prof.ratingDistribution.map((dist) => (
                    <div key={dist.stars} className="flex items-center gap-3">
                      <div className="w-10 text-sm font-medium text-slate-600">
                        {dist.stars} star
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${
                              totalRatingBars > 0
                                ? (dist.count / totalRatingBars) * 100
                                : 0
                            }%`,
                          }}
                          transition={{ duration: 0.6 }}
                          className="h-full rounded-full bg-amber-400"
                        />
                      </div>
                      <div className="w-8 text-right text-sm text-slate-500">
                        {dist.count}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {socialLinks.length > 0 ? (
                <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-bold text-slate-950">
                    Portfolio & Links
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {socialLinks.map((link, idx) => {
                      const platform = link.platform || "Website";
                      const icon =
                        SOCIAL_ICONS[platform.toLowerCase()] || "link";

                      return (
                        <a
                          key={`${platform}-${idx}`}
                          href={link.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {icon}
                          </span>
                          {platform}
                        </a>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-slate-950">
                  Trust details
                </h2>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-600">Verification</span>
                    <span className="text-sm font-semibold text-slate-950">
                      {prof.isVerified ? "Verified" : "Standard"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-600">Plan</span>
                    <span className="text-sm font-semibold text-slate-950">
                      {isPremium ? prof.subscription?.plan : "FREE"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-600">Location</span>
                    <span className="max-w-[10rem] truncate text-sm font-semibold text-slate-950">
                      {prof.location || "Mobile service"}
                    </span>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </main>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/96 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-10px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            <button
              onClick={handleSendMessage}
              disabled={!hasPhone}
              aria-label="Message professional"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[19px]">
                chat
              </span>
            </button>
            <button
              onClick={() => handleBookNow()}
              className="flex-1 rounded-2xl bg-gradient-to-r from-slate-950 to-emerald-700 px-4 py-3 text-sm font-semibold text-white"
            >
              Book from {formatCurrency(prof.hourlyRate)}/hr
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
