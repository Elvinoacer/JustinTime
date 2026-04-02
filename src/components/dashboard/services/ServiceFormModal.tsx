"use client";

import CategorySelector from "@/components/CategorySelector";
import apiClient from "@/lib/api/client";
import {
  useCreateService,
  type ServicePayload,
  useUpdateService,
} from "@/lib/api/hooks/useProvider";
import {
  SERVICE_CANCELLATION_POLICIES,
  SERVICE_LOCATION_TYPES,
  SERVICE_PRICING_UNITS,
  type ServiceCancellationPolicy,
  type ServiceLocationType,
} from "@/lib/services/config";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const MAX_SERVICE_IMAGES = 5;
const MAX_IMAGE_SIZE_MB = 2;
const MAX_VIDEO_SIZE_MB = 30;

// Validation Schema
const serviceFormSchema = z.object({
  name: z.string().min(2, "Service name must be at least 2 characters"),
  category: z.string().min(2, "Category is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().min(0, "Price must be positive"),
  pricingUnit: z.enum(SERVICE_PRICING_UNITS),
  images: z
    .array(z.string())
    .min(1, "Add at least one image before creating this service")
    .max(MAX_SERVICE_IMAGES, `Maximum ${MAX_SERVICE_IMAGES} images allowed`),
  video: z.string().optional(),
  requiresAvailability: z.boolean(),
  defaultDuration: z
    .number()
    .int()
    .min(15, "Default duration must be at least 15 minutes")
    .max(1440, "Default duration must be less than 24 hours")
    .nullable(),
  locationType: z.enum(SERVICE_LOCATION_TYPES),
  location: z.string().max(160, "Location note is too long").optional(),
  cancellationPolicy: z.enum(SERVICE_CANCELLATION_POLICIES),
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;

const LOCATION_TYPE_OPTIONS: Array<{
  value: ServiceLocationType;
  label: string;
  description: string;
}> = [
  {
    value: "PROVIDER_LOCATION",
    label: "At my location",
    description: "Clients come to your place.",
  },
  {
    value: "CLIENT_LOCATION",
    label: "At client location",
    description: "You travel to the client.",
  },
  {
    value: "NEGOTIABLE",
    label: "Negotiable",
    description: "Agree location per booking.",
  },
  {
    value: "REMOTE",
    label: "Remote",
    description: "Delivered online or virtually.",
  },
];

const CANCELLATION_POLICY_OPTIONS: Array<{
  value: ServiceCancellationPolicy;
  label: string;
  description: string;
}> = [
  {
    value: "FLEXIBLE",
    label: "Flexible",
    description: "Client-friendly cancellation terms.",
  },
  {
    value: "MODERATE",
    label: "Moderate",
    description: "Balanced protection for both sides.",
  },
  {
    value: "STRICT",
    label: "Strict",
    description: "Stronger commitment and fewer cancellations.",
  },
];

type EditableService = {
  id: string;
  name?: string;
  categoryId?: string;
  description?: string;
  price?: number;
  pricingUnit?: ServicePayload["pricingUnit"];
  requiresAvailability?: boolean;
  defaultDuration?: number | null;
  locationType?: ServiceLocationType;
  location?: string | null;
  cancellationPolicy?: ServiceCancellationPolicy;
  images?: string[];
  video?: string;
};

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  service?: EditableService;
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

const STEP_META = [
  {
    label: "Basic Info",
    title: "Name it, categorize it, and set pricing",
    description:
      "Give clients the essentials they need to recognize and compare your service.",
    icon: "inventory_2",
  },
  {
    label: "Details",
    title: "Define booking and delivery rules",
    description:
      "Configure how this service is booked, delivered, and cancelled so operations stay smooth.",
    icon: "description",
  },
  {
    label: "Media",
    title: "Add visuals that build trust",
    description:
      "Photos and short video help your listing feel real and improve confidence.",
    icon: "photo_library",
  },
] as const;

const ServiceFormModal = ({
  isOpen,
  onClose,
  service,
  isMobile = false,
}: ServiceFormModalProps) => {
  const isEditMode = !!service;
  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const router = useRouter();

  // Fetch categories
  const { data: categoriesData = [], isLoading: isLoadingCategories } =
    useQuery({
      queryKey: ["categories"],
      queryFn: async () => {
        const response = await apiClient.get("/categories");
        const payload = response?.data;
        const rawCategories = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.categories)
            ? payload.categories
            : Array.isArray(payload)
              ? payload
              : [];

        return rawCategories.filter((cat: Category) => cat.id !== "all");
      },
    });

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: service?.name || "",
    category: service?.categoryId || "",
    description: service?.description || "",
    price: service?.price || 0,
    pricingUnit: service?.pricingUnit || "fixed",
    requiresAvailability: service?.requiresAvailability ?? true,
    defaultDuration: service?.defaultDuration ?? 60,
    locationType: service?.locationType || "PROVIDER_LOCATION",
    location: service?.location || "",
    cancellationPolicy: service?.cancellationPolicy || "FLEXIBLE",
    images: service?.images || [],
    video: service?.video || undefined,
  });

  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const currentStepMeta = STEP_META[step - 1];

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
        requiresAvailability: service?.requiresAvailability ?? true,
        defaultDuration: service?.defaultDuration ?? 60,
        locationType: service?.locationType || "PROVIDER_LOCATION",
        location: service?.location || "",
        cancellationPolicy: service?.cancellationPolicy || "FLEXIBLE",
        images: service?.images || [],
        video: service?.video || undefined,
      });
      setErrors({});
      setUploadingFiles([]);
      setIsFullscreen(false);
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
    type: "image" | "video",
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validation
    if (type === "image") {
      if (formData.images.length + files.length > MAX_SERVICE_IMAGES) {
        toast.error(`Maximum ${MAX_SERVICE_IMAGES} images allowed`);
        return;
      }
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
          toast.error(
            `Image ${files[i].name} exceeds ${MAX_IMAGE_SIZE_MB}MB limit`,
          );
          return;
        }
      }
    } else {
      if (formData.video) {
        toast.error("Only 1 video allowed");
        return;
      }
      if (files[0].size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        toast.error(`Video exceeds ${MAX_VIDEO_SIZE_MB}MB limit`);
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
            f.preview === fileObj.preview ? { ...f, progress: 100 } : f,
          ),
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
            prev.filter((f) => f.preview !== fileObj.preview),
          );
          URL.revokeObjectURL(fileObj.preview);
        }, 500);
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error(`Failed to upload ${fileObj.file.name}`);
        setUploadingFiles((prev) =>
          prev.filter((f) => f.preview !== fileObj.preview),
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
      if (formData.requiresAvailability && !formData.defaultDuration) {
        newErrors.defaultDuration =
          "Set a default duration when availability scheduling is enabled";
        isValid = false;
      }
      if (
        formData.defaultDuration !== null &&
        formData.defaultDuration !== undefined &&
        formData.defaultDuration < 15
      ) {
        newErrors.defaultDuration =
          "Default duration must be at least 15 minutes";
        isValid = false;
      }
      if (!formData.locationType) {
        newErrors.locationType = "Choose how this service is delivered";
        isValid = false;
      }
      if (!formData.cancellationPolicy) {
        newErrors.cancellationPolicy = "Select a cancellation policy";
        isValid = false;
      }
    } else if (currentStep === 3) {
      if (formData.images.length < 1) {
        newErrors.images =
          "Add at least one image before creating this service";
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
    } catch (error: unknown) {
      console.error("Failed to save service", error);
      const knownError = error as {
        response?: { data?: { error?: string } };
      };
      if (knownError.response?.data?.error) {
        toast.error(knownError.response.data.error);
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
                  {/* Location Info Banner */}
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 sm:p-4 flex items-start gap-3">
                    <div className="bg-blue-100 rounded-full p-1.5 flex-shrink-0">
                      <span className="material-symbols-outlined text-blue-600 text-sm sm:text-base">
                        location_on
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-blue-800 font-medium mb-1">
                        Service Location
                      </p>
                      <p className="text-xs text-blue-600 leading-relaxed mb-2">
                        This service will be listed based on your profile
                        location. To change where your services appear, please
                        update your profile location.
                      </p>
                      <button
                        onClick={() => {
                          onClose();
                          router.push("/dashboard/profile");
                        }}
                        className="text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        Update Profile Location
                        <span className="material-symbols-outlined text-xs">
                          arrow_forward
                        </span>
                      </button>
                    </div>
                  </div>

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

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1.5">
                        Requires Availability Schedule
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              requiresAvailability: true,
                            })
                          }
                          className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                            formData.requiresAvailability
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-white text-gray-600"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              requiresAvailability: false,
                            })
                          }
                          className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                            !formData.requiresAvailability
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-white text-gray-600"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Default Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min={15}
                        step={15}
                        disabled={!formData.requiresAvailability}
                        value={formData.defaultDuration ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            defaultDuration:
                              e.target.value === ""
                                ? null
                                : Number.parseInt(e.target.value, 10),
                          })
                        }
                        className={`w-full px-3 py-2.5 rounded-lg border ${
                          errors.defaultDuration
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-200 focus:ring-emerald-500"
                        } focus:ring-2 focus:border-transparent transition-all text-sm text-gray-900 placeholder:text-gray-500 disabled:bg-gray-100 disabled:text-gray-400`}
                        placeholder="60"
                      />
                      {errors.defaultDuration && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.defaultDuration}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Service Delivery Type
                      </label>
                      <select
                        value={formData.locationType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            locationType: e.target.value as ServiceLocationType,
                          })
                        }
                        className={`w-full px-3 py-2.5 rounded-lg border ${
                          errors.locationType
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-200 focus:ring-emerald-500"
                        } focus:ring-2 focus:border-transparent transition-all text-sm text-gray-900`}
                      >
                        {LOCATION_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {errors.locationType && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.locationType}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Default Location Note (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={160}
                        value={formData.location || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm text-gray-900 placeholder:text-gray-500"
                        placeholder="e.g., Westlands studio or Nairobi CBD"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Cancellation Policy
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {CANCELLATION_POLICY_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                cancellationPolicy: option.value,
                              })
                            }
                            className={`px-2 py-2 rounded-lg border text-[11px] font-medium transition-all ${
                              formData.cancellationPolicy === option.value
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : "border-gray-200 bg-white text-gray-600"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      {errors.cancellationPolicy && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.cancellationPolicy}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-xs font-semibold text-gray-700 truncate">
                        Gallery ({formData.images.length}/{MAX_SERVICE_IMAGES})
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

                      {formData.images.length < MAX_SERVICE_IMAGES && (
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

                    {/* Image Upload Progress */}
                    {uploadingFiles.filter((f) => f.type === "image").length >
                      0 && (
                      <div className="space-y-1.5 mt-3">
                        {uploadingFiles
                          .filter((f) => f.type === "image")
                          .map((file, idx) => (
                            <div
                              key={idx}
                              className="bg-gray-50 rounded-md p-2 flex items-center gap-2"
                            >
                              <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-gray-500 text-xs">
                                  image
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

                    {/* Video Upload Progress */}
                    {uploadingFiles.filter((f) => f.type === "video").length >
                      0 && (
                      <div className="space-y-1.5 mt-3">
                        {uploadingFiles
                          .filter((f) => f.type === "video")
                          .map((file, idx) => (
                            <div
                              key={idx}
                              className="bg-gray-50 rounded-md p-2 flex items-center gap-2"
                            >
                              <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-gray-500 text-xs">
                                  videocam
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
          className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all ${
            isFullscreen
              ? "h-[96vh] w-[96vw] max-w-none"
              : "max-h-[92vh] w-full max-w-4xl"
          }`}
        >
          {/* Header */}
          <div className="border-b border-gray-100 bg-[linear-gradient(135deg,#f7fffb_0%,#ffffff_58%,#f4f8ff_100%)] px-6 py-3 lg:px-8 lg:py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  <span className="material-symbols-outlined text-sm">
                    {currentStepMeta.icon}
                  </span>
                  Step {step} of 3
                </div>
                <h2 className="truncate text-[1.75rem] font-bold text-gray-900 leading-tight">
                  {isEditMode ? "Edit Service" : "Create New Service"}
                </h2>
                <p className="mt-0.5 text-sm font-medium text-gray-700">
                  {currentStepMeta.title}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFullscreen((prev) => !prev)}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-700"
                  aria-label={
                    isFullscreen ? "Exit fullscreen editor" : "Expand editor"
                  }
                >
                  <span className="material-symbols-outlined text-xl">
                    {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                  </span>
                </button>
                <button
                  onClick={onClose}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-700"
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined text-xl">
                    close
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-2">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-gray-500">
                <span>{currentStepMeta.label}</span>
                <span>{Math.round((step / STEP_META.length) * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / STEP_META.length) * 100}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {STEP_META.map((item, index) => {
                  const stepNumber = index + 1;
                  const isActive = stepNumber === step;
                  const isDone = stepNumber < step;

                  return (
                    <div
                      key={item.label}
                      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${
                        isActive
                          ? "border-emerald-200 bg-white shadow-sm"
                          : isDone
                            ? "border-emerald-100 bg-emerald-50/60"
                            : "border-gray-100 bg-white/70"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          isActive || isDone
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {isDone ? (
                          <span className="material-symbols-outlined text-sm">
                            check
                          </span>
                        ) : (
                          stepNumber
                        )}
                      </div>
                      <p className="font-semibold text-gray-900">
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 lg:px-8 lg:py-6">
            {step === 1 && (
              <div className="mx-auto max-w-3xl space-y-5">
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                      <span className="material-symbols-outlined">
                        location_on
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">
                        Your service location comes from your profile
                      </p>
                      <p className="mt-1 text-sm text-blue-700">
                        Clients will see this service in the area set on your
                        provider profile. Update your profile if you want this
                        service to appear somewhere else.
                      </p>
                      <button
                        onClick={() => {
                          onClose();
                          router.push("/dashboard/profile");
                        }}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-800 hover:text-blue-900"
                      >
                        Update profile location
                        <span className="material-symbols-outlined text-sm">
                          arrow_forward
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="space-y-6">
                    <div>
                      <label className="mb-2 block text-base font-semibold text-gray-800">
                        Service Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className={`w-full rounded-xl border px-4 py-4 text-lg text-gray-900 transition-all placeholder:text-gray-500 ${
                          errors.name
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-200 focus:ring-emerald-500"
                        } focus:border-transparent focus:ring-2`}
                        placeholder="e.g. Professional House Cleaning"
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Start with the main thing the client is hiring you for.
                      </p>
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <CategorySelector
                        categories={categoriesData}
                        selectedIds={
                          formData.category ? [formData.category] : []
                        }
                        onToggle={(id) =>
                          setFormData({ ...formData, category: id })
                        }
                        isLoading={isLoadingCategories}
                        error={errors.category}
                        label="Choose the service category"
                        compact={true}
                      />
                      <p className="mt-3 text-sm text-gray-500">
                        Next, choose the category clients would browse to find
                        this service.
                      </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                      <div>
                        <label className="mb-2 block text-base font-semibold text-gray-800">
                          Price (KES) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-semibold text-gray-500">
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
                            className={`w-full rounded-xl border py-4 pl-14 pr-4 text-lg text-gray-900 transition-all placeholder:text-gray-500 ${
                              errors.price
                                ? "border-red-300 focus:ring-red-500"
                                : "border-gray-200 focus:ring-emerald-500"
                            } focus:border-transparent focus:ring-2`}
                            placeholder="0.00"
                          />
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                          Set the starting price a client will see first.
                        </p>
                        {errors.price && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.price}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-3 block text-base font-semibold text-gray-800">
                          Pricing Model <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, pricingUnit: "fixed" })
                            }
                            className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                              formData.pricingUnit === "fixed"
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                              <span className="material-symbols-outlined text-lg">
                                payments
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold">
                                Fixed Price
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Use this when the job has one clear total price.
                              </p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                pricingUnit: "hourly",
                              })
                            }
                            className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                              formData.pricingUnit === "hourly"
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                              <span className="material-symbols-outlined text-lg">
                                schedule
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold">
                                Hourly Rate
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Use this when time and scope can change per
                                booking.
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={6}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className={`w-full resize-none rounded-xl border px-4 py-3 text-base text-gray-900 transition-all placeholder:text-gray-500 ${
                      errors.description
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-200 focus:ring-emerald-500"
                    } focus:border-transparent focus:ring-2`}
                    placeholder="Describe exactly what is included, how the service works, and anything clients should know before booking."
                    maxLength={500}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="text-xs text-gray-500">
                      Tip: mention deliverables, turnaround time, and what makes
                      your service stand out.
                    </p>
                    <p className="shrink-0 text-sm text-gray-500">
                      {formData.description.length}/500
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Booking Configuration
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Define how clients book this service and what happens when
                    plans change.
                  </p>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Requires Availability Schedule
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              requiresAvailability: true,
                            })
                          }
                          className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                            formData.requiresAvailability
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-white text-gray-700"
                          }`}
                        >
                          Yes, schedule required
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              requiresAvailability: false,
                            })
                          }
                          className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                            !formData.requiresAvailability
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-white text-gray-700"
                          }`}
                        >
                          No, instant booking
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Default Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min={15}
                        step={15}
                        disabled={!formData.requiresAvailability}
                        value={formData.defaultDuration ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            defaultDuration:
                              e.target.value === ""
                                ? null
                                : Number.parseInt(e.target.value, 10),
                          })
                        }
                        className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 transition-all placeholder:text-gray-500 ${
                          errors.defaultDuration
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-200 focus:ring-emerald-500"
                        } focus:border-transparent focus:ring-2 disabled:bg-gray-100 disabled:text-gray-400`}
                        placeholder="60"
                      />
                      {errors.defaultDuration && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.defaultDuration}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Service Delivery Type
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {LOCATION_TYPE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              locationType: option.value,
                            })
                          }
                          className={`rounded-xl border px-3 py-3 text-left transition-all ${
                            formData.locationType === option.value
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <p className="text-sm font-semibold text-gray-900">
                            {option.label}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {option.description}
                          </p>
                        </button>
                      ))}
                    </div>
                    {errors.locationType && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.locationType}
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Default Location Note (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      value={formData.location || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 transition-all placeholder:text-gray-500 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g., Along Waiyaki Way, 2nd Floor Studio"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Cancellation Policy
                    </label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {CANCELLATION_POLICY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              cancellationPolicy: option.value,
                            })
                          }
                          className={`rounded-xl border px-3 py-3 text-left transition-all ${
                            formData.cancellationPolicy === option.value
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <p className="text-sm font-semibold text-gray-900">
                            {option.label}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {option.description}
                          </p>
                        </button>
                      ))}
                    </div>
                    {errors.cancellationPolicy && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.cancellationPolicy}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 lg:space-y-8">
                {/* Image Upload */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800">
                        Gallery Images ({formData.images.length}/
                        {MAX_SERVICE_IMAGES})
                      </label>
                      <p className="mt-1 text-xs text-gray-500">
                        Add clear photos that show the quality of your work. At
                        least one image is required.
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {MAX_SERVICE_IMAGES} max, {MAX_IMAGE_SIZE_MB}MB each
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {formData.images.map((url, idx) => (
                      <div
                        key={idx}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100"
                      >
                        <img
                          src={url}
                          alt={`Service ${idx}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-all group-hover:opacity-100"
                          aria-label={`Remove image ${idx + 1}`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            close
                          </span>
                        </button>
                      </div>
                    ))}

                    {formData.images.length < MAX_SERVICE_IMAGES && (
                      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 transition-all hover:border-emerald-500 hover:bg-emerald-50">
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
                  {errors.images && (
                    <p className="mt-3 text-sm text-red-500">{errors.images}</p>
                  )}
                </div>

                {/* Video Upload */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800">
                        Service Video (Optional)
                      </label>
                      <p className="mt-1 text-xs text-gray-500">
                        A short clip can help clients understand the service
                        faster.
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">
                      Max {MAX_VIDEO_SIZE_MB}MB
                    </span>
                  </div>

                  {formData.video ? (
                    <div className="group relative aspect-video overflow-hidden rounded-xl bg-black">
                      <video
                        src={formData.video}
                        controls
                        className="w-full h-full"
                      />
                      <button
                        onClick={removeVideo}
                        className="absolute right-2 top-2 z-10 rounded-full bg-red-500 p-1.5 text-white opacity-0 transition-all group-hover:opacity-100"
                        aria-label="Remove video"
                      >
                        <span className="material-symbols-outlined text-sm">
                          delete
                        </span>
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-2 transition-all hover:border-emerald-500 hover:bg-emerald-50">
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
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-3 text-sm font-semibold text-gray-800">
                      Upload Progress
                    </p>
                    <div className="space-y-2">
                      {uploadingFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
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
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 bg-white px-6 py-4 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-gray-500">
                {step === 1
                  ? "Complete the basics to continue."
                  : step === 2
                    ? "Add enough detail so clients know what to expect."
                    : "Review your media, then publish the service."}
              </p>
              <div className="flex items-center gap-3">
                {step > 1 ? (
                  <button
                    onClick={() => setStep((prev) => prev - 1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <span className="material-symbols-outlined text-base">
                      arrow_back
                    </span>
                    Back
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <span className="material-symbols-outlined text-base">
                      close
                    </span>
                    Cancel
                  </button>
                )}

                <button
                  onClick={step === 3 ? handleSubmit : handleNext}
                  disabled={
                    createServiceMutation.isPending ||
                    updateServiceMutation.isPending ||
                    uploadingFiles.length > 0
                  }
                  className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {(createServiceMutation.isPending ||
                    updateServiceMutation.isPending) && (
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
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
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ServiceFormModal;
