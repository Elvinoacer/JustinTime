"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useProviderServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from "@/lib/api/hooks/useProvider";

const ServicesPage = () => {
  const { data: servicesData, isLoading } = useProviderServices();
  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();

  const servicesList = servicesData?.data || [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
  });

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateServiceMutation.mutateAsync({
        id,
        data: { isActive: !currentStatus },
      });
    } catch (error) {
      console.error("Failed to toggle status", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteServiceMutation.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete service", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(formData.price.replace(/[^0-9.]/g, ""));

    try {
      if (editingService) {
        await updateServiceMutation.mutateAsync({
          id: editingService.id,
          data: { ...formData, price },
        });
      } else {
        await createServiceMutation.mutateAsync({ ...formData, price });
      }
      setShowAddModal(false);
      setEditingService(null);
      setFormData({ name: "", category: "", description: "", price: "" });
    } catch (error) {
      console.error("Failed to save service", error);
    }
  };

  const openEditModal = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      category: service.category,
      description: service.description || "",
      price: service.price.toString(),
    });
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setEditingService(null);
    setFormData({ name: "", category: "", description: "", price: "" });
    setShowAddModal(true);
  };

  const activeServices = servicesList.filter((s: any) => s.isActive).length;
  const inactiveServices = servicesList.filter((s: any) => !s.isActive).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" aria-label="Loading services" className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-gray-800 text-3xl font-bold leading-tight mb-2">
            Services
          </h1>
          <p className="text-gray-500 text-sm font-normal leading-normal">
            Manage your service offerings and pricing
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors flex items-center gap-2"
          aria-label="Add new service"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add New Service
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Total Services",
            count: servicesList.length,
            icon: "construction",
            color: "blue",
          },
          {
            label: "Active",
            count: activeServices,
            icon: "check_circle",
            color: "green",
          },
          {
            label: "Inactive",
            count: inactiveServices,
            icon: "cancel",
            color: "gray",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stat.count}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  stat.color === "blue"
                    ? "bg-blue-100"
                    : stat.color === "green"
                    ? "bg-green-100"
                    : "bg-gray-100"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${
                    stat.color === "blue"
                      ? "text-blue-600"
                      : stat.color === "green"
                      ? "text-green-600"
                      : "text-gray-600"
                  }`}
                >
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
              className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
                service.isActive
                  ? "border-gray-100"
                  : "border-gray-200 opacity-60"
              }`}
            >
              {/* Service Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary-600">
                      construction
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Status Toggle */}
                    <button
                      onClick={() => handleToggleStatus(service.id, service.isActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        service.isActive ? "bg-green-500" : "bg-gray-300"
                      }`}
                      role="switch"
                      aria-checked={service.isActive}
                      aria-label={`Toggle ${service.name} status`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          service.isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {service.name}
                </h3>
                <p className="text-sm text-gray-500 mb-3">{service.category}</p>
                <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-2">
                  {service.description}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-primary-600">
                    KES {service.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">per service</span>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                      service.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {service.isActive ? "check_circle" : "cancel"}
                    </span>
                    {service.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-100 p-4 bg-gray-50 flex items-center gap-2">
                <button
                  onClick={() => openEditModal(service)}
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  aria-label={`Edit ${service.name}`}
                >
                  <span className="material-symbols-outlined text-sm">
                    edit
                  </span>
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(service.id)}
                  className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-medium text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  aria-label={`Delete ${service.name}`}
                >
                  <span className="material-symbols-outlined text-sm">
                    delete
                  </span>
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {servicesList.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center border border-gray-100">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-gray-400 text-4xl">
              construction
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No services yet
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            Get started by adding your first service
          </p>
          <button
            onClick={openAddModal}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
              role="dialog"
              aria-labelledby="delete-dialog-title"
              aria-describedby="delete-dialog-description"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-red-600">
                    warning
                  </span>
                </div>
                <div>
                  <h3
                    id="delete-dialog-title"
                    className="text-lg font-bold text-gray-900 mb-1"
                  >
                    Delete Service
                  </h3>
                  <p
                    id="delete-dialog-description"
                    className="text-sm text-gray-600"
                  >
                    Are you sure you want to delete this service? This action
                    cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm!)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors"
                >
                  Delete Service
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Service Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              role="dialog"
              aria-labelledby="add-dialog-title"
            >
              <div className="flex items-center justify-between mb-6">
                <h3
                  id="add-dialog-title"
                  className="text-xl font-bold text-gray-900"
                >
                  {editingService ? "Edit Service" : "Add New Service"}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close dialog"
                >
                  <span className="material-symbols-outlined text-gray-600">
                    close
                  </span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="service-name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Service Name
                  </label>
                  <input
                    id="service-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Plumbing Repair"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="service-category"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Category
                  </label>
                  <input
                    id="service-category"
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Home Repair"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="service-description"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="service-description"
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your service..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="service-price"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Price
                  </label>
                  <input
                    id="service-price"
                    type="text"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g., 5000"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                    className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {(createServiceMutation.isPending || updateServiceMutation.isPending) && (
                      <div role="status" className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    )}
                    {editingService ? "Save Changes" : "Add Service"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServicesPage;
