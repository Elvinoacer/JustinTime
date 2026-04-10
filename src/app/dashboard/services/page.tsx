"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  useProviderServices,
  useDeleteService,
  useUpdateService,
} from "@/lib/api/hooks/useProvider";
import { useSubscriptionStatus } from "@/lib/api/hooks/useSubscription";
import apiClient from "@/lib/api/client";
import ServiceFormModal from "@/components/dashboard/services/ServiceFormModal";
import { PromoteServiceModal } from "@/components/revenue/PromoteServiceModal";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getServiceLimitForPlan,
  type ServiceCancellationPolicy,
  type ServiceLocationType,
} from "@/lib/services/config";

type ProviderService = {
  id: string;
  title?: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  pricingUnit: "fixed" | "hourly";
  isActive: boolean;
  requiresAvailability?: boolean;
  defaultDuration?: number | null;
  locationType?: ServiceLocationType;
  location?: string | null;
  cancellationPolicy?: ServiceCancellationPolicy;
  images?: string[];
  video?: string | null;
  views?: number;
  favorites?: number;
};

const isServiceOperationallyReady = (service: ProviderService) => {
  const hasDuration =
    service.requiresAvailability === false ||
    (service.defaultDuration ?? 0) >= 15;

  return Boolean(
    service.locationType && service.cancellationPolicy && hasDuration,
  );
};

const formatPriceLabel = (service: ProviderService) =>
  service.pricingUnit === "hourly" ? "/hr" : "fixed";

const getServiceAccent = (service: ProviderService) => {
  if (!service.isActive) {
    return {
      badge: "bg-slate-900/80 text-white",
      chip: "border-slate-200 bg-slate-50 text-slate-700",
      wash: "from-slate-900/10 via-slate-900/5 to-transparent",
      glow: "from-slate-100 via-white to-slate-50",
      metric: "bg-slate-50 text-slate-700 ring-slate-200",
      action:
        "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    };
  }

  const momentum = (service.views || 0) + (service.favorites || 0) * 4;
  if (momentum >= 40) {
    return {
      badge: "bg-amber-400/95 text-amber-950",
      chip: "border-amber-200 bg-amber-50 text-amber-800",
      wash: "from-amber-500/20 via-orange-400/10 to-transparent",
      glow: "from-amber-50 via-white to-orange-50",
      metric: "bg-amber-50 text-amber-900 ring-amber-200",
      action:
        "border-amber-200 bg-white text-amber-900 hover:border-amber-300 hover:bg-amber-50",
    };
  }

  return {
    badge: "bg-emerald-500/95 text-white",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    wash: "from-emerald-500/20 via-cyan-400/10 to-transparent",
    glow: "from-emerald-50 via-white to-cyan-50",
    metric: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    action:
      "border-emerald-200 bg-white text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50",
  };
};

const getPerformanceLabel = (service: ProviderService) => {
  const views = service.views || 0;
  const favorites = service.favorites || 0;

  if (!service.isActive) return "Paused listing";
  if (favorites >= 10 || views >= 120) return "Strong demand";
  if (favorites >= 3 || views >= 40) return "Picking up";
  return "Fresh listing";
};

const ServicesPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: servicesData, isLoading } = useProviderServices();
  const { data: subscriptionData } = useSubscriptionStatus();
  const { data: availabilityData } = useQuery({
    queryKey: ["provider", "availability", "summary"],
    queryFn: async () => {
      const response = await apiClient.get("/provider/availability");
      return response?.data;
    },
  });
  const deleteServiceMutation = useDeleteService();
  const updateServiceMutation = useUpdateService();

  const servicesList: ProviderService[] = Array.isArray(servicesData?.data)
    ? servicesData.data
    : Array.isArray(servicesData?.services)
      ? servicesData.services
      : [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<ProviderService | null>(
    null,
  );
  const [promotingService, setPromotingService] =
    useState<ProviderService | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasHandledCreateIntent, setHasHandledCreateIntent] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateServiceMutation.mutateAsync({
        id,
        data: { isActive: !currentStatus },
      });
      toast.success(`Service ${!currentStatus ? "activated" : "deactivated"}`);
    } catch (error) {
      console.error("Failed to toggle status", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteServiceMutation.mutateAsync(id);
      setDeleteConfirm(null);
      toast.success("Service deleted successfully");
    } catch (error) {
      console.error("Failed to delete service", error);
      toast.error("Failed to delete service");
    }
  };

  const openEditModal = (service: ProviderService) => {
    setEditingService(service);
    setShowAddModal(true);
  };

  const openAddModal = useCallback(() => {
    const currentPlan = subscriptionData?.subscription?.plan || "FREE";
    const limit = getServiceLimitForPlan(currentPlan);

    if (servicesList.length >= limit) {
      toast.error(
        `You have reached the maximum limit of ${limit} services for your ${currentPlan} plan.`,
      );
      return;
    }
    setEditingService(null);
    setShowAddModal(true);
  }, [servicesList.length, subscriptionData?.subscription?.plan]);

  useEffect(() => {
    if (isLoading || hasHandledCreateIntent) return;

    const shouldAutoOpenCreate = searchParams.get("create") === "true";
    if (!shouldAutoOpenCreate) return;

    setHasHandledCreateIntent(true);
    openAddModal();

    if (searchParams.get("from") === "onboarding") {
      toast.success(
        "Welcome aboard! Add your first service, then set your availability to start receiving smooth bookings.",
      );
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("create");
    const query = params.toString();
    router.replace(
      query ? `/dashboard/services?${query}` : "/dashboard/services",
      {
        scroll: false,
      },
    );
  }, [hasHandledCreateIntent, isLoading, openAddModal, router, searchParams]);

  const activeServices = servicesList.filter((s) => s.isActive).length;
  const inactiveServices = servicesList.filter((s) => !s.isActive).length;
  const totalViews = servicesList.reduce(
    (sum, service) => sum + (service.views || 0),
    0,
  );
  const totalFavorites = servicesList.reduce(
    (sum, service) => sum + (service.favorites || 0),
    0,
  );
  const currentPlan = subscriptionData?.subscription?.plan || "FREE";
  const serviceLimit = getServiceLimitForPlan(currentPlan);
  const isOnboardingFlow = searchParams.get("from") === "onboarding";
  const weeklyAvailability = Array.isArray(availabilityData?.weeklyAvailability)
    ? availabilityData.weeklyAvailability
    : [];
  const hasAnyService = servicesList.length > 0;
  const hasOperationalService = servicesList.some(isServiceOperationallyReady);
  const requiresAvailabilityScheduling = servicesList.some(
    (service) => service.requiresAvailability !== false,
  );
  const hasAvailabilitySetup = weeklyAvailability.length > 0;
  const needsAvailabilityStep = hasAnyService && requiresAvailabilityScheduling;

  const openConfigureOperationalRules = () => {
    if (!hasAnyService) {
      openAddModal();
      return;
    }

    const targetService =
      servicesList.find((service) => !isServiceOperationallyReady(service)) ||
      servicesList[0];
    openEditModal(targetService);
  };

  const onboardingChecklist = [
    {
      id: "service",
      label: "Add your first service",
      description: "Create at least one listing clients can discover.",
      actionLabel: "Add service",
      completed: hasAnyService,
      onClick: openAddModal,
    },
    {
      id: "rules",
      label: "Configure booking rules",
      description: "Set duration, delivery type, and cancellation policy.",
      actionLabel: hasAnyService ? "Configure" : "Add service first",
      completed: hasOperationalService,
      onClick: openConfigureOperationalRules,
    },
    {
      id: "availability",
      label: "Set your availability",
      description: needsAvailabilityStep
        ? "Add weekly slots so clients can request real time windows."
        : "Optional when all services do not require scheduling.",
      actionLabel: "Set availability",
      completed: !needsAvailabilityStep || hasAvailabilitySetup,
      onClick: () => router.push("/dashboard/availability"),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center px-4 md:min-h-[400px]">
        <div
          role="status"
          aria-label="Loading services"
          className={`${
            isMobile ? "w-10 h-10 border-3" : "w-12 h-12 border-4"
          } border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin`}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-4 lg:px-6">
      {/* Header */}
      <div className="mb-5 rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,#f7fffb_0%,#ffffff_50%,#f5f9ff_100%)] p-4 shadow-sm sm:mb-7 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              <span className="material-symbols-outlined text-sm">
                storefront
              </span>
              Services Dashboard
            </div>
            <div>
              <h1
                className={`${
                  isMobile ? "text-2xl" : "text-3xl lg:text-4xl"
                } font-bold text-gray-900 leading-tight`}
              >
                My Services
              </h1>
              <p
                className={`mt-2 ${
                  isMobile ? "text-sm" : "text-base"
                } max-w-2xl text-gray-600`}
              >
                Shape how clients discover you, compare your offers, and decide
                to book. Keep your listings polished, clear, and active.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-gray-100">
                <span className="material-symbols-outlined text-base text-emerald-600">
                  verified
                </span>
                Plan: {currentPlan}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-gray-100">
                <span className="material-symbols-outlined text-base text-blue-600">
                  bar_chart
                </span>
                {totalViews.toLocaleString()} total views
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-gray-100">
                <span className="material-symbols-outlined text-base text-rose-500">
                  favorite
                </span>
                {totalFavorites.toLocaleString()} favorites
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[17.5rem]">
            <button type="button"
              onClick={openAddModal}
              className={`${
                isMobile ? "px-3 py-3 text-sm" : "px-5 py-3.5 text-sm"
              } rounded-2xl bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 flex items-center justify-center gap-2 active:scale-95 touch-manipulation`}
              aria-label="Add new service"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Add New Service
            </button>
            <div className="rounded-2xl bg-white/80 p-3 text-sm text-gray-600 ring-1 ring-gray-100">
              {serviceLimit === Infinity
                ? "Your current plan supports unlimited service listings."
                : `You can list up to ${serviceLimit} services on your ${currentPlan} plan.`}
            </div>
          </div>
        </div>
      </div>

      {isOnboardingFlow && (
        <div className="mb-4 sm:mb-6 lg:mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
          <p className="text-sm font-semibold text-emerald-900">
            Complete your provider readiness checklist
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            Finish these steps to make your services bookable instead of just
            visible.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {onboardingChecklist.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-emerald-100 bg-white p-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`material-symbols-outlined mt-0.5 text-base ${
                      item.completed ? "text-emerald-600" : "text-amber-500"
                    }`}
                  >
                    {item.completed ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {item.description}
                    </p>
                  </div>
                </div>
                <button type="button"
                  onClick={item.onClick}
                  disabled={item.completed}
                  className="mt-3 inline-flex items-center justify-center rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-default disabled:border-emerald-100 disabled:text-emerald-400 touch-manipulation"
                >
                  {item.completed ? "Completed" : item.actionLabel}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {[
          {
            label: "Total",
            count: servicesList.length,
            limit:
              serviceLimit === Infinity ? "Unlimited" : `${serviceLimit} max`,
            icon: "construction",
            color: "blue",
          },
          {
            label: "Active",
            count: activeServices,
            icon: "check_circle",
            color: "emerald",
          },
          {
            label: "Inactive",
            count: inactiveServices,
            icon: "pause_circle",
            color: "gray",
          },
          {
            label: "Favorites",
            count: totalFavorites,
            icon: "favorite",
            color: "rose",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500">
                  {stat.label}
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.count.toLocaleString()}
                  </p>
                  {stat.limit && (
                    <span className="text-sm font-medium text-gray-400">
                      {stat.limit}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  stat.color === "blue"
                    ? "bg-blue-50 text-blue-600"
                    : stat.color === "emerald"
                      ? "bg-emerald-50 text-emerald-600"
                      : stat.color === "rose"
                        ? "bg-rose-50 text-rose-500"
                        : "bg-gray-50 text-gray-600"
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {stat.icon}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 gap-5 lg:gap-6">
        <AnimatePresence>
          {servicesList.map((service, index: number) => (
            <motion.article
              key={service.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)`,
              }}
              className={`group overflow-hidden rounded-[24px] border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                service.isActive
                  ? "border-gray-100"
                  : "border-gray-200 opacity-85"
              }`}
            >
              {(() => {
                const accent = getServiceAccent(service);
                const performanceLabel = getPerformanceLabel(service);
                const conversionRate =
                  (service.views || 0) > 0
                    ? Math.round(
                        ((service.favorites || 0) / (service.views || 1)) * 100,
                      )
                    : 0;

                return (
                  <div className="grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <div className="relative min-h-[220px] overflow-hidden bg-gray-100 lg:min-h-[100%]">
                      {(service.images?.length ?? 0) > 0 ? (
                        <img
                          src={service.images?.[0]}
                          alt={service.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center bg-linear-to-br ${accent.glow}`}
                        >
                          <span
                            className={`material-symbols-outlined text-gray-300 ${
                              isMobile ? "text-4xl" : "text-5xl"
                            }`}
                          >
                            construction
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
                      <div
                        className={`absolute inset-0 bg-linear-to-br ${accent.wash}`}
                      />

                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur-md ${accent.badge}`}
                        >
                          {service.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                          {performanceLabel}
                        </span>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="rounded-2xl border border-white/15 bg-black/20 p-4 text-white backdrop-blur-md">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                            Starting at
                          </p>
                          <div className="mt-1 flex items-end justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-2xl font-bold">
                                KES {service.price.toLocaleString()}
                              </p>
                              <p className="text-sm font-medium text-white/75">
                                {formatPriceLabel(service)}
                              </p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {(service.images?.length ?? 0) > 0 && (
                                <span className="flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-xs font-medium text-white">
                                  <span className="material-symbols-outlined text-[12px]">
                                    photo_library
                                  </span>
                                  {service.images?.length ?? 0}
                                </span>
                              )}
                              {service.video && (
                                <span className="flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-xs font-medium text-white">
                                  <span className="material-symbols-outlined text-[12px]">
                                    videocam
                                  </span>
                                  Preview
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col gap-4 p-5 lg:p-6">
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`max-w-[220px] truncate rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${accent.chip}`}
                            >
                              {service.category || "Service"}
                            </span>
                            <span className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">
                              {service.pricingUnit === "hourly"
                                ? "Hourly"
                                : "Fixed fee"}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <h3 className="max-w-3xl truncate text-2xl font-bold tracking-tight text-gray-950">
                              {service.name}
                            </h3>
                            <p className="line-clamp-2 max-w-2xl text-sm font-medium leading-6 text-gray-500">
                              {service.isActive
                                ? "Visible to clients and ready to attract bookings."
                                : "Currently hidden from new client searches."}
                            </p>
                            <p className="line-clamp-2 max-w-3xl text-sm leading-6 text-gray-600">
                              {service.description ||
                                "Add a concise value-focused description so clients quickly understand what makes this service worth booking."}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 self-start">
                          <div className="min-w-0 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                              Positioning
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg text-gray-700">
                                campaign
                              </span>
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {performanceLabel}
                              </p>
                            </div>
                          </div>
                          <div className="min-w-0 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                              Save Rate
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg text-gray-700">
                                monitoring
                              </span>
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {conversionRate}% interest
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          <div
                            className={`min-w-0 rounded-2xl px-3 py-3 ring-1 ${accent.metric}`}
                            title="Total Views"
                          >
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <span className="material-symbols-outlined text-base">
                                visibility
                              </span>
                              <span className="truncate text-xs font-medium uppercase tracking-wide">
                                Views
                              </span>
                            </div>
                            <p className="mt-1 text-lg font-semibold text-gray-900">
                              {(service.views || 0).toLocaleString()}
                            </p>
                          </div>
                          <div
                            className={`min-w-0 rounded-2xl px-3 py-3 ring-1 ${accent.metric}`}
                            title="Favorites"
                          >
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <span className="material-symbols-outlined text-base">
                                favorite
                              </span>
                              <span className="truncate text-xs font-medium uppercase tracking-wide">
                                Favorites
                              </span>
                            </div>
                            <p className="mt-1 text-lg font-semibold text-gray-900">
                              {(service.favorites || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="min-w-0 rounded-2xl border border-gray-100 bg-white px-3 py-3 shadow-sm">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <span className="material-symbols-outlined text-base">
                                sell
                              </span>
                              <span className="truncate text-xs font-medium uppercase tracking-wide">
                                Pricing
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900">
                              {service.pricingUnit === "hourly"
                                ? "Hourly"
                                : "Fixed fee"}
                            </p>
                          </div>
                          <div className="min-w-0 rounded-2xl border border-gray-100 bg-white px-3 py-3 shadow-sm">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <span className="material-symbols-outlined text-base">
                                collections_bookmark
                              </span>
                              <span className="truncate text-xs font-medium uppercase tracking-wide">
                                Assets
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {(service.images?.length || 0) +
                                (service.video ? 1 : 0)}{" "}
                              attached
                            </p>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-slate-950/95 shadow-sm">
                          {service.video ? (
                            <video
                              src={service.video}
                              muted
                              autoPlay
                              loop
                              playsInline
                              className="aspect-video w-full object-cover object-center opacity-80"
                            />
                          ) : (
                            <div className="flex aspect-video w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.28),_transparent_45%),linear-gradient(135deg,#0f172a_0%,#111827_100%)] text-white/80">
                              <div className="text-center">
                                <span className="material-symbols-outlined text-3xl">
                                  movie
                                </span>
                                <p className="mt-2 text-sm font-medium">
                                  No video preview
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="border-t border-white/10 bg-slate-950/90 px-3 py-2">
                            <div className="flex items-center justify-between gap-3 text-xs text-white/70">
                              <span className="truncate uppercase tracking-[0.18em]">
                                Video Preview
                              </span>
                              <span className="shrink-0">
                                {service.video ? "Muted loop" : "Optional"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-gray-100 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_100%)] p-3 shadow-sm">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
                          <button type="button"
                            onClick={() => {
                              setPromotingService(service);
                              setShowPromoteModal(true);
                            }}
                            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-fuchsia-600 via-violet-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95 touch-manipulation"
                          >
                            <span className="material-symbols-outlined text-sm">
                              rocket_launch
                            </span>
                            <span>Boost Visibility</span>
                          </button>
                          <button type="button"
                            onClick={() => openEditModal(service)}
                            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors active:scale-95 touch-manipulation ${accent.action}`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              edit
                            </span>
                            <span>Edit</span>
                          </button>
                          <button type="button"
                            onClick={() =>
                              handleToggleStatus(service.id, service.isActive)
                            }
                            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors active:scale-95 touch-manipulation ${
                              service.isActive
                                ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {service.isActive ? "pause" : "play_arrow"}
                            </span>
                            <span className="truncate">
                              {service.isActive ? "Pause" : "Activate"}
                            </span>
                          </button>
                          <button type="button"
                            onClick={() => setDeleteConfirm(service.id)}
                            className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-red-600 opacity-80 transition-colors hover:bg-red-50 hover:opacity-100 active:scale-95 touch-manipulation"
                          >
                            <span className="material-symbols-outlined text-sm">
                              delete
                            </span>
                            <span className="truncate">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {servicesList.length === 0 && (
        <div
          className={`bg-white ${
            isMobile ? "rounded-lg p-4" : "rounded-xl p-6 sm:p-8 lg:p-12"
          } shadow-xs sm:shadow-sm border border-gray-100 text-center`}
        >
          <div
            className={`${
              isMobile ? "w-12 h-12" : "w-16 h-16 sm:w-20 sm:h-20"
            } bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-6`}
          >
            <span
              className={`material-symbols-outlined text-gray-300 ${
                isMobile ? "text-2xl" : "text-3xl sm:text-4xl"
              }`}
            >
              construction
            </span>
          </div>
          <h3
            className={`${
              isMobile ? "text-base" : "text-lg sm:text-xl"
            } font-bold text-gray-900 mb-1 sm:mb-2`}
          >
            No services yet
          </h3>
          <p
            className={`${
              isMobile ? "text-xs px-2" : "text-sm sm:text-base px-4"
            } text-gray-500 mb-3 sm:mb-4 lg:mb-8 max-w-md mx-auto`}
          >
            Start building your profile by adding your first service. You can
            add{" "}
            {serviceLimit === Infinity ? "unlimited" : `up to ${serviceLimit}`}{" "}
            services to showcase your expertise.
          </p>
          <button type="button"
            onClick={openAddModal}
            className={`${
              isMobile ? "px-3 py-2.5 text-xs" : "px-4 sm:px-6 py-3 text-sm"
            } bg-emerald-600 text-white ${
              isMobile ? "rounded-lg" : "rounded-xl"
            } font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg shadow-emerald-200 inline-flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto active:scale-95 touch-manipulation`}
          >
            <span
              className={`material-symbols-outlined ${
                isMobile ? "text-sm" : "text-base"
              }`}
            >
              add
            </span>
            {isMobile ? "Add Service" : "Add Your First Service"}
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal - Mobile Optimized */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className={`bg-white ${
                isMobile ? "rounded-lg p-4" : "rounded-xl p-5 sm:p-6 lg:p-8"
              } relative max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto text-center shadow-lg sm:max-h-[90vh] sm:shadow-2xl`}
            >
              {/* Decorative background element */}
              <div className="absolute top-0 left-0 w-full h-1.5 sm:h-2 bg-linear-to-r from-red-400 to-red-600" />

              <div
                className={`${
                  isMobile ? "w-12 h-12" : "w-14 h-14 sm:w-16 sm:h-16"
                } bg-red-50 rounded-full flex items-center justify-center mb-3 sm:mb-4 lg:mb-6 mx-auto`}
              >
                <span
                  className={`material-symbols-outlined text-red-500 ${
                    isMobile ? "text-xl" : "text-2xl sm:text-3xl"
                  }`}
                >
                  delete_forever
                </span>
              </div>

              <h3
                className={`${
                  isMobile ? "text-base" : "text-lg sm:text-xl"
                } font-bold text-gray-900 mb-2`}
              >
                Delete Service?
              </h3>

              <p
                className={`${
                  isMobile ? "text-xs px-1" : "text-sm px-2"
                } text-gray-500 mb-3 sm:mb-4 lg:mb-8 leading-relaxed`}
              >
                This action cannot be undone. This will permanently delete the
                service and all associated media.
              </p>

              <div className={`flex flex-col ${isMobile ? "gap-2" : "gap-3"}`}>
                <button type="button"
                  onClick={() => handleDelete(deleteConfirm!)}
                  className={`w-full ${
                    isMobile
                      ? "px-3 py-2.5 text-xs"
                      : "px-4 sm:px-5 py-3 text-sm"
                  } bg-red-600 text-white ${
                    isMobile ? "rounded-lg" : "rounded-xl"
                  } font-bold hover:bg-red-700 transition-all shadow-md hover:shadow-lg shadow-red-200 flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 touch-manipulation`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      isMobile ? "text-sm" : "text-base"
                    }`}
                  >
                    delete
                  </span>
                  Yes, Delete Service
                </button>
                <button type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className={`w-full ${
                    isMobile
                      ? "px-3 py-2.5 text-xs"
                      : "px-4 sm:px-5 py-3 text-sm"
                  } bg-white text-gray-700 border border-gray-200 ${
                    isMobile ? "rounded-lg" : "rounded-xl"
                  } font-semibold hover:bg-gray-50 transition-colors active:scale-95 touch-manipulation`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Service Modal */}
      <ServiceFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        service={editingService ?? undefined}
        isMobile={isMobile}
      />

      {/* Promote Service Modal */}
      <PromoteServiceModal
        isOpen={showPromoteModal}
        onClose={() => setShowPromoteModal(false)}
        serviceId={promotingService?.id || ""}
        serviceTitle={promotingService?.title || promotingService?.name || ""}
      />
    </div>
  );
};

export default ServicesPage;
