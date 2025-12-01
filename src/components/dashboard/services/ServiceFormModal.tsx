"use client";

import CategorySelector from "@/components/CategorySelector";
import apiClient from "@/lib/api/client";
import {
  useCreateService,
  useUpdateService,
} from "@/lib/api/hooks/useProvider";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";
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
      if (files[0].size > 10 * 1024 * 1024) {
        toast.error("Video exceeds 10MB limit");
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start md:items-center justify-center z-50 p-2 md:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-lg md:rounded-xl lg:rounded-2xl shadow-lg md:shadow-xl lg:shadow-2xl w-full max-w-lg md:max-w-2xl my-4 md:my-0 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]"
        >
          {/* Header */}
          <div className="px-4 md:px-6 lg:px-8 py-4 md:py-5 lg:py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                {isEditMode ? "Edit Service" : "Create New Service"}
              </h2>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1 truncate">
                Step {step} of 3:{" "}
                {step === 1 ? "Basic Info" : step === 2 ? "Details" : "Media"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-lg md:text-xl">
                close
              </span>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 md:p-6 lg:p-8 overflow-y-auto flex-1">
            {step === 1 && (
              <div className="space-y-4 md:space-y-5 lg:space-y-6">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">
                    Service Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full px-3 py-2.5 md:px-4 md:py-3 rounded-lg md:rounded-xl border ${
                      errors.name
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-200 focus:ring-emerald-500"
                    } focus:ring-2 focus:border-transparent transition-all text-sm md:text-base text-gray-900 placeholder:text-gray-500`}
                    placeholder="e.g. Professional House Cleaning"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs md:text-sm mt-1">
                      {errors.name}
                    </p>
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
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">
                    Price (KES) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm md:text-base font-medium">
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
                      className={`w-full pl-12 md:pl-14 pr-3 md:pr-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border ${
                        errors.price
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-200 focus:ring-emerald-500"
                      } focus:ring-2 focus:border-transparent transition-all text-sm md:text-base text-gray-900 placeholder:text-gray-500`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price && (
                    <p className="text-red-500 text-xs md:text-sm mt-1">
                      {errors.price}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">
                    Pricing Model <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 md:gap-3 lg:gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, pricingUnit: "fixed" })
                      }
                      className={`px-3 py-2.5 md:px-4 md:py-3 rounded-lg md:rounded-xl border-2 font-medium text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 md:gap-2 ${
                        formData.pricingUnit === "fixed"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base md:text-lg">
                        payments
                      </span>
                      <span className="truncate">Fixed Price</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, pricingUnit: "hourly" })
                      }
                      className={`px-3 py-2.5 md:px-4 md:py-3 rounded-lg md:rounded-xl border-2 font-medium text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 md:gap-2 ${
                        formData.pricingUnit === "hourly"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base md:text-lg">
                        schedule
                      </span>
                      <span className="truncate">Hourly Rate</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 md:space-y-5 lg:space-y-6">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className={`w-full px-3 py-2.5 md:px-4 md:py-3 rounded-lg md:rounded-xl border ${
                      errors.description
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-200 focus:ring-emerald-500"
                    } focus:ring-2 focus:border-transparent transition-all resize-none text-sm md:text-base text-gray-900 placeholder:text-gray-500`}
                    placeholder="Describe your service in detail..."
                    maxLength={500}
                  />
                  {errors.description && (
                    <p className="text-red-500 text-xs md:text-sm mt-1">
                      {errors.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5 md:mt-2 text-right">
                    {formData.description.length}/500 characters
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5 md:space-y-6 lg:space-y-8">
                {/* Image Upload */}
                <div>
                  <div className="flex justify-between items-center mb-3 md:mb-4">
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 truncate">
                      Gallery Images ({formData.images.length}/10)
                    </label>
                    <span className="text-xs text-gray-500">Max 2MB</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
                    {formData.images.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-lg md:rounded-xl overflow-hidden group border border-gray-100"
                      >
                        <img
                          src={url}
                          alt={`Service ${idx}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-0.5 md:p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 text-xs md:text-sm"
                          aria-label={`Remove image ${idx + 1}`}
                        >
                          <span className="material-symbols-outlined text-xs md:text-sm">
                            close
                          </span>
                        </button>
                      </div>
                    ))}

                    {formData.images.length < 10 && (
                      <label className="aspect-square rounded-lg md:rounded-xl border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 md:gap-2 group">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "image")}
                        />
                        <span className="material-symbols-outlined text-gray-400 group-hover:text-emerald-500 text-2xl md:text-3xl">
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
                  <div className="flex justify-between items-center mb-3 md:mb-4">
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 truncate">
                      Service Video (Optional)
                    </label>
                    <span className="text-xs text-gray-500">Max 10MB</span>
                  </div>

                  {formData.video ? (
                    <div className="relative rounded-lg md:rounded-xl overflow-hidden bg-black aspect-video group">
                      <video
                        src={formData.video}
                        controls
                        className="w-full h-full"
                      />
                      <button
                        onClick={removeVideo}
                        className="absolute top-1.5 md:top-2 right-1.5 md:right-2 bg-red-500 text-white p-1 md:p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 z-10 text-xs md:text-sm"
                        aria-label="Remove video"
                      >
                        <span className="material-symbols-outlined text-xs md:text-sm">
                          delete
                        </span>
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-24 md:h-32 rounded-lg md:rounded-xl border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 md:gap-2 group p-2">
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "video")}
                      />
                      <span className="material-symbols-outlined text-gray-400 group-hover:text-emerald-500 text-3xl md:text-4xl">
                        video_call
                      </span>
                      <span className="text-xs md:text-sm text-gray-500 group-hover:text-emerald-600 font-medium text-center">
                        Upload a video to showcase your work
                      </span>
                    </label>
                  )}
                </div>

                {/* Upload Progress */}
                {uploadingFiles.length > 0 && (
                  <div className="space-y-1.5 md:space-y-2">
                    {uploadingFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 rounded-md md:rounded-lg p-2 md:p-3 flex items-center gap-2 md:gap-3"
                      >
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-gray-500 text-xs md:text-sm">
                            {file.type === "image" ? "image" : "videocam"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-0.5 md:mb-1">
                            <span className="font-medium text-gray-700 truncate">
                              {file.file.name}
                            </span>
                            <span className="text-emerald-600 whitespace-nowrap">
                              {file.progress}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1 md:h-1.5">
                            <div
                              className="bg-emerald-500 h-1 md:h-1.5 rounded-full transition-all duration-300"
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
          <div className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
            {step > 1 ? (
              <button
                onClick={() => setStep((prev) => prev - 1)}
                className="px-4 py-2 md:px-5 md:py-2.5 text-gray-600 text-xs md:text-sm font-medium hover:bg-gray-100 rounded-lg md:rounded-xl transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base md:text-lg">
                  arrow_back
                </span>
                <span className="hidden xs:inline">Back</span>
              </button>
            ) : (
              <div></div> // Spacer
            )}

            <button
              onClick={step === 3 ? handleSubmit : handleNext}
              disabled={
                createServiceMutation.isPending ||
                updateServiceMutation.isPending ||
                uploadingFiles.length > 0
              }
              className="px-4 py-2 md:px-6 md:py-2.5 lg:px-8 lg:py-2.5 bg-emerald-600 text-white text-xs md:text-sm font-bold rounded-lg md:rounded-xl hover:bg-emerald-700 transition-all shadow-md md:shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 md:gap-2 min-w-[100px]"
            >
              {(createServiceMutation.isPending ||
                updateServiceMutation.isPending) && (
                <span className="w-3 h-3 md:w-4 md:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
              )}
              <span className="truncate">
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
