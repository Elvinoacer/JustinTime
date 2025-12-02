"use client";

import { useState, useEffect } from "react";
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

  const servicesList = Array.isArray(servicesData?.data) 
    ? servicesData.data 
    : Array.isArray(servicesData?.services) 
    ? servicesData.services 
    : [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1
            className={`${
              isMobile ? "text-xl" : "text-2xl lg:text-3xl"
            } font-bold text-gray-900 mb-1 sm:mb-2 leading-tight`}
          >
            My Services
          </h1>
          <p
            className={`${
              isMobile ? "text-xs" : "text-sm"
            } text-gray-500 font-normal leading-normal`}
          >
            Manage your service offerings and showcase your work
          </p>
        </div>
        <button
          onClick={openAddModal}
          className={`${
            isMobile ? "px-3 py-2.5 text-xs" : "px-4 py-3 text-sm"
          } bg-emerald-600 text-white ${
            isMobile ? "rounded-lg" : "rounded-xl"
          } font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg shadow-emerald-200 flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto active:scale-95`}
          aria-label="Add new service"
        >
          <span
            className={`material-symbols-outlined ${
              isMobile ? "text-sm" : "text-base"
            }`}
          >
            add
          </span>
          {isMobile ? "Add Service" : "Add New Service"}
        </button>
      </div>

      {/* Stats Cards - Mobile Optimized */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6 lg:mb-8">
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
            className={`bg-white ${
              isMobile ? "rounded-lg p-3" : "rounded-xl p-4 sm:p-6"
            } shadow-xs sm:shadow-sm border border-gray-100`}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p
                  className={`${
                    isMobile ? "text-xs" : "text-sm"
                  } text-gray-500 font-medium truncate`}
                >
                  {stat.label}
                </p>
                <div className="flex items-baseline gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                  <p
                    className={`${
                      isMobile ? "text-lg" : "text-xl lg:text-2xl"
                    } font-bold text-gray-900`}
                  >
                    {stat.count}
                  </p>
                  {stat.limit && (
                    <span
                      className={`${
                        isMobile ? "text-xs" : "text-sm lg:text-base"
                      } text-gray-400 font-medium`}
                    >
                      {stat.limit}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`${
                  isMobile
                    ? "w-8 h-8 rounded-lg"
                    : "w-10 h-10 sm:w-12 sm:h-12 rounded-xl"
                } flex items-center justify-center flex-shrink-0 ${
                  stat.color === "blue"
                    ? "bg-blue-50 text-blue-600"
                    : stat.color === "emerald"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${
                    isMobile ? "text-base" : "text-lg sm:text-xl"
                  }`}
                >
                  {stat.icon}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Services Grid - Responsive Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <AnimatePresence>
          {servicesList.map((service: any, index: number) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={`bg-white ${
                isMobile ? "rounded-lg" : "rounded-xl"
              } shadow-xs sm:shadow-sm border overflow-hidden transition-all duration-300 hover:shadow-md ${
                isMobile ? "hover:-translate-y-0.5" : "hover:-translate-y-1"
              } group ${
                service.isActive
                  ? "border-gray-100"
                  : "border-gray-200 opacity-75 grayscale-[0.5]"
              }`}
            >
              {/* Service Preview Image */}
              <div
                className={`${
                  isMobile ? "h-32" : "h-40 sm:h-48"
                } bg-gray-100 relative overflow-hidden`}
              >
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

                {/* Media Indicators */}
                <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 flex gap-1 sm:gap-1.5">
                  {service.images?.length > 0 && (
                    <span
                      className={`${
                        isMobile
                          ? "px-1.5 py-0.5 text-[10px]"
                          : "px-2 py-1 text-xs"
                      } bg-black/60 backdrop-blur-sm text-white font-medium ${
                        isMobile ? "rounded" : "rounded-lg"
                      } flex items-center gap-0.5 sm:gap-1`}
                    >
                      <span
                        className={`material-symbols-outlined ${
                          isMobile ? "text-[10px]" : "text-[12px]"
                        }`}
                      >
                        photo_library
                      </span>
                      <span
                        className={`${isMobile ? "text-[10px]" : "text-xs"}`}
                      >
                        {service.images.length}
                      </span>
                    </span>
                  )}
                  {service.video && (
                    <span
                      className={`${
                        isMobile
                          ? "px-1.5 py-0.5 text-[10px]"
                          : "px-2 py-1 text-xs"
                      } bg-black/60 backdrop-blur-sm text-white font-medium ${
                        isMobile ? "rounded" : "rounded-lg"
                      } flex items-center gap-0.5 sm:gap-1`}
                    >
                      <span
                        className={`material-symbols-outlined ${
                          isMobile ? "text-[10px]" : "text-[12px]"
                        }`}
                      >
                        videocam
                      </span>
                      <span
                        className={`${isMobile ? "text-[10px]" : "text-xs"}`}
                      >
                        1
                      </span>
                    </span>
                  )}
                </div>

                {/* Status Badge */}
                <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                  <span
                    className={`${
                      isMobile
                        ? "px-1.5 py-0.5 text-[10px]"
                        : "px-2 sm:px-3 py-1 text-xs"
                    } rounded-full font-bold shadow-sm backdrop-blur-md ${
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
              <div className={`${isMobile ? "p-3" : "p-4 sm:p-6"}`}>
                <div className={`${isMobile ? "mb-2" : "mb-3 sm:mb-4"}`}>
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <span
                      className={`${
                        isMobile
                          ? "px-1.5 py-0.5 text-[10px]"
                          : "px-2 sm:px-3 py-1 text-xs"
                      } bg-gray-100 text-gray-600 font-semibold ${
                        isMobile ? "rounded" : "rounded-full"
                      } uppercase tracking-wide group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors truncate max-w-[70%]`}
                    >
                      {service.category}
                    </span>
                  </div>
                  <h3
                    className={`${
                      isMobile
                        ? "text-sm font-semibold"
                        : "text-base sm:text-lg font-bold"
                    } text-gray-900 mb-1 line-clamp-1`}
                  >
                    {service.name}
                  </h3>
                  <p
                    className={`${
                      isMobile ? "text-xs" : "text-sm"
                    } text-gray-500 leading-relaxed line-clamp-2 ${
                      isMobile ? "h-8" : "h-10"
                    }`}
                  >
                    {service.description}
                  </p>
                </div>

                <div className="flex items-end justify-between mb-3 sm:mb-4">
                  <div className="min-w-0">
                    <p
                      className={`${
                        isMobile ? "text-[10px]" : "text-xs"
                      } text-gray-500 font-medium uppercase tracking-wider mb-0.5`}
                    >
                      Price
                    </p>
                    <div className="flex items-baseline gap-0.5 sm:gap-1">
                      <p
                        className={`${
                          isMobile ? "text-base" : "text-lg sm:text-xl"
                        } font-bold text-gray-900 truncate`}
                      >
                        KES {service.price.toLocaleString()}
                      </p>
                      <span
                        className={`${
                          isMobile ? "text-xs" : "text-sm"
                        } text-gray-500 font-medium flex-shrink-0`}
                      >
                        {service.pricingUnit === "hourly" ? "/hr" : "(Fixed)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-1.5 text-gray-500" title="Total Views">
                    <span className={`material-symbols-outlined ${isMobile ? "text-base" : "text-lg"}`}>visibility</span>
                    <span className={`${isMobile ? "text-xs" : "text-sm"} font-medium`}>
                      {service.views?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500" title="Favorites">
                    <span className={`material-symbols-outlined ${isMobile ? "text-base" : "text-lg"}`}>favorite</span>
                    <span className={`${isMobile ? "text-xs" : "text-sm"} font-medium`}>
                      {service.favorites?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>

                {/* Actions - Mobile Optimized */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={() => openEditModal(service)}
                    className={`${
                      isMobile
                        ? "px-2 py-1.5 text-xs"
                        : "px-3 sm:px-4 py-2 text-sm"
                    } bg-gray-50 text-gray-700 ${
                      isMobile ? "rounded" : "rounded-lg sm:rounded-xl"
                    } font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-1 sm:gap-2 active:scale-95`}
                  >
                    <span
                      className={`material-symbols-outlined ${
                        isMobile ? "text-xs" : "text-sm"
                      }`}
                    >
                      edit
                    </span>
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() =>
                      handleToggleStatus(service.id, service.isActive)
                    }
                    className={`${
                      isMobile
                        ? "px-2 py-1.5 text-xs"
                        : "px-3 sm:px-4 py-2 text-sm"
                    } ${
                      isMobile ? "rounded" : "rounded-lg sm:rounded-xl"
                    } font-semibold transition-colors flex items-center justify-center gap-1 sm:gap-2 active:scale-95 ${
                      service.isActive
                        ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined ${
                        isMobile ? "text-xs" : "text-sm"
                      }`}
                    >
                      {service.isActive ? "pause" : "play_arrow"}
                    </span>
                    <span className="truncate">
                      {service.isActive ? "Pause" : "Activate"}
                    </span>
                  </button>
                </div>

                <button
                  onClick={() => setDeleteConfirm(service.id)}
                  className={`w-full mt-2 sm:mt-3 ${
                    isMobile
                      ? "px-2 py-1.5 text-xs"
                      : "px-3 sm:px-4 py-2 text-sm"
                  } text-red-600 font-medium hover:bg-red-50 ${
                    isMobile ? "rounded" : "rounded-lg sm:rounded-xl"
                  } transition-colors flex items-center justify-center gap-1 sm:gap-2 opacity-60 hover:opacity-100 active:scale-95`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                  >
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
    </div>
  );
};

export default ServicesPage;
