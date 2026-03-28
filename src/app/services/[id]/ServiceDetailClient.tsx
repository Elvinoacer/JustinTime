"use client";

import { use, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InteractionBar from "@/components/InteractionBar";
import { useService, type Service } from "@/lib/api/hooks/useServices";

type TabId = "about" | "services" | "gallery" | "reviews" | "contact";

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "about", label: "About", icon: "info" },
  { id: "services", label: "More", icon: "home_repair_service" },
  { id: "gallery", label: "Gallery", icon: "photo_library" },
  { id: "reviews", label: "Reviews", icon: "star" },
  { id: "contact", label: "Contact", icon: "call" },
];

function StarRow({
  value,
  size = "sm",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  const full = Math.floor(value);
  const iconClass =
    size === "md" ? "text-lg sm:text-xl" : "text-sm sm:text-base";
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`material-symbols-outlined ${iconClass} ${
            i < full ? "text-amber-400" : "text-gray-200"
          }`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          star
        </span>
      ))}
    </div>
  );
}

export default function ServiceDetailClient({
  params,
  initialService,
}: {
  params: Promise<{ id: string }>;
  initialService: Service;
}) {
  const { id: serviceId } = use(params);
  const { data: service = initialService } = useService(serviceId, {
    initialData: initialService,
  });

  const [activeTab, setActiveTab] = useState<TabId>("about");
  const [showMobileContact, setShowMobileContact] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const provider = service.provider;
  const profile = provider.profile;

  const heroImage = service.images[0] ?? provider.image;
  const categoryHref = `/services?category=${encodeURIComponent(service.category.name)}`;

  const crumbs = useMemo(
    () => [
      { name: "Home", href: "/" },
      { name: "Services", href: "/services" },
      {
        name: service.category.name,
        href: `/services?category=${encodeURIComponent(service.category.name)}`,
      },
      { name: service.title, href: `/services/${serviceId}` },
    ],
    [service.category.name, service.title, serviceId],
  );

  const isProProvider =
    provider.subscription?.plan &&
    ["PRO", "BUSINESS"].includes(provider.subscription.plan) &&
    provider.subscription.isActive;

  const showVerified = Boolean(profile?.isVerified || isProProvider);

  const listDate = useCallback((iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const memberSince = useMemo(() => {
    return new Date(provider.createdAt).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [provider.createdAt]);

  const listedSince = useMemo(() => {
    return new Date(service.createdAt).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [service.createdAt]);

  return (
    <div className="bg-zinc-50 min-h-screen flex flex-col text-zinc-900">
      <Header />

      {lightboxUrl ? (
        <button
          type="button"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxUrl(null)}
          aria-label="Close image preview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90vh] max-w-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      ) : null}

      <main className="flex-1 pb-24 lg:pb-10">
        <div className="relative overflow-hidden border-b border-zinc-200/80 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"
            aria-hidden
          />
          <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs sm:text-sm text-zinc-500">
                {crumbs.map((crumb, index) => (
                  <li key={crumb.href} className="flex items-center gap-1">
                    {index > 0 ? (
                      <span className="material-symbols-outlined text-[14px] text-zinc-400">
                        chevron_right
                      </span>
                    ) : null}
                    <Link
                      href={crumb.href}
                      className={
                        index === crumbs.length - 1
                          ? "font-medium text-zinc-800 max-w-[200px] truncate sm:max-w-md"
                          : "hover:text-emerald-700 transition-colors"
                      }
                    >
                      {crumb.name}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
              <div className="min-w-0 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm backdrop-blur-sm">
                  <span className="material-symbols-outlined text-base text-emerald-600">
                    label
                  </span>
                  <Link href={categoryHref} className="hover:underline">
                    {service.category.name}
                  </Link>
                </div>

                <div className="space-y-3">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl lg:leading-tight">
                    {service.title}
                  </h1>
                  <p className="text-sm text-zinc-600 sm:text-base max-w-3xl line-clamp-3 sm:line-clamp-none">
                    {service.description.length > 220
                      ? `${service.description.slice(0, 217)}…`
                      : service.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-baseline gap-1.5 rounded-xl bg-white/90 px-4 py-2 shadow-sm ring-1 ring-zinc-200/80">
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      From
                    </span>
                    <span className="text-xl font-bold text-zinc-900 tabular-nums">
                      KES {service.price.toLocaleString()}
                    </span>
                    <span className="text-zinc-500">· {service.pricingUnit}</span>
                  </div>
                  <InteractionBar
                    id={service.id}
                    type="service"
                    initialViews={service.views || 0}
                    initialFavorites={service.favorites || 0}
                  />
                </div>

                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-zinc-100 shadow-md ring-1 ring-black/5 sm:aspect-[21/9]">
                  {heroImage ? (
                    <Image
                      src={heroImage}
                      alt=""
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, min(896px, 55vw)"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400">
                      <span className="material-symbols-outlined text-5xl">
                        image
                      </span>
                      <span className="text-sm">No cover image yet</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                  <Link
                    href={`/professionals/${provider.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 group"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100 ring-2 ring-white shadow">
                      {provider.image ? (
                        <Image
                          src={provider.image}
                          alt=""
                          fill
                          className="object-cover transition group-hover:opacity-95"
                          sizes="56px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                          <span className="material-symbols-outlined text-2xl">
                            person
                          </span>
                        </div>
                      )}
                      {showVerified ? (
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] shadow ${
                            isProProvider
                              ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white"
                              : "bg-emerald-500 text-white"
                          }`}
                          title={isProProvider ? "Pro provider" : "Verified"}
                        >
                          <span className="material-symbols-outlined text-xs !text-[14px]">
                            verified
                          </span>
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900 group-hover:text-emerald-700">
                        {provider.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                        <StarRow value={provider.rating} />
                        <span className="tabular-nums">
                          {provider.rating.toFixed(1)} ·{" "}
                          {provider.reviewCount}{" "}
                          {provider.reviewCount === 1 ? "review" : "reviews"}
                        </span>
                      </div>
                    </div>
                  </Link>
                  {provider.backgroundChecks &&
                  provider.backgroundChecks.length > 0 ? (
                    <div
                      className="flex items-center gap-1 rounded-lg bg-zinc-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"
                      title="Background check approved"
                    >
                      <span className="material-symbols-outlined text-emerald-400 !text-[14px]">
                        shield_lock
                      </span>
                      Cleared
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="lg:sticky lg:top-24 h-fit space-y-4">
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-lg shadow-zinc-200/50">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Reserve this service
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900">
                    KES {service.price.toLocaleString()}
                  </p>
                  <p className="text-sm text-zinc-500">{service.pricingUnit}</p>
                  <div className="mt-5 flex flex-col gap-2">
                    <Link
                      href={`/booking?professional=${provider.id}&service=${service.id}`}
                      className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        calendar_month
                      </span>
                      Book now
                    </Link>
                    <Link
                      href={`/client/messages?recipient=${provider.id}`}
                      className="flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-600/30 bg-white px-4 py-3 text-center text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        chat
                      </span>
                      Message
                    </Link>
                  </div>
                  {profile?.location ? (
                    <p className="mt-4 flex items-start gap-2 text-sm text-zinc-600">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0">
                        location_on
                      </span>
                      <span>{profile.location}</span>
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-100 bg-white p-3 shadow-sm">
                    <p className="text-[11px] font-medium uppercase text-zinc-500">
                      Page views
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {(service.views ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-white p-3 shadow-sm">
                    <p className="text-[11px] font-medium uppercase text-zinc-500">
                      Jobs done
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {(provider.completedJobs ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-white p-3 shadow-sm">
                    <p className="text-[11px] font-medium uppercase text-zinc-500">
                      Rating
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {provider.reviewCount > 0
                        ? provider.rating.toFixed(1)
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-white p-3 shadow-sm">
                    <p className="text-[11px] font-medium uppercase text-zinc-500">
                      Listed
                    </p>
                    <p className="mt-1 text-sm font-bold leading-snug">
                      {listedSince}
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-3 py-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
            <div className="hidden lg:flex border-b border-zinc-100 px-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-5 py-4 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? "text-emerald-700"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id ? (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-emerald-500" />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
              {activeTab === "about" && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  <section>
                    <h2 className="text-lg font-bold text-zinc-900">
                      About this service
                    </h2>
                    <p className="mt-3 whitespace-pre-wrap text-zinc-600 leading-relaxed">
                      {service.description}
                    </p>
                  </section>
                  {profile?.bio ? (
                    <section>
                      <h3 className="text-base font-bold text-zinc-900">
                        About {provider.name}
                      </h3>
                      <p className="mt-3 whitespace-pre-wrap text-zinc-600 leading-relaxed">
                        {profile.bio}
                      </p>
                    </section>
                  ) : null}
                  <section className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 sm:p-6">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
                      <span className="material-symbols-outlined text-emerald-600">
                        payments
                      </span>
                      Pricing
                    </h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3">
                        <span className="text-sm text-zinc-600">Service</span>
                        <span className="font-semibold tabular-nums">
                          KES {service.price.toLocaleString()}
                        </span>
                      </div>
                      {profile?.hourlyRate ? (
                        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3">
                          <span className="text-sm text-zinc-600">
                            Hourly rate
                          </span>
                          <span className="font-semibold tabular-nums">
                            KES {profile.hourlyRate.toLocaleString()}/hr
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </section>
                  <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                      <p className="text-[11px] font-medium text-blue-800">
                        Member since
                      </p>
                      <p className="mt-1 text-sm font-semibold">{memberSince}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                      <p className="text-[11px] font-medium text-emerald-800">
                        Jobs completed
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {(provider.completedJobs ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                      <p className="text-[11px] font-medium text-amber-900">
                        Reviews
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {provider.reviewCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
                      <p className="text-[11px] font-medium text-violet-900">
                        Avg. rating
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {provider.reviewCount > 0
                          ? provider.rating.toFixed(1)
                          : "—"}
                      </p>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "services" && (
                <div className="animate-in fade-in duration-200">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-zinc-900">
                      More from {provider.name}
                    </h2>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      {service.otherServices.length}
                    </span>
                  </div>
                  {service.otherServices.length > 0 ? (
                    <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100 overflow-hidden">
                      {service.otherServices.map((s) => (
                        <li key={s.id}>
                          <Link
                            href={`/services/${s.id}`}
                            className="flex items-center justify-between gap-3 bg-white px-4 py-3 transition hover:bg-zinc-50"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-zinc-900 truncate">
                                {s.title}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {s.category.name} · {s.pricingUnit}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="text-sm font-semibold tabular-nums">
                                KES {s.price.toLocaleString()}
                              </span>
                              <span className="material-symbols-outlined text-zinc-400 text-lg">
                                chevron_right
                              </span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-500">
                      No other active listings from this provider.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "gallery" && (
                <div className="animate-in fade-in duration-200">
                  <h2 className="text-lg font-bold text-zinc-900">Gallery</h2>
                  {service.video || service.images.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      {service.video ? (
                        <div className="overflow-hidden rounded-xl bg-black ring-1 ring-black/10">
                          <video
                            src={service.video}
                            controls
                            preload="metadata"
                            className="max-h-[420px] w-full"
                          />
                        </div>
                      ) : null}
                      {service.images.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                          {service.images.map((src, index) => (
                            <button
                              key={`${src}-${index}`}
                              type="button"
                              onClick={() => setLightboxUrl(src)}
                              className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              <Image
                                src={src}
                                alt=""
                                fill
                                className="object-cover transition hover:opacity-95"
                                sizes="(max-width: 640px) 50vw, 33vw"
                                loading={index < 4 ? "eager" : "lazy"}
                              />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-6 text-center text-sm text-zinc-500">
                      No media uploaded for this service yet.
                    </p>
                  )}
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 className="text-lg font-bold text-zinc-900">
                      Reviews
                    </h2>
                    <div className="flex items-center gap-2 text-sm">
                      <StarRow value={provider.rating} />
                      <span className="font-semibold tabular-nums">
                        {provider.reviewCount > 0
                          ? provider.rating.toFixed(1)
                          : "—"}
                      </span>
                      <span className="text-zinc-500">
                        ({provider.reviewCount}{" "}
                        {provider.reviewCount === 1 ? "review" : "reviews"})
                      </span>
                    </div>
                  </div>
                  {provider.receivedReviews.length > 0 ? (
                    <ul className="mt-6 space-y-6">
                      {provider.receivedReviews.map((review) => (
                        <li
                          key={review.id}
                          className="border-b border-zinc-100 pb-6 last:border-0 last:pb-0"
                        >
                          <div className="flex gap-3">
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-2 ring-white">
                              {review.author.image ? (
                                <Image
                                  src={review.author.image}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="44px"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-zinc-400">
                                  <span className="material-symbols-outlined text-xl">
                                    person
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-zinc-900">
                                  {review.author.name || "Client"}
                                </p>
                                <time
                                  className="text-xs text-zinc-500"
                                  dateTime={review.createdAt}
                                >
                                  {listDate(review.createdAt)}
                                </time>
                              </div>
                              <StarRow value={review.rating} />
                              {review.comment ? (
                                <p className="mt-2 rounded-lg rounded-tl-none bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                                  {review.comment}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-8 text-center text-sm text-zinc-500">
                      No reviews yet for this provider.
                    </p>
                  )}
                </div>
              )}

              {activeTab === "contact" && (
                <div className="animate-in fade-in duration-200 space-y-4">
                  <h2 className="text-lg font-bold text-zinc-900">Contact</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {provider.phone ? (
                      <div className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
                        <span className="material-symbols-outlined text-emerald-600">
                          call
                        </span>
                        <div>
                          <p className="font-semibold text-zinc-900">Phone</p>
                          <p className="text-sm text-zinc-600">
                            Available after you book or message on the
                            platform.
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 sm:col-span-2">
                      <span className="material-symbols-outlined text-emerald-600">
                        mail
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900">Email</p>
                        <p className="truncate text-sm text-zinc-600">
                          {provider.email || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500">
                    For your safety, arrange work and payments through JustInTime
                    where possible.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="grid grid-cols-5 gap-0.5 p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center rounded-lg py-2 text-[10px] font-medium transition ${
                activeTab === tab.id
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-zinc-500"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {tab.icon}
              </span>
              <span className="mt-0.5 truncate w-full text-center">
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:hidden fixed bottom-20 right-4 z-30 flex flex-col items-end gap-2">
        {showMobileContact ? (
          <div className="mb-1 w-48 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex flex-col gap-2">
              <Link
                href={`/booking?professional=${provider.id}&service=${service.id}`}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white"
              >
                <span className="material-symbols-outlined text-lg">
                  calendar_month
                </span>
                Book
              </Link>
              <Link
                href={`/client/messages?recipient=${provider.id}`}
                className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-800"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                Message
              </Link>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setShowMobileContact((v) => !v)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
          aria-expanded={showMobileContact}
          aria-label={showMobileContact ? "Close actions" : "Booking actions"}
        >
          <span className="material-symbols-outlined">
            {showMobileContact ? "close" : "contact_page"}
          </span>
        </button>
      </div>

      <Footer />
    </div>
  );
}
