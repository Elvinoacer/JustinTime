"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useProviderServices,
  useDeleteService,
  useUpdateService,
} from "@/lib/api/hooks/useProvider";
import { useSubscriptionStatus } from "@/lib/api/hooks/useSubscription";
import ServiceFormModal from "@/components/dashboard/services/ServiceFormModal";
import { toast } from "sonner";

const PLAN_LIMITS = {
  FREE: 5,
  PRO: Infinity,
  BUSINESS: Infinity,
};

const ServicesPage = () => {
  const { data: servicesData, isLoading } = useProviderServices();
  const { data: subscriptionData } = useSubscriptionStatus();
  const deleteServiceMutation = useDeleteService();
  const updateServiceMutation = useUpdateService();

  const servicesList = servicesData?.data || [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any | null>(null);

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

  const openEditModal = (service: any) => {
    setEditingService(service);
    setShowAddModal(true);
  };

  const openAddModal = () => {
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
  };

  const activeServices = servicesList.filter((s: any) => s.isActive).length;
  const inactiveServices = servicesList.filter((s: any) => !s.isActive).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] md:min-h-[400px]">
        <div
          role="status"
          aria-label="Loading services"
          className="w-10 h-10 md:w-12 md:h-12 border-3 md:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-4 lg:px-6">
      {/* Header */}
      <div className="mb-4 md:mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-gray-900 text-xl md:text-2xl lg:text-3xl font-bold leading-tight mb-1 md:mb-2">
            My Services
          </h1>
          <p className="text-gray-500 text-xs md:text-sm font-normal leading-normal">
            Manage your service offerings and showcase your work
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 md:px-6 md:py-2.5 bg-emerald-600 text-white rounded-lg md:rounded-xl font-bold text-xs md:text-sm hover:bg-emerald-700 transition-all shadow-md md:shadow-lg shadow-emerald-200 flex items-center justify-center gap-1.5 md:gap-2 w-full sm:w-auto"
          aria-label="Add new service"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add New Service
        </button>
      </div>

      {/* Stats Cards - Mobile Optimized */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 lg:gap-4 mb-4 md:mb-6 lg:mb-8">
        {[
          {
            label: "Total",
            count: servicesList.length,
            limit:
              PLAN_LIMITS[
                (subscriptionData?.subscription?.plan ||
                  "FREE") as keyof typeof PLAN_LIMITS
              ] === Infinity
                ? " (Unlimited)"
                : `/ ${
                    PLAN_LIMITS[
                      (subscriptionData?.subscription?.plan ||
                        "FREE") as keyof typeof PLAN_LIMITS
                    ] || 5
                  }`,
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
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg md:rounded-xl shadow-xs md:shadow-sm p-3 md:p-4 lg:p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs md:text-sm font-medium truncate">
                  {stat.label}
                </p>
                <div className="flex items-baseline gap-0.5 md:gap-1 mt-0.5 md:mt-1">
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
                    {stat.count}
                  </p>
                  {stat.limit && (
                    <span className="text-gray-400 text-sm md:text-lg font-medium">
                      {stat.limit}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 ${
                  stat.color === "blue"
                    ? "bg-blue-50 text-blue-600"
                    : stat.color === "emerald"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                <span className="material-symbols-outlined text-base md:text-lg lg:text-xl">
                  {stat.icon}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Services Grid - Responsive Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        <AnimatePresence>
          {servicesList.map((service: any, index: number) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={`bg-white rounded-lg md:rounded-xl shadow-xs md:shadow-sm border overflow-hidden transition-all duration-300 hover:shadow-sm md:hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 group ${
                service.isActive
                  ? "border-gray-100"
                  : "border-gray-200 opacity-75 grayscale-[0.5]"
              }`}
            >
              {/* Service Preview Image */}
              <div className="h-40 md:h-48 bg-gray-100 relative overflow-hidden">
                {service.images && service.images.length > 0 ? (
                  <img
                    src={service.images[0]}
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <span className="material-symbols-outlined text-gray-300 text-4xl md:text-5xl">
                      construction
                    </span>
                  </div>
                )}

                {/* Media Indicators */}
                <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3 flex gap-1.5 md:gap-2">
                  {service.images?.length > 0 && (
                    <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded md:rounded-lg flex items-center gap-0.5 md:gap-1">
                      <span className="material-symbols-outlined text-[12px] md:text-[14px]">
                        photo_library
                      </span>
                      <span className="text-xs">{service.images.length}</span>
                    </span>
                  )}
                  {service.video && (
                    <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded md:rounded-lg flex items-center gap-0.5 md:gap-1">
                      <span className="material-symbols-outlined text-[12px] md:text-[14px]">
                        videocam
                      </span>
                      <span className="text-xs">1</span>
                    </span>
                  )}
                </div>

                {/* Status Badge */}
                <div className="absolute top-2 md:top-3 right-2 md:right-3">
                  <span
                    className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${
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
              <div className="p-4 md:p-6">
                <div className="mb-3 md:mb-4">
                  <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                    <span className="px-2 py-0.5 md:px-3 md:py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full uppercase tracking-wide group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors truncate max-w-[70%]">
                      {service.category}
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                    {service.name}
                  </h3>
                  <p className="text-gray-500 text-xs md:text-sm leading-relaxed line-clamp-2 h-8 md:h-10">
                    {service.description}
                  </p>
                </div>

                <div className="flex items-end justify-between mb-4 md:mb-6">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">
                      Price
                    </p>
                    <div className="flex items-baseline gap-0.5 md:gap-1">
                      <p className="text-lg md:text-xl font-bold text-gray-900">
                        KES {service.price.toLocaleString()}
                      </p>
                      <span className="text-xs md:text-sm text-gray-500 font-medium">
                        {service.pricingUnit === "hourly" ? "/hr" : "(Fixed)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions - Mobile Optimized */}
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <button
                    onClick={() => openEditModal(service)}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-50 text-gray-700 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5 md:gap-2"
                  >
                    <span className="material-symbols-outlined text-xs md:text-sm">
                      edit
                    </span>
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() =>
                      handleToggleStatus(service.id, service.isActive)
                    }
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm transition-colors flex items-center justify-center gap-1.5 md:gap-2 ${
                      service.isActive
                        ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs md:text-sm">
                      {service.isActive ? "pause" : "play_arrow"}
                    </span>
                    <span className="truncate">
                      {service.isActive ? "Pause" : "Activate"}
                    </span>
                  </button>
                </div>

                <button
                  onClick={() => setDeleteConfirm(service.id)}
                  className="w-full mt-2 md:mt-3 px-3 py-1.5 md:px-4 md:py-2 text-red-600 text-xs md:text-sm font-medium hover:bg-red-50 rounded-lg md:rounded-xl transition-colors flex items-center justify-center gap-1.5 md:gap-2 opacity-60 hover:opacity-100"
                >
                  <span className="material-symbols-outlined text-xs md:text-sm">
                    delete
                  </span>
                  <span className="truncate">Delete</span>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {servicesList.length === 0 && (
        <div className="bg-white rounded-lg md:rounded-xl shadow-xs md:shadow-sm p-6 md:p-8 lg:p-12 text-center border border-gray-100">
          <div className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
            <span className="material-symbols-outlined text-gray-300 text-3xl md:text-4xl lg:text-5xl">
              construction
            </span>
          </div>
          <h3 className="text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-2">
            No services yet
          </h3>
          <p className="text-gray-500 text-xs md:text-sm lg:text-base mb-4 md:mb-6 lg:mb-8 max-w-md mx-auto px-2">
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
            className="px-4 py-2 md:px-6 md:py-3 lg:px-8 lg:py-3 bg-emerald-600 text-white rounded-lg md:rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md md:shadow-lg shadow-emerald-200 inline-flex items-center justify-center gap-1.5 md:gap-2 w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Your First Service
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg md:rounded-xl shadow-lg md:shadow-2xl p-5 md:p-6 lg:p-8 max-w-sm w-full text-center relative overflow-hidden"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 left-0 w-full h-1.5 md:h-2 bg-gradient-to-r from-red-400 to-red-600" />

              <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 md:mb-5 lg:mb-6 mx-auto">
                <span className="material-symbols-outlined text-red-500 text-2xl md:text-3xl">
                  delete_forever
                </span>
              </div>

              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                Delete Service?
              </h3>

              <p className="text-gray-500 text-xs md:text-sm mb-4 md:mb-6 lg:mb-8 leading-relaxed px-2">
                This action cannot be undone. This will permanently delete the
                service and all associated media.
              </p>

              <div className="flex flex-col gap-2 md:gap-3">
                <button
                  onClick={() => handleDelete(deleteConfirm!)}
                  className="w-full px-4 py-2.5 md:px-5 md:py-3 lg:px-6 lg:py-3 bg-red-600 text-white rounded-lg md:rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-md md:shadow-lg shadow-red-200 flex items-center justify-center gap-1.5 md:gap-2 group"
                >
                  <span className="material-symbols-outlined text-sm group-hover:animate-bounce">
                    delete
                  </span>
                  Yes, Delete Service
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="w-full px-4 py-2.5 md:px-5 md:py-3 lg:px-6 lg:py-3 bg-white text-gray-700 border border-gray-200 rounded-lg md:rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
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
      />
    </div>
  );
};

export default ServicesPage;
