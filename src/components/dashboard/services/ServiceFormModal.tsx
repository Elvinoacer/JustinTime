"use client";

import CategorySelector from "@/components/CategorySelector";
import apiClient from "@/lib/api/client";
import {
  useCreateService,
  useUpdateService,
} from "@/lib/api/hooks/useProvider";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

// Validation Schema
const serviceFormSchema = z.object({
  name: z.string().min(2, "Service name must be at least 2 characters"),
  category: z.string().min(2, "Category is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().min(0, "Price must be positive"),
  pricingUnit: z.enum(["fixed", "hourly"]),
  images: z.array(z.string()).max(10, "Maximum 10 images allowed"),
  video: z.string().optional(),
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  service?: any; // If provided, we are in edit mode
  isMobile?: boolean;
}

type UploadingFile = {
  file: File;
  preview: string;
  progress: number;
  publicId?: string;
  type: "image" | "video";
};

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  icon: string;
  count: number;
}

const ServiceFormModal = ({
  isOpen,
  onClose,
  service,
  isMobile = false,
}: ServiceFormModalProps) => {
  const isEditMode = !!service;
  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();

  // Fetch categories
  const { data: categoriesData = [], isLoading: isLoadingCategories } =
    useQuery({
      queryKey: ["categories"],
      queryFn: async () => {
        const response = await apiClient.get("/categories");
        return response.data.data.filter((cat: Category) => cat.id !== "all");
      },
    });

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: service?.name || "",
    category: service?.categoryId || "",
    description: service?.description || "",
    price: service?.price || 0,
    pricingUnit: service?.pricingUnit || "fixed",
    images: service?.images || [],
    video: service?.video || undefined,
  });

  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset state when modal opens/closes or service changes
  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormData({
        name: service?.name || "",
        category: service?.categoryId || "",
        description: service?.description || "",
        price: service?.price || 0,
        pricingUnit: service?.pricingUnit || "fixed",
        images: service?.images || [],
        video: service?.video || undefined,
      });
      setErrors({});
      setUploadingFiles([]);
    }
  }, [isOpen, service]);

  // Handle swipe gestures for mobile modal
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isSwipeDown = distance < -minSwipeDistance;

    if (isSwipeDown && isMobile) {
      onClose();
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validation
    if (type === "image") {
      if (formData.images.length + files.length > 10) {
        toast.error("Maximum 10 images allowed");
        return;
      }
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > 2 * 1024 * 1024) {
          toast.error(`Image ${files[i].name} exceeds 2MB limit`);
          return;
        }
      }
    } else {
      if (formData.video) {
        toast.error("Only 1 video allowed");
        return;
      }
      if (files[0].size > 30 * 1024 * 1024) {
        toast.error("Video exceeds 30MB limit");
        return;
      }
    }

    // Create preview objects
    const newFiles: UploadingFile[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      type,
    }));

    setUploadingFiles((prev) => [...prev, ...newFiles]);

    // Upload logic
    for (const fileObj of newFiles) {
      try {
        const formData = new FormData();
        formData.append("file", fileObj.file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();

        // Update progress
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.preview === fileObj.preview ? { ...f, progress: 100 } : f
          )
        );

        // Update form data
        if (type === "image") {
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images, data.url],
          }));
        } else {
          setFormData((prev) => ({ ...prev, video: data.url }));
        }

        // Cleanup
        setTimeout(() => {
          setUploadingFiles((prev) =>
            prev.filter((f) => f.preview !== fileObj.preview)
          );
          URL.revokeObjectURL(fileObj.preview);
        }, 500);
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error(`Failed to upload ${fileObj.file.name}`);
        setUploadingFiles((prev) =>
          prev.filter((f) => f.preview !== fileObj.preview)
        );
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const removeVideo = () => {
    setFormData((prev) => ({ ...prev, video: undefined }));
  };

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (currentStep === 1) {
      if (!formData.name || formData.name.length < 2) {
        newErrors.name = "Name must be at least 2 characters";
        isValid = false;
      }
      if (!formData.category) {
        newErrors.category = "Category is required";
        isValid = false;
      }
      if (formData.price < 0) {
        newErrors.price = "Price cannot be negative";
        isValid = false;
      }
    } else if (currentStep === 2) {
      if (!formData.description || formData.description.length < 10) {
        newErrors.description = "Description must be at least 10 characters";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    try {
      if (isEditMode) {
        await updateServiceMutation.mutateAsync({
          id: service.id,
          data: formData,
        });
        toast.success("Service updated successfully");
      } else {
        await createServiceMutation.mutateAsync(formData);
        toast.success("Service created successfully");
      }
      onClose();
    } catch (error: any) {
      console.error("Failed to save service", error);
      // Error is handled by global error handler or mutation error
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      }
    }
  };

  if (!isOpen) return null;

  // Mobile Bottom Sheet Style
  if (isMobile) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-h-[90vh] rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-gray-900 truncate">
                  {isEditMode ? "Edit Service" : "New Service"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  Step {step} of 3:{" "}
                  {step === 1 ? "Basic Info" : step === 2 ? "Details" : "Media"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {/* Step Indicator - Mobile Only */}
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((num) => (
                    <div
                      key={num}
                      className={`w-2 h-2 rounded-full ${
                        num === step
                          ? "bg-emerald-500"
                          : num < step
                          ? "bg-emerald-300"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {step === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Service Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className={`w-full px-3 py-2.5 rounded-lg border ${
                        errors.name
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-200 focus:ring-emerald-500"
                      } focus:ring-2 focus:border-transparent transition-all text-sm text-gray-900 placeholder:text-gray-500`}
                      placeholder="e.g., House Cleaning"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <CategorySelector
                      categories={categoriesData}
                      selectedIds={formData.category ? [formData.category] : []}
                      onToggle={(id) =>
                        setFormData({ ...formData, category: id })
                      }
                      isLoading={isLoadingCategories}
                      error={errors.category}
                      label="Category"
                      compact={true}
                      isMobile={true}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Price (KES) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                        KES
                      </span>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        className={`w-full pl-10 pr-3 py-2.5 rounded-lg border ${
                          errors.price
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-200 focus:ring-emerald-500"
                        } focus:ring-2 focus:border-transparent transition-all text-sm text-gray-900 placeholder:text-gray-500`}
                        placeholder="0.00"
                      />
                    </div>
                    {errors.price && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.price}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Pricing Model <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, pricingUnit: "fixed" })
                        }
                        className={`px-3 py-2.5 rounded-lg border-2 font-medium text-xs transition-all flex items-center justify-center gap-1.5 ${
                          formData.pricingUnit === "fixed"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          payments
                        </span>
                        <span className="truncate">Fixed</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, pricingUnit: "hourly" })
                        }
                        className={`px-3 py-2.5 rounded-lg border-2 font-medium text-xs transition-all flex items-center justify-center gap-1.5 ${
                          formData.pricingUnit === "hourly"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          schedule
                        </span>
                        <span className="truncate">Hourly</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2.5 rounded-lg border ${
                        errors.description
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-200 focus:ring-emerald-500"
                      } focus:ring-2 focus:border-transparent transition-all resize-none text-sm text-gray-900 placeholder:text-gray-500`}
                      placeholder="Describe your service..."
                      maxLength={500}
                    />
                    {errors.description && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.description}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-500 mt-1 text-right">
                      {formData.description.length}/500 characters
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-xs font-semibold text-gray-700 truncate">
                        Gallery ({formData.images.length}/10)
                      </label>
                      <span className="text-xs text-gray-500">Max 2MB</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {formData.images.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-lg overflow-hidden group border border-gray-100"
                        >
                          <img
                            src={url}
                            alt={`Service ${idx}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <button
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 text-[10px]"
                            aria-label={`Remove image ${idx + 1}`}
                          >
                            <span className="material-symbols-outlined text-[10px]">
                              close
                            </span>
                          </button>
                        </div>
                      ))}

                      {formData.images.length < 10 && (
                        <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 group">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, "image")}
                          />
                          <span className="material-symbols-outlined text-gray-400 group-hover:text-emerald-500 text-2xl">
                            add_photo_alternate
                          </span>
                          <span className="text-xs text-gray-500 group-hover:text-emerald-600 font-medium text-center px-1">
                            Add Photo
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Video Upload */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-xs font-semibold text-gray-700 truncate">
                        Video (Optional)
                      </label>
                      <span className="text-xs text-gray-500">Max 30MB</span>
                    </div>

                    {formData.video ? (
                      <div className="relative rounded-lg overflow-hidden bg-black aspect-video group">
                        <video
                          src={formData.video}
                          controls
                          className="w-full h-full"
                        />
                        <button
                          onClick={removeVideo}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 z-10 text-xs"
                          aria-label="Remove video"
                        >
                          <span className="material-symbols-outlined text-xs">
                            delete
                          </span>
                        </button>
                      </div>
                    ) : (
                      <label className="w-full h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 group p-2">
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "video")}
                        />
                        <span className="material-symbols-outlined text-gray-400 group-hover:text-emerald-500 text-3xl">
                          video_call
                        </span>
                        <span className="text-xs text-gray-500 group-hover:text-emerald-600 font-medium text-center">
                          Add video (optional)
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Upload Progress */}
                  {uploadingFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {uploadingFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 rounded-md p-2 flex items-center gap-2"
                        >
                          <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-gray-500 text-xs">
                              {file.type === "image" ? "image" : "videocam"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="font-medium text-gray-700 truncate">
                                {file.file.name}
                              </span>
                              <span className="text-emerald-600 whitespace-nowrap">
                                {file.progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div
                                className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
              {step > 1 ? (
                <button
                  onClick={() => setStep((prev) => prev - 1)}
                  className="px-3 py-2 text-gray-600 text-xs font-medium hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">
                    arrow_back
                  </span>
                  <span>Back</span>
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-3 py-2 text-gray-600 text-xs font-medium hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">
                    close
                  </span>
                  <span>Cancel</span>
                </button>
              )}

              <button
                onClick={step === 3 ? handleSubmit : handleNext}
                disabled={
                  createServiceMutation.isPending ||
                  updateServiceMutation.isPending ||
                  uploadingFiles.length > 0
                }
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 min-w-[100px] active:scale-95"
              >
                {(createServiceMutation.isPending ||
                  updateServiceMutation.isPending) && (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                )}
                <span className="truncate">
                  {step === 3 ? (isEditMode ? "Save" : "Create") : "Continue"}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Desktop Version
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl lg:rounded-2xl shadow-xl lg:shadow-2xl w-full max-w-lg lg:max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 lg:px-8 py-4 lg:py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                {isEditMode ? "Edit Service" : "Create New Service"}
              </h2>
              <p className="text-sm text-gray-500 mt-1 truncate">
                Step {step} of 3:{" "}
                {step === 1 ? "Basic Info" : step === 2 ? "Details" : "Media"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 lg:p-8 overflow-y-auto flex-1">
            {step === 1 && (
              <div className="space-y-5 lg:space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Service Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.name
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-200 focus:ring-emerald-500"
                    } focus:ring-2 focus:border-transparent transition-all text-base text-gray-900 placeholder:text-gray-500`}
                    placeholder="e.g. Professional House Cleaning"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <CategorySelector
                    categories={categoriesData}
                    selectedIds={formData.category ? [formData.category] : []}
                    onToggle={(id) =>
                      setFormData({ ...formData, category: id })
                    }
                    isLoading={isLoadingCategories}
                    error={errors.category}
                    label="Category"
                    compact={true}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Price (KES) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-base font-medium">
                      KES
                    </span>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                        errors.price
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-200 focus:ring-emerald-500"
                      } focus:ring-2 focus:border-transparent transition-all text-base text-gray-900 placeholder:text-gray-500`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price && (
                    <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pricing Model <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, pricingUnit: "fixed" })
                      }
                      className={`px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                        formData.pricingUnit === "fixed"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        payments
                      </span>
                      <span>Fixed Price</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, pricingUnit: "hourly" })
                      }
                      className={`px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                        formData.pricingUnit === "hourly"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        schedule
                      </span>
                      <span>Hourly Rate</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 lg:space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.description
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-200 focus:ring-emerald-500"
                    } focus:ring-2 focus:border-transparent transition-all resize-none text-base text-gray-900 placeholder:text-gray-500`}
                    placeholder="Describe your service in detail..."
                    maxLength={500}
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-2 text-right">
                    {formData.description.length}/500 characters
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 lg:space-y-8">
                {/* Image Upload */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-semibold text-gray-700 truncate">
                      Gallery Images ({formData.images.length}/10)
                    </label>
                    <span className="text-sm text-gray-500">Max 2MB</span>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {formData.images.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100"
                      >
                        <img
                          src={url}
                          alt={`Service ${idx}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 text-sm"
                          aria-label={`Remove image ${idx + 1}`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            close
                          </span>
                        </button>
                      </div>
                    ))}

                    {formData.images.length < 10 && (
                      <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "image")}
                        />
                        <span className="material-symbols-outlined text-gray-400 group-hover:text-emerald-500 text-3xl">
                          add_photo_alternate
                        </span>
                        <span className="text-sm text-gray-500 group-hover:text-emerald-600 font-medium text-center px-1">
                          Add Photo
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Video Upload */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-semibold text-gray-700 truncate">
                      Service Video (Optional)
                    </label>
                    <span className="text-sm text-gray-500">Max 30MB</span>
                  </div>

                  {formData.video ? (
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video group">
                      <video
                        src={formData.video}
                        controls
                        className="w-full h-full"
                      />
                      <button
                        onClick={removeVideo}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 z-10 text-sm"
                        aria-label="Remove video"
                      >
                        <span className="material-symbols-outlined text-sm">
                          delete
                        </span>
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-32 rounded-xl border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group p-2">
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "video")}
                      />
                      <span className="material-symbols-outlined text-gray-400 group-hover:text-emerald-500 text-4xl">
                        video_call
                      </span>
                      <span className="text-sm text-gray-500 group-hover:text-emerald-600 font-medium text-center">
                        Upload a video to showcase your work
                      </span>
                    </label>
                  )}
                </div>

                {/* Upload Progress */}
                {uploadingFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadingFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 rounded-lg p-3 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-gray-500 text-sm">
                            {file.type === "image" ? "image" : "videocam"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700 truncate">
                              {file.file.name}
                            </span>
                            <span className="text-emerald-600 whitespace-nowrap">
                              {file.progress}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 lg:px-8 py-4 lg:py-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
            {step > 1 ? (
              <button
                onClick={() => setStep((prev) => prev - 1)}
                className="px-5 py-2.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-lg">
                  arrow_back
                </span>
                <span>Back</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                <span>Cancel</span>
              </button>
            )}

            <button
              onClick={step === 3 ? handleSubmit : handleNext}
              disabled={
                createServiceMutation.isPending ||
                updateServiceMutation.isPending ||
                uploadingFiles.length > 0
              }
              className="px-6 py-2.5 lg:px-8 lg:py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
            >
              {(createServiceMutation.isPending ||
                updateServiceMutation.isPending) && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
              )}
              <span>
                {step === 3
                  ? isEditMode
                    ? "Save Changes"
                    : "Create Service"
                  : "Continue"}
              </span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ServiceFormModal;
