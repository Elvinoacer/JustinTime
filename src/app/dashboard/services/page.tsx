"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useProviderServices,
  useDeleteService,
  useUpdateService,
} from "@/lib/api/hooks/useProvider";
import { useSubscriptionStatus } from "@/lib/api/hooks/useSubscription";
import ServiceFormModal from "@/components/dashboard/services/ServiceFormModal";
import { PromoteServiceModal } from "@/components/revenue/PromoteServiceModal";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

const PLAN_LIMITS = {
  FREE: 5,
  PRO: Infinity,
  BUSINESS: Infinity,
};

type ProviderService = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  pricingUnit: "fixed" | "hourly";
  isActive: boolean;
  images?: string[];
  video?: string | null;
  views?: number;
  favorites?: number;
};

const ServicesPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: servicesData, isLoading } = useProviderServices();
  const { data: subscriptionData } = useSubscriptionStatus();
  const deleteServiceMutation = useDeleteService();
  const updateServiceMutation = useUpdateService();

  const servicesList: ProviderService[] = Array.isArray(servicesData?.data)
    ? servicesData.data
    : Array.isArray(servicesData?.services)
      ? servicesData.services
      : [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<ProviderService | null>(null);
  const [promotingService, setPromotingService] = useState<ProviderService | null>(null);
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
    const limit = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || 5;

    if (servicesList.length >= limit) {
      toast.error(
        `You have reached the maximum limit of ${limit} services for your ${currentPlan} plan.`
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
    router.replace(query ? `/dashboard/services?${query}` : "/dashboard/services", {
      scroll: false,
    });
  }, [hasHandledCreateIntent, isLoading, openAddModal, router, searchParams]);

  const activeServices = servicesList.filter((s) => s.isActive).length;
  const inactiveServices = servicesList.filter((s) => !s.isActive).length;
  const totalViews = servicesList.reduce((sum, service) => sum + (service.views || 0), 0);
  const totalFavorites = servicesList.reduce(
    (sum, service) => sum + (service.favorites || 0),
    0,
  );
  const currentPlan =
    subscriptionData?.subscription?.plan || "FREE";
  const serviceLimit =
    PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || 5;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] md:min-h-[400px] px-4">
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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-10">
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

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[280px]">
            <button
              onClick={openAddModal}
              className={`${
                isMobile ? "px-3 py-3 text-sm" : "px-5 py-3.5 text-sm"
              } rounded-2xl bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 flex items-center justify-center gap-2 active:scale-95`}
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

      {searchParams.get("from") === "onboarding" && (
        <div className="mb-4 sm:mb-6 lg:mb-8 bg-emerald-50 border border-emerald-200 rounded-xl p-3 sm:p-4">
          <p className="text-sm text-emerald-800">
            Next step: create at least one service and then set your availability to reduce missed requests and booking friction.
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {[
          {
            label: "Total",
            count: servicesList.length,
            limit: serviceLimit === Infinity ? "Unlimited" : `${serviceLimit} max`,
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
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
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
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
                  stat.color === "blue"
                    ? "bg-blue-50 text-blue-600"
                    : stat.color === "emerald"
                    ? "bg-emerald-50 text-emerald-600"
                    : stat.color === "rose"
                    ? "bg-rose-50 text-rose-500"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                <span className="material-symbols-outlined text-xl">{stat.icon}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        <AnimatePresence>
          {servicesList.map((service, index: number) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={`group overflow-hidden rounded-[24px] border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                service.isActive
                  ? "border-gray-100"
                  : "border-gray-200 opacity-85"
              }`}
            >
              {/* Service Preview Image */}
              <div className="relative h-44 overflow-hidden bg-gray-100">
                {service.images && service.images.length > 0 ? (
                  <img
                    src={service.images[0]}
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <span
                      className={`material-symbols-outlined text-gray-300 ${
                        isMobile ? "text-3xl" : "text-4xl sm:text-5xl"
                      }`}
                    >
                      construction
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                {/* Media Indicators */}
                <div className="absolute bottom-3 right-3 flex gap-1.5">
                  {service.images?.length > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      <span className="material-symbols-outlined text-[12px]">
                        photo_library
                      </span>
                      {service.images.length}
                    </span>
                  )}
                  {service.video && (
                    <span className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      <span className="material-symbols-outlined text-[12px]">
                        videocam
                      </span>
                      1
                    </span>
                  )}
                </div>

                {/* Status Badge */}
                <div className="absolute left-3 top-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur-md ${
                      service.isActive
                        ? "bg-emerald-500/90 text-white"
                        : "bg-gray-500/90 text-white"
                    }`}
                  >
                    {service.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Service Content */}
              <div className="p-5">
                <div className="mb-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="max-w-[75%] truncate rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-600">
                      {service.category || "Service"}
                    </span>
                  </div>
                  <h3 className="mb-1 line-clamp-1 text-lg font-bold text-gray-900">
                    {service.name}
                  </h3>
                  <p className="line-clamp-2 min-h-[2.75rem] text-sm leading-relaxed text-gray-500">
                    {service.description || "No description yet."}
                  </p>
                </div>

                <div className="mb-4 flex items-end justify-between">
                  <div className="min-w-0">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                      Price
                    </p>
                    <div className="flex items-baseline gap-1">
                      <p className="truncate text-2xl font-bold text-gray-900">
                        KES {service.price.toLocaleString()}
                      </p>
                      <span className="flex-shrink-0 text-sm font-medium text-gray-500">
                        {service.pricingUnit === "hourly" ? "/hr" : "(Fixed)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="mb-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
                  <div className="rounded-2xl bg-gray-50 px-3 py-2" title="Total Views">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <span className="material-symbols-outlined text-base">visibility</span>
                      <span className="text-xs font-medium uppercase tracking-wide">
                        Views
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {(service.views || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-3 py-2" title="Favorites">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <span className="material-symbols-outlined text-base">favorite</span>
                      <span className="text-xs font-medium uppercase tracking-wide">
                        Favorites
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {(service.favorites || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                  {/* Promote Action */}
                  <button
                    onClick={() => {
                        setPromotingService(service);
                        setShowPromoteModal(true);
                    }}
                    className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
                  >
                     <span className="material-symbols-outlined text-sm">rocket_launch</span>
                     <span>Boost Visibility</span>
                  </button>

                  {/* Actions - Mobile Optimized */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openEditModal(service)}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() =>
                        handleToggleStatus(service.id, service.isActive)
                      }
                      className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors active:scale-95 ${
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
                  </div>


                <button
                  onClick={() => setDeleteConfirm(service.id)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-red-600 opacity-70 transition-colors hover:bg-red-50 hover:opacity-100 active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  <span className="truncate">Delete</span>
                </button>
              </div>
            </motion.div>
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
            {PLAN_LIMITS[
              (subscriptionData?.subscription?.plan ||
                "FREE") as keyof typeof PLAN_LIMITS
            ] === Infinity
              ? "unlimited"
              : `up to ${
                  PLAN_LIMITS[
                    (subscriptionData?.subscription?.plan ||
                      "FREE") as keyof typeof PLAN_LIMITS
                  ] || 5
                }`}{" "}
            services to showcase your expertise.
          </p>
          <button
            onClick={openAddModal}
            className={`${
              isMobile ? "px-3 py-2.5 text-xs" : "px-4 sm:px-6 py-3 text-sm"
            } bg-emerald-600 text-white ${
              isMobile ? "rounded-lg" : "rounded-xl"
            } font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg shadow-emerald-200 inline-flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto active:scale-95`}
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className={`bg-white ${
                isMobile ? "rounded-lg p-4" : "rounded-xl p-5 sm:p-6 lg:p-8"
              } shadow-lg sm:shadow-2xl max-w-sm w-full text-center relative overflow-hidden`}
            >
              {/* Decorative background element */}
              <div className="absolute top-0 left-0 w-full h-1.5 sm:h-2 bg-gradient-to-r from-red-400 to-red-600" />

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
                <button
                  onClick={() => handleDelete(deleteConfirm!)}
                  className={`w-full ${
                    isMobile
                      ? "px-3 py-2.5 text-xs"
                      : "px-4 sm:px-5 py-3 text-sm"
                  } bg-red-600 text-white ${
                    isMobile ? "rounded-lg" : "rounded-xl"
                  } font-bold hover:bg-red-700 transition-all shadow-md hover:shadow-lg shadow-red-200 flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95`}
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
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className={`w-full ${
                    isMobile
                      ? "px-3 py-2.5 text-xs"
                      : "px-4 sm:px-5 py-3 text-sm"
                  } bg-white text-gray-700 border border-gray-200 ${
                    isMobile ? "rounded-lg" : "rounded-xl"
                  } font-semibold hover:bg-gray-50 transition-colors active:scale-95`}
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
        service={editingService}
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
