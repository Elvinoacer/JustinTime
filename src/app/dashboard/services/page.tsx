"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useProviderServices,
  useDeleteService,
  useUpdateService,
} from "@/lib/api/hooks/useProvider";
import ServiceFormModal from "@/components/dashboard/services/ServiceFormModal";
import { toast } from "sonner";

const ServicesPage = () => {
  const { data: servicesData, isLoading } = useProviderServices();
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
      toast.success(`Service ${!currentStatus ? 'activated' : 'deactivated'}`);
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
    if (servicesList.length >= 5) {
      toast.error("You have reached the maximum limit of 5 services.");
      return;
    }
    setEditingService(null);
    setShowAddModal(true);
  };

  const activeServices = servicesList.filter((s: any) => s.isActive).length;
  const inactiveServices = servicesList.filter((s: any) => !s.isActive).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" aria-label="Loading services" className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-gray-900 text-3xl font-bold leading-tight mb-2">
            My Services
          </h1>
          <p className="text-gray-500 text-sm font-normal leading-normal">
            Manage your service offerings and showcase your work
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
          aria-label="Add new service"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add New Service
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Total Services",
            count: servicesList.length,
            limit: "/ 5",
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">
                  {stat.label}
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-3xl font-bold text-gray-900">
                    {stat.count}
                  </p>
                  {stat.limit && (
                    <span className="text-gray-400 text-lg font-medium">{stat.limit}</span>
                  )}
                </div>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  stat.color === "blue"
                    ? "bg-blue-50 text-blue-600"
                    : stat.color === "emerald"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                <span className="material-symbols-outlined">
                  {stat.icon}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {servicesList.map((service: any, index: number) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group ${
                service.isActive
                  ? "border-gray-100"
                  : "border-gray-200 opacity-75 grayscale-[0.5]"
              }`}
            >
              {/* Service Preview Image */}
              <div className="h-48 bg-gray-100 relative overflow-hidden">
                {service.images && service.images.length > 0 ? (
                  <img 
                    src={service.images[0]} 
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <span className="material-symbols-outlined text-gray-300 text-5xl">construction</span>
                  </div>
                )}
                
                {/* Media Indicators */}
                <div className="absolute bottom-3 right-3 flex gap-2">
                  {service.images?.length > 0 && (
                    <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-lg flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">photo_library</span>
                      {service.images.length}
                    </span>
                  )}
                  {service.video && (
                    <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-lg flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">videocam</span>
                      1
                    </span>
                  )}
                </div>

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${
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
              <div className="p-6">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full uppercase tracking-wide group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      {service.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                    {service.name}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 h-10">
                    {service.description}
                  </p>
                </div>

                <div className="flex items-end justify-between mb-6">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">Price</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-xl font-bold text-gray-900">
                        KES {service.price.toLocaleString()}
                      </p>
                      <span className="text-sm text-gray-500 font-medium">
                        {service.pricingUnit === 'hourly' ? '/hr' : '(Fixed)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => openEditModal(service)}
                    className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(service.id, service.isActive)}
                    className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                      service.isActive
                        ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {service.isActive ? "pause" : "play_arrow"}
                    </span>
                    {service.isActive ? "Pause" : "Activate"}
                  </button>
                </div>
                
                <button
                  onClick={() => setDeleteConfirm(service.id)}
                  className="w-full mt-3 px-4 py-2 text-red-600 text-sm font-medium hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2 opacity-60 hover:opacity-100"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Delete Service
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {servicesList.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-gray-100">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-gray-300 text-5xl">
              construction
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No services yet
          </h3>
          <p className="text-gray-500 text-base mb-8 max-w-md mx-auto">
            Start building your profile by adding your first service. You can add up to 5 services to showcase your expertise.
          </p>
          <button
            onClick={openAddModal}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Add Your First Service
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center relative overflow-hidden"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 to-red-600" />
              
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                <span className="material-symbols-outlined text-red-500 text-3xl">
                  delete_forever
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Delete Service?
              </h3>
              
              <p className="text-gray-500 mb-8 leading-relaxed">
                This action cannot be undone. This will permanently delete the service and all associated media.
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleDelete(deleteConfirm!)}
                  className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 group"
                >
                  <span className="material-symbols-outlined group-hover:animate-bounce">delete</span>
                  Yes, Delete Service
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="w-full px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
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
