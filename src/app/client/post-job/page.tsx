"use client";
import React, { useState, useRef, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { createJobSchema } from "@/lib/validations/schemas";
import { useCreateJob } from "@/lib/api/hooks/useJobs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import CategorySelector from "@/components/CategorySelector";

// Steps configuration
const steps = [
  { id: 1, title: "Basics", icon: "edit", description: "Title & Category" },
  {
    id: 2,
    title: "Details",
    icon: "description",
    description: "Description & Photos",
  },
  {
    id: 3,
    title: "Preferences",
    icon: "tune",
    description: "Budget & Location",
  },
  { id: 4, title: "Review", icon: "check_circle", description: "Final Check" },
];

// Category type
interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  icon: string;
  count: number;
}

function PostJobPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const editJobId = searchParams.get("edit");
  const isEditMode = !!editJobId;
  const [isMobile, setIsMobile] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    budget: "",
    location: "",
    date: "",
    maxApplicants: "",
  });

  // Improved image upload tracking
  type UploadingFile = {
    file: File;
    preview: string;
    progress: number;
    publicId?: string;
  };

  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadedImages, setUploadedImages] = useState<
    Array<{ url: string; publicId: string }>
  >([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const stepRef = useRef<HTMLDivElement>(null);

  const createJobMutation = useCreateJob();

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch categories from database
  const { data: categoriesData = [], isLoading: isLoadingCategories } =
    useQuery({
      queryKey: ["categories"],
      queryFn: async () => {
        const response = await apiClient.get("/categories");
        return response.data.data.filter((cat: Category) => cat.id !== "all");
      },
    });

  // Fetch job data if in edit mode
  const { data: existingJob, isLoading: isLoadingJob } = useQuery({
    queryKey: ["job", editJobId],
    queryFn: async () => {
      const response = await apiClient.get(`/jobs/${editJobId}`);
      return response.data;
    },
    enabled: isEditMode,
  });

  // Update job mutation for edit mode
  const updateJobMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.put(`/jobs/${editJobId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", editJobId] });
      setShowSuccessToast(true);
      setTimeout(() => router.push("/client/dashboard"), 2000);
    },
  });

  // Prefill form data when existing job loads
  useEffect(() => {
    if (existingJob) {
      setFormData({
        title: existingJob.title || "",
        category: existingJob.category?.slug || existingJob.categoryId || "",
        description: existingJob.description || "",
        budget: existingJob.budget?.toString() || "",
        location: existingJob.location || "",
        date: "",
        maxApplicants: existingJob.maxApplicants?.toString() || "",
      });
      // Prefill images if they exist
      if (existingJob.images && existingJob.images.length > 0) {
        setUploadedImages(
          existingJob.images.map((url: string) => ({ url, publicId: "" }))
        );
      }
    }
  }, [existingJob]);

  // Focus management when step changes
  useEffect(() => {
    if (stepRef.current) {
      stepRef.current.focus();
    }
  }, [currentStep]);

  // Improved image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadingFile[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
    }));

    setUploadingFiles((prev) => [...prev, ...newFiles]);

    for (let i = 0; i < newFiles.length; i++) {
      const fileObj = newFiles[i];
      try {
        const formData = new FormData();
        formData.append("file", fileObj.file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();

        setUploadingFiles((prev) =>
          prev.map((f, idx) =>
            f.preview === fileObj.preview
              ? { ...f, progress: 100, publicId: data.publicId }
              : f
          )
        );

        setTimeout(() => {
          setUploadedImages((prev) => [
            ...prev,
            { url: data.url, publicId: data.publicId },
          ]);
          setUploadingFiles((prev) =>
            prev.filter((f) => f.preview !== fileObj.preview)
          );
          URL.revokeObjectURL(fileObj.preview);
        }, 500);
      } catch (error) {
        console.error("Image upload failed:", error);
        setUploadingFiles((prev) =>
          prev.filter((f) => f.preview !== fileObj.preview)
        );
        URL.revokeObjectURL(fileObj.preview);
      }
    }
  };

  // Remove uploaded image
  const removeImage = async (index: number) => {
    const image = uploadedImages[index];
    if (image.publicId) {
      try {
        await fetch(`/api/upload?publicId=${image.publicId}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error("Failed to delete from Cloudinary:", error);
      }
    }
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    try {
      if (step === 1) {
        createJobSchema.pick({ title: true, category: true }).parse({
          title: formData.title,
          category: formData.category,
        });
      } else if (step === 2) {
        createJobSchema.pick({ description: true }).parse({
          description: formData.description,
        });
      } else if (step === 3) {
        if (!formData.budget || isNaN(Number(formData.budget))) {
          newErrors.budget = "Please enter a valid budget amount";
          isValid = false;
        }
        if (!formData.location) {
          newErrors.location = "Location is required";
          isValid = false;
        }
        if (formData.maxApplicants && isNaN(Number(formData.maxApplicants))) {
          newErrors.maxApplicants = "Please enter a valid number";
          isValid = false;
        }
        if (isValid) {
          createJobSchema
            .pick({ budget: true, location: true, maxApplicants: true })
            .parse({
              budget: Number(formData.budget),
              location: formData.location,
              maxApplicants: formData.maxApplicants
                ? Number(formData.maxApplicants)
                : undefined,
            });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormData({ ...formData, category: categoryId });
    if (errors.category) {
      setErrors({ ...errors, category: "" });
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;
    for (let i = 1; i <= steps.length; i++) {
      if (!validateStep(i)) {
        isValid = false;
        setCurrentStep(i);
        break;
      }
    }
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const jobData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budget: Number(formData.budget),
        location: formData.location,
        images: uploadedImages.map((img) => img.url),
        maxApplicants: formData.maxApplicants
          ? Number(formData.maxApplicants)
          : undefined,
      };

      if (isEditMode) {
        await updateJobMutation.mutateAsync(jobData);
      } else {
        await createJobMutation.mutateAsync(jobData);
        setShowSuccessToast(true);
        setTimeout(() => router.push("/client/dashboard"), 2000);
      }
    } catch (error) {
      console.error("Failed to submit job:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-4 sm:py-8 lg:py-12">
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 bg-emerald-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg z-50 flex items-center gap-2 sm:gap-3 max-w-xs sm:max-w-sm"
          >
            <span className="material-symbols-outlined text-sm sm:text-base">
              check_circle
            </span>
            <div>
              <p className="font-semibold text-sm sm:text-base">
                Job {isEditMode ? "updated" : "created"} successfully!
              </p>
              <p className="text-xs text-emerald-100">
                Redirecting to dashboard...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-6 sm:mb-8 lg:mb-12 text-center">
        <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900">
          {isEditMode ? "Edit Job" : "Post a New Job"}
        </h1>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">
          {isEditMode
            ? "Update your job details below."
            : "Tell us what you need done, and we'll connect you with the best pros."}
        </p>
      </div>

      {/* Mobile Progress Steps (Simplified) */}
      {isMobile && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`p-2 rounded-lg ${
                currentStep === 1
                  ? "text-gray-300"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="text-center">
              <span className="text-sm font-bold text-gray-900">
                Step {currentStep} of {steps.length}
              </span>
              <p className="text-xs text-gray-500">
                {steps[currentStep - 1]?.title}
              </p>
            </div>
            <div className="w-10"></div>
          </div>

          <div className="flex gap-1 mb-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`h-1 flex-1 rounded-full ${
                  step.id < currentStep
                    ? "bg-emerald-600"
                    : step.id === currentStep
                    ? "bg-emerald-400"
                    : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Desktop Progress Steps */}
      {!isMobile && (
        <nav aria-label="Progress" className="mb-8 lg:mb-12">
          <ol
            role="list"
            className="overflow-hidden rounded-md lg:flex lg:border-l lg:border-r lg:border-gray-200 lg:rounded-none border-gray-200"
          >
            {steps.map((step, stepIdx) => (
              <li key={step.id} className="relative overflow-hidden lg:flex-1">
                <div
                  className={`border-b border-gray-200 overflow-hidden lg:border-b-0 ${
                    stepIdx === steps.length - 1 ? "" : "lg:border-r"
                  }`}
                >
                  <button
                    onClick={() =>
                      step.id < currentStep && setCurrentStep(step.id)
                    }
                    disabled={step.id > currentStep}
                    className="group w-full"
                    aria-current={step.id === currentStep ? "step" : undefined}
                  >
                    <span
                      className={`absolute top-0 left-0 h-full w-1 bg-transparent group-hover:bg-gray-200 lg:bottom-0 lg:top-auto lg:h-1 lg:w-full ${
                        step.id < currentStep
                          ? "bg-emerald-600"
                          : step.id === currentStep
                          ? "bg-emerald-600"
                          : ""
                      }`}
                      aria-hidden="true"
                    />
                    <span className="flex items-start px-4 sm:px-6 py-4 text-sm font-medium">
                      <span className="flex-shrink-0">
                        <span
                          className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 ${
                            step.id < currentStep
                              ? "border-emerald-600 bg-emerald-600"
                              : step.id === currentStep
                              ? "border-emerald-600"
                              : "border-gray-300"
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-sm sm:text-base ${
                              step.id < currentStep
                                ? "text-white"
                                : step.id === currentStep
                                ? "text-emerald-600"
                                : "text-gray-500"
                            }`}
                          >
                            {step.id < currentStep ? "check" : step.icon}
                          </span>
                        </span>
                      </span>
                      <span className="ml-3 mt-0.5 flex min-w-0 flex-col text-left">
                        <span
                          className={`text-xs sm:text-sm font-bold tracking-wide uppercase ${
                            step.id <= currentStep
                              ? "text-emerald-600"
                              : "text-gray-500"
                          }`}
                        >
                          {step.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          {step.description}
                        </span>
                      </span>
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xs sm:shadow-md lg:shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 sm:space-y-6 focus:outline-none"
              tabIndex={-1}
              ref={stepRef}
            >
              {currentStep === 1 && (
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                      Let's start with the basics
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Give your job a clear title and category.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="title"
                      className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2"
                    >
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      value={formData.title}
                      onChange={handleChange}
                      aria-invalid={!!errors.title}
                      aria-describedby={
                        errors.title ? "title-error" : undefined
                      }
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base text-gray-900 ${
                        errors.title
                          ? "border-red-300 focus:ring-1 sm:focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      } transition-shadow`}
                      placeholder="e.g. Fix leaking faucet in kitchen"
                    />
                    {errors.title && (
                      <p
                        id="title-error"
                        className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">
                          error
                        </span>
                        {errors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <CategorySelector
                      categories={categoriesData}
                      selectedIds={formData.category ? [formData.category] : []}
                      onToggle={(id) => handleCategorySelect(id)}
                      isLoading={isLoadingCategories}
                      error={errors.category}
                      label="Category"
                      compact={isMobile}
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                      Describe the job
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500">
                      The more details you provide, the better proposals you'll
                      get.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2"
                    >
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={isMobile ? 4 : 6}
                      value={formData.description}
                      onChange={handleChange}
                      aria-invalid={!!errors.description}
                      aria-describedby={
                        errors.description ? "description-error" : undefined
                      }
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base text-gray-900 ${
                        errors.description
                          ? "border-red-300 focus:ring-1 sm:focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      } transition-shadow`}
                      placeholder="Describe the issue, specific requirements, measurements, etc..."
                    />
                    {errors.description && (
                      <p
                        id="description-error"
                        className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">
                          error
                        </span>
                        {errors.description}
                      </p>
                    )}
                  </div>

                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                      Photos (Optional)
                    </label>
                    <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                      Add photos to help professionals understand the job
                      better.
                    </p>

                    {/* Upload Area */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center hover:border-emerald-400 transition-colors">
                      <input
                        type="file"
                        id="images"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <label htmlFor="images" className="cursor-pointer">
                        <span className="material-symbols-outlined text-2xl sm:text-3xl lg:text-4xl text-gray-400 mb-1.5 sm:mb-2">
                          cloud_upload
                        </span>
                        <p className="text-xs sm:text-sm font-medium text-gray-700">
                          {uploadingFiles.length > 0
                            ? "Uploading..."
                            : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </label>
                    </div>

                    {/* Uploading Progress */}
                    {uploadingFiles.length > 0 && (
                      <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                        <p className="text-xs sm:text-sm font-medium text-gray-700">
                          Uploading...
                        </p>
                        {uploadingFiles.map((file, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-2.5 sm:p-3"
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <img
                                src={file.preview}
                                alt={file.file.name}
                                className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded"
                              />
                              <div className="flex-1">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                  {file.file.name}
                                </p>
                                <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                                  <div
                                    className="bg-emerald-600 h-1.5 sm:h-2 rounded-full transition-all"
                                    style={{ width: `${file.progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Uploaded Images Gallery */}
                    {uploadedImages.length > 0 && (
                      <div className="mt-3 sm:mt-4">
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                          {uploadedImages.length} photo(s) uploaded
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                          {uploadedImages.map((image, index) => (
                            <div
                              key={index}
                              className="relative aspect-square rounded-lg overflow-hidden group"
                            >
                              <img
                                src={image.url}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-red-500 text-white p-0.5 sm:p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove image"
                              >
                                <span className="material-symbols-outlined text-xs sm:text-sm">
                                  close
                                </span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                      Budget & Location
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Help pros understand your constraints.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label
                        htmlFor="budget"
                        className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2"
                      >
                        Estimated Budget (KES){" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 font-medium text-sm">
                            KES
                          </span>
                        </span>
                        <input
                          type="number"
                          name="budget"
                          id="budget"
                          value={formData.budget}
                          onChange={handleChange}
                          aria-invalid={!!errors.budget}
                          aria-describedby={
                            errors.budget ? "budget-error" : undefined
                          }
                          className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base text-gray-900 ${
                            errors.budget
                              ? "border-red-300 focus:ring-1 sm:focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              : "border-gray-300 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          } transition-shadow`}
                          placeholder="e.g. 5000"
                        />
                      </div>
                      {errors.budget && (
                        <p
                          id="budget-error"
                          className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">
                            error
                          </span>
                          {errors.budget}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="date"
                        className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2"
                      >
                        Preferred Date (Optional)
                      </label>
                      <input
                        type="date"
                        name="date"
                        id="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-300 text-sm sm:text-base text-gray-900 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="maxApplicants"
                      className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2"
                    >
                      Max Applicants (Optional)
                    </label>
                    <p className="text-xs sm:text-sm text-gray-500 mb-2">
                      Limit the number of proposals you receive.
                    </p>
                    <input
                      type="number"
                      name="maxApplicants"
                      id="maxApplicants"
                      min="1"
                      value={formData.maxApplicants}
                      onChange={handleChange}
                      aria-invalid={!!errors.maxApplicants}
                      aria-describedby={
                        errors.maxApplicants ? "maxApplicants-error" : undefined
                      }
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base text-gray-900 ${
                        errors.maxApplicants
                          ? "border-red-300 focus:ring-1 sm:focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      } transition-shadow`}
                      placeholder="e.g. 10"
                    />
                    {errors.maxApplicants && (
                      <p
                        id="maxApplicants-error"
                        className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">
                          error
                        </span>
                        {errors.maxApplicants}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="location"
                      className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2"
                    >
                      Location <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-400 text-sm">
                          location_on
                        </span>
                      </span>
                      <input
                        type="text"
                        name="location"
                        id="location"
                        value={formData.location}
                        onChange={handleChange}
                        aria-invalid={!!errors.location}
                        aria-describedby={
                          errors.location ? "location-error" : undefined
                        }
                        className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base text-gray-900 ${
                          errors.location
                            ? "border-red-300 focus:ring-1 sm:focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        } transition-shadow`}
                        placeholder="e.g. Westlands, Nairobi"
                      />
                    </div>
                    {errors.location && (
                      <p
                        id="location-error"
                        className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">
                          error
                        </span>
                        {errors.location}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                      Review & Post
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Review your job details before posting.
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Job Title
                        </h3>
                        <p className="text-base sm:text-lg font-bold text-gray-900">
                          {formData.title}
                        </p>
                      </div>
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="text-emerald-600 text-xs sm:text-sm font-medium hover:underline whitespace-nowrap ml-2"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Category
                        </h3>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {categoriesData.find(
                            (c: Category) => c.id === formData.category
                          )?.image ? (
                            <img
                              src={
                                categoriesData.find(
                                  (c: Category) => c.id === formData.category
                                )?.image
                              }
                              alt="Category"
                              className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-gray-600 text-base">
                              {
                                categoriesData.find(
                                  (c: Category) => c.id === formData.category
                                )?.icon
                              }
                            </span>
                          )}
                          <p className="text-sm sm:text-base text-gray-900 capitalize truncate">
                            {
                              categoriesData.find(
                                (c: Category) => c.id === formData.category
                              )?.name
                            }
                          </p>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Budget
                        </h3>
                        <p className="text-base sm:text-lg text-emerald-600 font-bold">
                          KES {formData.budget}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Description
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto pr-2">
                        {formData.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Location
                        </h3>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="material-symbols-outlined text-gray-400 text-base">
                            location_on
                          </span>
                          <p className="text-sm sm:text-base text-gray-900 truncate">
                            {formData.location}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Date
                        </h3>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="material-symbols-outlined text-gray-400 text-base">
                            calendar_today
                          </span>
                          <p className="text-sm sm:text-base text-gray-900">
                            {formData.date || "Flexible"}
                          </p>
                        </div>
                      </div>
                      {formData.maxApplicants && (
                        <div>
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Max Applicants
                          </h3>
                          <p className="text-sm sm:text-base text-gray-900">
                            {formData.maxApplicants}
                          </p>
                        </div>
                      )}
                    </div>

                    {uploadedImages.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Photos ({uploadedImages.length})
                        </h3>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          {uploadedImages.slice(0, 3).map((image, index) => (
                            <img
                              key={index}
                              src={image.url}
                              alt={`Job photo ${index + 1}`}
                              className="aspect-square object-cover rounded-lg"
                            />
                          ))}
                          {uploadedImages.length > 3 && (
                            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-xs sm:text-sm font-bold text-gray-600">
                                +{uploadedImages.length - 3} more
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 sm:mt-8 lg:mt-10 flex justify-between pt-4 sm:pt-6 border-t border-gray-100">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-colors text-sm sm:text-base ${
                currentStep === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              Back
            </button>
            <button
              onClick={currentStep === steps.length ? handleSubmit : handleNext}
              disabled={createJobMutation.isPending}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base"
            >
              {createJobMutation.isPending ? (
                <>
                  <span className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span className="text-xs sm:text-sm">Posting...</span>
                </>
              ) : currentStep === steps.length ? (
                "Post Job Now"
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && currentStep < steps.length && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg sm:hidden">
          <button
            onClick={currentStep === steps.length ? handleSubmit : handleNext}
            disabled={createJobMutation.isPending}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md"
          >
            {createJobMutation.isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Posting...
              </>
            ) : currentStep === steps.length ? (
              "Post Job Now"
            ) : (
              `Continue to ${steps[currentStep]?.title}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function PostJobPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-emerald-600"></div>
        </div>
      }
    >
      <PostJobPageContent />
    </Suspense>
  );
}
